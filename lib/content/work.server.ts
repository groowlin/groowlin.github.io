import "server-only";

import path from "node:path";
import { cache } from "react";
import { parseMdxFrontmatter, listMdxFilenames, renderMdx, getContentDir } from "@/lib/content/mdx.server";
import { workFrontmatterSchema } from "@/lib/content/schemas";
import type { HomeWorkEntry, WorkCase, WorkFrontmatter } from "@/lib/content/types";

const WORK_DIR = getContentDir("work");

async function loadWorkFrontmatterByFilename(filename: string): Promise<{ filename: string; data: WorkFrontmatter }> {
  const filePath = path.join(WORK_DIR, filename);
  const { frontmatter } = await parseMdxFrontmatter(filePath, workFrontmatterSchema);
  const expectedFilename = `${frontmatter.slug}.mdx`;

  if (expectedFilename !== filename) {
    throw new Error(`MDX filename mismatch for slug \"${frontmatter.slug}\": expected \"${expectedFilename}\", got \"${filename}\"`);
  }

  return { filename, data: frontmatter };
}

const loadAllWorkFrontmatters = cache(async () => {
  const filenames = await listMdxFilenames(WORK_DIR);
  const parsed = await Promise.all(filenames.map((filename) => loadWorkFrontmatterByFilename(filename)));

  const seenSlugs = new Set<string>();

  for (const { data } of parsed) {
    if (seenSlugs.has(data.slug)) {
      throw new Error(`Duplicate work slug found: \"${data.slug}\"`);
    }

    seenSlugs.add(data.slug);
  }

  return parsed.map((item) => item.data);
});

async function getPublishedWorkFrontmatters() {
  const all = await loadAllWorkFrontmatters();
  return all.filter((item) => item.status === "published");
}

export async function getHomeWorkEntries(): Promise<HomeWorkEntry[]> {
  const published = await getPublishedWorkFrontmatters();

  return published.map((item) => ({
    label: item.title,
    year: item.year,
    category: item.category,
    href: `/work/${item.slug}`,
    preview: item.preview
  }));
}

export async function getWorkSlugs() {
  const published = await getPublishedWorkFrontmatters();
  return published.map((item) => item.slug);
}

export async function getWorkCase(slug: string): Promise<WorkCase | null> {
  const frontmatters = await loadAllWorkFrontmatters();
  const current = frontmatters.find((item) => item.slug === slug && item.status === "published");

  if (!current) {
    return null;
  }

  const filePath = path.join(WORK_DIR, `${slug}.mdx`);
  const { body } = await parseMdxFrontmatter(filePath, workFrontmatterSchema);

  return {
    slug: current.slug,
    canonical: current.canonical,
    summary: {
      title: current.title,
      year: current.year,
      category: current.category,
      preview: current.preview
    },
    meta: {
      title: current.title,
      description: current.description,
      ogImage: current.ogImage,
      ogType: current.ogType ?? "article"
    },
    content: renderMdx(body, "work")
  };
}

export async function getAllWorkCases() {
  const slugs = await getWorkSlugs();
  return Promise.all(slugs.map((slug) => getWorkCase(slug))).then((entries) => entries.filter(Boolean) as WorkCase[]);
}
