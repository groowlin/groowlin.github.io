import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { z } from "zod";
import { getMdxComponents } from "@/lib/content/mdx-components";

const CONTENT_DIR = path.join(process.cwd(), "content");

export function getContentDir(...segments: string[]) {
  return path.join(CONTENT_DIR, ...segments);
}

export async function listMdxFilenames(dir: string) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

export async function readMdxSource(filePath: string) {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read MDX file at ${filePath}: ${reason}`);
  }
}

export async function parseMdxFrontmatter<T extends z.ZodTypeAny>(
  filePath: string,
  schema: T
): Promise<{ frontmatter: z.output<T>; body: string }> {
  const source = await readMdxSource(filePath);
  const parsed = matter(source);

  const result = schema.safeParse(parsed.data);

  if (!result.success) {
    throw new Error(`Invalid frontmatter in ${filePath}: ${result.error.message}`);
  }

  return {
    frontmatter: result.data,
    body: parsed.content.trim()
  };
}

export function renderMdx(body: string, variant: "default" | "work" = "default") {
  return <MDXRemote source={body} components={getMdxComponents(variant)} />;
}
