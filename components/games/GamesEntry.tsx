"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { GameModeShell } from "./GameModeShell";
import { MascotMessage } from "./MascotMessage";
import type { MascotCopy } from "./MascotMessage";
import { createGamesSession, GAMES_SESSION_KEY, readGamesSession } from "./session";
import type { GameProgress } from "./game-logic";
import { createReactionState, hydrateReactionState, parseReactionState, reactToEvent } from "./reactions/engine";
import { pixelPerfectReactionConfig } from "./reactions/pixel-perfect";
import { mascotCopy } from "./reactions/copy";
import { calculateGameFrameTop, nextFrame, scrollToElement, scrollToPageBottom, waitForCloseExit, waitForReturnThenReveal, type ExperiencePhase } from "./experience-lifecycle";
import { clearMascotVisual, freezeMascotVisual, prepareMascotExit, resetMascot, revealMascot } from "./mascot-motion";
import styles from "./games-entry.module.css";

function subscribeDesktop(callback: () => void) {
  const media = window.matchMedia("(min-width: 768px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function getDesktopSnapshot() { return window.matchMedia("(min-width: 768px)").matches; }
function getServerDesktopSnapshot() { return false; }

const DEFAULT_MESSAGE = { title: mascotCopy.default.title, body: mascotCopy.default.body };
const REACTIONS_SESSION_KEY = "portfolio.games.reactions.v1";

export function GamesExperience() {
  const [session, setSession] = useState(createGamesSession);
  const [mascotOpen, setMascotOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<ExperiencePhase>("closed");
  const [mascotMessage, setMascotMessage] = useState<MascotCopy>({ id: "default-0", ...DEFAULT_MESSAGE });
  const [mascotHovered, setMascotHovered] = useState(false);
  const [mascotFocused, setMascotFocused] = useState(false);
  const [restoreVisual, setRestoreVisual] = useState<"waiting" | "reveal" | null>(null);
  const phaseRef = useRef<ExperiencePhase>("closed");
  const experienceRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const entryRef = useRef<HTMLButtonElement>(null);
  const entryAnchorRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<AbortController | null>(null);
  const reactionRef = useRef(createReactionState());
  const messageSequenceRef = useRef(0);
  const restoreRequestedRef = useRef(false);
  const restoreRunRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(false);
  const desktop = useSyncExternalStore(subscribeDesktop, getDesktopSnapshot, getServerDesktopSnapshot);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const restored = readGamesSession();
      const gaps = restored.games["pixel-perfect"].attempts;
      let savedReactions = null;
      try { savedReactions = parseReactionState(sessionStorage.getItem(REACTIONS_SESSION_KEY), pixelPerfectReactionConfig); }
      catch { /* Analytics can be reconstructed from valid game progress. */ }
      reactionRef.current = savedReactions?.mode === "campaign" && savedReactions.history.length === gaps.length && savedReactions.history.every((result, index) => result.gap === gaps[index])
        ? savedReactions : hydrateReactionState(gaps);
      document.documentElement.dataset.gamesOpen = String(restored.isOpen);
      setSession(restored);
      setMascotOpen(restored.isOpen);
      restoreRequestedRef.current = restored.isOpen;
      if (restored.isOpen) {
        setRestoreVisual("waiting");
      }
      phaseRef.current = restored.isOpen ? "open" : "closed";
      setPhase(phaseRef.current);
      setReady(true);
    });
    return () => {
      cancelled = true;
      mountedRef.current = false;
      interactionRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!ready || !desktop || !restoreRequestedRef.current || restoreRunRef.current) return;
    const controller = new AbortController();
    restoreRunRef.current = controller;
    interactionRef.current?.abort();
    interactionRef.current = controller;
    const { signal } = controller;
    const frame = panelRef.current?.querySelector<HTMLElement>("[data-game-frame]") ?? null;

    void (async () => {
      try {
        await waitForScrollRestoration(signal);
        positionGameFrame(panelRef.current, messageRef.current, frame);
        setMascotHovered(false);
        setMascotFocused(false);
        frame?.style.setProperty("--games-frame-progress", "0");
        frame?.style.setProperty("--games-frame-scale-progress", "0");
        setRestoreVisual("reveal");
        await nextFrame(signal);
        const frameReveal = animateGameFrame(frame, 1, Boolean(reducedMotion), signal, () => {
          frame?.style.removeProperty("opacity");
        });
        void frameReveal.settled.catch(() => {});
        await frameReveal.settled;
        restoreRequestedRef.current = false;
        if (mountedRef.current) setRestoreVisual(null);
      } catch (error) {
        normalizeRestoredOpen(frame);
        restoreRequestedRef.current = false;
        if (mountedRef.current) {
          setMascotOpen(true);
          setRestoreVisual(null);
        }
        if (!(error instanceof DOMException && error.name === "AbortError")) throw error;
      } finally {
        if (interactionRef.current === controller) interactionRef.current = null;
        if (restoreRunRef.current === controller) restoreRunRef.current = null;
      }
    })();

    return () => controller.abort();
  }, [desktop, ready]);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.gamesOpen = String(session.isOpen);
    try { sessionStorage.setItem(GAMES_SESSION_KEY, JSON.stringify(session)); }
    catch { /* Runtime stays usable when browser storage is unavailable. */ }
  }, [ready, session]);

  useEffect(() => {
    if (!ready || desktop) return;
    interactionRef.current?.abort();
    const frame = panelRef.current?.querySelector<HTMLElement>("[data-game-frame]");
    const stableProgress = session.isOpen ? "1" : "0";
    frame?.style.setProperty("--games-frame-progress", stableProgress);
    frame?.style.setProperty("--games-frame-scale-progress", stableProgress);
    resetMascot(entryRef.current);
    clearMascotVisual(entryRef.current);
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      phaseRef.current = session.isOpen ? "open" : "closed";
      setPhase(phaseRef.current);
    });
    return () => { cancelled = true; };
  }, [desktop, ready, session.isOpen]);

  useEffect(() => {
    if (!ready || !desktop || phase === "closed" || restoreVisual !== null) return;
    const panel = panelRef.current;
    const message = messageRef.current;
    const frame = panel?.querySelector<HTMLElement>("[data-game-frame]") ?? null;
    if (!panel || !message || !frame) return;
    let animationFrame = 0;
    const update = () => positionGameFrame(panel, message, frame);
    const scheduleUpdate = () => {
      if (animationFrame) return;
      animationFrame = requestAnimationFrame(() => {
        animationFrame = 0;
        update();
      });
    };
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(panel);
    observer.observe(message);
    observer.observe(frame);
    update();
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [desktop, phase, ready, restoreVisual]);

  function enterPhase(next: ExperiencePhase) {
    phaseRef.current = next;
    setPhase(next);
  }

  async function toggle() {
    if (!ready || !desktop || restoreVisual !== null) return;
    const isOpen = !session.isOpen;
    freezeMascotVisual(entryRef.current);
    setSession((previous) => ({ ...previous, isOpen }));
    interactionRef.current?.abort();
    const controller = new AbortController();
    interactionRef.current = controller;
    const { signal } = controller;
    const exitMascot = prepareMascotExit(entryRef.current, Boolean(reducedMotion), signal);
    const frame = panelRef.current?.querySelector<HTMLElement>("[data-game-frame]") ?? null;
    try {
      if (isOpen) {
        setMascotHovered(false);
        setMascotFocused(false);
        setMascotMessage({ id: `default-${++messageSequenceRef.current}`, ...DEFAULT_MESSAGE });
        enterPhase("scrolling");
        let mascotExit: Promise<void> = Promise.resolve();
        let frameReveal: FrameSpringRun = resolvedFrameSpring();
        const scroll = scrollToPageBottom(Boolean(reducedMotion), signal, () => {
          prepareOpeningGameFrame(panelRef.current, messageRef.current, frame);
          mascotExit = exitMascot();
          void mascotExit.catch(() => {});
          enterPhase("opening");
          frameReveal = animateGameFrame(frame, 1, Boolean(reducedMotion), signal);
          void frameReveal.settled.catch(() => {});
        });
        await scroll;
        const mascotReveal = Promise.all([mascotExit, frameReveal.targetReached]).then(async () => {
          if (signal.aborted) throw new DOMException("Games interaction cancelled", "AbortError");
          setMascotOpen(true);
          await nextFrame(signal);
          clearMascotVisual(entryRef.current);
          await revealMascot(entryRef.current, Boolean(reducedMotion), signal);
        });
        void mascotReveal.catch(() => {});
        await Promise.all([frameReveal.settled, mascotReveal]);
        enterPhase("open");
      } else {
        enterPhase("closing");
        const mascotExit = exitMascot();
        const frameExit = animateGameFrameClose(frame, Boolean(reducedMotion), signal);
        void mascotExit.catch(() => {});
        void frameExit.catch(() => {});
        await waitForCloseExit(() => mascotExit, () => frameExit);
        setMascotOpen(false);
        await nextFrame(signal);
        clearMascotVisual(entryRef.current);
        enterPhase("returning");
        await waitForReturnThenReveal(
          () => scrollToElement(entryAnchorRef.current, "end", Boolean(reducedMotion), signal),
          () => revealMascot(entryRef.current, Boolean(reducedMotion), signal)
        );
        enterPhase("closed");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) throw error;
    } finally {
      if (interactionRef.current === controller) interactionRef.current = null;
    }
  }

  function updateProgress(progress: GameProgress) {
    if (progress.attempts.length === 0) {
      reactionRef.current = createReactionState();
      persistReactions();
    }
    setSession((previous) => ({ ...previous, games: { ...previous.games, "pixel-perfect": progress } }));
  }

  function persistReactions() {
    try { sessionStorage.setItem(REACTIONS_SESSION_KEY, JSON.stringify(reactionRef.current)); }
    catch { /* Reactions remain usable in memory when storage is disabled. */ }
  }

  function handleResult(outcome: "failure" | "win" | "out-of-bounds" | "overlap", gap?: number) {
    if (outcome !== "out-of-bounds" && outcome !== "overlap" && gap === undefined) return;
    const event = outcome === "out-of-bounds" || outcome === "overlap" ? { type: outcome } : { type: "attempt" as const, gap: gap! };
    const next = reactToEvent(reactionRef.current, event, pixelPerfectReactionConfig);
    reactionRef.current = next.state;
    persistReactions();
    if (next.reply) setMascotMessage({ ...next.reply, id: `${next.reply.id}-${++messageSequenceRef.current}` });
  }

  return (
    <div ref={experienceRef} className={styles.experience} data-games-experience="" data-ready={ready} data-open={session.isOpen} data-phase={phase} data-restore-visual={restoreVisual ?? "none"}>
      <div className={styles.revealSpace} aria-hidden="true" />
      <div ref={panelRef} id="home-game-frame" className={styles.panel} inert={!ready || phase !== "open" || !desktop || restoreVisual !== null} aria-hidden={!ready || phase === "closed" || phase === "scrolling" || phase === "returning" || phase === "closing" || !desktop || restoreVisual !== null}>
        <div className={styles.panelClip}>
          <div className={styles.panelContent}>
            <GameModeShell session={session} active={ready && desktop && phase === "open" && restoreVisual === null} resetWhenHidden={!desktop || phase === "closed" || phase === "returning"} onProgress={updateProgress} onResult={handleResult} onGameChange={(currentGameId) => {
              setSession((previous) => ({ ...previous, currentGameId }));
              setMascotMessage({ id: `default-${++messageSequenceRef.current}`, ...DEFAULT_MESSAGE });
            }} />
          </div>
        </div>
      </div>
      <MascotMessage
        ref={messageRef}
        message={mascotMessage}
        active={ready && desktop && (phase === "scrolling" || phase === "opening" || phase === "open")}
        closePreview={restoreVisual === null && mascotOpen && phase === "open" && (mascotHovered || mascotFocused)}
        instantFirstEnter={restoreVisual !== null}
      />
      <div ref={entryAnchorRef} className={styles.entryAnchor}>
        <button ref={entryRef} type="button" className={styles.entry} data-mascot-open={mascotOpen} onClick={toggle} onPointerEnter={() => setMascotHovered(true)} onPointerLeave={() => setMascotHovered(false)} onPointerDown={() => setMascotFocused(false)} onFocus={(event) => setMascotFocused(event.currentTarget.matches(":focus-visible"))} onBlur={() => setMascotFocused(false)} aria-disabled={restoreVisual !== null} aria-expanded={session.isOpen} aria-controls="home-game-frame" aria-label={session.isOpen ? "Закрыть игры" : "Открыть игры"}>
          <Image className={styles.defaultImage} src="/media/games/games-default.png" width={125} height={72} alt="" loading="eager" unoptimized />
          <Image className={`${styles.hoverImage} ${styles.openHoverImage}`} data-mascot-hover="" src="/media/games/games-hover.png" width={125} height={72} alt="" loading="eager" unoptimized />
          <Image className={`${styles.hoverImage} ${styles.closeHoverImage}`} data-mascot-hover="" src="/media/games/games-hover-exit.png" width={125} height={72} alt="" loading="eager" unoptimized />
        </button>
      </div>
    </div>
  );
}

