"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DM_Sans } from "next/font/google";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowRight } from "lucide-react";
import ExampleGarageCard from "./ExampleGarageCard";
import styles from "./Onboarding.module.css";

const introFont = DM_Sans({ subsets: ["latin"], display: "swap" });
const getServerSnapshot = () => null;
const COMPLETION_KEY = "spark:onboarding-complete";
const ARTWORK_WAIT_MS = 2500;

const exampleGarages = [
  { name: "South Garage", spaces: 1358, occupied: 6, delay: 1060 },
  { name: "North Garage", spaces: 812, occupied: 42, delay: 1460 },
];

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
  const completed = useSyncExternalStore(
    subscribeToOnboardingCompletion,
    getOnboardingCompletion,
    getServerSnapshot,
  );

  useEffect(() => {
    if (completed) router.replace("/sjsu");
  }, [completed, router]);

  if (completed === false) return <WelcomeScreen />;

  return <div className={styles.screen} />;
}

function WelcomeScreen() {
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

  return (
    <main className={styles.screen} data-ready={ready} aria-busy={!ready}>
      <div className={styles.brand}>
        {(!artworkTimedOut || logoReady) && (
          <Image
            className={styles.brandMark}
            src="/spark-logo.svg"
            width={37}
            height={28}
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
          <h1>Find parking at <span>SJSU</span></h1>
          <p>Check live and predicted parking availability at SJSU, so you can plan ahead and park with less stress.</p>
        </div>

        <section className={styles.example} aria-labelledby="onboarding-example-label">
          <h2 id="onboarding-example-label" className={styles.exampleLabel}>Example availability*</h2>
          <div className={styles.illustration}>
            {showMap && (
              <div className={styles.map}>
                <Image
                  className={styles.mapTile}
                  src="/images/onboarding-map.svg"
                  width={480}
                  height={330}
                  alt=""
                  loading="eager"
                  fetchPriority="high"
                  onLoad={() => setMapState("loaded")}
                  onError={() => setMapState("failed")}
                />
                <svg className={styles.mapPin} viewBox="0 0 480 330" aria-hidden="true">
                  <ellipse className={styles.pinRipple} cx="333" cy="274" rx="16" ry="7" />
                  <ellipse className={styles.pinShadow} cx="333" cy="274" rx="11" ry="4" fill="#3974ce" />
                  <g className={styles.pinMarker}>
                    <path d="M333 236a15 15 0 0 0-15 15c0 8 9 17 15 24 6-7 15-16 15-24a15 15 0 0 0-15-15Z" fill="#2567df" />
                    <circle cx="333" cy="251" r="6" fill="#fff" />
                  </g>
                </svg>
              </div>
            )}
            {ready && (
              <div className={styles.cards}>
                {exampleGarages.map((garage) => (
                  <ExampleGarageCard key={garage.name} {...garage} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <div className={styles.footer}>
        <svg className={styles.wave} viewBox="0 0 480 56" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 37C58 12 105 9 174 29S270 54 335 31 432 2 480 8V56H0Z" fill="currentColor" />
        </svg>
        <Link className={styles.start} href="/sjsu" replace onNavigate={completeOnboarding}>
          Get started <ArrowRight className={styles.startArrow} size={22} aria-hidden="true" />
        </Link>
      </div>
    </main>
  );
}
