"use client";

import { useEffect, useRef } from "react";
import { useWorkShortSummaryState } from "@/components/sections/WorkShortSummaryToggle";
import { caseMeasurement } from "@/lib/analytics/case-measurement";
import { getCurrentPath, trackMetricaGoal } from "@/lib/analytics/yandex-metrica";

interface WorkCaseAnalyticsTrackerProps {
  slug: string;
  title: string;
}

export function WorkCaseAnalyticsTracker({ slug, title }: WorkCaseAnalyticsTrackerProps) {
  const { displayMode } = useWorkShortSummaryState() ?? { displayMode: "full" as const };
  const lastEntrySlug = useRef<string | null>(null);

  useEffect(() => {
    // React StrictMode effect replay is not another page entry.
    if (lastEntrySlug.current === slug) return;
    lastEntrySlug.current = slug;
    trackMetricaGoal("view_case", {
      case_slug: slug,
      case_title: title,
      page_path: getCurrentPath()
    });
    const previousSlug = caseMeasurement.visitCase(slug);
    if (previousSlug) {
      trackMetricaGoal("view_second_case", {
        case_slug: slug,
        previous_case_slug: previousSlug,
        page_path: getCurrentPath()
      });
    }
  }, [slug, title]);

  useEffect(() => {
    if (displayMode !== "full") return;

    const params = { case_slug: slug, case_title: title, page_path: getCurrentPath() };
    let pageActive = true;
    const isVisible = () => pageActive && document.visibilityState === "visible";
    const reading = caseMeasurement.readingSegment(slug, isVisible());
    const sample = (active: boolean) => {
      if (reading.sample(active)) trackMetricaGoal("case_read_120s", params);
    };
    const onVisibility = () => sample(isVisible());
    const onPageHide = () => {
      pageActive = false;
      sample(false);
    };
    const onPageShow = () => {
      pageActive = true;
      sample(isVisible());
    };
    const onScroll = () => {
      if (!isVisible()) return;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      if (height > 0 && window.scrollY / height >= 0.9 && caseMeasurement.recordScroll(slug)) {
        trackMetricaGoal("case_scroll_90", params);
      }
    };

    const interval = window.setInterval(onVisibility, 1_000);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      sample(false);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("scroll", onScroll);
    };
  }, [displayMode, slug, title]);

  return null;
}
