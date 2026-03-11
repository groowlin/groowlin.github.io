import {
  type CmsContentAdapter,
  type HomeWorkEntry,
  type MediaPlaceholder,
  type NavEntry,
  type PageMeta,
  type RedirectRule,
  type SectionBlock,
  type WorkCase
} from "@/lib/content/types";

const placeholderLink = "#";

export const siteIdentity = {
  name: "Gavin Nelson",
  role: "Designer at OpenAI",
  logoAlt: "Gavin Nelson"
};

export const metaNav: NavEntry[] = [
  { label: "About", href: "/about", section: "meta" },
  { label: "Connect", href: "/connect", section: "meta" },
  { label: "Features", href: "/features", section: "meta" }
];

export const homeWorkEntries: HomeWorkEntry[] = [
  {
    label: "Interaction prototypes",
    subtitle: "Interaction design",
    year: "2024-present",
    href: "/work/interaction-prototypes",
    preview: { kind: "video", token: "pinchscrolling", aspectRatio: "9 / 16", centered: true }
  },
  {
    label: "App icon design",
    subtitle: "iOS and macOS app icons",
    year: "2020-present",
    href: "/icon-design",
    preview: { kind: "image", token: "app-icons", aspectRatio: "4 / 3" }
  },
  {
    label: "Explorations",
    subtitle: "Misc. creative exercises",
    year: "2020-present",
    href: "/explorations",
    preview: { kind: "video", token: "finder-shader", aspectRatio: "4 / 3", centered: true }
  },
  {
    label: "Linear Navigation",
    subtitle: "Product and interaction design",
    year: "2025",
    href: "/work/linear-26",
    preview: { kind: "video", token: "linear-26", aspectRatio: "9 / 16", centered: true }
  },
  {
    label: "Linear Search",
    subtitle: "Product and interaction design",
    year: "2025",
    href: "/work/linear-search",
    preview: { kind: "video", token: "linear-search", aspectRatio: "9 / 16", centered: true }
  },
  {
    label: "Linear Documents",
    subtitle: "Product and interaction design",
    year: "2024",
    href: "/work/linear-documents",
    preview: { kind: "video", token: "linear-documents", aspectRatio: "9 / 16", centered: true }
  },
  {
    label: "Linear Mobile v1.0",
    subtitle: "Product design",
    year: "2024",
    href: "/work/linear-v1",
    preview: { kind: "image", token: "linear-v1", aspectRatio: "4 / 3" }
  },
  {
    label: "Linear homepage renders",
    subtitle: "3D rendering",
    year: "2024",
    href: "/work/linear-renders",
    preview: { kind: "image", token: "linear-renders", aspectRatio: "16 / 10" }
  },
  {
    label: "GitHub Copilot",
    subtitle: "Product and interaction design",
    year: "2024",
    href: "/work/github-copilot",
    preview: { kind: "image", token: "github-copilot", aspectRatio: "16 / 10" }
  },
  {
    label: "GitHub Achievements",
    subtitle: "Interaction design",
    year: "2023",
    href: "/work/achievements",
    preview: { kind: "image", token: "achievements", aspectRatio: "16 / 10" }
  },
  {
    label: "GitHub Navigation Shortcuts",
    subtitle: "Product design",
    year: "2022",
    href: "/work/navigation-shortcuts",
    preview: { kind: "image", token: "navigation-shortcuts", aspectRatio: "16 / 10" }
  }
];

export const connectLinks: NavEntry[] = [
  { label: "Email", href: placeholderLink, section: "contact" },
  { label: "Twitter", href: placeholderLink, section: "contact" },
  { label: "GitHub", href: placeholderLink, section: "contact" },
  { label: "LinkedIn", href: placeholderLink, section: "contact" }
];

export const featureLinks: NavEntry[] = [
  {
    label: "Interview with Gavin Nelson, Lovers Magazine by Spaces",
    href: placeholderLink,
    section: "meta"
  },
  {
    label: "Dive Club podcast: Prototyping, interaction design, and SwiftUI",
    href: placeholderLink,
    section: "meta"
  },
  { label: "iOS and macOS App Icon Book", href: placeholderLink, section: "meta" },
  { label: "Workspaces #341", href: placeholderLink, section: "meta" },
  {
    label: "Interview with Gavin Nelson, Product and Icon Designer",
    href: placeholderLink,
    section: "meta"
  },
  {
    label: "Made with Sketch: How Gavin Nelson Puts the Icon in Iconic",
    href: placeholderLink,
    section: "meta"
  },
  { label: "Workspaces #136", href: placeholderLink, section: "meta" }
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
  { kind: "video", aspectRatio: "4 / 3", posterToken: "findershader" },
  { kind: "video", aspectRatio: "4 / 3", posterToken: "stretchymenu" },
  { kind: "video", aspectRatio: "4 / 3", posterToken: "appmesh" },
  { kind: "video", aspectRatio: "4 / 3", posterToken: "coverflow" },
  { kind: "image", aspectRatio: "4 / 3", posterToken: "mark" },
  { kind: "image", aspectRatio: "4 / 3", posterToken: "dock-icons" },
  { kind: "image", aspectRatio: "4 / 3", posterToken: "chess" },
  { kind: "image", aspectRatio: "4 / 3", posterToken: "basic-icons" },
  { kind: "image", aspectRatio: "1 / 1", posterToken: "queen" },
  { kind: "image", aspectRatio: "1 / 1", posterToken: "apple-pencil" },
  { kind: "image", aspectRatio: "1 / 1", posterToken: "mario" },
  { kind: "image", aspectRatio: "4 / 3", posterToken: "refraction" },
  { kind: "image", aspectRatio: "4 / 3", posterToken: "music" },
  { kind: "image", aspectRatio: "4 / 3", posterToken: "weather" },
  { kind: "image", aspectRatio: "4 / 3", posterToken: "communication" },
  { kind: "image", aspectRatio: "4 / 3", posterToken: "pearl" },
  { kind: "image", aspectRatio: "4 / 3", posterToken: "tools" }
];

