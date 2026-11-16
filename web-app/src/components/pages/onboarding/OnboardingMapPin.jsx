import styles from "./Onboarding.module.css";

export default function OnboardingMapPin({ transform, markerClassName, rippleClassName }) {
  return (
    <g transform={transform}>
      <ellipse className={rippleClassName ? `${styles.pinRipple} ${rippleClassName}` : styles.pinRipple} rx="16" ry="6" />
      <ellipse className={styles.pinShadow} rx="10" ry="3" fill="#274a90" />
      <g className={markerClassName ? `${styles.pinMarker} ${markerClassName}` : styles.pinMarker}>
        <path d="M0-36a14 14 0 0 0-14 14C-14-15-7-7 0 0c7-7 14-15 14-22a14 14 0 0 0-14-14Z" fill="#2567df" />
        <circle cy="-22" r="5.5" fill="#fff" />
      </g>
    </g>
  );
}
