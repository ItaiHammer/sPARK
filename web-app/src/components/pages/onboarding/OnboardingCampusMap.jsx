import Image from "next/image";
import { useId } from "react";
import OnboardingMapPin from "./OnboardingMapPin";
import styles from "./Onboarding.module.css";

const route = "M292 143v5q0 4-4 4H168q-6 0-6-6v-16q0-6-6-6V94h-35q-4 0-4-4v-5";

export default function OnboardingCampusMap({ onLoad, onError }) {
  const routeMask = useId();
  const pulseMask = `${routeMask}-pulse`;

  return (
    <div className={styles.map}>
      <Image
        className={styles.mapTile}
        src="/images/onboarding-campus.svg"
        width={475}
        height={251}
        alt="Illustrated campus map with a walking route from a parking garage to Tower Hall"
        loading="eager"
        fetchPriority="high"
        onLoad={onLoad}
        onError={onError}
      />
      <svg className={styles.mapOverlay} viewBox="20 49 475 251" aria-hidden="true">
        <defs>
          <mask id={routeMask} maskUnits="userSpaceOnUse" x="0" y="0" width="355" height="184">
            <path className={styles.routeReveal} d={route} pathLength="1" fill="none" stroke="white" strokeWidth="11" strokeDasharray="1" strokeLinecap="round" />
          </mask>
          <mask id={pulseMask} maskUnits="userSpaceOnUse" x="0" y="0" width="355" height="184">
            <path className={styles.routePulse} d={route} pathLength="1" fill="none" stroke="white" strokeWidth="11" strokeDasharray=".18 1" />
          </mask>
        </defs>
        {/* Use the same ground projection as the campus illustration. */}
        <g transform="matrix(1 -.2 .46 .76 37 140)" fill="none" stroke="#2567df" strokeWidth="4.5" strokeDasharray=".1 8" strokeLinecap="round">
          <path d={route} mask={`url(#${routeMask})`} />
          <path d={route} mask={`url(#${pulseMask})`} stroke="#80adff" />
        </g>
        <OnboardingMapPin transform="translate(394.78 190.28)" />
      </svg>
    </div>
  );
}