function positionGameFrame(panel: HTMLElement | null, message: HTMLElement | null, frame: HTMLElement | null) {
  if (!panel || !message || !frame) return null;
  const panelRect = panel.getBoundingClientRect();
  const messageRect = message.getBoundingClientRect();
  const frameHeight = frame.offsetHeight;
  if (!panelRect.height || !frameHeight) return null;
  const top = calculateGameFrameTop(panelRect.height, messageRect.top, frameHeight, panelRect.top);
  panel.style.setProperty("--games-frame-top", `${top}px`);
  return { localTop: top };
}

function prepareOpeningGameFrame(panel: HTMLElement | null, message: HTMLElement | null, frame: HTMLElement | null) {
  positionGameFrame(panel, message, frame);
  frame?.style.removeProperty("opacity");
}

const FRAME_SPRING = {
  type: "spring" as const,
  stiffness: 100,
  damping: 14,
  mass: 1.4,
  restSpeed: 0.002,
  restDelta: 0.0002,
};

type FrameSpringRun = { targetReached: Promise<void>; settled: Promise<void> };

function resolvedFrameSpring(): FrameSpringRun {
  return { targetReached: Promise.resolve(), settled: Promise.resolve() };
}

function animateGameFrame(
  frame: HTMLElement | null,
  target: 1,
  reducedMotion: boolean,
  signal: AbortSignal,
  onFirstVisualUpdate?: () => void,
): FrameSpringRun {
  let firstVisualUpdateCommitted = false;
  const commitFirstVisualUpdate = () => {
    if (firstVisualUpdateCommitted) return;
    firstVisualUpdateCommitted = true;
    onFirstVisualUpdate?.();
  };
  if (!frame) {
    commitFirstVisualUpdate();
    return resolvedFrameSpring();
  }
  if (signal.aborted) {
    const cancelled = Promise.reject<void>(new DOMException("Games interaction cancelled", "AbortError"));
    void cancelled.catch(() => {});
    return { targetReached: cancelled, settled: cancelled };
  }
  const rawCurrent = Number.parseFloat(getComputedStyle(frame).getPropertyValue("--games-frame-progress"));
  const current = Number.isFinite(rawCurrent) ? rawCurrent : 0;
  if (reducedMotion || Math.abs(current - target) <= FRAME_SPRING.restDelta) {
    frame.style.setProperty("--games-frame-progress", String(target));
    frame.style.setProperty("--games-frame-scale-progress", String(target));
    commitFirstVisualUpdate();
    return resolvedFrameSpring();
  }
  let resolveTargetReached!: () => void;
  let rejectTargetReached!: (reason: DOMException) => void;
  let targetWasReached = current >= target;
  const targetReached = targetWasReached ? Promise.resolve() : new Promise<void>((resolve, reject) => {
    resolveTargetReached = resolve;
    rejectTargetReached = reject;
  });
  const settled = new Promise<void>((resolve, reject) => {
    let settled = false;
    let controls: ReturnType<typeof animate> | null = null;
    const cleanup = () => signal.removeEventListener("abort", cancel);
    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (!targetWasReached) {
        targetWasReached = true;
        resolveTargetReached();
      }
      frame.style.setProperty("--games-frame-progress", String(target));
      frame.style.setProperty("--games-frame-scale-progress", String(target));
      commitFirstVisualUpdate();
      resolve();
    };
    const cancel = () => {
      if (settled) return;
      settled = true;
      controls?.stop();
      cleanup();
      const error = new DOMException("Games interaction cancelled", "AbortError");
      if (!targetWasReached) rejectTargetReached(error);
      reject(error);
    };
    signal.addEventListener("abort", cancel, { once: true });
    controls = animate(current, target, {
      ...FRAME_SPRING,
      onUpdate: (value) => {
        frame.style.setProperty("--games-frame-progress", String(value));
        frame.style.setProperty("--games-frame-scale-progress", String(targetWasReached ? target : Math.max(0, Math.min(value, target))));
        commitFirstVisualUpdate();
        if (!targetWasReached && value >= target) {
          targetWasReached = true;
          frame.style.setProperty("--games-frame-scale-progress", String(target));
          resolveTargetReached();
        }
      },
      onComplete: finish,
    });
  });
  return { targetReached, settled };
}

