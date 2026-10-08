"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { forwardRef, useState } from "react";
import styles from "./games-entry.module.css";
import { mascotCopy } from "./reactions/copy";

export type MascotCopy = { id: string; title: string; body: string };
type MascotMessageProps = { message: MascotCopy; active: boolean; closePreview: boolean; instantFirstEnter: boolean };

const CLOSE_COPY: MascotCopy = mascotCopy.close;
const EXPRESSIVE = [0.22, 1, 0.36, 1] as const;
const MICRO_SECONDS = 0.18;
const BASE_SECONDS = 0.28;
const FRESH_ENTER_DELAY_SECONDS = 1;

export const MascotMessage = forwardRef<HTMLDivElement, MascotMessageProps>(function MascotMessage({ message, active, closePreview, instantFirstEnter }, ref) {
  const reducedMotion = useReducedMotion();
  const visual = closePreview ? CLOSE_COPY : message;
  const [activation, setActivation] = useState({ active, firstMessageId: active ? visual.id : null as string | null });
  if (activation.active !== active) setActivation({ active, firstMessageId: active ? visual.id : null });
  const freshEnter = active && activation.firstMessageId === visual.id;
  const enterImmediately = freshEnter && instantFirstEnter;

  return (
    <div ref={ref} className={styles.message} data-games-message="">
      <div className={styles.messageSizer} aria-hidden="true">
        <h2>{mascotCopy.default.title}</h2>
        <p>{mascotCopy.default.body}</p>
      </div>
      <div className={styles.messageBubblePositioner}>
        <AnimatePresence mode="sync" initial={false}>
          {active && (
            <motion.div
              key={visual.id}
              className={styles.messageBubble}
              initial={enterImmediately
                ? false
                : freshEnter
                ? { opacity: 0, filter: reducedMotion ? "blur(0px)" : "blur(6px)", y: reducedMotion ? 0 : 12 }
                : { opacity: 0, filter: reducedMotion ? "blur(0px)" : "blur(4px)", y: 0 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              exit={{ opacity: 0, filter: reducedMotion ? "blur(0px)" : "blur(4px)", y: 0, transition: { duration: MICRO_SECONDS, ease: EXPRESSIVE } }}
              transition={{
                duration: enterImmediately ? 0 : freshEnter ? BASE_SECONDS : MICRO_SECONDS,
                delay: enterImmediately ? 0 : freshEnter ? FRESH_ENTER_DELAY_SECONDS : 0,
                ease: EXPRESSIVE,
              }}
              aria-hidden="true"
            >
              <h2>{visual.title}</h2>
              <p>{visual.body}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <span className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{active ? `${message.title}. ${message.body}` : ""}</span>
    </div>
  );
});
