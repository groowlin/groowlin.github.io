"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent
} from "react";
import { PageRevealSequence } from "@/components/motion/PageRevealSequence";
import { useWorkShortSummaryState } from "@/components/sections/WorkShortSummaryToggle";
import styles from "@/components/sections/work-article-outline.module.css";

interface OutlineHeading {
  id: string;
  title: string;
  preview: string;
  top: number;
}

const HEADING_SELECTOR = "[data-work-article-root] :is(h1, h2, h3)";
const PAGE_TITLE_SELECTOR = "header h1";
const HEADING_SLUG_SEPARATOR = "-";
const HEADING_SCROLL_OFFSET = 24;
const ACTIVE_HEADING_OFFSET = 120;
const FOCUS_LINE_WIDTH = 30;
const DEFAULT_LINE_WIDTH = 8;
const WIDTH_DECAY = 0.72;
const PREVIEW_LEFT = 104;
const OUTLINE_ROW_HEIGHT = 20;
const OUTLINE_TOP_PADDING = 40;
const OUTLINE_BOTTOM_PADDING = 40;

function slugifyHeading(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[\s/]+/g, HEADING_SLUG_SEPARATOR)
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-{2,}/g, HEADING_SLUG_SEPARATOR)
    .replace(/^-+|-+$/g, "");
}

function extractPreviewText(element: HTMLElement) {
  if (element.matches(PAGE_TITLE_SELECTOR)) {
    const articleRoot = document.querySelector<HTMLElement>("[data-work-article-root]");

    if (!articleRoot) {
      return "";
    }

    let current = articleRoot.firstElementChild;

    while (current) {
      if (/^H[1-6]$/.test(current.tagName)) {
        break;
      }

      const text = current.textContent?.replace(/\s+/g, " ").trim();

      if (text) {
        return text;
      }

      current = current.nextElementSibling;
    }

    return "";
  }

  const fragments: string[] = [];
  let current = element.nextElementSibling;

  while (current) {
    if (/^H[1-3]$/.test(current.tagName)) {
      break;
    }

    const text = current.textContent?.replace(/\s+/g, " ").trim();

    if (text) {
      fragments.push(text);
    }

    if (fragments.join(" ").length >= 180) {
      break;
    }

    current = current.nextElementSibling;
  }

  return fragments.join(" ").slice(0, 180).trim();
}

function collectHeadings() {
  const pageTitle = document.querySelector<HTMLElement>(PAGE_TITLE_SELECTOR);
  const contentHeadings = Array.from(document.querySelectorAll<HTMLElement>(HEADING_SELECTOR));
  const headingElements = pageTitle ? [pageTitle, ...contentHeadings] : contentHeadings;
  const slugCounts = new Map<string, number>();

  return headingElements.reduce<OutlineHeading[]>((accumulator, element) => {
    const title = element.textContent?.replace(/\s+/g, " ").trim() ?? "";

    if (!title) {
      return accumulator;
    }

    const baseSlug = slugifyHeading(title) || "section";
    const duplicateCount = slugCounts.get(baseSlug) ?? 0;
    const nextCount = duplicateCount + 1;
    const id = duplicateCount === 0 ? baseSlug : `${baseSlug}-${nextCount}`;

    slugCounts.set(baseSlug, nextCount);
    element.id = id;

    accumulator.push({
      id,
      title,
      preview: extractPreviewText(element),
      top: 0
    });

    return accumulator;
  }, []);
}

function withHeadingPositions(headings: OutlineHeading[]) {
  return headings.map((heading) => {
    const element = document.getElementById(heading.id);
    const top = element ? window.scrollY + element.getBoundingClientRect().top : 0;

    return { ...heading, top };
  });
}

function getVisibleHeadingIds(headings: OutlineHeading[]) {
  const visibleIds = headings
    .filter((heading) => {
      const element = document.getElementById(heading.id);

      if (!element) {
        return false;
      }

      const rect = element.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    })
    .map((heading) => heading.id);

  if (visibleIds.length > 0) {
    return visibleIds;
  }

  const currentScroll = window.scrollY + ACTIVE_HEADING_OFFSET;
  let fallbackId = headings[0]?.id ?? null;

  for (const heading of headings) {
    if (heading.top <= currentScroll) {
      fallbackId = heading.id;
      continue;
    }

    break;
  }

  return fallbackId ? [fallbackId] : [];
}

function getLineWidth(distance: number) {
  const expandedWidth =
    DEFAULT_LINE_WIDTH + (FOCUS_LINE_WIDTH - DEFAULT_LINE_WIDTH) * Math.pow(WIDTH_DECAY, distance);
  return Math.round(expandedWidth * 10) / 10;
}

function getLineOpacity(distance: number) {
  return Math.max(0.38, 1 - distance * 0.16);
}