const workMeta = (slug: string, title: string, description: string): PageMeta => ({
  title,
  description,
  canonical: `/work/${slug}`,
  ogType: "article"
});

const m = (kind: "image" | "video", aspectRatio: string, posterToken: string, caption?: string) =>
  ({ kind, aspectRatio, posterToken, caption }) satisfies MediaPlaceholder;

const sections = (...items: SectionBlock[]) => items;

export const workCases: WorkCase[] = [
  {
    slug: "interaction-prototypes",
    title: "Interaction prototypes",
    subtitle: "A collection of interaction experiments",
    year: "2024-present",
    category: "Interaction design",
    meta: workMeta(
      "interaction-prototypes",
      "Interaction prototypes",
      "A library of tactile interaction studies recreated with static media placeholders."
    ),
    heroMedia: m("video", "9 / 16", "interaction-hero"),
    sections: sections(
      {
        type: "paragraph",
        title: "Approach",
        body: "Each prototype explores one core motion principle: spatial mapping, gesture continuity, or velocity-aware transitions."
      },
      {
        type: "media",
        title: "Prototype reel",
        body: "In production this section renders a sequence of looping clips. Phase 1 keeps shape and rhythm with placeholders.",
        media: m("video", "9 / 16", "prototype-reel")
      },
      {
        type: "list",
        title: "Focus areas",
        items: [
          "Micro-gesture discoverability",
          "Physicality through spring easing",
          "Seamless input state handoff",
          "Readable hierarchy under motion"
        ]
      }
    )
  },
  {
    slug: "linear-26",
    title: "Linear Navigation",
    subtitle: "Reframing navigation as a fluid system",
    year: "2025",
    category: "Product and interaction design",
    meta: workMeta("linear-26", "Linear Navigation", "Navigation redesign case study with placeholder media."),
    heroMedia: m("video", "9 / 16", "linear26-hero"),
    sections: sections(
      {
        type: "paragraph",
        title: "Context",
        body: "The navigation model was updated to reduce context switching costs on mobile while preserving speed for power users."
      },
      {
        type: "media",
        title: "Persona and transition model",
        media: m("image", "16 / 10", "personas")
      },
      {
        type: "paragraph",
        title: "Solution",
        body: "The final pattern combines edge gestures, progressive disclosure, and icon semantics with lightweight spring transitions."
      },
      { type: "media", title: "Motion details", media: m("video", "9 / 16", "linear26-details") }
    )
  },
  {
    slug: "linear-search",
    title: "Linear Search",
    subtitle: "Refactoring the search entry and result model",
    year: "2025",
    category: "Product and interaction design",
    meta: workMeta("linear-search", "Linear Search", "Search overlay redesign with placeholder media."),
    heroMedia: m("video", "9 / 16", "linear-search-hero"),
    sections: sections(
      {
        type: "paragraph",
        title: "Problem",
        body: "The old flow blended navigation and search responsibilities. Users lost confidence in what mode they were in."
      },
      { type: "media", title: "Scope frame", media: m("image", "16 / 10", "linear-search-scope") },
      {
        type: "paragraph",
        title: "Solution",
        body: "A dedicated search layer clarified focus states, query intent, and result ranking while reducing interaction overhead."
      },
      {
        type: "media",
        title: "Display options",
        media: m("video", "9 / 16", "linear-search-options")
      }
    )
  },
  {
    slug: "linear-documents",
    title: "Linear Documents",
    subtitle: "Unified comment and document workflows",
    year: "2024",
    category: "Product and interaction design",
    meta: workMeta(
      "linear-documents",
      "Linear Documents",
      "Commenting and document workflows case study with placeholder media."
    ),
    heroMedia: m("video", "9 / 16", "linear-docs-hero"),
    sections: sections(
      {
        type: "paragraph",
        title: "Opportunity",
        body: "Document discussions and task updates were fragmented. The redesign creates one coherent model across touchpoints."
      },
      { type: "media", title: "Current-state map", media: m("image", "16 / 10", "linear-docs-context") },
      {
        type: "list",
        title: "Goals",
        items: [
          "Reduce context loss during comments",
          "Align desktop and mobile interaction grammar",
          "Improve notification-to-action conversion"
        ]
      },
      { type: "media", title: "Prototype outcomes", media: m("video", "9 / 16", "linear-docs-proto") }
    )
  },
  {
    slug: "linear-v1",
    title: "Linear Mobile v1.0",
    subtitle: "Foundational mobile experience",
    year: "2024",
    category: "Product design",
    meta: workMeta("linear-v1", "Linear Mobile v1.0", "Launch narrative for Linear Mobile v1."),
    heroMedia: m("video", "16 / 9", "linear-v1-video"),
    sections: sections(
      {
        type: "paragraph",
        body: "This page in the clone keeps an intentionally spare editorial structure and centers one primary media panel."
      },
      {
        type: "cta",
        label: "Linear Mobile on the App Store",
        href: placeholderLink,
        body: "Destination is replaced with placeholder URL in phase 1."
      }
    )
  },
  {
    slug: "linear-renders",
    title: "Linear homepage renders",
    subtitle: "Making 3D visuals production-ready",
    year: "2024",
    category: "3D rendering",
    meta: workMeta("linear-renders", "Linear homepage renders", "Render process breakdown with placeholders."),
    heroMedia: m("image", "16 / 10", "linear-renders-hero"),
    sections: sections(
      {
        type: "paragraph",
        title: "Background",
        body: "This case study documents visual direction, iteration loops, and post-processing tradeoffs that led to launch quality."
      },
      {
        type: "media",
        title: "Iteration board",
        media: m("image", "16 / 10", "linear-renders-board")
      },
      {
        type: "quote",
        quote: "The best render was rarely the most complex one. It was the most legible one.",
        attribution: "Design note"
      },
      {
        type: "media",
        title: "Lighting studies",
        media: m("video", "16 / 10", "linear-renders-lighting")
      }
    )
  },
  {
    slug: "github-copilot",
    title: "GitHub Copilot",
    subtitle: "Interaction model for conversational coding assistance",
    year: "2024",
    category: "Product and interaction design",
    meta: workMeta("github-copilot", "GitHub Copilot", "Copilot interaction case study with placeholders."),
    heroMedia: m("image", "16 / 10", "copilot-hero"),
    sections: sections(
      {
        type: "paragraph",
        title: "Context",
        body: "The work focused on making Copilot feel predictable and composable inside existing developer workflows."
      },
      {
        type: "media",
        title: "Interaction layer",
        media: m("video", "16 / 10", "copilot-interaction")
      },
      {
        type: "list",
        title: "Design principles",
        items: [
          "Persistent mental model",
          "Fast context switching",
          "Low-friction input and revision"
        ]
      }
    )
  },
  {
    slug: "achievements",
    title: "GitHub Achievements",
    subtitle: "Reward loops for contribution behavior",
    year: "2023",
    category: "Interaction design",
    meta: workMeta("achievements", "GitHub Achievements", "Achievement design case study with placeholders."),
    heroMedia: m("image", "16 / 10", "achievements-hero"),
    sections: sections(
      {
        type: "paragraph",
        title: "Problem",
        body: "Users needed clearer recognition moments tied to meaningful contribution milestones."
      },
      {
        type: "paragraph",
        title: "Opportunity",
        body: "Achievements create memorable status signals while encouraging healthy engagement loops."
      },
      { type: "media", title: "Final product", media: m("image", "16 / 10", "achievements-final") }
    )
  },
  {
    slug: "navigation-shortcuts",
    title: "GitHub Navigation Shortcuts",
    subtitle: "One-tap access to your recurring workflows",
    year: "2022",
    category: "Product design",
    meta: workMeta(
      "navigation-shortcuts",
      "GitHub Navigation Shortcuts",
      "Shortcut creation and workflow design case study with placeholders."
    ),
    heroMedia: m("image", "16 / 10", "shortcuts-hero"),
    sections: sections(
      {
        type: "paragraph",
        title: "Context",
        body: "Mobile users repeatedly rebuilt the same filters every day. The workflow needed a durable shortcut primitive."
      },
      {
        type: "list",
        title: "Launch outcomes",
        items: [
          "Save active filter states as shortcuts",
          "Create shortcut from scratch",
          "Personalize iconography for scan speed"
        ]
      },
      {
        type: "media",
        title: "Shortcut anatomy",
        media: m("image", "16 / 10", "shortcuts-anatomy")
      }
    )
  }
];

export const phaseOneRouteManifest = [
  "/",
  "/about",
  "/connect",
  "/features",
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

export const staticPageMeta: Record<"about" | "connect" | "features" | "iconDesign" | "explorations", PageMeta> = {
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
  features: {
    title: "Features",
    description: "Interviews and external mentions list rendered as placeholders.",
    canonical: "/features"
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

class LocalCmsAdapter implements CmsContentAdapter {
  getWorkCases() {
    return workCases;
  }

  getWorkCaseBySlug(slug: string) {
    return workCases.find((entry) => entry.slug === slug);
  }
}

export const localCmsAdapter: CmsContentAdapter = new LocalCmsAdapter();

export const workSlugs = workCases.map((entry) => entry.slug);
