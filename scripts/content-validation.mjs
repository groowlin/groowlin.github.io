import path from "node:path";

// Classify only by the first directory inside content, never by checkout ancestors.
export function classifyContentFile(contentRoot, file, pathApi = path) {
  const relative = pathApi.relative(pathApi.resolve(contentRoot), pathApi.resolve(file));
  if (!relative || pathApi.isAbsolute(relative) || relative === ".." || relative.startsWith(`..${pathApi.sep}`)) return null;
  const [directory] = relative.split(pathApi.sep);
  if (!["work", "pages", "site"].includes(directory) || !relative.endsWith(".mdx")) return null;
  return { type: directory, slug: pathApi.basename(file, ".mdx") };
}

function normalizeRoute(value) {
  if (typeof value !== "string" || value === "/") return value;
  return value.replace(/\/+$/, "");
}

// Lightweight CLI checks; complete, file-specific frontmatter schemas stay in
// lib/content/schemas.ts and are applied by the loaders during the build.
export function validateFrontmatter(content, data) {
  const errors = [];
  const warnings = [];
  if (content?.type === "work" || content?.type === "pages") {
    for (const field of ["title", "description", "canonical"]) {
      if (typeof data[field] !== "string" || !data[field].trim()) errors.push(`missing required frontmatter field '${field}'`);
    }
  }
  if (content?.type === "work") {
    if (data.slug !== content.slug) errors.push(`frontmatter slug '${data.slug ?? ""}' must match filename '${content.slug}'`);
    const expectedCanonical = `/work/${content.slug}`;
    if (normalizeRoute(data.canonical) !== expectedCanonical) errors.push(`canonical must be '${expectedCanonical}'`);
    if (typeof data.subtitle !== "string" || !data.subtitle.includes(" · ")) warnings.push("subtitle should follow 'period · role/format/status'");
  }
  return { errors, warnings };
}
