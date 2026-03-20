import { z } from "zod";

export const mediaSchema = z.object({
  kind: z.enum(["image", "video", "gif"]),
  aspectRatio: z.string().min(1).optional(),
  caption: z.string().min(1).optional(),
  src: z.string().min(1).optional(),
  placeholderToken: z.string().min(1).optional()
});

export const paragraphSectionSchema = z.object({
  type: z.literal("paragraph"),
  title: z.string().min(1).optional(),
  body: z.string().min(1)
});

export const listSectionSchema = z.object({
  type: z.literal("list"),
  title: z.string().min(1).optional(),
  items: z.array(z.string().min(1)).min(1)
});

export const mediaSectionSchema = z.object({
  type: z.literal("media"),
  media: mediaSchema
});

export const quoteSectionSchema = z.object({
  type: z.literal("quote"),
  quote: z.string().min(1),
  attribution: z.string().min(1).optional()
});

export const ctaSectionSchema = z.object({
  type: z.literal("cta"),
  label: z.string().min(1),
  href: z.string().min(1),
  body: z.string().min(1).optional()
});

export const simpleSectionSchema = z.discriminatedUnion("type", [
  paragraphSectionSchema,
  listSectionSchema,
  mediaSectionSchema,
  quoteSectionSchema,
  ctaSectionSchema
]);

export const gallerySectionSchema = z.object({
  type: z.literal("gallery"),
  title: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  layout: z.enum(["grid", "carousel"]).optional(),
  items: z.array(mediaSchema).min(1)
});

export const metricsSectionSchema = z.object({
  type: z.literal("metrics"),
  title: z.string().min(1).optional(),
  items: z
    .array(
      z.object({
        value: z.string().min(1),
        label: z.string().min(1),
        note: z.string().min(1).optional()
      })
    )
    .min(1)
});

export const timelineSectionSchema = z.object({
  type: z.literal("timeline"),
  title: z.string().min(1).optional(),
  items: z
    .array(
      z.object({
        title: z.string().min(1),
        period: z.string().min(1).optional(),
        body: z.string().min(1).optional(),
        media: mediaSchema.optional()
      })
    )
    .min(1)
});

export const twoColumnSectionSchema = z.object({
  type: z.literal("twoColumn"),
  title: z.string().min(1).optional(),
  left: z.array(simpleSectionSchema).min(1),
  right: z.array(simpleSectionSchema).min(1)
});

export const sectionSchema = z.discriminatedUnion("type", [
  paragraphSectionSchema,
  listSectionSchema,
  mediaSectionSchema,
  quoteSectionSchema,
  ctaSectionSchema,
  gallerySectionSchema,
  metricsSectionSchema,
  timelineSectionSchema,
  twoColumnSectionSchema
]);

export const homePreviewSchema = z.object({
  kind: z.enum(["image", "video", "gif"]),
  src: z.string().min(1).optional(),
  placeholderToken: z.string().min(1).optional(),
  aspectRatio: z.string().min(1),
  centered: z.boolean().optional()
});

export const workCaseSchema = z.object({
  schemaVersion: z.literal("1.0"),
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  status: z.enum(["published", "hidden"]),
  sortOrder: z.number().int(),
  summary: z.object({
    title: z.string().min(1),
    year: z.string().min(1),
    category: z.string().min(1),
    preview: homePreviewSchema
  }),
  meta: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    ogImage: z.string().min(1).optional(),
    ogType: z.enum(["article", "website"]).optional()
  }),
  sections: z.array(sectionSchema)
});
