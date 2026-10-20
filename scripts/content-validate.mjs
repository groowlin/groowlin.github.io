#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import matter from "gray-matter";
import { classifyContentFile, validateFrontmatter } from "./content-validation.mjs";

const root = process.cwd();
const errors = [];
const warnings = [];

function report(bucket, file, message, line) {
  bucket.push(`${path.relative(root, file).replaceAll("\\", "/")}${line ? `:${line}` : ""}: ${message}`);
}

async function walk(directory, predicate = () => true) {
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(absolute, predicate));
    else if (predicate(absolute)) result.push(absolute);
  }
  return result;
}

function lineAt(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function stableJson(value) {
  if (Array.isArray(value)) return value.map(stableJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableJson(value[key])]));
  }
  return value;
}

function collectPathRefs(text) {
  const refs = [];
  const regex = /["'(=:]\s*(\/(?:media|work)\/[^\s"')}>]+)/g;
  for (const match of text.matchAll(regex)) {
    refs.push({ value: match[1].replace(/[.,;]+$/, ""), line: lineAt(text, match.index) });
  }
  return refs;
}

async function validateMdx() {
  const contentRoot = path.join(root, "content");
  const files = await walk(contentRoot, (file) => file.endsWith(".mdx"));
  const workFiles = files.filter((file) => classifyContentFile(contentRoot, file)?.type === "work");
  const workSlugs = new Set(workFiles.map((file) => path.basename(file, ".mdx")));
  const referencedMedia = new Set();

  for (const file of files) {
    const raw = await fs.readFile(file, "utf8");
    let data;
    try {
      data = matter(raw).data;
    } catch (error) {
      report(errors, file, `invalid frontmatter: ${error.message}`);
      continue;
    }
    const result = validateFrontmatter(classifyContentFile(contentRoot, file), data);
    for (const message of result.errors) report(errors, file, message);
    for (const message of result.warnings) report(warnings, file, message);

    for (const ref of collectPathRefs(raw)) {
      const clean = decodeURIComponent(ref.value.split(/[?#]/)[0]);
      if (clean.split("/").includes("..")) {
        report(errors, file, `path traversal is not allowed in '${clean}'`, ref.line);
        continue;
      }
      if (clean.startsWith("/media/")) {
        referencedMedia.add(clean);
        const absolute = path.join(root, "public", ...clean.split("/").filter(Boolean));
        try { await fs.access(absolute); }
        catch { report(errors, file, `missing media '${clean}'`, ref.line); }
      } else if (clean.startsWith("/work/")) {
        const slug = clean.slice("/work/".length).split("/")[0];
        if (slug && !workSlugs.has(slug)) report(errors, file, `internal link targets unknown work slug '${slug}'`, ref.line);
      }
    }
  }

  const casesRoot = path.join(root, "public", "media", "cases");
  try {
    const mediaFiles = await walk(casesRoot, () => true);
    for (const file of mediaFiles) {
      const publicRef = `/${path.relative(path.join(root, "public"), file).replaceAll("\\", "/")}`;
      const baseRef = publicRef.replace(/@2x(?=\.[^.]+$)|-full(?=\.[^.]+$)/, "");
      if (!referencedMedia.has(publicRef) && !referencedMedia.has(baseRef)) {
        report(warnings, file, "orphan candidate; review manually, do not delete automatically");
      }
    }
  } catch {}
}

async function validateStructures() {
  const first = path.join(root, "portfolio-structure.json");
  const second = path.join(root, "portoflio-structure.json");
  try {
    const [aRaw, bRaw] = await Promise.all([fs.readFile(first, "utf8"), fs.readFile(second, "utf8")]);
    const [a, b] = [JSON.parse(aRaw), JSON.parse(bRaw)];
    if (JSON.stringify(stableJson(a)) !== JSON.stringify(stableJson(b))) report(errors, second, "must contain the same JSON structure as portfolio-structure.json");
  } catch (error) {
    report(errors, first, `cannot compare structural JSON files: ${error.message}`);
  }
}

await validateMdx();
await validateStructures();

for (const item of warnings) console.warn(`warning: ${item}`);
for (const item of errors) console.error(`error: ${item}`);
console.log(`content:validate: ${errors.length} error(s), ${warnings.length} warning(s)`);
if (errors.length) process.exitCode = 1;
