"use client";

import Image from "next/image";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  usePresence,
  useReducedMotion,
  useTransform,
  type MotionValue,
  type Variants
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { TopCardArrow, TopCardVisual } from "@/components/navigation/TopCard";
import homeStyles from "@/components/home/home-showcase.module.css";
import topCardStyles from "@/components/navigation/top-card.module.css";
import shellStyles from "@/components/shell/site-shell.module.css";
import shortModeStyles from "@/components/sections/work-short-summary-toggle.module.css";
import type { TopCardContent } from "@/lib/content/types";
import styles from "@/components/sections/portfolio-motion-demo.module.css";

const SCENE_TRANSITION_DURATION_SECONDS = 0.72;
const SCENE_VISIBLE_DURATION_SECONDS = 0.72;
const SCENE_LIFECYCLE_DURATION_SECONDS =
  SCENE_TRANSITION_DURATION_SECONDS + SCENE_VISIBLE_DURATION_SECONDS;
const SCENE_LIFECYCLE_DURATION_MS = SCENE_LIFECYCLE_DURATION_SECONDS * 1000;
const SCENE_OPACITY_TRIGGER_THRESHOLD = 0.8;
const SCENE_VERTICAL_OFFSET_PX = 120;
const SCENE_ROTATION_DEGREES = 15;
// Exact time fractions at which the mirrored y curves cover 50% of the distance.
const SCENE_EXIT_HALF_DISTANCE_TIME = 0.8984374226549161;
const SCENE_ENTER_HALF_DISTANCE_TIME = 1 - SCENE_EXIT_HALF_DISTANCE_TIME;
const SCENE_EXIT_FADE_START_SECONDS =
  SCENE_TRANSITION_DURATION_SECONDS * SCENE_EXIT_HALF_DISTANCE_TIME;
const SCENE_INCOMING_DELAY_SECONDS =
  SCENE_EXIT_FADE_START_SECONDS +
  (SCENE_TRANSITION_DURATION_SECONDS - SCENE_EXIT_FADE_START_SECONDS) / 2;
const SCENE_INCOMING_Y_DURATION_SECONDS =
  SCENE_LIFECYCLE_DURATION_SECONDS - SCENE_INCOMING_DELAY_SECONDS;
const TOP_CARD_TRACK_DURATION_SECONDS = 0.42;
const TOP_CARD_SURFACE_DURATION_SECONDS = 0.56;
const CONTROL_SWITCH_DELAY_MS = 280;
const TOP_CARD_OPACITY_TRAVEL_PERCENT = 64;
const TOP_CARD_CONTENT_EDGE_SCALE = 1 / 1.5;
const DESKTOP_CONTROL_WIDTH_PX = 84;
const DESKTOP_THUMB_SIZE_PX = 36;
const DESKTOP_THUMB_INSET_PX = 2;
const EXPRESSIVE_EASING = [0.22, 1, 0.36, 1] as const;
const STANDARD_EASING = [0.4, 0, 0.2, 1] as const;
const SCENE_ENTER_Y_EASING = [0.16, 1, 0.3, 1] as const;
const SCENE_EXIT_Y_EASING = [0.7, 0, 0.84, 0] as const;
const STICKER_APPEARANCE_DURATION_SECONDS = 0.7;
const GLASS_APPEARANCE_DELAY_SECONDS = 0.14;
const GLASS_APPEARANCE_DURATION_SECONDS = 0.28;
const GLASS_SCALE_STIFFNESS = 220;
const GLASS_SCALE_DAMPING = 14;
const GLASS_SCALE_MASS = 1;
const STICKER_APPEARANCE_DELAY_MS =
  (GLASS_APPEARANCE_DELAY_SECONDS + GLASS_APPEARANCE_DURATION_SECONDS) * 1000;
const STICKER_FRAME_INTERVAL_MS = 200;
const PUFFY_STAR_STICKER_SRC = "/media/cases/portfoliocase/sticker-puffy-star-darker-yellow.svg";

const TOP_CARD_TO_HOME: TopCardContent = {
  variant: "to-home",
  photo: "/media/top-card/to_home_moscot.png",
  title: "На главную",
  subtitle: "Кейсы ·",
  link: "/",
  icons: [
    "/media/cases/goldenapple/sticker-stack-link.svg",
    "/media/top-card/icon_famil.svg",
    "/media/top-card/icon_vk.svg"
  ]
};

