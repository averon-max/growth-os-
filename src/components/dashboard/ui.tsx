import Link from "next/link";
import styles from "./ui.module.css";

type IconComponent = React.ComponentType<{
  size?: number;
  className?: string;
}>;

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: IconComponent;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIconWrap}>
        <Icon size={17} className={styles.emptyIcon} />
      </div>

      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptyDescription}>{description}</p>

      {actionLabel && actionHref && (
        <Link href={actionHref} className={styles.emptyAction}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statHeader}>
        <p className={styles.statLabel}>{label}</p>

        <span
          className={styles.statAccent}
          style={{ background: accent ?? "var(--muted)" }}
        />
      </div>

      <p className={`${styles.statValue} ${styles.mono}`}>
        {value}
      </p>
    </div>
  );
}

const badgeToneClass = {
  danger: "badgeDanger",
  warning: "badgeWarning",
  accent: "badgeAccent",
  muted: "badgeMuted",
  success: "badgeSuccess",
} as const;

export function Badge({
  tone,
  children,
}: {
  tone: keyof typeof badgeToneClass;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`${styles.badge} ${styles[badgeToneClass[tone]]}`}
    >
      {children}
    </span>
  );
}
