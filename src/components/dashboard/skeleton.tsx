import styles from "./skeleton.module.css";

export function Skeleton({ width = "100%", height = "14px" }: { width?: string; height?: string }) {
  return <div className={styles.skeleton} style={{ width, height }} />;
}
