import styles from "./Onboarding.module.css";

export default function OnboardingFooter({ children, className }) {
  return (
    <footer className={className ? `${styles.footer} ${className}` : styles.footer}>
      {children}
    </footer>
  );
}
