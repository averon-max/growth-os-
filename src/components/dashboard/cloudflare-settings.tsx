"use client";

import { useCallback, useEffect, useState } from "react";

type Site = { id: string; name: string; url: string };
type Status = { connected: boolean; zoneId?: string; updatedAt?: string } | null;

/** Pre-filled Cloudflare page: a token that can only read analytics and the list of sites. */
const CREATE_TOKEN_URL =
  "https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22analytics%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22zone%22%2C%22type%22%3A%22read%22%7D%5D&accountId=%2A&zoneId=all&name=Hyprlyx";

const row: React.CSSProperties = { padding: "12px 16px", borderTop: "1px solid #1e1f22" };
const btn: React.CSSProperties = { height: 30, padding: "0 12px", border: "1px solid #2a2c31", borderRadius: 6, background: "#141516", color: "#f7f8f8", fontSize: 12.5, fontWeight: 510, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center", whiteSpace: "nowrap" };
const primary: React.CSSProperties = { ...btn, border: 0, background: "#0090ff", color: "#fff" };
const input: React.CSSProperties = { height: 32, padding: "0 10px", border: "1px solid #26282d", borderRadius: 6, background: "#101112", color: "#f7f8f8", fontSize: 13, outline: "none", minWidth: 0 };
const muted: React.CSSProperties = { margin: 0, color: "#8a8f98", fontSize: 12.5, lineHeight: 1.55 };

function SiteRow({ site }: { site: Site }) {
  const [status, setStatus] = useState<Status>(null);
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [needZone, setNeedZone] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/integrations/cloudflare/connect?websiteId=${encodeURIComponent(site.id)}`, { cache: "no-store" });
    setStatus(res.ok ? await res.json() : { connected: false });
  }, [site.id]);
  useEffect(() => { void load(); }, [load]);

  async function sync() {
    setBusy("sync");
    const res = await fetch("/api/integrations/cloudflare/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ websiteId: site.id, days: 30 }) });
    const data = await res.json().catch(() => ({}));
    setBusy("");
    setMsg(res.ok ? { ok: true, text: `Loaded ${data.syncedDays ?? 0} days of traffic.` } : { ok: false, text: data.error ?? "Couldn't load traffic yet. Try again in a minute." });
  }

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setBusy("connect");
    setMsg(null);
    const res = await fetch("/api/integrations/cloudflare/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ websiteId: site.id, apiToken: token, zoneId: zoneId || undefined }) });
    const data = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      if (data.needsZoneId) setNeedZone(true);
      return setMsg({ ok: false, text: data.error ?? "Couldn't connect." });
    }
    setToken("");
    setZoneId("");
    setOpen(false);
    setMsg({ ok: true, text: `Connected to ${data.zoneName}. Loading traffic…` });
    await load();
    await sync();
  }

  async function disconnect() {
    if (!confirm(`Disconnect Cloudflare from ${site.name}? The saved token and its traffic history are deleted.`)) return;
    setBusy("disconnect");
    const res = await fetch(`/api/integrations/cloudflare/connect?websiteId=${encodeURIComponent(site.id)}`, { method: "DELETE" });
    setBusy("");
    setMsg(res.ok ? { ok: true, text: "Disconnected." } : { ok: false, text: "Couldn't disconnect." });
    await load();
  }

  const connected = status?.connected === true;
  return (
    <div style={row}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ color: "#e3e5e8", fontSize: 13, fontWeight: 510 }}>{site.name}</div>
          <p style={muted}>{status === null ? "Checking…" : connected ? `Connected · zone ${status.zoneId?.slice(0, 8)}…` : "Not connected"}</p>
        </div>
        {connected ? (
          <>
            <button type="button" style={btn} disabled={!!busy} onClick={() => void sync()}>{busy === "sync" ? "Loading…" : "Refresh data"}</button>
            <button type="button" style={btn} disabled={!!busy} onClick={() => setOpen(!open)}>Replace token</button>
            <button type="button" style={{ ...btn, color: "#ff6369", borderColor: "rgba(229,72,77,.3)" }} disabled={!!busy} onClick={() => void disconnect()}>Disconnect</button>
          </>
        ) : (
          <button type="button" style={primary} onClick={() => setOpen(!open)}>Connect</button>
        )}
      </div>

      {open ? (
        <form onSubmit={connect} style={{ marginTop: 12, display: "grid", gap: 10, padding: 12, border: "1px solid #23252a", borderRadius: 8, background: "#0d0e0f" }}>
          <p style={muted}>
            <b style={{ color: "#f7f8f8" }}>1.</b> Create a read-only token in Cloudflare — the permissions are already filled in, just press <b style={{ color: "#f7f8f8" }}>Continue to summary</b> and <b style={{ color: "#f7f8f8" }}>Create Token</b>.
          </p>
          <div><a href={CREATE_TOKEN_URL} target="_blank" rel="noopener noreferrer" style={btn}>Create token in Cloudflare ↗</a></div>
          <p style={muted}><b style={{ color: "#f7f8f8" }}>2.</b> Copy the token and paste it here. We find the right site automatically and store the token encrypted.</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input style={{ ...input, flex: "1 1 280px" }} type="password" autoComplete="off" spellCheck={false} placeholder="Cloudflare API token" value={token} onChange={(e) => setToken(e.target.value)} />
            {needZone ? <input style={{ ...input, flex: "1 1 220px" }} placeholder="Zone ID (from the site's Overview page)" value={zoneId} onChange={(e) => setZoneId(e.target.value.trim())} /> : null}
            <button type="submit" style={primary} disabled={busy === "connect" || token.trim().length < 20}>{busy === "connect" ? "Checking…" : "Connect"}</button>
          </div>
          {!needZone ? <button type="button" onClick={() => setNeedZone(true)} style={{ ...muted, background: "none", border: 0, padding: 0, textAlign: "left", cursor: "pointer", textDecoration: "underline" }}>I have a Zone ID</button> : null}
        </form>
      ) : null}
      {msg ? <p style={{ ...muted, marginTop: 8, color: msg.ok ? "#30a46c" : "#ff6369" }}>{msg.text}</p> : null}
    </div>
  );
}

/** Cloudflare connection for each website: traffic, countries, pages and search/AI crawlers. */
export function CloudflareSettings({ websites }: { websites: Site[] }) {
  return (
    <div id="cloudflare" style={{ scrollMarginTop: 80 }}>
      <div style={{ padding: "12px 16px" }}>
        <div style={{ color: "#e3e5e8", fontSize: 13, fontWeight: 510 }}>Cloudflare</div>
        <p style={muted}>Visitors, countries, pages and search &amp; AI crawlers for sites that run through Cloudflare. Read-only access.</p>
      </div>
      {websites.length === 0 ? <div style={row}><p style={muted}>Add a website first.</p></div> : websites.map((s) => <SiteRow key={s.id} site={s} />)}
    </div>
  );
}
