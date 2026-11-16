import Image from "next/image";
import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AvailabilityExample, ArrivalExample, WalkingExample } from "./OnboardingGuideExamples";
import OnboardingFooter from "./OnboardingFooter";
import welcomeStyles from "./Onboarding.module.css";
import styles from "./OnboardingGuide.module.css";

const lessons = [
  {
    title: "Check spaces now",
    description: <>Check <strong>spaces left</strong> and garage hours before you go.</>,
    Example: AvailabilityExample,
  },
  {
    title: "Plan your arrival",
    description: <>Pick a date and time for an estimate. Tap <strong>Now</strong> for live updates.</>,
    Example: ArrivalExample,
  },
  {
    title: "Park near your building",
    description: <>Sort by <strong>Walking distance</strong>, then pick your campus building.</>,
    Example: WalkingExample,
  },
];

export default function OnboardingGuide({ step, fontClassName, onBack, onNext, onFinish }) {
  const heading = useRef(null);
  const { title, description, Example } = lessons[step - 1];
  const last = step === lessons.length;

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [step]);

  return (
    <main className={`${welcomeStyles.screen} ${styles.guide}`} data-step={step}>
      <header className={styles.header}>
        <nav className={styles.navigation} aria-label="Onboarding">
          <button className={styles.back} type="button" aria-label="Back" onClick={onBack}>
            <ArrowLeft size={21} aria-hidden="true" />
          </button>
          <div className={styles.progress}>
            <span className="sr-only">Step {step} of {lessons.length}</span>
            {lessons.map((lesson, index) => (
              <span
                key={lesson.title}
                className={styles.progressDot}
                data-state={index + 1 === step ? "current" : index + 1 < step ? "visited" : undefined}
                aria-hidden="true"
              />
            ))}
          </div>
          <button className={`${welcomeStyles.secondaryAction} ${styles.skip}`} type="button" onClick={onFinish}>Skip</button>
        </nav>
        <div className={styles.brand}>
          <Image src="/spark-logo.svg" width={27} height={20} alt="" />
          <span>SPARK</span>
        </div>
      </header>

      <div className={styles.lesson} key={step}>
        <div className={`${styles.intro} ${fontClassName}`}>
          <h1 ref={heading} tabIndex={-1} aria-describedby="onboarding-description">{title}</h1>
          <p id="onboarding-description">{description}</p>
        </div>
        <Example />
      </div>

      <OnboardingFooter>
        <button className={welcomeStyles.start} type="button" onClick={last ? onFinish : onNext}>
          <span>{last ? "See garages" : "Next"}</span>
          <ArrowRight size={21} aria-hidden="true" />
        </button>
      </OnboardingFooter>
    </main>
  );
}
