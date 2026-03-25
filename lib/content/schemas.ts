import { z } from "zod";

export const mediaKindSchema = z.enum(["image", "video", "gif"]);

export const homePreviewSchema = z.object({
  kind: mediaKindSchema,
  src: z.string().optional(),
  placeholderToken: z.string().optional(),
  aspectRatio: z.string().min(1),
  centered: z.boolean().optional()
});

export const homeFrontmatterSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  avatar: z.string().optional(),
  metaNav: z
    .array(
      z.object({
        label: z.string().min(1),
        href: z.string().min(1)
      })
    )
    .default([]),
  contacts: z
    .array(
      z.object({
        label: z.string().min(1),
        href: z.string().min(1)
      })
    )
    .default([]),
  seo: z.object({
    siteUrl: z.string().url(),
    siteName: z.string().min(1),
    defaultTitle: z.string().min(1),
    titleTemplate: z.string().min(1),
    defaultDescription: z.string().min(1),
    defaultOgImage: z.string().optional(),
    faviconUrl: z.string().optional(),
    robotsIndexByDefault: z.boolean().default(true)
  })
});

export const staticPageFrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  canonical: z.string().min(1)
});

export const workFrontmatterSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  year: z.string().min(1),
  category: z.string().min(1),
  status: z.enum(["published", "hidden"]),
  preview: homePreviewSchema,
  description: z.string().min(1),
  canonical: z.string().min(1),
  ogImage: z.string().optional(),
  ogType: z.enum(["article", "website"]).optional()
});