const TOP_CARD_TO_PROFILE: TopCardContent = {
  variant: "to-profile",
  photo: "/media/top-card/avatar_profile.png",
  title: "Родюков Артем",
  subtitle: "Обо мне ·",
  link: "/about",
  icons: [
    "/media/top-card/logos_telegram.svg",
    "/media/top-card/skill-icons_gmail-light.svg",
    "/media/top-card/mdi_github.svg"
  ]
};

const PORTFOLIO_CASE = {
  slug: "portfoliocase",
  title: "Портфолио как продукт",
  subtitle: "2026 · Дизайн · AI"
} as const;

const SHORT_MODE_OPTIONS = [
  { mode: "full", iconSrc: "/media/system/read-full-compact.svg" },
  { mode: "short", iconSrc: "/media/system/read-short-compact.svg" }
] as const;

const PORTFOLIO_STICKER_SRCS = [
  "/media/cases/portfoliocase/sticker-codex.svg",
  "/media/cases/portfoliocase/sticker-puffy-sparkle-darker-violet.svg",
  "/media/cases/portfoliocase/sticker-github.svg",
  "/media/cases/portfoliocase/sticker-segmented-circle.svg",
  PUFFY_STAR_STICKER_SRC
] as const;

const SCENE_VARIANTS: Variants = {
  hidden: (rotationDirection: number = 1) => ({
    opacity: 0,
    filter: "blur(18px)",
    y: SCENE_VERTICAL_OFFSET_PX,
    rotate: rotationDirection * SCENE_ROTATION_DEGREES
  }),
  visible: {
    opacity: [0, 1, 1],
    filter: ["blur(18px)", "blur(0px)", "blur(0px)"],
    y: 0,
    rotate: 0,
    transition: {
      opacity: {
        duration: SCENE_INCOMING_Y_DURATION_SECONDS,
        delay: SCENE_INCOMING_DELAY_SECONDS,
        times: [0, SCENE_ENTER_HALF_DISTANCE_TIME, 1],
        ease: "linear"
      },
      filter: {
        duration: SCENE_INCOMING_Y_DURATION_SECONDS,
        delay: SCENE_INCOMING_DELAY_SECONDS,
        times: [0, SCENE_ENTER_HALF_DISTANCE_TIME, 1],
        ease: "linear"
      },
      y: {
        duration: SCENE_INCOMING_Y_DURATION_SECONDS,
        delay: SCENE_INCOMING_DELAY_SECONDS,
        ease: SCENE_ENTER_Y_EASING
      },
      rotate: {
        duration: SCENE_INCOMING_Y_DURATION_SECONDS,
        delay: SCENE_INCOMING_DELAY_SECONDS,
        ease: SCENE_ENTER_Y_EASING
      }
    }
  },
  exit: (rotationDirection: number = 1) => ({
    opacity: [1, 1, 0],
    filter: ["blur(0px)", "blur(0px)", "blur(18px)"],
    y: SCENE_VERTICAL_OFFSET_PX,
    rotate: rotationDirection * -SCENE_ROTATION_DEGREES,
    transition: {
      opacity: {
        duration: SCENE_TRANSITION_DURATION_SECONDS,
        times: [0, SCENE_EXIT_HALF_DISTANCE_TIME, 1],
        ease: "linear"
      },
      filter: {
        duration: SCENE_TRANSITION_DURATION_SECONDS,
        times: [0, SCENE_EXIT_HALF_DISTANCE_TIME, 1],
        ease: "linear"
      },
      y: { duration: SCENE_TRANSITION_DURATION_SECONDS, ease: SCENE_EXIT_Y_EASING },
      rotate: { duration: SCENE_TRANSITION_DURATION_SECONDS, ease: SCENE_EXIT_Y_EASING }
    }
  })
};

const PORTFOLIO_CASE_SCENE_VARIANTS: Variants = {
  hidden: { opacity: 1, filter: "blur(0px)", y: 0, rotate: 0 },
  visible: { opacity: 1, filter: "blur(0px)", y: 0, rotate: 0 },
  exit: {
    opacity: 1,
    filter: "blur(0px)",
    y: 0,
    rotate: 0
  }
};

