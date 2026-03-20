import "server-only";

import fs from "node:fs";
import path from "node:path";
import type { HomeWorkEntry, WorkCase } from "@/lib/content/types";
import { workCaseSchema } from "@/lib/content/work-schema";
import {
  getHomeEntriesFromDb,
  getPublishedCaseBySlugFromDb,
  getPublishedCasesFromDb,
  getPublishedSlugsFromDb
} from "@/lib/cms/db.server";
import { isCmsReadFromDbEnabled } from "@/lib/cms/env";

const CASES_DIR = path.join(process.cwd(), "content", "cases");

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

function loadCasesFromFiles() {
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

function getPublishedCasesFromFiles() {
  return loadCasesFromFiles().filter((entry) => entry.status === "published");
}

async function getPublishedCasesFromSource() {
  if (isCmsReadFromDbEnabled()) {
    return getPublishedCasesFromDb();
  }

  return getPublishedCasesFromFiles();
}

export async function getAllWorkCases() {
  return getPublishedCasesFromSource();
}

export async function getWorkCase(slug: string) {
  if (isCmsReadFromDbEnabled()) {
    return getPublishedCaseBySlugFromDb(slug);
  }

  return getPublishedCasesFromFiles().find((entry) => entry.slug === slug);
}

export async function getWorkSlugs() {
  if (isCmsReadFromDbEnabled()) {
    return getPublishedSlugsFromDb();
  }

  return getPublishedCasesFromFiles().map((entry) => entry.slug);
}

export async function getHomeWorkEntries(): Promise<HomeWorkEntry[]> {
  if (isCmsReadFromDbEnabled()) {
    return getHomeEntriesFromDb();
  }

  return getPublishedCasesFromFiles().map((entry) => ({
    label: entry.summary.title,
    year: entry.summary.year,
    category: entry.summary.category,
    href: `/work/${entry.slug}`,
    preview: entry.summary.preview
  }));
}
