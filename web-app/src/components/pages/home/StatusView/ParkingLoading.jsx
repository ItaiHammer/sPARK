import styles from "./StatusViewPage.module.css";

export default function ParkingLoading({ fullPage = false, label = "Loading garages" }) {
  return (
    <div className={fullPage ? styles.pageLoading : styles.cardLoading} role="status" aria-live="polite">
      {fullPage ? <span className={styles.loadingBrand} aria-hidden="true">SPARK</span> : null}
      <span className={styles.spinner} aria-hidden="true" />
      <span className={fullPage ? styles.srOnly : styles.loadingLabel}>{fullPage ? "Loading Spark" : label}</span>
    </div>
  );
}