const PORTFOLIO_CASE_VARIANTS: Variants = {
  hidden: ({ rotationDirection }: { rotationDirection: number }) => ({
    opacity: 0,
    filter: "blur(18px)",
    y: SCENE_VERTICAL_OFFSET_PX,
    rotate: rotationDirection * SCENE_ROTATION_DEGREES
  }),
  visible: ({ rotationDirection }: { rotationDirection: number }) => {
    const enterDuration = SCENE_INCOMING_Y_DURATION_SECONDS;
    const exitDuration = SCENE_TRANSITION_DURATION_SECONDS;
    const duration = enterDuration + exitDuration;
    const apexProgress = enterDuration / duration;
    const enterOpacityEndProgress =
      (enterDuration * SCENE_ENTER_HALF_DISTANCE_TIME) / duration;
    const exitOpacityStartProgress =
      (enterDuration + exitDuration * SCENE_EXIT_HALF_DISTANCE_TIME) / duration;

    return {
      opacity: [0, 1, 1, 0],
      filter: ["blur(18px)", "blur(0px)", "blur(0px)", "blur(18px)"],
      y: [SCENE_VERTICAL_OFFSET_PX, 0, SCENE_VERTICAL_OFFSET_PX],
      rotate: [
        rotationDirection * SCENE_ROTATION_DEGREES,
        0,
        rotationDirection * -SCENE_ROTATION_DEGREES
      ],
      transition: {
        opacity: {
          duration,
          delay: SCENE_INCOMING_DELAY_SECONDS,
          times: [0, enterOpacityEndProgress, exitOpacityStartProgress, 1],
          ease: "linear"
        },
        filter: {
          duration,
          delay: SCENE_INCOMING_DELAY_SECONDS,
          times: [0, enterOpacityEndProgress, exitOpacityStartProgress, 1],
          ease: "linear"
        },
        y: {
          duration,
          delay: SCENE_INCOMING_DELAY_SECONDS,
          times: [0, apexProgress, 1],
          ease: [SCENE_ENTER_Y_EASING, SCENE_EXIT_Y_EASING]
        },
        rotate: {
          duration,
          delay: SCENE_INCOMING_DELAY_SECONDS,
          times: [0, apexProgress, 1],
          ease: [SCENE_ENTER_Y_EASING, SCENE_EXIT_Y_EASING]
        }
      }
    };
  }
};

type DemoScene = "top-card" | "short-mode" | "portfolio-case";

const DEMO_SCENES: readonly DemoScene[] = ["top-card", "short-mode", "portfolio-case"];

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function getTopCardLayerOpacity(visualPosition: number) {
  if (visualPosition >= 0) {
    return clamp((100 - visualPosition) / TOP_CARD_OPACITY_TRAVEL_PERCENT, 0, 1);
  }

  return clamp((visualPosition + TOP_CARD_OPACITY_TRAVEL_PERCENT) / TOP_CARD_OPACITY_TRAVEL_PERCENT, 0, 1);
}

function getTopCardLayerScale(visualPosition: number) {
  const distanceFromCenter = clamp(Math.abs(visualPosition) / 100, 0, 1);
  return 1 - (1 - TOP_CARD_CONTENT_EDGE_SCALE) * distanceFromCenter;
}

function TopCardDemoLayer({
  card,
  slot,
  trackOffset
}: {
  card: TopCardContent;
  slot: number;
  trackOffset: MotionValue<number>;
}) {
  const visualPosition = useTransform(trackOffset, (latestOffset) => latestOffset + slot * 100);
  const opacity = useTransform(visualPosition, getTopCardLayerOpacity);
  const scale = useTransform(visualPosition, getTopCardLayerScale);

  return (
    <motion.div
      className={shellStyles.topCardLayer}
      style={{ top: `${slot * 100}%`, opacity, scale, willChange: "opacity, transform" }}
    >
      <TopCardVisual
        card={card}
        className={[shellStyles.topCard, topCardStyles.iconMotionActive].join(" ")}
        showArrow={false}
      />
    </motion.div>
  );
}

