"use client";

import { useEffect } from "react";
import { getCurrentPath, trackMetricaGoal, type MetricaGoalParams } from "@/lib/analytics/yandex-metrica";

interface PageGoalTrackerProps {
  goal: string;
  params?: MetricaGoalParams;
}

export function PageGoalTracker({ goal, params }: PageGoalTrackerProps) {
  useEffect(() => {
    trackMetricaGoal(goal, {
      page_path: getCurrentPath(),
      ...params
    });
  }, [goal, params]);

  return null;
}
