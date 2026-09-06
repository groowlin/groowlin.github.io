"use client";

import { useEffect } from "react";
import { getCurrentPath, trackMetricaGoal } from "@/lib/analytics/yandex-metrica";

interface PageGoalTrackerProps {
  goal: "view_home" | "view_about";
}

export function PageGoalTracker({ goal }: PageGoalTrackerProps) {
  useEffect(() => {
    trackMetricaGoal(goal, {
      page_path: getCurrentPath()
    });
  }, [goal]);

  return null;
}
