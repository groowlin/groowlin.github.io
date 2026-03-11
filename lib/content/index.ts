import { getCmsAdapter } from "@/lib/content/adapter";
import {
  connectLinks,
  explorationItems,
  featureLinks,
  homeWorkEntries,
  iconDesignItems,
  metaNav,
  phaseOneRouteManifest,
  redirectRules,
  siteIdentity,
  staticPageMeta,
  workSlugs
} from "@/lib/content/schema";

export {
  connectLinks,
  explorationItems,
  featureLinks,
  homeWorkEntries,
  iconDesignItems,
  metaNav,
  phaseOneRouteManifest,
  redirectRules,
  siteIdentity,
  staticPageMeta,
  workSlugs
};

export function getAllWorkCases() {
  return getCmsAdapter().getWorkCases();
}

export function getWorkCase(slug: string) {
  return getCmsAdapter().getWorkCaseBySlug(slug);
}
