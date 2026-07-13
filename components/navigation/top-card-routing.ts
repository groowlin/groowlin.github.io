import type { TopCardContent, TopCardVariant } from "@/lib/content/types";

export function normalizePathname(pathname: string) {
  if (pathname === "/") {
    return pathname;
  }

  return pathname.replace(/\/+$/, "") || "/";
}

export function getTopCardVariant(pathname: string, workSlugs: string[]): TopCardVariant {
  const normalizedPathname = normalizePathname(pathname);

  if (normalizedPathname === "/") {
    return "to-profile";
  }

  if (normalizedPathname === "/about") {
    return "to-home";
  }

  if (normalizedPathname.startsWith("/work/")) {
    const slug = normalizedPathname.slice("/work/".length);

    if (slug.length > 0 && !slug.includes("/") && workSlugs.includes(slug)) {
      return "to-home";
    }
  }

  return "default";
}

export function getTopCardForPathname(
  pathname: string,
  topCards: Record<TopCardVariant, TopCardContent>,
  workSlugs: string[]
) {
  return topCards[getTopCardVariant(pathname, workSlugs)];
}
