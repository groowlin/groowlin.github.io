"use client";

import Link from "next/link";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
  type Variants
} from "framer-motion";
import { useCallback, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { useNavigationLifecycle } from "@/components/navigation/NavigationLifecycleProvider";
import { getExternalLinkProps, TopCard, TopCardArrow, TopCardVisual } from "@/components/navigation/TopCard";
import { getTopCardForPathname, normalizePathname } from "@/components/navigation/top-card-routing";
import type { TopCardContent, TopCardVariant } from "@/lib/content/types";
import styles from "@/components/shell/site-shell.module.css";

interface AnimatedTopCardProps {
  className?: string;
  topCards: Record<TopCardVariant, TopCardContent>;
  workSlugs: string[];
}

interface TopCardTarget {
  card: TopCardContent;
  identity: string;
  pathname: string;
}

interface TopCardSnapshot extends TopCardTarget {
  instance: number;
  slot: number;
}

interface AnimatedTopCardWheelProps extends AnimatedTopCardProps {
  committedCard: TopCardContent;
  committedIdentity: string;
  committedPathname: string;
  shouldRevealInitially: boolean;
}

interface TopCardWheelLayerProps {
  className?: string;
  snapshot: TopCardSnapshot;
  trackOffset: MotionValue<number>;
}

interface StoppableAnimation {
  stop: () => void;
}

const EXPRESSIVE_EASING = [0.22, 1, 0.36, 1] as const;
const STANDARD_EASING = [0.4, 0, 0.2, 1] as const;
const TRACK_DURATION_SECONDS = 0.42;
const OPACITY_TRAVEL_PERCENT = 64;
const CONTENT_EDGE_SCALE = 1 / 1.5;
const SURFACE_SHAPE_DURATION_SECONDS = 0.56;
const CONTENT_REVEAL_VARIANTS: Variants = {
  hidden: {
    opacity: 0.22,
    filter: "blur(18px)",
    scale: 0.985
  },
  revealed: {
    opacity: 1,
    filter: "blur(0px)",
    scale: 1,
    transition: {
      duration: 1.24,
      delay: 0.08,
      ease: EXPRESSIVE_EASING
    }
  },
  route: {
    opacity: 1,
    filter: "blur(0px)",
    scale: 1,
    transition: {
      duration: 0,
      delay: 0
    }
  }
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function getCardKey(card: TopCardContent) {
  return [card.variant, card.photo, card.title, card.subtitle, card.link, card.icons.join("|")].join("::");
}

function getCardIdentity(pathname: string, card: TopCardContent) {
  return `${normalizePathname(pathname)}::${getCardKey(card)}`;
}

function getTrackStep(fromPathname: string, toPathname: string) {
  const normalizedFromPathname = normalizePathname(fromPathname);
  const normalizedToPathname = normalizePathname(toPathname);

  if (normalizedFromPathname !== "/" && normalizedToPathname === "/") {
    return -1;
  }

  return 1;
}

function getLayerOpacity(visualPosition: number) {
  if (visualPosition >= 0) {
    return clamp((100 - visualPosition) / OPACITY_TRAVEL_PERCENT, 0, 1);
  }

  return clamp((visualPosition + OPACITY_TRAVEL_PERCENT) / OPACITY_TRAVEL_PERCENT, 0, 1);
}

function getLayerScale(visualPosition: number) {
  const distanceFromCenter = clamp(Math.abs(visualPosition) / 100, 0, 1);
  return 1 - (1 - CONTENT_EDGE_SCALE) * distanceFromCenter;
}

function TopCardWheelLayer({ className, snapshot, trackOffset }: TopCardWheelLayerProps) {
  const visualPosition = useTransform(trackOffset, (latestOffset) => latestOffset + snapshot.slot * 100);
  const opacity = useTransform(visualPosition, getLayerOpacity);
  const scale = useTransform(visualPosition, getLayerScale);

  return (
    <motion.div
      className={styles.topCardLayer}
      style={{
        top: `${snapshot.slot * 100}%`,
        opacity,
        scale,
        willChange: "opacity, transform"
      }}
    >
      <TopCardVisual card={snapshot.card} className={className} showArrow={false} />
    </motion.div>
  );
}

function AnimatedTopCardWheel({
  className,
  committedCard,
  committedIdentity,
  committedPathname,
  shouldRevealInitially,
  topCards,
  workSlugs
}: AnimatedTopCardWheelProps) {
  const initialSnapshot: TopCardSnapshot = {
    card: committedCard,
    identity: committedIdentity,
    pathname: normalizePathname(committedPathname),
    instance: 0,
    slot: 0
  };
  const [snapshots, setSnapshots] = useState<TopCardSnapshot[]>(() => [initialSnapshot]);
  const [hasWheelStarted, setHasWheelStarted] = useState(!shouldRevealInitially);
  const snapshotsRef = useRef(snapshots);
  const nextInstanceRef = useRef(1);
  const observedCommittedIdentityRef = useRef(committedIdentity);
  const trackRunIdRef = useRef(0);
  const trackAnimationRef = useRef<StoppableAnimation | null>(null);
  const surfaceScaleXAnimationRef = useRef<StoppableAnimation | null>(null);
  const surfaceScaleYAnimationRef = useRef<StoppableAnimation | null>(null);
  const trackOffset = useMotionValue(0);
  const surfaceScaleX = useMotionValue(1);
  const surfaceScaleY = useMotionValue(1);
  const trackY = useTransform(trackOffset, (latestOffset) => `${latestOffset}%`);
  const surfaceInverseScaleX = useTransform(surfaceScaleX, (latestScale) => 1 / latestScale);
  const surfaceInverseScaleY = useTransform(surfaceScaleY, (latestScale) => 1 / latestScale);

  const appendSnapshot = useCallback(
    (target: TopCardTarget) => {
      const currentSnapshots = snapshotsRef.current;
      const latestSnapshot = currentSnapshots.at(-1);

      if (!latestSnapshot || latestSnapshot.identity === target.identity) {
        return;
      }

      const normalizedTarget: TopCardTarget = {
        ...target,
        pathname: normalizePathname(target.pathname)
      };
      const trackStep = getTrackStep(latestSnapshot.pathname, normalizedTarget.pathname);
      const reusableSnapshot = currentSnapshots
        .filter(
          (snapshot) =>
            snapshot.identity === normalizedTarget.identity &&
            (snapshot.slot - latestSnapshot.slot) * trackStep > 0
        )
        .sort(
          (leftSnapshot, rightSnapshot) =>
            Math.abs(leftSnapshot.slot - latestSnapshot.slot) -
            Math.abs(rightSnapshot.slot - latestSnapshot.slot)
        )[0];

      let snapshot: TopCardSnapshot;
      let nextSnapshots: TopCardSnapshot[];

      if (reusableSnapshot) {
        snapshot = {
          ...reusableSnapshot,
          ...normalizedTarget
        };
        nextSnapshots = [
          ...currentSnapshots.filter((currentSnapshot) => currentSnapshot.instance !== snapshot.instance),
          snapshot
        ];
      } else {
        const nextSlot = latestSnapshot.slot + trackStep;
        snapshot = {
          ...normalizedTarget,
          instance: nextInstanceRef.current,
          slot: nextSlot
        };
        nextInstanceRef.current += 1;
        nextSnapshots = [
          ...currentSnapshots.filter((currentSnapshot) => currentSnapshot.slot !== nextSlot),
          snapshot
        ];
      }

      snapshotsRef.current = nextSnapshots;
      setSnapshots(nextSnapshots);
      setHasWheelStarted(true);

      const runId = trackRunIdRef.current + 1;
      trackRunIdRef.current = runId;
      trackAnimationRef.current?.stop();

      const nextAnimation = animate(trackOffset, -snapshot.slot * 100, {
        duration: TRACK_DURATION_SECONDS,
        ease: STANDARD_EASING
      });
      trackAnimationRef.current = nextAnimation;

      void nextAnimation.then(() => {
        if (trackRunIdRef.current !== runId) {
          return;
        }

        trackAnimationRef.current = null;
        const latestSnapshot = snapshotsRef.current.at(-1);

        if (!latestSnapshot) {
          return;
        }

        const settledSnapshots = [latestSnapshot];
        snapshotsRef.current = settledSnapshots;
        setSnapshots(settledSnapshots);
      });
    },
    [trackOffset]
  );

  useLayoutEffect(() => {
    if (observedCommittedIdentityRef.current === committedIdentity) {
      return;
    }

    let isCancelled = false;

    queueMicrotask(() => {
      if (isCancelled || observedCommittedIdentityRef.current === committedIdentity) {
        return;
      }

      observedCommittedIdentityRef.current = committedIdentity;

      if (snapshotsRef.current.some((snapshot) => snapshot.identity === committedIdentity)) {
        return;
      }

      appendSnapshot({
        card: committedCard,
        identity: committedIdentity,
        pathname: committedPathname
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [appendSnapshot, committedCard, committedIdentity, committedPathname]);

  useLayoutEffect(
    () => () => {
      trackRunIdRef.current += 1;
      trackAnimationRef.current?.stop();
      surfaceScaleXAnimationRef.current?.stop();
      surfaceScaleYAnimationRef.current?.stop();
    },
    []
  );

  const latestSnapshot = snapshots.at(-1) ?? initialSnapshot;

  function animateSurfaceShape() {
    surfaceScaleXAnimationRef.current?.stop();
    surfaceScaleYAnimationRef.current?.stop();
    surfaceScaleXAnimationRef.current = animate(
      surfaceScaleX,
      [surfaceScaleX.get(), 0.96, 1.02, 0.995, 1],
      {
        duration: SURFACE_SHAPE_DURATION_SECONDS,
        times: [0, 0.18, 0.46, 0.76, 1],
        ease: ["easeOut", "easeInOut", "easeOut", "easeInOut"]
      }
    );
    surfaceScaleYAnimationRef.current = animate(
      surfaceScaleY,
      [surfaceScaleY.get(), 1.11, 0.985, 1.01, 1],
      {
        duration: SURFACE_SHAPE_DURATION_SECONDS,
        times: [0, 0.18, 0.46, 0.76, 1],
        ease: ["easeOut", "easeInOut", "easeOut", "easeInOut"]
      }
    );
  }

  function handleInteractionClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    animateSurfaceShape();

    const targetPathname = latestSnapshot.card.link;

    if (!targetPathname.startsWith("/") || targetPathname.startsWith("//")) {
      return;
    }

    const targetCard = getTopCardForPathname(targetPathname, topCards, workSlugs);
    appendSnapshot({
      card: targetCard,
      identity: getCardIdentity(targetPathname, targetCard),
      pathname: targetPathname
    });
  }

  return (
    <motion.div
      className={styles.topCardStage}
      data-top-card-stage=""
    >
      <motion.div
        className={styles.topCardSurface}
        initial={
          shouldRevealInitially
            ? {
                opacity: 0.22,
                filter: "blur(18px)",
                scale: 0.985
              }
            : false
        }
        animate={{
          opacity: 1,
          filter: "blur(0px)",
          scale: 1
        }}
        transition={{
          duration: 1.24,
          delay: 0.08,
          ease: EXPRESSIVE_EASING
        }}
        style={{ scaleX: surfaceScaleX, scaleY: surfaceScaleY }}
        aria-hidden="true"
      />

      <motion.div
        className={[
          styles.topCardContentViewport,
          hasWheelStarted ? styles.topCardContentViewportRoute : ""
        ]
          .filter(Boolean)
          .join(" ")}
        initial={shouldRevealInitially ? "hidden" : false}
        animate={hasWheelStarted ? "route" : "revealed"}
        variants={CONTENT_REVEAL_VARIANTS}
        style={{ scaleX: surfaceScaleX, scaleY: surfaceScaleY, willChange: "filter, opacity, transform" }}
      >
        <motion.div
          className={styles.topCardViewportCounterScale}
          style={{ scaleX: surfaceInverseScaleX, scaleY: surfaceInverseScaleY }}
        >
          <motion.div className={styles.topCardTape} style={{ y: trackY, willChange: "transform" }}>
            {snapshots.map((snapshot) => (
              <TopCardWheelLayer
                key={snapshot.instance}
                snapshot={snapshot}
                trackOffset={trackOffset}
                className={className}
              />
            ))}
          </motion.div>
        </motion.div>
      </motion.div>

      <Link
        href={latestSnapshot.card.link}
        scroll={false}
        className={styles.topCardInteractionOverlay}
        aria-label={`${latestSnapshot.card.title}. ${latestSnapshot.card.subtitle}`}
        onClick={handleInteractionClick}
        {...getExternalLinkProps(latestSnapshot.card.link)}
      />

      <motion.div
        className={styles.topCardArrowReveal}
        initial={shouldRevealInitially ? "hidden" : false}
        animate={hasWheelStarted ? "route" : "revealed"}
        variants={CONTENT_REVEAL_VARIANTS}
      >
        <motion.div
          className={styles.topCardArrowSurfaceFollower}
          style={{ scaleX: surfaceScaleX, scaleY: surfaceScaleY }}
        >
          <motion.div
            className={styles.topCardArrowCounterScale}
            style={{ scaleX: surfaceInverseScaleX, scaleY: surfaceInverseScaleY }}
          >
            <div className={styles.topCardArrowAnchor}>
              <TopCardArrow className={styles.topCardStaticArrow} positioned={false} />
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export function AnimatedTopCard({ className, topCards, workSlugs }: AnimatedTopCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const { classifyPathname, routeKey } = useNavigationLifecycle();
  const committedCard = getTopCardForPathname(routeKey, topCards, workSlugs);
  const committedIdentity = getCardIdentity(routeKey, committedCard);

  if (prefersReducedMotion) {
    return <TopCard card={committedCard} className={className} />;
  }

  return (
    <AnimatedTopCardWheel
      className={className}
      committedCard={committedCard}
      committedIdentity={committedIdentity}
      committedPathname={routeKey}
      shouldRevealInitially={classifyPathname(routeKey) === "initial"}
      topCards={topCards}
      workSlugs={workSlugs}
    />
  );
}
