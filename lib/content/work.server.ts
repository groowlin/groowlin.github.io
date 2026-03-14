import "server-only";

import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { HomeWorkEntry, WorkCase } from "@/lib/content/types";

const CASES_DIR = path.join(process.cwd(), "content", "cases");

const mediaSchema = z.object({
  kind: z.enum(["image", "video", "gif"]),
  aspectRatio: z.string().min(1).optional(),
  caption: z.string().min(1).optional(),
  src: z.string().min(1).optional(),
  placeholderToken: z.string().min(1).optional()
});

const paragraphSectionSchema = z.object({
  type: z.literal("paragraph"),
  title: z.string().min(1).optional(),
  body: z.string().min(1)
});

const listSectionSchema = z.object({
  type: z.literal("list"),
  title: z.string().min(1).optional(),
  items: z.array(z.string().min(1)).min(1)
});

const mediaSectionSchema = z.object({
  type: z.literal("media"),
  media: mediaSchema
});

const quoteSectionSchema = z.object({
  type: z.literal("quote"),
  quote: z.string().min(1),
  attribution: z.string().min(1).optional()
});

const ctaSectionSchema = z.object({
  type: z.literal("cta"),
  label: z.string().min(1),
  href: z.string().min(1),
  body: z.string().min(1).optional()
});

const simpleSectionSchema = z.discriminatedUnion("type", [
  paragraphSectionSchema,
  listSectionSchema,
  mediaSectionSchema,
  quoteSectionSchema,
  ctaSectionSchema
]);

const gallerySectionSchema = z.object({
  type: z.literal("gallery"),
  title: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  layout: z.enum(["grid", "carousel"]).optional(),
  items: z.array(mediaSchema).min(1)
});

const metricsSectionSchema = z.object({
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

const timelineSectionSchema = z.object({
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

const twoColumnSectionSchema = z.object({
  type: z.literal("twoColumn"),
  title: z.string().min(1).optional(),
  left: z.array(simpleSectionSchema).min(1),
  right: z.array(simpleSectionSchema).min(1)
});

const sectionSchema = z.discriminatedUnion("type", [
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

const workCaseSchema = z.object({
  schemaVersion: z.literal("1.0"),
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  status: z.enum(["published", "hidden"]),
  sortOrder: z.number().int(),
  summary: z.object({
    title: z.string().min(1),
    year: z.string().min(1),
    category: z.string().min(1),
    preview: z.object({
      kind: z.enum(["image", "video", "gif"]),
      src: z.string().min(1).optional(),
      placeholderToken: z.string().min(1).optional(),
      aspectRatio: z.string().min(1),
      centered: z.boolean().optional()
    })
  }),
  meta: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    ogImage: z.string().min(1).optional(),
    ogType: z.enum(["article", "website"]).optional()
  }),
  sections: z.array(sectionSchema)
});

let cachedCases: WorkCase[] | null = null;

function parseCaseFile(filepath: string, filename: string) {
  const raw = fs.readFileSync(filepath, "utf-8");
  let json: unknown;

  try {
    json = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${filename}: ${(error as Error).message}`);
  }

  const parsed = workCaseSchema.safeParse(json);

  if (!parsed.success) {
    throw new Error(`Invalid case schema in ${filename}: ${parsed.error.message}`);
  }

  const caseData = parsed.data;
  const expectedName = `${caseData.slug}.json`;

  if (filename !== expectedName) {
    throw new Error(`Filename mismatch for slug "${caseData.slug}": expected "${expectedName}", got "${filename}"`);
  }

  return caseData;
}

function loadCases() {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && cachedCases) {
    return cachedCases;
  }

  if (!fs.existsSync(CASES_DIR)) {
    throw new Error(`Missing content directory: ${CASES_DIR}`);
  }

  const filenames = fs
    .readdirSync(CASES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const parsedCases = filenames.map((filename) => parseCaseFile(path.join(CASES_DIR, filename), filename));

  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();

  for (const entry of parsedCases) {
    if (seenIds.has(entry.id)) {
      throw new Error(`Duplicate case id "${entry.id}"`);
    }
    if (seenSlugs.has(entry.slug)) {
      throw new Error(`Duplicate case slug "${entry.slug}"`);
    }
    seenIds.add(entry.id);
    seenSlugs.add(entry.slug);
  }

  const sortedCases = parsedCases.sort((a, b) => a.sortOrder - b.sortOrder);

  if (isProduction) {
    cachedCases = sortedCases;
  }

  return sortedCases;
}

function getPublishedCases() {
  return loadCases().filter((entry) => entry.status === "published");
}

export function getAllWorkCases() {
  return getPublishedCases();
}

export function getWorkCase(slug: string) {
  return getPublishedCases().find((entry) => entry.slug === slug);
}

export function getWorkSlugs() {
  return getPublishedCases().map((entry) => entry.slug);
}

export function getHomeWorkEntries(): HomeWorkEntry[] {
  return getPublishedCases().map((entry) => ({
    label: entry.summary.title,
    year: entry.summary.year,
    category: entry.summary.category,
    href: `/work/${entry.slug}`,
    preview: entry.summary.preview
  }));
}
