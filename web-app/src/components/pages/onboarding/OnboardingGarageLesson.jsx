import Image from "next/image";
import { useEffect, useState } from "react";
import { preload } from "react-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ChartNoAxesColumnIncreasing, Clock3, CreditCard, SquareParking } from "lucide-react";
import GarageCard from "@/components/layout/GarageCard/GarageCard";
import { ExamplePanel } from "./OnboardingGuideExamples";
import OnboardingMapPin from "./OnboardingMapPin";
import { southGarage } from "./sampleGarages";
import welcomeStyles from "./Onboarding.module.css";
import styles from "./OnboardingGuide.module.css";

const garage = { ...southGarage, hours: "Open 24h" };
const garageArtwork = "/images/onboarding-garage.svg";
const features = [
  { label: "Forecast", Icon: ChartNoAxesColumnIncreasing },
  { label: "Spot types", Icon: SquareParking },
  { label: "Parking hours", Icon: Clock3 },
  { label: "Payment", Icon: CreditCard },
];
const ease = [0.2, 0.7, 0.24, 1];
export const garageTransition = {
  open: { duration: 0.44, ease },
  close: { duration: 0.32, ease },
};

export default function OnboardingGarageLesson({ view, buttonRef, onOpen, onBack, layoutTransition }) {
  preload(garageArtwork, { as: "image" });
  const showDetails = view === "details";
  const [pinReady, setPinReady] = useState(false);

  useEffect(() => {
    if (!showDetails || !layoutTransition || pinReady) return;
    // A layout change can be skipped if the panel already fits the new view.
    const fallback = window.setTimeout(() => setPinReady(true), layoutTransition.duration * 1000 + 120);
    return () => window.clearTimeout(fallback);
  }, [showDetails, layoutTransition, pinReady]);

  function openDetails() {
    setPinReady(false);
    onOpen();
  }

  return (
    <ExamplePanel
      className={styles.garageExample}
      ariaLabel={showDetails ? "South Garage details example" : "Garage card example"}
      layoutTransition={layoutTransition}
      onLayoutAnimationComplete={showDetails ? () => setPinReady(true) : undefined}
      activity={(
        <button
          ref={buttonRef}
          className={styles.exampleAction}
          type="button"
          onClick={showDetails ? onBack : openDetails}
        >
          {showDetails ? <><ArrowLeft size={16} aria-hidden="true" /> Back to example</> : <>Open Garage Page <ArrowRight size={16} aria-hidden="true" /></>}
        </button>
      )}
    >
      <motion.div
        key={view}
        className={view === "card" ? undefined : styles.garagePane}
        layout={layoutTransition ? "position" : false}
      >
        {showDetails ? <GarageOverview showPin={pinReady || !layoutTransition} /> : <GarageCard garage={garage} adaptiveDensity animateEntrance={view === "card"} />}
      </motion.div>
    </ExamplePanel>
  );
}

function GarageOverview({ showPin }) {
  return (
    <div className={styles.garageOverview}>
      <div className={styles.garageArtwork}>
        <Image className={styles.garageTile} src={garageArtwork} width={362} height={205} alt="" loading="eager" />
        {showPin && (
          <svg className={styles.garageOverlay} viewBox="14 15 362 205" aria-hidden="true">
            <OnboardingMapPin transform="translate(266 160) scale(.86)" markerClassName={styles.garagePin} rippleClassName={welcomeStyles.previewPinRipple} />
          </svg>
        )}
      </div>
      <ul className={styles.garageFeatures} aria-label="On the garage page">
        {features.map(({ label, Icon }) => (
          <li key={label}>
            <Icon size={18} strokeWidth={1.7} aria-hidden="true" />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
