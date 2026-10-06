"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Share2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useUI } from "@/contexts/UI/UI.context";
import { LOTS } from "@/lib/constants/sjsu";
import AppHeader from "./AppHeader";
import styles from "./AppHeader.module.css";

export default function ParkingHeader() {
  const { location_id, lot_id } = useParams();
  const { isInitialPageLoading } = useUI();
  const locationId = typeof location_id === "string" ? location_id.toLowerCase() : null;
  const lotId = typeof lot_id === "string" ? lot_id : null;
  const garagePath = locationId && lotId
    ? `/${encodeURIComponent(locationId)}/garages/${encodeURIComponent(lotId)}` : null;
  const [shareNotice, setShareNotice] = useState(null);
  const [shareFallback, setShareFallback] = useState(null);
  const reducedMotion = useReducedMotion();
  // Feedback belongs to the garage that was shared, even if navigation happens
  // while the native share menu or clipboard request is still completing.
  const notice = garagePath && shareNotice?.path === garagePath ? shareNotice : null;
  const fallback = garagePath && shareFallback?.path === garagePath ? shareFallback : null;

  useEffect(() => {
    if (!shareNotice) return;
    const timeout = setTimeout(() => setShareNotice(null), 4000);
    return () => clearTimeout(timeout);
  }, [shareNotice]);

  const shareGarage = async () => {
    const url = `${window.location.origin}${garagePath}`;
    const garageName = Object.hasOwn(LOTS, lotId) ? LOTS[lotId]
      : document.title.replace(/\s*·\s*sPARK$/, "").trim() || "this garage";
    const shareData = {
      title: `${garageName} · sPARK`,
      text: `Check the parking forecast for ${garageName}.`,
      url,
    };
    const shareText = `${shareData.text}\n${url}`;
    setShareNotice(null);
    setShareFallback(null);
    if (typeof navigator.share === "function" && (!navigator.canShare || navigator.canShare(shareData))) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setShareNotice({ path: garagePath, message: "Share message copied" });
    } catch (error) {
      if (error.name !== "AbortError") setShareFallback({ path: garagePath, text: shareText });
    }
  };

  return (
    <>
      <AppHeader
        inert={isInitialPageLoading}
        aria-hidden={isInitialPageLoading}
        start={garagePath ? <Link className={styles.action} href={`/${encodeURIComponent(locationId)}`} aria-label="Back to all garages"><ArrowLeft aria-hidden="true" size={20} /></Link> : null}
        end={garagePath ? <button className={styles.action} type="button" onClick={shareGarage} aria-label="Share garage"><Share2 aria-hidden="true" size={19} /></button> : null}
      />
      <AnimatePresence>
        {notice ? (
          <motion.p
            key="garage-share-toast"
            className={styles.shareToast}
            role="status"
            style={{ x: "-50%" }}
            initial={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: reducedMotion ? .12 : .24, ease: [.16, 1, .3, 1] } }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : -4, transition: { duration: .16, ease: [.4, 0, 1, 1] } }}
          >{notice.message}</motion.p>
        ) : null}
      </AnimatePresence>
      {fallback ? (
        <div className={styles.shareFallbackWrapper}>
          <div className={styles.shareFallback}>
            <label htmlFor="garage-share-url">Copy this message to share</label>
            <textarea id="garage-share-url" rows={3} readOnly value={fallback.text} onFocus={(event) => event.target.select()} />
            <button type="button" onClick={() => setShareFallback(null)}>Close</button>
          </div>
        </div>
      ) : null}
    </>
  );
}