function TopCardScene({ isActive }: { isActive: boolean }) {
  const trackOffset = useMotionValue(0);
  const surfaceScaleX = useMotionValue(1);
  const surfaceScaleY = useMotionValue(1);
  const trackY = useTransform(trackOffset, (latestOffset) => `${latestOffset}%`);
  const surfaceInverseScaleX = useTransform(surfaceScaleX, (latestScale) => 1 / latestScale);
  const surfaceInverseScaleY = useTransform(surfaceScaleY, (latestScale) => 1 / latestScale);

  useEffect(() => {
    if (!isActive) return;

    const animations: Array<{ stop: () => void }> = [];
    let activeSurfaceXAnimation: { stop: () => void } | null = null;
    let activeSurfaceYAnimation: { stop: () => void } | null = null;
    const runProductionTransition = (targetSlot: number) => {
      activeSurfaceXAnimation?.stop();
      activeSurfaceYAnimation?.stop();

      const trackAnimation = animate(trackOffset, targetSlot * -100, {
        duration: TOP_CARD_TRACK_DURATION_SECONDS,
        ease: STANDARD_EASING
      });
      activeSurfaceXAnimation = animate(surfaceScaleX, [surfaceScaleX.get(), 0.96, 1.02, 0.995, 1], {
        duration: TOP_CARD_SURFACE_DURATION_SECONDS,
        times: [0, 0.18, 0.46, 0.76, 1],
        ease: ["easeOut", "easeInOut", "easeOut", "easeInOut"]
      });
      activeSurfaceYAnimation = animate(surfaceScaleY, [surfaceScaleY.get(), 1.11, 0.985, 1.01, 1], {
        duration: TOP_CARD_SURFACE_DURATION_SECONDS,
        times: [0, 0.18, 0.46, 0.76, 1],
        ease: ["easeOut", "easeInOut", "easeOut", "easeInOut"]
      });

      animations.push(trackAnimation, activeSurfaceXAnimation, activeSurfaceYAnimation);
      return trackAnimation;
    };

    const switchTimeoutId = window.setTimeout(() => {
      runProductionTransition(1);
    }, CONTROL_SWITCH_DELAY_MS);

    return () => {
      window.clearTimeout(switchTimeoutId);
      animations.forEach((animation) => animation.stop());
    };
  }, [isActive, surfaceScaleX, surfaceScaleY, trackOffset]);

  return (
    <div className={[shellStyles.topCardStage, styles.topCardStage].join(" ")}>
      <motion.div className={shellStyles.topCardSurface} style={{ scaleX: surfaceScaleX, scaleY: surfaceScaleY }} />
      <motion.div
        className={[shellStyles.topCardContentViewport, shellStyles.topCardContentViewportRoute].join(" ")}
        style={{ scaleX: surfaceScaleX, scaleY: surfaceScaleY }}
      >
        <motion.div
          className={shellStyles.topCardViewportCounterScale}
          style={{ scaleX: surfaceInverseScaleX, scaleY: surfaceInverseScaleY }}
        >
          <motion.div className={shellStyles.topCardTape} style={{ y: trackY, willChange: "transform" }}>
            <TopCardDemoLayer card={TOP_CARD_TO_PROFILE} slot={0} trackOffset={trackOffset} />
            <TopCardDemoLayer card={TOP_CARD_TO_HOME} slot={1} trackOffset={trackOffset} />
          </motion.div>
        </motion.div>
      </motion.div>
      <div className={shellStyles.topCardArrowReveal}>
        <motion.div
          className={shellStyles.topCardArrowSurfaceFollower}
          style={{ scaleX: surfaceScaleX, scaleY: surfaceScaleY }}
        >
          <motion.div
            className={shellStyles.topCardArrowCounterScale}
            style={{ scaleX: surfaceInverseScaleX, scaleY: surfaceInverseScaleY }}
          >
            <div className={shellStyles.topCardArrowAnchor}>
              <TopCardArrow className={shellStyles.topCardStaticArrow} positioned={false} />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function ShortModeScene({ showShort }: { showShort: boolean }) {
  const shellScaleX = useMotionValue(1);
  const shellScaleY = useMotionValue(1);
  const shellBackground = useMotionValue("#f5f5f5");
  const thumbX = useMotionValue(0);
  const thumbScaleX = useMotionValue(1);
  const thumbScaleY = useMotionValue(1);
  const desktopMaskClipPath = useTransform([thumbX, thumbScaleX], ([latestX, latestScaleX]) => {
    const x = typeof latestX === "number" ? latestX : 0;
    const scaleX = typeof latestScaleX === "number" ? latestScaleX : 1;
    const scaledThumbWidth = DESKTOP_THUMB_SIZE_PX * scaleX;
    const scaleOffset = (DESKTOP_THUMB_SIZE_PX - scaledThumbWidth) / 2;
    const left = x + DESKTOP_THUMB_INSET_PX + scaleOffset;
    const right = Math.max(DESKTOP_CONTROL_WIDTH_PX - left - scaledThumbWidth, 0);
    return `inset(${DESKTOP_THUMB_INSET_PX}px ${right}px ${DESKTOP_THUMB_INSET_PX}px ${left}px round 12px)`;
  });

  useEffect(() => {
    if (!showShort) return;

    const animations: Array<{ stop: () => void }> = [];
    const switchTimeoutId = window.setTimeout(() => {
      animations.push(
        animate(shellScaleX, [1, 1.04, 0.985, 1.01, 1], {
          duration: 0.4,
          times: [0, 0.24, 0.6, 0.84, 1],
          ease: ["easeOut", "easeInOut", "easeOut", "easeInOut"]
        }),
        animate(shellScaleY, [1, 1.12, 1.03, 1], {
          duration: 0.36,
          times: [0, 0.32, 0.72, 1],
          ease: ["easeOut", "easeInOut", "easeOut"]
        }),
        animate(shellBackground, ["#f5f5f5", "#ffffff", "#f5f5f5"], {
          duration: 0.72,
          times: [0, 0.18, 1],
          ease: ["easeOut", "easeOut"]
        }),
        animate(thumbX, 44, { type: "spring", stiffness: 270, damping: 11, mass: 0.56 }),
        animate(thumbScaleX, [1, 1.45, 0.8, 1.12, 1], {
          duration: 0.56,
          times: [0, 0.18, 0.46, 0.76, 1],
          ease: ["easeOut", "easeInOut", "easeOut", "easeInOut"]
        }),
        animate(thumbScaleY, [1, 0.74, 1.12, 0.96, 1], {
          duration: 0.56,
          times: [0, 0.18, 0.46, 0.76, 1],
          ease: ["easeOut", "easeInOut", "easeOut", "easeInOut"]
        })
      );
    }, CONTROL_SWITCH_DELAY_MS);

    return () => {
      window.clearTimeout(switchTimeoutId);
      animations.forEach((animation) => animation.stop());
    };
  }, [showShort, shellBackground, shellScaleX, shellScaleY, thumbScaleX, thumbScaleY, thumbX]);

  return (
    <span className={[shortModeStyles.segmentedControl, styles.shortModeControl].join(" ")}>
      <motion.span
        className={shortModeStyles.segmentShell}
        style={{ scaleX: shellScaleX, scaleY: shellScaleY, backgroundColor: shellBackground }}
      />
      <motion.span
        className={shortModeStyles.segmentThumb}
        style={{ x: thumbX, scaleX: thumbScaleX, scaleY: thumbScaleY }}
      />
      <motion.span className={shortModeStyles.desktopActiveMask} style={{ clipPath: desktopMaskClipPath }}>
        <span className={shortModeStyles.desktopActiveTrack}>
          {SHORT_MODE_OPTIONS.map((option) => (
            <span
              key={option.mode}
              className={[
                shortModeStyles.segmentTab,
                option.mode === "full" ? shortModeStyles.segmentTabFull : shortModeStyles.segmentTabShort
              ].join(" ")}
            >
              <Image className={shortModeStyles.segmentIcon} src={option.iconSrc} width={20} height={20} alt="" draggable={false} />
            </span>
          ))}
        </span>
      </motion.span>
      {SHORT_MODE_OPTIONS.map((option) => (
        <span
          key={option.mode}
          className={[
            shortModeStyles.segmentTab,
            option.mode === "full" ? shortModeStyles.segmentTabFull : shortModeStyles.segmentTabShort
          ].join(" ")}
        >
          <Image className={shortModeStyles.segmentIcon} src={option.iconSrc} width={20} height={20} alt="" draggable={false} />
        </span>
      ))}
    </span>
  );
}

function PortfolioCaseScene({
  isStatic = false,
  rotationDirection = 1
}: {
  isStatic?: boolean;
  rotationDirection?: number;
}) {
  const [stickerFrameIndex, setStickerFrameIndex] = useState(0);
  const [areDecorationsActive, setAreDecorationsActive] = useState(false);
  const hasTriggeredDecorationsRef = useRef(false);

  useEffect(() => {
    if (!areDecorationsActive) return;

    let intervalId: number | null = null;
    const startTimeoutId = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        setStickerFrameIndex((currentIndex) => (currentIndex + 1) % PORTFOLIO_STICKER_SRCS.length);
      }, STICKER_FRAME_INTERVAL_MS);
    }, STICKER_APPEARANCE_DELAY_MS);

    return () => {
      window.clearTimeout(startTimeoutId);
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [areDecorationsActive]);

  return (
    <div className={styles.portfolioCaseScene}>
      <motion.span
        className={styles.caseRevealItem}
        custom={{ rotationDirection }}
        variants={isStatic ? undefined : PORTFOLIO_CASE_VARIANTS}
        initial={isStatic ? false : "hidden"}
        animate={isStatic ? undefined : "visible"}
        onUpdate={(latest) => {
          if (isStatic || hasTriggeredDecorationsRef.current) return;

          const opacity = typeof latest.opacity === "number" ? latest.opacity : 0;

          if (opacity >= SCENE_OPACITY_TRIGGER_THRESHOLD) {
            hasTriggeredDecorationsRef.current = true;
            setAreDecorationsActive(true);
          }
        }}
      >
        <span className={[homeStyles.item, homeStyles.itemActive].join(" ")}>
          <span className={[homeStyles.itemVisualBounds, styles.caseVisualBounds].join(" ")}>
            <motion.span
              className={[homeStyles.glass, styles.caseGlass].join(" ")}
              initial={isStatic ? false : { opacity: 0, scale: 0.1 }}
              animate={{
                opacity: isStatic || areDecorationsActive ? 1 : 0,
                scale: isStatic || areDecorationsActive ? 1 : 0.1
              }}
              transition={{
                opacity: {
                  duration: GLASS_APPEARANCE_DURATION_SECONDS,
                  delay: areDecorationsActive ? GLASS_APPEARANCE_DELAY_SECONDS : 0,
                  ease: EXPRESSIVE_EASING
                },
                scale: {
                  type: "spring",
                  stiffness: GLASS_SCALE_STIFFNESS,
                  damping: GLASS_SCALE_DAMPING,
                  mass: GLASS_SCALE_MASS,
                  delay: areDecorationsActive ? GLASS_APPEARANCE_DELAY_SECONDS : 0
                }
              }}
            >
              <span className={homeStyles.glassHighlight} />
            </motion.span>
            <motion.span
              className={[homeStyles.hoverIcon, styles.caseSticker].join(" ")}
              initial={isStatic ? false : { opacity: 0, filter: "blur(4px)" }}
              animate={{
                opacity: isStatic || areDecorationsActive ? 1 : 0,
                filter: isStatic || areDecorationsActive ? "blur(0px)" : "blur(4px)"
              }}
              transition={{
                duration: STICKER_APPEARANCE_DURATION_SECONDS,
                delay: areDecorationsActive ? STICKER_APPEARANCE_DELAY_MS / 1000 : 0,
                ease: EXPRESSIVE_EASING
              }}
              style={{ rotate: -15 }}
            >
              <span className={homeStyles.hoverIconFrames}>
                {PORTFOLIO_STICKER_SRCS.map((stickerSrc, stickerIndex) => (
                  <Image
                    key={stickerSrc}
                    className={[
                      homeStyles.hoverIconImage,
                      stickerSrc === PUFFY_STAR_STICKER_SRC
                        ? homeStyles.hoverIconImagePuffyStar
                        : "",
                      stickerIndex === stickerFrameIndex ? homeStyles.hoverIconImageActive : ""
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    src={stickerSrc}
                    alt=""
                    width={27}
                    height={27}
                    loading="eager"
                    draggable={false}
                  />
                ))}
              </span>
            </motion.span>
            <span className={[homeStyles.itemContent, styles.caseContent].join(" ")}>
              <span className={homeStyles.itemLabel}>{PORTFOLIO_CASE.title}</span>
              <span className={homeStyles.itemMeta}>{PORTFOLIO_CASE.subtitle}</span>
            </span>
          </span>
        </span>
      </motion.span>
    </div>
  );
}

function AnimatedScene({ scene, rotationDirection }: { scene: DemoScene; rotationDirection: number }) {
  const [isActive, setIsActive] = useState(false);
  const hasTriggeredRef = useRef(false);
  const [isPresent, safeToRemove] = usePresence();

  useEffect(() => {
    if (isPresent) return;

    const timeoutId = window.setTimeout(
      safeToRemove,
      SCENE_TRANSITION_DURATION_SECONDS * 1000
    );

    return () => window.clearTimeout(timeoutId);
  }, [isPresent, safeToRemove, scene]);

  return (
    <motion.div
      className={styles.scene}
      custom={rotationDirection}
      variants={scene === "portfolio-case" ? PORTFOLIO_CASE_SCENE_VARIANTS : SCENE_VARIANTS}
      initial="hidden"
      animate="visible"
      exit="exit"
      onUpdate={(latest) => {
        if (scene === "portfolio-case") return;

        const opacity = typeof latest.opacity === "number" ? latest.opacity : 0;

        if (!hasTriggeredRef.current && opacity >= SCENE_OPACITY_TRIGGER_THRESHOLD) {
          hasTriggeredRef.current = true;
          setIsActive(true);
        }
      }}
    >
      {scene === "top-card" ? <TopCardScene isActive={isActive} /> : null}
      {scene === "short-mode" ? <ShortModeScene showShort={isActive} /> : null}
      {scene === "portfolio-case" ? (
        <PortfolioCaseScene rotationDirection={rotationDirection} />
      ) : null}
    </motion.div>
  );
}

export function PortfolioMotionDemo() {
  const prefersReducedMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [rotationDirection, setRotationDirection] = useState(1);
  const [presenceSession, setPresenceSession] = useState(0);
  const [isPlaybackActive, setIsPlaybackActive] = useState(false);
  const hasPlaybackStartedRef = useRef(false);
  const isPlaybackActiveRef = useRef(false);
  const isInPlaybackRangeRef = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const root = rootRef.current;

    function updatePlaybackState(nextIsActive: boolean) {
      if (isPlaybackActiveRef.current === nextIsActive) return;

      if (nextIsActive && hasPlaybackStartedRef.current) {
        setSceneIndex((currentIndex) => (currentIndex + 1) % DEMO_SCENES.length);
        setRotationDirection((currentDirection) => currentDirection * -1);
        setPresenceSession((currentSession) => currentSession + 1);
      }

      if (nextIsActive) {
        hasPlaybackStartedRef.current = true;
      }

      isPlaybackActiveRef.current = nextIsActive;
      setIsPlaybackActive(nextIsActive);
    }

    function handleVisibilityChange() {
      updatePlaybackState(isInPlaybackRangeRef.current && !document.hidden);
    }

    const observer = root && typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(
          ([entry]) => {
            isInPlaybackRangeRef.current = entry?.isIntersecting ?? false;
            updatePlaybackState(isInPlaybackRangeRef.current && !document.hidden);
          },
          { rootMargin: "100px 0px" }
        )
      : null;

    if (observer && root) {
      observer.observe(root);
    } else {
      const fallbackFrameId = window.requestAnimationFrame(() => {
        isInPlaybackRangeRef.current = true;
        updatePlaybackState(!document.hidden);
      });

      document.addEventListener("visibilitychange", handleVisibilityChange);
      return () => {
        window.cancelAnimationFrame(fallbackFrameId);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion || !isPlaybackActive) return;

    let timeoutId: number | null = null;

    function clearScheduledStep() {
      if (timeoutId === null) return;

      window.clearTimeout(timeoutId);
      timeoutId = null;
    }

    function scheduleNextStep() {
      clearScheduledStep();
      timeoutId = window.setTimeout(() => {
        setSceneIndex((currentIndex) => (currentIndex + 1) % DEMO_SCENES.length);
        setRotationDirection((currentDirection) => currentDirection * -1);
        scheduleNextStep();
      }, SCENE_LIFECYCLE_DURATION_MS);
    }

    scheduleNextStep();

    return () => {
      clearScheduledStep();
    };
  }, [isPlaybackActive, prefersReducedMotion]);

  if (prefersReducedMotion) {
    return (
      <div ref={rootRef} className={styles.root} data-page-reveal="" aria-hidden="true">
        <div className={styles.sceneViewport}>
          <div className={styles.scene}>
            <PortfolioCaseScene isStatic />
          </div>
        </div>
      </div>
    );
  }

  const scene = DEMO_SCENES[sceneIndex] ?? "top-card";

  return (
    <div ref={rootRef} className={styles.root} data-page-reveal="" aria-hidden="true">
      <div className={styles.sceneViewport}>
        {isPlaybackActive ? (
          <AnimatePresence key={presenceSession} mode="sync">
            <AnimatedScene key={scene} scene={scene} rotationDirection={rotationDirection} />
          </AnimatePresence>
        ) : null}
      </div>
    </div>
  );
}