const FRAME_CLOSE_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

async function animateGameFrameClose(frame: HTMLElement | null, reducedMotion: boolean, signal: AbortSignal): Promise<void> {
  if (!frame) return;
  if (signal.aborted) throw new DOMException("Games interaction cancelled", "AbortError");
  if (reducedMotion) {
    frame.style.opacity = "0";
    frame.style.setProperty("--games-frame-progress", "0");
    frame.style.setProperty("--games-frame-scale-progress", "0");
    return;
  }
  await Promise.all([
    playFrameAnimation(frame, [
      { transform: "translateX(0)" },
      { transform: "translateX(-6px)", offset: 0.25 },
      { transform: "translateX(6px)", offset: 0.58 },
      { transform: "translateX(-3px)", offset: 0.8 },
      { transform: "translateX(0)" },
    ], { duration: 400, easing: FRAME_CLOSE_EASING }, signal),
    playFrameAnimation(frame, [
      { opacity: getComputedStyle(frame).opacity },
      { opacity: "0" },
    ], { duration: 280, easing: FRAME_CLOSE_EASING }, signal, () => {
      frame.style.opacity = "0";
    }),
  ]);
  frame.style.opacity = "0";
  frame.style.setProperty("--games-frame-progress", "0");
  frame.style.setProperty("--games-frame-scale-progress", "0");
}

