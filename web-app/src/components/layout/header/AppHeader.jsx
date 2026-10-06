import styles from "./AppHeader.module.css";

export default function AppHeader({ start, end, ...props }) {
  return (
    <header {...props} className={styles.header}>
      {start ? <div className={styles.start}>{start}</div> : null}
      <h1 className={styles.brand}>SPARK</h1>
      {end ? <div className={styles.end}>{end}</div> : null}
    </header>
  );
}
