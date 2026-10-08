#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const ROLE_WIDTHS = {
  body: { base: 744, retina: 1488, full: 2232 },
  short: { base: 362, retina: 724, full: 1086 },
  preview: { base: 484, retina: 968, full: null },
};
const SUPPORTED = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);

function parseArgs(argv) {
  const result = { role: "body", dryRun: false, force: false, full: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") result.dryRun = true;
    else if (arg === "--force") result.force = true;
    else if (arg === "--full") result.full = true;
    else if (arg.startsWith("--")) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
      result[key] = value;
      i += 1;
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  return result;
}

function safePart(value, label) {
  if (!value || !/^[a-z0-9][a-z0-9-]*$/i.test(value)) {
    throw new Error(`${label} must contain only letters, digits, and hyphens`);
  }
  return value;
}

function outputOptions(format) {
  if (format === "jpg" || format === "jpeg") return { format: "jpeg", options: { quality: 82, mozjpeg: true } };
  if (format === "webp") return { format, options: { quality: 82 } };
  if (format === "avif") return { format, options: { quality: 55 } };
  return { format: "png", options: { compressionLevel: 9, adaptiveFiltering: true } };
}

async function inputFiles(inputPath) {
  const absolute = path.resolve(inputPath);
  const stat = await fs.stat(absolute);
  if (stat.isFile()) return [absolute];
  if (!stat.isDirectory()) throw new Error("--input must be an image file or directory");
  const entries = await fs.readdir(absolute, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && SUPPORTED.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(absolute, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

async function ensureWritable(outputs, force) {
  if (force) return;
  const collisions = [];
  for (const output of outputs) {
    try {
      await fs.access(output.path);
      collisions.push(output.path);
    } catch {}
  }
  if (collisions.length) throw new Error(`Refusing to overwrite:\n${collisions.join("\n")}`);
}

async function writeVariant(source, output, format, dryRun) {
  if (dryRun) return null;
  let pipeline = sharp(source).rotate().resize({ width: output.width, withoutEnlargement: true });
  const codec = outputOptions(format);
  pipeline = pipeline.toFormat(codec.format, codec.options);
  await pipeline.toFile(output.path);
  const [metadata, stat] = await Promise.all([sharp(output.path).metadata(), fs.stat(output.path)]);
  return { width: metadata.width, height: metadata.height, bytes: stat.size };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.slug || !args.input) {
    throw new Error("Usage: pnpm media:prepare -- --slug <slug> --input <file|dir> --role <body|short|preview> [--name name] [--format png|jpg|webp|avif] [--full] [--dry-run] [--force]");
  }
  const slug = safePart(args.slug, "slug").toLowerCase();
  if (!ROLE_WIDTHS[args.role]) throw new Error("--role must be body, short, or preview");
  const files = await inputFiles(args.input);
  if (!files.length) throw new Error("No supported images found");
  if (args.name && files.length > 1) throw new Error("--name can only be used with one input file");

  const destination = path.resolve("public", "media", "cases", slug);
  const plans = [];
  for (const source of files) {
    const parsed = path.parse(source);
    const baseName = safePart(args.name ?? parsed.name.replace(/@2x|-full$/i, ""), "output name");
    const requestedFormat = (args.format ?? parsed.ext.slice(1)).toLowerCase().replace("jpeg", "jpg");
    if (!new Set(["png", "jpg", "webp", "avif"]).has(requestedFormat)) throw new Error(`Unsupported format: ${requestedFormat}`);
    const ext = requestedFormat === "jpg" ? ".jpg" : `.${requestedFormat}`;
    const widths = ROLE_WIDTHS[args.role];
    const variants = [
      { label: "1x", width: widths.base, path: path.join(destination, `${baseName}${ext}`) },
      { label: "2x", width: widths.retina, path: path.join(destination, `${baseName}@2x${ext}`) },
    ];
    if ((widths.full || args.full) && (args.role !== "preview" || args.full)) {
      variants.push({ label: "full", width: widths.full ?? widths.retina * 2, path: path.join(destination, `${baseName}-full${ext}`) });
    }
    const [sourceMetadata, sourceStat] = await Promise.all([sharp(source).metadata(), fs.stat(source)]);
    const retina = variants.find((variant) => variant.label === "2x");
    if (!sourceMetadata.width || sourceMetadata.width < retina.width) {
      throw new Error(`${path.basename(source)} is ${sourceMetadata.width ?? "unknown"}px wide; at least ${retina.width}px is required to create a true 2x asset without upscaling`);
    }
    plans.push({ source, variants, format: requestedFormat, sourceMetadata, sourceStat });
  }

  await ensureWritable(plans.flatMap((plan) => plan.variants), args.force);
  if (!args.dryRun) await fs.mkdir(destination, { recursive: true });

  const report = [];
  for (const plan of plans) {
    const variants = [];
    for (const variant of plan.variants) {
      const result = await writeVariant(plan.source, variant, plan.format, args.dryRun);
      variants.push({
        label: variant.label,
        targetWidth: variant.width,
        path: path.relative(process.cwd(), variant.path).replaceAll("\\", "/"),
        ...(result ?? {}),
      });
    }
    report.push({
      source: path.relative(process.cwd(), plan.source).replaceAll("\\", "/"),
      sourceWidth: plan.sourceMetadata.width,
      sourceHeight: plan.sourceMetadata.height,
      sourceBytes: plan.sourceStat.size,
      variants,
    });
  }
  console.log(JSON.stringify({ dryRun: args.dryRun, role: args.role, destination: path.relative(process.cwd(), destination).replaceAll("\\", "/"), files: report }, null, 2));
}

main().catch((error) => {
  console.error(`media:prepare: ${error.message}`);
  process.exitCode = 1;
});
