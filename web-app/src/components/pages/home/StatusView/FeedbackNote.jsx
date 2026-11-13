"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import { ChevronDown, Heart, X } from "lucide-react";
import Image from "next/image";
import posthog from "posthog-js";
import {
  feedbackTypes,
  maxFeedbackLength,
  question,
  surveyProperties,
} from "@/lib/constants/feedbackSurvey";
import { SHEET_SPRING } from "./sheetMotion";
import styles from "./FeedbackNote.module.css";

const dismissalKey = "spark:feedback-note-dismissed";
const feedbackExamples = [
  "I found parking before my playlist ended.",
  "I miss doing laps around the garage man...",
  "I got to class early and now I have to make small talk.",
  "I forgot what the 5th floor looks like after using this.",
  "I used to know every speed bump by name.",
  "My professor thinks I’ve become a morning person.",
  "I parked so fast my coffee was still mostly ice. I paid $8 for this.",
  "I guess I have to stop blaming parking now.",
  "The forecast got stuck when I changed the date.",
  "I’d love to save my favorite garage.",
  "Can I sort by how late I’m about to be?",
  "Can I sort by fewest stairs? I’m trying to get to class, not close my rings.",
  "I sent this to the group chat. Nobody has thanked me yet.",
  "My roommate asked how I always find parking. I said intuition.",
  "I showed my dad and he asked if it works at Costco.",
];

const confettiColors = ["#3976d4", "#f2bd3c", "#379971", "#f37b67", "#8266d4"];
const confetti = Array.from({ length: 32 }, (_, index) => {
  const angle = index * 2.399963;
  const distance = 0.48 + (index % 7) * 0.08;
  return {
    "--piece-x": Math.cos(angle) * distance,
    "--piece-y": Math.sin(angle) * distance,
    "--piece-turn": `${(index % 2 ? -1 : 1) * (180 + (index % 5) * 90)}deg`,
    "--piece-duration": `${760 + (index % 6) * 65}ms`,
    "--piece-color": confettiColors[index % confettiColors.length],
  };
});

function pickFeedbackExample(previous) {
  const choices = feedbackExamples.filter((item) => item !== previous);
  return choices[Math.floor(Math.random() * choices.length)] ?? previous;
}

