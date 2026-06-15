"use client";

import { useEffect, useRef } from "react";
import { useWorkShortSummaryState } from "@/components/sections/WorkShortSummaryToggle";
import { getCurrentPath, trackMetricaGoal } from "@/lib/analytics/yandex-metrica";

const LAST_CASE_STORAGE_KEY = "portfolio.analytics.last-case-slug";
const FULL_CASE_READ_TARGET_MS = 120_000;

interface WorkCaseAnalyticsTrackerProps {
  slug: string;
  title: string;
}

export function WorkCaseAnalyticsTracker({ slug, title }: WorkCaseAnalyticsTrackerProps) {
  const { displayMode } = useWorkShortSummaryState() ?? { displayMode: "full" as const };
  const hasTrackedScrollDepth = useRef(false);
  const hasTrackedReadTime = useRef(false);
  const accumulatedReadTimeMs = useRef(0);

  useEffect(() => {
    trackMetricaGoal("view_case", {
      case_slug: slug,
      case_title: title,
      page_path: getCurrentPath()
    });

    try {
      const previousSlug = window.sessionStorage.getItem(LAST_CASE_STORAGE_KEY);
      if (previousSlug && previousSlug !== slug) {
        trackMetricaGoal("view_second_case", {
          case_slug: slug,
          previous_case_slug: previousSlug,
          page_path: getCurrentPath()
        });
      }

      window.sessionStorage.setItem(LAST_CASE_STORAGE_KEY, slug);
    } catch {
      // Ignore unavailable session storage.
    }
  }, [slug, title]);

  useEffect(() => {
    if (displayMode !== "full" || hasTrackedScrollDepth.current) {
      return;
    }

    const onScroll = () => {
      const root = document.documentElement;
      const totalScrollableHeight = Math.max(root.scrollHeight - window.innerHeight, 1);
      const progress = window.scrollY / totalScrollableHeight;

      if (progress < 0.9) {
        return;
      }

      hasTrackedScrollDepth.current = true;
      trackMetricaGoal("case_scroll_90", {
        case_slug: slug,
        case_title: title,
        page_path: getCurrentPath()
      });
      window.removeEventListener("scroll", onScroll);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [displayMode, slug, title]);

  useEffect(() => {
    if (displayMode !== "full" || hasTrackedReadTime.current) {
      return;
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      accumulatedReadTimeMs.current += 1_000;
      if (accumulatedReadTimeMs.current < FULL_CASE_READ_TARGET_MS) {
        return;
      }

      hasTrackedReadTime.current = true;
      trackMetricaGoal("case_read_120s", {
        case_slug: slug,
        case_title: title,
        page_path: getCurrentPath()
      });
      window.clearInterval(interval);
    }, 1_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [displayMode, slug, title]);

  return null;
}
