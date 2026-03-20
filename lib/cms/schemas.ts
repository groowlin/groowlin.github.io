import { z } from "zod";
import { workCaseSchema } from "@/lib/content/work-schema";

export const staticPageBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("paragraph"),
    title: z.string().min(1).optional(),
    body: z.string().min(1)
  }),
  z.object({
    type: z.literal("list"),
    title: z.string().min(1).optional(),
    items: z.array(z.string().min(1)).min(1)
  }),
  z.object({
    type: z.literal("quote"),
    quote: z.string().min(1),
    attribution: z.string().min(1).optional()
  }),
  z.object({
    type: z.literal("links"),
    title: z.string().min(1).optional(),
    items: z
      .array(
        z.object({
          label: z.string().min(1),
          href: z.string().min(1)
        })
      )
      .min(1)
  })
]);

export const staticPageContentSchema = z.object({
  key: z.enum(["about", "connect"]),
  meta: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    canonical: z.string().min(1),
    ogImage: z.string().min(1).optional(),
    ogType: z.enum(["website", "article"]).optional()
  }),
  blocks: z.array(staticPageBlockSchema)
});

export const siteHeaderSchema = z.object({
  identity: z.object({
    name: z.string().min(1),
    role: z.string().min(1),
    rolePrefix: z.string().min(1),
    roleCompanyLabel: z.string().min(1),
    roleCompanyHref: z.string().min(1),
    logoAlt: z.string().min(1)
  }),
  metaNav: z
    .array(
      z.object({
        label: z.string().min(1),
        href: z.string().min(1),
        section: z.literal("meta")
      })
    )
    .min(1)
});

export const siteMetadataSettingsSchema = z.object({
  siteUrl: z.string().url(),
  siteName: z.string().min(1),
  defaultTitle: z.string().min(1),
  titleTemplate: z.string().min(1),
  defaultDescription: z.string().min(1),
  defaultOgImage: z.string().min(1).or(z.literal("")).optional(),
  faviconUrl: z.string().min(1).or(z.literal("")).optional(),
  robotsIndexByDefault: z.boolean()
});

export const createCaseSchema = z.object({
  payload: workCaseSchema
});

export const updateCaseSchema = z.object({
  payload: workCaseSchema
});

export const reorderCasesSchema = z.object({
  ids: z.array(z.string().uuid()).min(1)
});

export const previewTokenRequestSchema = z.object({
  entityType: z.literal("case"),
  entityId: z.string().uuid()
});
