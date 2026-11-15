import { useLayoutEffect, useRef } from "react";
import { animateGarageValues, CARD_VALUES_MS, formatEntranceNumber } from "@/components/layout/GarageCard/garageEntrance";
import styles from "./Onboarding.module.css";

function Reading({ value, approximate = false }) {
  const formatted = formatEntranceNumber(value);
  const prefix = approximate ? "~" : "";

  return (
    <span className={styles.reading}>
      <span className={styles.readingWidth} aria-hidden="true">{prefix}{formatted}</span>
      <span className={styles.readingValue} aria-hidden="true">
        {prefix}<span data-entrance-value={value}>{formatted}</span>
      </span>
      <span className="sr-only">{approximate && "About "}{formatted}</span>
    </span>
  );
}

export default function ExampleGarageCard({ name, occupied, spaces, delay }) {
  const card = useRef(null);

  useLayoutEffect(() => animateGarageValues(card.current, { enabled: true, delay }), [delay]);

  return (
    <article
      ref={card}
      className={styles.card}
      aria-label={name}
      style={{ "--card-enter-delay": `${delay}ms`, "--card-enter-duration": `${CARD_VALUES_MS}ms` }}
    >
      <div className={styles.cardStats}>
        <div>
          <h3 className={styles.cardName}>{name}</h3>
          <p className={styles.cardOccupied}><Reading value={occupied} />% occupied</p>
        </div>
        <div className={styles.cardSpaces}>
          <p className={styles.cardCount}><Reading value={spaces} approximate /></p>
          <p className={styles.cardCaption}>spaces left</p>
        </div>
      </div>
      <div className={styles.cardMeter} aria-hidden="true">
        <span data-entrance-bar style={{ width: `${occupied}%` }} />
      </div>
    </article>
  );
}
