"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/dashboard/topbar";
import f from "./add-website.module.css";

type Created = { websiteId: string; analysisId: string | null; domain: string; note: string | null };

/** Turns "https://www.acme-hardware.com/shop" into "Acme Hardware" for the name field. */
function nameFromUrl(url: string): string {
  try {
    const host = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "");
    const base = host.split(".")[0] ?? "";
    return base
      .split(/[-_]/)
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ");
  } catch {
    return "";
  }
}

function domainOf(url: string): string {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function AddWebsitePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [nameTouched, setNameTouched] = useState(false);
  const [form, setForm] = useState({ businessName: "", industry: "", location: "", websiteUrl: "" });
  const [created, setCreated] = useState<Created | null>(null);

  useEffect(() => {
    fetch("/api/workspaces/mine")
      .then((r) => r.json())
      .then((data) => {
        if (data?.workspaceId) setWorkspaceId(data.workspaceId);
      })
      .catch(() => {});
  }, []);

  const setUrl = (websiteUrl: string) =>
    setForm((prev) => ({ ...prev, websiteUrl, businessName: nameTouched ? prev.businessName : nameFromUrl(websiteUrl) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) {
      setError("Session error. Please refresh and try again.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, workspaceId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      const analysisRes = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId: data.website.id }),
      });
      const analysisData = await analysisRes.json().catch(() => ({}));
      // The website already exists at this point, so the flow always moves on to step 2.
      // On Free the audit is refused (402): the site is still added and the data can be connected.
      const note = analysisRes.ok
        ? null
        : analysisRes.status === 402
          ? "The site audit is part of Starter. Your site is added and you can connect its data now."
          : analysisData.error || "The site audit didn't start. You can run it later from SEO audit.";
      setCreated({ websiteId: data.website.id, analysisId: analysisRes.ok ? analysisData.analysisId ?? null : null, domain: domainOf(form.websiteUrl), note });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const ready = !!form.businessName.trim() && !!form.websiteUrl.trim() && !!workspaceId && !loading;

  return (
    <>
      <Topbar title="Add website" />
      <div className={f.wrap}>
        <Link href="/dashboard/websites" className={f.back}>
          <span aria-hidden>←</span> Websites
        </Link>

        <ol className={f.steps} aria-label="Steps">
          <li className={created ? f.done : f.on}>Website</li>
          <li className={created ? f.on : undefined}>Connect data</li>
        </ol>

        {!created ? (
          <>
            <h1 className={f.title}>Add a website</h1>
            <p className={f.lede}>Hyprlyx crawls the site, checks technical SEO and finds the keywords you can win. It takes a minute or two.</p>

            <form className={f.card} onSubmit={handleSubmit}>
              <div className={f.body}>
                <label className={f.field}>
                  <span className={f.label}>Website URL</span>
                  <input
                    className={f.input}
                    type="text"
                    inputMode="url"
                    autoComplete="url"
                    autoFocus
                    placeholder="https://example.com"
                    value={form.websiteUrl}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </label>
                <label className={f.field}>
                  <span className={f.label}>Business name</span>
                  <input
                    className={f.input}
                    type="text"
                    placeholder="Acme Hardware"
                    value={form.businessName}
                    onChange={(e) => {
                      setNameTouched(true);
                      setForm({ ...form, businessName: e.target.value });
                    }}
                  />
                </label>
                <div className={f.row}>
                  <label className={f.field}>
                    <span className={f.label}>
                      Industry <em>optional</em>
                    </span>
                    <input
                      className={f.input}
                      type="text"
                      placeholder="Plumbing, e-commerce…"
                      value={form.industry}
                      onChange={(e) => setForm({ ...form, industry: e.target.value })}
                    />
                  </label>
                  <label className={f.field}>
                    <span className={f.label}>
                      Location <em>optional</em>
                    </span>
                    <input
                      className={f.input}
                      type="text"
                      placeholder="Calgary, AB"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                    />
                  </label>
                </div>
                <p className={f.hint}>Industry and location help pick the right market and competitors.</p>
                {error ? <p className={f.error}>{error}</p> : null}
              </div>
              <div className={f.foot}>
                <span className={f.footNote}>Next: connect Search Console, Analytics and Cloudflare.</span>
                <button type="submit" className={f.primary} disabled={!ready}>
                  {loading ? "Starting…" : "Analyze website"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h1 className={f.title}>Connect your data</h1>
            <p className={f.lede}>
              The analysis of <b>{created.domain}</b> is running. Connect your sources so rankings, traffic and crawlers show real numbers. Each one is read-only
              and takes a few seconds.
            </p>

            <div className={f.card}>
              <div className={f.source}>
                <div>
                  <div className={f.sourceName}>Google Search Console</div>
                  <div className={f.sourceText}>Clicks, impressions, positions and the queries closest to page one.</div>
                </div>
                <a className={f.connect} href={`/api/integrations/google/connect?websiteId=${encodeURIComponent(created.websiteId)}`}>
                  Connect
                </a>
              </div>
              <div className={f.source}>
                <div>
                  <div className={f.sourceName}>Google Analytics 4</div>
                  <div className={f.sourceText}>Visitors, countries and pages from your GA4 property.</div>
                </div>
                <a
                  className={f.connect}
                  href={`/api/integrations/google-analytics/connect?workspaceId=${encodeURIComponent(workspaceId ?? "")}&websiteId=${encodeURIComponent(created.websiteId)}`}
                >
                  Connect
                </a>
              </div>
              <div className={f.source}>
                <div>
                  <div className={f.sourceName}>Cloudflare</div>
                  <div className={f.sourceText}>Every visit, country and verified crawler — including AI bots — if the site runs through Cloudflare.</div>
                </div>
                <Link className={f.connect} href="/dashboard/settings#cloudflare">
                  Connect
                </Link>
              </div>
              <div className={f.foot}>
                <span className={f.footNote}>{created.note ?? "You can connect these later in Settings."}</span>
                {created.analysisId ? (
                  <Link className={f.primary} href={`/dashboard/analysis/${created.analysisId}`}>
                    Open analysis
                  </Link>
                ) : (
                  <Link className={f.primary} href="/dashboard">
                    Go to Overview
                  </Link>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
