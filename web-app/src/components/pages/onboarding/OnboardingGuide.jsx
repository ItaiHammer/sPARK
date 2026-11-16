import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AvailabilityExample, ArrivalExample, WalkingExample } from "./OnboardingGuideExamples";
import OnboardingGarageLesson, { garageTransition } from "./OnboardingGarageLesson";
import OnboardingFooter from "./OnboardingFooter";
import welcomeStyles from "./Onboarding.module.css";
import styles from "./OnboardingGuide.module.css";

const lessons = [
  {
    title: "Check Spaces Now",
    description: <>Check <strong>spaces left</strong> and garage hours before you go.</>,
    Example: AvailabilityExample,
  },
  {
    title: "Plan Your Arrival",
    description: <>Pick a date and time for an estimate. Tap <strong>Now</strong> for live updates.</>,
    Example: ArrivalExample,
  },
  {
    title: "Park Near Your Building",
    description: <>Sort by <strong>Walking distance</strong>, then pick your campus building.</>,
    Example: WalkingExample,
  },
  {
    title: "Tap a Garage Card",
    description: <>Open the garage page for directions, forecasts, and parking info.</>,
    Example: OnboardingGarageLesson,
  },
];

export const ONBOARDING_LESSON_COUNT = lessons.length;

export default function OnboardingGuide({ step, fontClassName, onBack, onNext, onSkip, onFinish }) {
  const guide = useRef(null);
  const heading = useRef(null);
  const garageButton = useRef(null);
  const [garageView, setGarageView] = useState("card");
  const reducedMotion = useReducedMotion();
  const { title, description, Example } = lessons[step - 1];
  const last = step === ONBOARDING_LESSON_COUNT;
  const garageLesson = Example === OnboardingGarageLesson;
  const showGarageDetails = garageLesson && garageView === "details";
  const layoutTransition = garageLesson && !reducedMotion
    ? garageTransition[showGarageDetails ? "open" : "close"]
    : undefined;

  const closeGarageDetails = () => setGarageView("return");
  function goBack() {
    if (showGarageDetails) {
      closeGarageDetails();
      return;
    }
    if (garageLesson) setGarageView("card");
    onBack();
  }

  useLayoutEffect(() => {
    if (reducedMotion) return;
    const animation = guide.current?.animate?.([{ opacity: 0.76 }, { opacity: 1 }], {
      duration: 280,
      easing: "cubic-bezier(0.28, 0.34, 0.24, 1)",
    });
    return () => animation?.cancel();
  }, [step, reducedMotion]);

  useEffect(() => {
    const target = garageLesson && garageView === "return" ? garageButton : heading;
    target.current?.focus({ preventScroll: true });
  }, [step, garageLesson, garageView]);

  return (
    <main ref={guide} className={`${welcomeStyles.screen} ${styles.guide}`} data-step={step}>
      <header className={styles.header}>
        <nav className={styles.navigation} aria-label="Onboarding">
          <button className={styles.back} type="button" aria-label="Back" onClick={goBack}>
            <ArrowLeft size={21} aria-hidden="true" />
          </button>
          <div className={styles.progress}>
            <span className="sr-only">Step {step} of {ONBOARDING_LESSON_COUNT}</span>
            {lessons.map((lesson, index) => (
              <span
                key={lesson.title}
                className={styles.progressDot}
                data-state={index + 1 === step ? "current" : index + 1 < step ? "visited" : undefined}
                aria-hidden="true"
              />
            ))}
          </div>
          <button className={`${welcomeStyles.secondaryAction} ${styles.skip}`} type="button" onClick={onSkip}>Skip</button>
        </nav>
        <div className={styles.brand}>
          <Image src="/spark-logo.svg" width={27} height={20} alt="" />
          <span>SPARK</span>
        </div>
      </header>

      <div className={styles.lesson} key={step} data-garage-view={garageLesson ? garageView : undefined}>
        <motion.div className={`${styles.intro} ${fontClassName}`} layout={layoutTransition ? "position" : false} transition={{ layout: layoutTransition }}>
          <h1 key={showGarageDetails ? "details" : "lesson"} ref={heading} tabIndex={-1} aria-describedby="onboarding-description">
            {showGarageDetails ? "Garage Details" : title}
          </h1>
          <p key={showGarageDetails ? "details-copy" : "lesson-copy"} id="onboarding-description">
            {showGarageDetails ? "Get more detailed information about a specific garage." : description}
          </p>
        </motion.div>
        {garageLesson ? (
          <OnboardingGarageLesson
            view={garageView}
            buttonRef={garageButton}
            layoutTransition={layoutTransition}
            onOpen={() => setGarageView("details")}
            onBack={closeGarageDetails}
          />
        ) : <Example />}
      </div>

      <OnboardingFooter>
        <button className={welcomeStyles.start} type="button" onClick={last ? onFinish : onNext}>
          <span>{last ? "See Garages" : "Next"}</span>
          <ArrowRight size={21} aria-hidden="true" />
        </button>
      </OnboardingFooter>
    </main>
  );
}
