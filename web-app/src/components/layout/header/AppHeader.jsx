import Image from "next/image";
import styles from "./AppHeader.module.css";

export default function AppHeader({ start, end, ...props }) {
  return (
    <header {...props} className={styles.header}>
      {start ? <div className={styles.start}>{start}</div> : null}
      <h1 className={styles.brand}>
        <span>SPARK</span>
        <Image
          className={styles.betaBadge}
          src="/icons/beta-badge.svg"
          width={38}
          height={18}
          alt="Beta"
        />
      </h1>
      {end ? <div className={styles.end}>{end}</div> : null}
    </header>
  );
}
