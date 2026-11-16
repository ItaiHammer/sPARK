"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { DM_Sans } from "next/font/google";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import ParkingLoading from "@/components/pages/home/StatusView/ParkingLoading";
import OnboardingCampusMap from "./OnboardingCampusMap";
import OnboardingFooter from "./OnboardingFooter";
import OnboardingGuide, { ONBOARDING_LESSON_COUNT } from "./OnboardingGuide";
import styles from "./Onboarding.module.css";

const introFont = DM_Sans({ subsets: ["latin"], display: "swap" });
const getServerSnapshot = () => null;
const COMPLETION_KEY = "spark:onboarding-complete";
const GARAGE_LIST_PATH = "/sjsu";
const ARTWORK_WAIT_MS = 2500;
const HANDOFF_DURATION_MS = 240;
const GARAGE_NAVIGATION_TIMEOUT_MS = 5000;
const screenEase = [0.32, 0.12, 0.24, 1];
const screenVariants = {
  enter: (reducedMotion) => ({
    opacity: 1,
    y: 0,
    transition: { duration: reducedMotion ? 0 : 0.56, ease: screenEase },
  }),
  handoff: {
    opacity: 0.32,
    y: -6,
    transition: { duration: HANDOFF_DURATION_MS / 1000, ease: screenEase },
  },
};

function getOnboardingCompletion() {
  try {
    return localStorage.getItem(COMPLETION_KEY) === "true";
  } catch {
    return false;
  }
}

function completeOnboarding() {
  try {
    localStorage.setItem(COMPLETION_KEY, "true");
  } catch { /* Visitors can still continue when browser storage is unavailable. */ }
}

function subscribeToOnboardingCompletion(onChange) {
  const onStorage = ({ key }) => {
    if (key === COMPLETION_KEY || key === null) onChange();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener("pageshow", onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("pageshow", onChange);
  };
}

export default function Onboarding() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState(null);
  const [finishing, setFinishing] = useState(false);
  const [opening, setOpening] = useState(false);
  const completed = useSyncExternalStore(
    subscribeToOnboardingCompletion,
    getOnboardingCompletion,
    getServerSnapshot,
  );
  const openingGarages = opening || (completed === true && !finishing);
  const showOnboarding = completed === false || finishing || opening;

  useEffect(() => {
    if (!openingGarages) return;
    if (opening) completeOnboarding();
    const fallback = window.setTimeout(() => window.location.replace(GARAGE_LIST_PATH), GARAGE_NAVIGATION_TIMEOUT_MS);
    router.replace(GARAGE_LIST_PATH);
    return () => window.clearTimeout(fallback);
  }, [opening, openingGarages, router]);

  useEffect(() => {
    if (step === ONBOARDING_LESSON_COUNT) router.prefetch(GARAGE_LIST_PATH);
  }, [router, step]);

  useEffect(() => {
    if (!finishing || openingGarages) return;
    // Continue if the browser interrupts or suppresses the exit animation.
    const fallback = window.setTimeout(() => setOpening(true), HANDOFF_DURATION_MS + 100);
    return () => window.clearTimeout(fallback);
  }, [finishing, openingGarages]);

  const finish = () => setOpening(true);

  function finishWithHandoff() {
    if (reducedMotion) finish();
    else setFinishing(true);
  }

  const welcome = !step;
  return (
    <div className={styles.transitionSurface}>
      {showOnboarding && (
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            className={styles.stage}
            key={welcome ? "welcome" : "guide"}
            inert={finishing || openingGarages}
            custom={reducedMotion}
            variants={screenVariants}
            initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 10 }}
            animate={finishing ? "handoff" : "enter"}
            onAnimationComplete={(variant) => {
              if (variant === "handoff") finish();
            }}
            exit={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : -6, transition: { duration: reducedMotion ? 0 : 0.24, ease: "easeIn" } }}
          >
            {welcome ? (
              <WelcomeScreen
                restoreFocus={step === 0}
                onStart={() => setStep(1)}
                onFinish={finish}
              />
            ) : (
              <OnboardingGuide
                step={step}
                fontClassName={introFont.className}
                onBack={() => setStep(step - 1)}
                onNext={() => setStep(step + 1)}
                onSkip={finish}
                onFinish={finishWithHandoff}
              />
            )}
          </motion.div>
        </AnimatePresence>
      )}
      {openingGarages && (
        <div className={styles.handoffLoading}>
          <ParkingLoading fullPage />
        </div>
      )}
    </div>
  );
}

function WelcomeScreen({ restoreFocus, onStart, onFinish }) {
  const heading = useRef(null);
  const [logoReady, setLogoReady] = useState(false);
  const [mapState, setMapState] = useState("pending");
  const [artworkTimedOut, setArtworkTimedOut] = useState(false);
  const ready = artworkTimedOut || (logoReady && mapState !== "pending");
  const showMap = mapState === "loaded" || (mapState === "pending" && !artworkTimedOut);
  const finishLogo = () => setLogoReady(true);

  useEffect(() => {
    if (ready) return;
    const timeout = window.setTimeout(() => setArtworkTimedOut(true), ARTWORK_WAIT_MS);
    return () => window.clearTimeout(timeout);
  }, [ready]);

  useEffect(() => {
    if (ready && restoreFocus) heading.current?.focus({ preventScroll: true });
  }, [ready, restoreFocus]);

  return (
    <main className={styles.screen} data-ready={ready} aria-busy={!ready}>
      <div className={styles.brand}>
        {(!artworkTimedOut || logoReady) && (
          <Image
            src="/spark-logo.svg"
            width={30}
            height={23}
            alt=""
            loading="eager"
            fetchPriority="high"
            onLoad={finishLogo}
            onError={finishLogo}
          />
        )}
        <span className={styles.wordmark}>SPARK</span>
      </div>

      <div className={styles.content}>
        <div className={`${styles.intro} ${introFont.className}`}>
          <h1 ref={heading} tabIndex={-1}>Find Parking with sPARK</h1>
          <p>Check live garage availability and plan ahead with parking forecasts.</p>
        </div>

        {showMap && (
          <OnboardingCampusMap onLoad={() => setMapState("loaded")} onError={() => setMapState("failed")} />
        )}
      </div>

      <OnboardingFooter className={styles.welcomeFooter}>
        <button className={styles.start} type="button" onClick={onStart}>
          <span>Get Started</span>
          <ArrowRight className={styles.startArrow} size={21} aria-hidden="true" />
        </button>
        <button className={styles.secondaryAction} type="button" onClick={onFinish}>Skip Onboarding</button>
      </OnboardingFooter>
    </main>
  );
}
