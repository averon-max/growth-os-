import { Users } from "lucide-react";
import { requireUser, requireWebsiteAccess } from "@/lib/auth-helpers";
import { getAudienceSegments } from "@/lib/audience/repository";
import { EmptyState, Stat, Badge } from "@/components/dashboard/ui";
import styles from "@/components/dashboard/ui.module.css";

export default async function AudiencePage({
  searchParams,
}: {
  searchParams: { websiteId?: string };
}) {
  const user = await requireUser();
  const websiteId = searchParams.websiteId;

  if (!websiteId) {
    return (
      <EmptyState
        icon={Users}
        title="Выберите сайт"
        description="Чтобы увидеть аудиторию, сначала выберите сайт в разделе Websites."
        actionLabel="К сайтам"
        actionHref="/dashboard/websites"
      />
    );
  }

  await requireWebsiteAccess(user.id, websiteId);

  const { segments, pagination } = await getAudienceSegments(websiteId);

  if (segments.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Данных об аудитории пока нет"
        description="Подключите Google Analytics 4, чтобы увидеть сегменты пользователей этого сайта."
        actionLabel="Подключить GA4"
        actionHref="/dashboard/settings"
      />
    );
  }

  return (
    <div className={styles.pageBody}>
      <div className={styles.statGrid}>
        <Stat label="Сегментов" value={String(pagination.total)} />
      </div>

      <div className={styles.group}>
        <div className={styles.groupHeader}>
          <span className={styles.groupLabel}>Сегменты аудитории</span>
          <span className={styles.groupCount}>{pagination.total}</span>
        </div>

        {segments.map((segment) => {
          const criteria = segment.criteria as Record<string, string | number>;
          return (
            <div key={segment.id} className={styles.issueRow}>
              <div className={styles.issueMain}>
                <span className={styles.issueDot} data-tone="accent" />
                <div>
                  <div className={styles.issueTitle}>{segment.name}</div>
                  <div className={styles.issueDesc}>
                    {Object.entries(criteria)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(" · ")}
                  </div>
                </div>
              </div>
              <div className={styles.issueMeta}>
                {Object.keys(criteria).map((key) => (
                  <Badge key={key} tone="muted">
                    {key}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
