import styles from "./GaragePage.module.css";

const COLORS = {
  shell: "#d8d8d6",
  detail: "#8d8d87",
  surface: "var(--spark-pearl)",
  paper: "var(--spark-paper)",
  app: "var(--spark-good)",
  screen: "#b9cde4",
};

function ParkingMark({ y, x = 32, scale = 1, stroke = COLORS.detail }) {
  return <path d="M0 10V0H4C9 0 9 6 4 6H0" transform={`translate(${x} ${y}) scale(${scale})`} stroke={stroke} vectorEffect="non-scaling-stroke" />;
}

export default function PaymentArtwork({ method }) {
  return (
    <span className={styles.paymentVisual}>
      <svg viewBox="0 0 72 100" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="12" y="5" width="48" height="90" rx="8" fill={COLORS.shell} />
        {method === "app" ? (
          <>
            <rect x="17" y="13" width="38" height="68" rx="3" fill={COLORS.surface} />
            <rect x="28" y="8" width="16" height="2" rx="1" fill={COLORS.detail} />
            <circle cx="36" cy="48" r="13" fill={COLORS.app} />
            <ParkingMark x={29.5} y={39.5} scale={1.7} stroke={COLORS.paper} />
            <circle cx="36" cy="87" r="3" fill={COLORS.paper} />
          </>
        ) : method === "station" ? (
          <>
            <rect x="17" y="13" width="38" height="32" rx="3" fill={COLORS.paper} />
            <rect x="21" y="17" width="30" height="23" rx="2" fill={COLORS.screen} />
            <path d="M23 50H34M23 55H34M23 60H34" stroke={COLORS.detail} strokeDasharray="1 3" />
            <path d="M41 55H51M48 52L51 55L48 58" stroke={COLORS.detail} />
            <rect x="25" y="69" width="22" height="18" rx="3" fill={COLORS.paper} />
            <ParkingMark y={73} />
          </>
        ) : (
          <>
            <path d="M49 5H52A8 8 0 0 1 60 13V24H55A6 6 0 0 1 49 18Z" fill={COLORS.paper} />
            <circle cx="30" cy="27" r="10" fill={COLORS.paper} />
            <rect x="18" y="43" width="36" height="19" rx="3" fill={COLORS.surface} />
            <ParkingMark y={47.5} />
            <rect x="18" y="70" width="36" height="16" rx="3" fill={COLORS.paper} />
            <path d="M24 76H48M24 80H42" stroke={COLORS.detail} />
          </>
        )}
      </svg>
    </span>
  );
}
