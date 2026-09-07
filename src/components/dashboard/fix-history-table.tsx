"use client";

import { useEffect, useState, useCallback } from "react";
import { History, AlertTriangle } from "lucide-react";
import { EmptyState, Badge } from "./ui";
import uiStyles from "./ui.module.css";

interface AppliedFixRow {
  id: string;
  pageUrl: string;
  fixType: string;
  riskLevel: string;
  previousValue: string | null;
  newValue: string;
  status: string;
  errorMessage: string | null;
  appliedAt: string | null;
  createdAt: string;
  cmsConnection: {
    website: {
      url: string;
      business: { name: string };
    };
  };
}

interface FixesResponse {
  items: AppliedFixRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_TONE: Record<string, "success" | "danger" | "warning" | "muted"> = {
  SUCCESS: "success",
  FAILED: "danger",
  PENDING: "warning",
  ROLLED_BACK: "muted",
};

const PAGE_SIZE = 25;

export function FixHistoryTable({ workspaceId }: { workspaceId: string }) {
  const [data, setData] = useState<FixesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ workspaceId, page: String(page), limit: String(PAGE_SIZE) });
      const res = await fetch(`/api/cms/fixes?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error || `Failed to load fix history (${res.status}).`);
        return;
      }
      setData(await res.json());
    } catch {
      setError("Network error while loading fix history.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, page]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return <p className={uiStyles.awaitingLabel}>Loading...</p>;
  }

  if (error) {
    return (
      <div className={uiStyles.errorCard}>
        <p className={uiStyles.errorTitle} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={15} /> Couldn&apos;t load fix history
        </p>
        <p className={uiStyles.errorDesc}>{error}</p>
        <button
          onClick={load}
          className={uiStyles.link}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit", marginTop: 10, display: "inline-block" }}
        >
          Retry →
        </button>
      </div>
    );
  }

  if (data && data.total === 0) {
    return (
      <EmptyState
        icon={History}
        title="No fixes applied yet"
        description="Once you apply a fix from Issues or Opportunities, it will appear here with its full history."
      />
    );
  }

  return (
    <div>
      <table className={uiStyles.table}>
        <thead>
          <tr>
            <th>Website</th>
            <th>Page</th>
            <th>Fix</th>
            <th>Risk</th>
            <th>Status</th>
            <th>Applied</th>
          </tr>
        </thead>
        <tbody>
          {data?.items.map((fix) => (
            <tr key={fix.id}>
              <td>{fix.cmsConnection.website.business.name}</td>
              <td>
                <span className={`${uiStyles.mono} ${uiStyles.truncate}`} title={fix.pageUrl}>{fix.pageUrl}</span>
              </td>
              <td>{fix.fixType}</td>
              <td>
                <Badge tone={fix.riskLevel === "DANGEROUS" ? "danger" : fix.riskLevel === "REVIEW" ? "warning" : "muted"}>
                  {fix.riskLevel}
                </Badge>
              </td>
              <td>
                <Badge tone={STATUS_TONE[fix.status] ?? "muted"}>{fix.status}</Badge>
              </td>
              <td className={uiStyles.mono}>
                {fix.appliedAt ? fix.appliedAt.slice(0, 16).replace("T", " ") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {data && data.totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 16 }}>
          <button
            className={uiStyles.link}
            style={{ background: "none", border: "none", cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.4 : 1 }}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className={uiStyles.awaitingLabel}>Page {data.page} of {data.totalPages}</span>
          <button
            className={uiStyles.link}
            style={{ background: "none", border: "none", cursor: page >= data.totalPages ? "not-allowed" : "pointer", opacity: page >= data.totalPages ? 0.4 : 1 }}
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