export default function FeedbackNote() {
  const dialog = useRef(null);
  const title = useRef(null);
  const sheet = useRef(null);
  const sheetY = useMotionValue(0);
  const reducedMotion = useReducedMotion();
  const done = useRef(null);
  const pressedBackdrop = useRef(false);
  const submission = useRef(null);
  const sending = useRef(false);
  const titleId = useId();
  const successId = useId();
  const categoryId = useId();
  const answerId = useId();
  const hintId = useId();
  const [dismissed, setDismissed] = useState(null);
  const [category, setCategory] = useState("");
  const [answer, setAnswer] = useState("");
  const [example, setExample] = useState(null);
  const [sent, setSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        setDismissed(sessionStorage.getItem(dismissalKey) === "1");
      } catch {
        setDismissed(false);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (sent) {
      sheet.current.scrollTop = 0;
      done.current?.focus({ preventScroll: true });
    }
  }, [sent]);

  function hideNote() {
    setDismissed(true);
    try {
      sessionStorage.setItem(dismissalKey, "1");
    } catch {
      // The note stays hidden on this page if browser storage is unavailable.
    }
  }

  function openForm() {
    setError(false);
    setExample(pickFeedbackExample(example));
    const form = dialog.current;
    form.showModal();
    title.current?.focus({ preventScroll: true });
    sheetY.jump(reducedMotion ? 0 : form.offsetHeight);
    if (!reducedMotion) animate(sheetY, 0, SHEET_SPRING);
    posthog.capture("survey shown", surveyProperties);
  }

  function closeForm() {
    const form = dialog.current;
    if (!form.open || form.dataset.closing || sending.current) return;

    if (reducedMotion) {
      sheetY.stop();
      form.close();
      return;
    }

    form.dataset.closing = "true";
    animate(sheetY, form.offsetHeight, {
      ...SHEET_SPRING,
      onComplete: () => {
        form.close();
        delete form.dataset.closing;
      },
    });
  }

  async function submitFeedback(event) {
    event.preventDefault();
    const message = answer.trim();
    if (!message || sent || sending.current || dialog.current.dataset.closing) return;

    sending.current = true;
    setIsSending(true);
    setError(false);

    try {
      if (!submission.current) {
        const distinctId = posthog.has_opted_out_capturing()
          ? undefined
          : posthog.get_distinct_id();
        submission.current = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          distinctId,
        };
      }

      const result = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...submission.current, message, category }),
        signal: AbortSignal.timeout(15000),
      });
      if (result.status !== 204) throw new Error("Feedback was not accepted");

      submission.current = null;
      setSent(true);
      setCategory("");
      setAnswer("");
    } catch {
      setError(true);
    } finally {
      sending.current = false;
      setIsSending(false);
    }
  }

  function onClose() {
    if (!sent) posthog.capture("survey dismissed", surveyProperties);
    setSent(false);
  }

  if (
    dismissed !== false ||
    !process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ||
    !process.env.NEXT_PUBLIC_POSTHOG_HOST
  )
    return null;

  return (
    <>
      <div className={styles.note}>
        <button
          className={styles.iconButton}
          type="button"
          aria-label="Hide feedback invitation"
          onClick={hideNote}
        >
          <X size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <button
          className={styles.open}
          type="button"
          aria-haspopup="dialog"
          onClick={openForm}
        >
          <span className={styles.noteText}>
            <Heart size={16} strokeWidth={1.75} aria-hidden="true" />
            <strong>Help shape sPARK</strong>
            <span>Tell us about your experience</span>
          </span>
          <svg
            className={styles.arrow}
            width="21"
            height="18"
            viewBox="0 0 28 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h18m-7-7 7 7-7 7" />
          </svg>
        </button>
      </div>

      <motion.dialog
        ref={dialog}
        className={styles.dialog}
        style={{ y: sheetY }}
        aria-labelledby={sent ? successId : titleId}
        onPointerDown={(event) => {
          pressedBackdrop.current = event.target === event.currentTarget;
        }}
        onClick={(event) => {
          if (pressedBackdrop.current && event.target === event.currentTarget) {
            closeForm();
          }
          pressedBackdrop.current = false;
        }}
        onCancel={(event) => {
          event.preventDefault();
          closeForm();
        }}
        onClose={onClose}
      >
        <div ref={sheet} className={styles.sheet}>
          <button
            className={`${styles.iconButton} ${styles.close}`}
            type="button"
            aria-label="Close feedback form"
            onClick={closeForm}
            disabled={isSending}
          >
            <X size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
          {!sent && (
            <div className={styles.formContent}>
              <h2 ref={title} id={titleId} tabIndex={-1}>
                <Heart size={20} strokeWidth={1.75} aria-hidden="true" />
                Help shape sPARK
              </h2>
              <p className={styles.intro}>
                sPARK is in{" "}
                <Image
                  className={styles.betaBadge}
                  src="/icons/beta-badge.svg"
                  width={38}
                  height={18}
                  alt="beta"
                />
                , and we’d love to hear from you. Share a <strong>bug</strong>, a{" "}
                <strong>feature request</strong>, a <strong>parking story</strong>
                , or anything else about the app.
              </p>
              <form className={styles.form} onSubmit={submitFeedback} aria-busy={isSending}>
                <label htmlFor={categoryId}>
                  Feedback type{" "}
                  <span className={styles.optional}>(optional)</span>
                </label>
                <div className={styles.selectField}>
                  <select
                    id={categoryId}
                    value={category}
                    disabled={isSending}
                    onChange={(event) => {
                      submission.current = null;
                      setCategory(event.target.value);
                      setError(false);
                    }}
                  >
                    <option value="">Choose a type</option>
                    {feedbackTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className={styles.selectChevron}
                    size={14}
                    strokeWidth={1.7}
                    aria-hidden="true"
                  />
                </div>
                <label htmlFor={answerId}>{question}</label>
                <textarea
                  id={answerId}
                  aria-describedby={hintId}
                  placeholder={example ?? undefined}
                  maxLength={maxFeedbackLength}
                  readOnly={isSending}
                  required
                  value={answer}
                  onChange={(event) => {
                    submission.current = null;
                    setAnswer(event.target.value);
                    setError(false);
                  }}
                />
                <p id={hintId} className={styles.hint}>
                  Please leave out names, emails, and student IDs.
                </p>
                {error && (
                  <p className={styles.error} role="alert">
                    Feedback couldn’t be sent. Please try again.
                  </p>
                )}
                <button
                  className={styles.send}
                  type="submit"
                  disabled={isSending || !answer.trim()}
                >
                  {isSending ? "Sending…" : "Send feedback"}
                </button>
              </form>
            </div>
          )}
          {sent && (
            <div className={styles.success}>
              <div className={styles.successMark} aria-hidden="true">
                <Image
                  src="/images/feedback-thanks.webp"
                  width={480}
                  height={384}
                  alt=""
                  unoptimized
                />
                <span className={styles.confetti}>
                  {confetti.map((piece, index) => (
                    <i key={index} style={piece} />
                  ))}
                </span>
              </div>
              <p id={successId} role="status">
                Thanks for sharing your feedback!
              </p>
              <button
                ref={done}
                className={styles.send}
                type="button"
                onClick={closeForm}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </motion.dialog>
    </>
  );
}
