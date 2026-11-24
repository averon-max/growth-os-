import styles from "./loading.module.css";

/** Shown at once while a dashboard page loads, so a click never looks ignored. */
export default function Loading() {
  return (
    <div className={styles.wrap} aria-busy="true" aria-label="Loading">
      <div className={styles.bar} />
      <div className={styles.title} />
      <div className={styles.line} />
      <div className={styles.grid}>
        <div /><div /><div /><div />
      </div>
      <div className={styles.block} />
    </div>
  );
}
