"use client";

import dynamic from "next/dynamic";

const GamesExperience = dynamic(
  () => import("./GamesEntry").then((module) => module.GamesExperience),
  { ssr: true }
);

export function GamesExperienceEntry() {
  return <GamesExperience />;
}
