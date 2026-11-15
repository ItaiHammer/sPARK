import styles from "./Onboarding.module.css";

export default function OnboardingFooter({ children, className }) {
  return (
    <footer className={className ? `${styles.footer} ${className}` : styles.footer}>
      <div className={styles.footerBackdrop} aria-hidden="true">
        <svg className={styles.wave} viewBox="0 0 480 56" preserveAspectRatio="none">
          <path d="M0 37C58 12 105 9 174 29S270 54 335 31 432 2 480 8V56H0Z" fill="currentColor" />
        </svg>
      </div>
      {children}
    </footer>
  );
}
