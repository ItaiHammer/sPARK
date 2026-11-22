import Image from "next/image";
import styles from "./AppHeader.module.css";

export default function AppHeader({ start, end, ...props }) {
  return (
    <header {...props} className={styles.header}>
      {start ? <div className={styles.start}>{start}</div> : null}
      <h1 className={styles.brand}>
        <Image src="/spark-logo.svg" width={25} height={19} alt="" />
        <span className={styles.wordmark}>SPARK</span>
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
