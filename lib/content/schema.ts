import {
  type MediaPlaceholder,
  type NavEntry,
  type PageMeta,
  type RedirectRule,
  type SiteHeaderContent,
  type StaticPageContent
} from "@/lib/content/types";

const placeholderLink = "#";

export const siteIdentity = {
  name: "Gavin Nelson",
  role: "Designer at OpenAI",
  rolePrefix: "designer at",
  roleCompanyLabel: "OpenAI",
  roleCompanyHref: "https://openai.com",
  logoAlt: "Gavin Nelson"
};

export const metaNav: NavEntry[] = [
  { label: "About", href: "/about", section: "meta" },
  { label: "Connect", href: "/connect", section: "meta" }
];

export const defaultSiteHeaderContent: SiteHeaderContent = {
  identity: siteIdentity,
  metaNav
};

export const connectLinks: NavEntry[] = [
  { label: "Email", href: placeholderLink, section: "contact" },
  { label: "Twitter", href: placeholderLink, section: "contact" },
  { label: "GitHub", href: placeholderLink, section: "contact" },
  { label: "LinkedIn", href: placeholderLink, section: "contact" }
];

export const iconDesignItems = [
  "Codex",
  "Base",
  "Linear v2",
  "1Password",
  "Flighty",
  "Polymarket",
  "1Blocker",
  "Visual Electric",
  "GitHub Copilot",
  "Family",
  "GitHub G1",
  "Linear",
  "Matter",
  "Xdesign",
  "Startup",
  "Claquette",
  "Stops",
  "Camo",
  "Incident.io",
  "Copilot Money",
  "Emulsion",
  "Suptho",
  "GitHub Diffraction",
  "GitHub Holo",
  "GitHub Leaf",
  "GitHub Neon Nights",
  "GitHub Replace",
  "GitHub Ruby",
  "Obsidian",
  "Readwise",
  "Things",
  "VS Code",
  "Zoom",
  "Blender"
];

export const explorationItems: MediaPlaceholder[] = [
  { kind: "video", aspectRatio: "4 / 3", placeholderToken: "findershader" },
  { kind: "video", aspectRatio: "4 / 3", placeholderToken: "stretchymenu" },
  { kind: "video", aspectRatio: "4 / 3", placeholderToken: "appmesh" },
  { kind: "video", aspectRatio: "4 / 3", placeholderToken: "coverflow" },
  { kind: "image", aspectRatio: "4 / 3", placeholderToken: "mark" },
  { kind: "image", aspectRatio: "4 / 3", placeholderToken: "dock-icons" },
  { kind: "image", aspectRatio: "4 / 3", placeholderToken: "chess" },
  { kind: "image", aspectRatio: "4 / 3", placeholderToken: "basic-icons" },
  { kind: "image", aspectRatio: "1 / 1", placeholderToken: "queen" },
  { kind: "image", aspectRatio: "1 / 1", placeholderToken: "apple-pencil" },
  { kind: "image", aspectRatio: "1 / 1", placeholderToken: "mario" },
  { kind: "image", aspectRatio: "4 / 3", placeholderToken: "refraction" },
  { kind: "image", aspectRatio: "4 / 3", placeholderToken: "music" },
  { kind: "image", aspectRatio: "4 / 3", placeholderToken: "weather" },
  { kind: "image", aspectRatio: "4 / 3", placeholderToken: "communication" },
  { kind: "image", aspectRatio: "4 / 3", placeholderToken: "pearl" },
  { kind: "image", aspectRatio: "4 / 3", placeholderToken: "tools" }
];

export const phaseOneRouteManifest = [
  "/",
  "/about",
  "/connect",
  "/icon-design",
  "/explorations",
  "/work/interaction-prototypes",
  "/work/linear-26",
  "/work/linear-search",
  "/work/linear-documents",
  "/work/linear-v1",
  "/work/linear-renders",
  "/work/github-copilot",
  "/work/achievements",
  "/work/navigation-shortcuts"
] as const;

export const phaseTwoBacklog = [
  "/work/linear-interaction-moments",
  "/downloads/figma-icon",
  "/icon-design/quote",
  "RU localization and locale switcher"
] as const;

export const redirectRules: RedirectRule[] = [
  { source: "/navigation", destination: "/", permanent: true },
  { source: "/product-design", destination: "/", permanent: true },
  {
    source: "/work/linear-interaction-moments",
    destination: "/work/interaction-prototypes",
    permanent: true
  },
  { source: "/icon-design/quote", destination: "/icon-design", permanent: true },
  { source: "/downloads/figma-icon", destination: "/icon-design", permanent: true },
  {
    source: "/product-design/github-copilot",
    destination: "/work/github-copilot",
    permanent: true
  },
  {
    source: "/product-design/navigation-shortcuts",
    destination: "/work/navigation-shortcuts",
    permanent: true
  },
  {
    source: "/product-design/achievements",
    destination: "/work/achievements",
    permanent: true
  }
];

export const staticPageMeta: Record<"about" | "connect" | "iconDesign" | "explorations", PageMeta> = {
  about: {
    title: "About",
    description: "About profile page for the Nelson-inspired portfolio clone.",
    canonical: "/about"
  },
  connect: {
    title: "Connect",
    description: "Contact and profile links for the portfolio clone.",
    canonical: "/connect"
  },
  iconDesign: {
    title: "App icon design",
    description: "A curated gallery of icon design projects rendered with placeholders.",
    canonical: "/icon-design"
  },
  explorations: {
    title: "Explorations",
    description: "Miscellaneous design explorations in a masonry-style placeholder grid.",
    canonical: "/explorations"
  }
};

export const staticPageContentDefaults: Record<"about" | "connect", StaticPageContent> = {
  about: {
    key: "about",
    meta: staticPageMeta.about,
    blocks: [
      {
        type: "paragraph",
        body: "Product and interaction designer focused on visual systems, motion language, and expressive yet clear user interfaces."
      },
      {
        type: "paragraph",
        body: "This clone preserves the editorial rhythm and interaction model of the original site while using placeholder media assets for phase 1 delivery."
      },
      {
        type: "links",
        items: [{ label: "Connect", href: "/connect" }]
      }
    ]
  },
  connect: {
    key: "connect",
    meta: staticPageMeta.connect,
    blocks: [
      {
        type: "links",
        items: connectLinks.map((entry) => ({ label: entry.label, href: entry.href }))
      }
    ]
  }
};