function playFrameAnimation(
  frame: HTMLElement,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
  signal: AbortSignal,
  commitFinalState?: () => void,
): Promise<void> {
  if (signal.aborted) return Promise.reject(new DOMException("Games interaction cancelled", "AbortError"));
  return new Promise<void>((resolve, reject) => {
    const animation = frame.animate(keyframes, options);
    let settled = false;
    const cleanup = () => signal.removeEventListener("abort", cancel);
    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      commitFinalState?.();
      animation.cancel();
      resolve();
    };
    const cancel = () => {
      if (settled) return;
      settled = true;
      animation.cancel();
      cleanup();
      reject(new DOMException("Games interaction cancelled", "AbortError"));
    };
    animation.addEventListener("finish", finish, { once: true });
    animation.addEventListener("cancel", cancel, { once: true });
    signal.addEventListener("abort", cancel, { once: true });
  });
}

function waitForScrollRestoration(signal: AbortSignal): Promise<void> {
  if (document.documentElement.dataset.scrollRestoration !== "pending") return Promise.resolve();
  if (signal.aborted) return Promise.reject(new DOMException("Games restore cancelled", "AbortError"));
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      window.removeEventListener("app:scroll-restored", finish);
      signal.removeEventListener("abort", cancel);
    };
    const finish = () => { cleanup(); resolve(); };
    const cancel = () => { cleanup(); reject(new DOMException("Games restore cancelled", "AbortError")); };
    window.addEventListener("app:scroll-restored", finish, { once: true });
    signal.addEventListener("abort", cancel, { once: true });
  });
}

function normalizeRestoredOpen(frame: HTMLElement | null) {
  frame?.style.removeProperty("opacity");
  frame?.style.setProperty("--games-frame-progress", "1");
  frame?.style.setProperty("--games-frame-scale-progress", "1");
}