export function WorkArticleOutline() {
  const shortSummaryState = useWorkShortSummaryState();
  const [headings, setHeadings] = useState<OutlineHeading[]>([]);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [previewTop, setPreviewTop] = useState<number | null>(null);
  const headingsRef = useRef<OutlineHeading[]>([]);
  const railRef = useRef<HTMLDivElement | null>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const rafRef = useRef<number | null>(null);
  const tooltipId = useId();
  const revealKey = shortSummaryState?.hasToggled ? shortSummaryState.displayMode : "initial";

  const hoveredHeading = useMemo(
    () => headings.find((heading) => heading.id === hoveredId) ?? null,
    [headings, hoveredId]
  );

  const focusIndex = useMemo(
    () => headings.findIndex((heading) => heading.id === hoveredId),
    [headings, hoveredId]
  );

  const previewStyle = useMemo<CSSProperties | undefined>(() => {
    if (!hoveredHeading || previewTop === null) {
      return undefined;
    }

    return {
      left: `${PREVIEW_LEFT}px`,
      top: `${previewTop}px`
    };
  }, [hoveredHeading, previewTop]);

  useEffect(() => {
    function updateHeadings() {
      const nextHeadings = withHeadingPositions(collectHeadings());
      headingsRef.current = nextHeadings;
      setHeadings(nextHeadings);
      setActiveIds(getVisibleHeadingIds(nextHeadings));
    }

    function queueUpdate() {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = window.requestAnimationFrame(() => {
        updateHeadings();
        rafRef.current = null;
      });
    }

    function updateActiveHeading() {
      setActiveIds((current) => {
        const nextIds = getVisibleHeadingIds(headingsRef.current);
        return current.length === nextIds.length && current.every((id, index) => id === nextIds[index]) ? current : nextIds;
      });
    }

    queueUpdate();

    const observer = new MutationObserver(() => {
      queueUpdate();
    });

    const root = document.querySelector("main[data-page-main]");

    if (root) {
      observer.observe(root, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }

    window.addEventListener("resize", queueUpdate);
    window.addEventListener("scroll", updateActiveHeading, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", queueUpdate);
      window.removeEventListener("scroll", updateActiveHeading);

      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  if (headings.length <= 1) {
    return null;
  }

  function scrollToHeading(id: string) {
    if (headingsRef.current[0]?.id === id) {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
      return;
    }

    const element = document.getElementById(id);

    if (!element) {
      return;
    }

    const targetTop = window.scrollY + element.getBoundingClientRect().top - HEADING_SCROLL_OFFSET;

    window.scrollTo({
      top: Math.max(targetTop, 0),
      behavior: "smooth"
    });
  }

  function updateHoveredState(id: string | null) {
    setHoveredId(id);

    if (!id) {
      setPreviewTop(null);
      return;
    }

    const trigger = triggerRefs.current[id];

    if (!trigger) {
      setPreviewTop(null);
      return;
    }

    const rect = trigger.getBoundingClientRect();
    setPreviewTop(rect.top + rect.height / 2);
  }

  function getHeadingIdFromPointer(pointerY: number) {
    const rail = railRef.current;
    const totalHeadings = headingsRef.current.length;

    if (!rail || totalHeadings === 0) {
      return null;
    }

    const rect = rail.getBoundingClientRect();
    const contentHeight = totalHeadings * OUTLINE_ROW_HEIGHT;
    const relativeY = pointerY - rect.top - OUTLINE_TOP_PADDING;
    const clampedY = Math.max(0, Math.min(relativeY, Math.max(contentHeight - 1, 0)));
    const index = Math.floor(clampedY / OUTLINE_ROW_HEIGHT);

    return headingsRef.current[index]?.id ?? null;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, id: string) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    scrollToHeading(id);
  }

  function handleRailPointerMove(event: PointerEvent<HTMLDivElement>) {
    updateHoveredState(getHeadingIdFromPointer(event.clientY));
  }

  function handleRailPointerDown(event: PointerEvent<HTMLDivElement>) {
    const id = getHeadingIdFromPointer(event.clientY);

    if (!id) {
      return;
    }

    event.preventDefault();
    updateHoveredState(id);
    scrollToHeading(id);
  }

  return (
    <PageRevealSequence key={revealKey}>
      <nav className={styles.nav} aria-label="Содержание кейса" data-page-reveal="">
      <div
        ref={railRef}
        className={styles.rail}
        onPointerMove={handleRailPointerMove}
        onPointerDown={handleRailPointerDown}
        onPointerLeave={() => updateHoveredState(null)}
      >
        <ol className={styles.list}>
          {headings.map((heading, index) => {
            const isActive = activeIds.includes(heading.id);
            const isHovered = heading.id === hoveredId;
            const distance = focusIndex === -1 ? null : Math.abs(index - focusIndex);
            const width = distance === null ? DEFAULT_LINE_WIDTH : getLineWidth(distance);
            const opacity = 1;
            const color = isHovered || isActive ? "var(--text-primary)" : "var(--color-gray-500)";

            return (
              <li key={heading.id} className={styles.item}>
                <button
                  ref={(node) => {
                    triggerRefs.current[heading.id] = node;
                  }}
                  type="button"
                  className={[styles.trigger, isActive ? styles.triggerActive : "", isHovered ? styles.triggerHovered : ""]
                    .filter(Boolean)
                    .join(" ")}
                  data-outline-id={heading.id}
                  aria-label={heading.title}
                  aria-current={isActive ? "location" : undefined}
                  aria-describedby={isHovered ? tooltipId : undefined}
                  onKeyDown={(event) => handleKeyDown(event, heading.id)}
                  onFocus={() => updateHoveredState(heading.id)}
                  onBlur={() => updateHoveredState(null)}
                >
                  <span className={styles.lineSlot}>
                    <span
                      className={styles.line}
                      aria-hidden="true"
                      style={
                        {
                          "--outline-line-width": `${width}px`,
                          "--outline-line-opacity": opacity.toString(),
                          "--outline-line-color": color
                        } as CSSProperties
                      }
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

        {hoveredHeading && previewStyle ? (
          <div id={tooltipId} className={styles.preview} role="tooltip" style={previewStyle}>
            <p className={styles.previewTitle}>{hoveredHeading.title}</p>
            {hoveredHeading.preview ? <p className={styles.previewBody}>{hoveredHeading.preview}</p> : null}
          </div>
        ) : null}
      </nav>
    </PageRevealSequence>
  );
}
