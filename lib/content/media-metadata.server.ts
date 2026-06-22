import "server-only";

import fs from "node:fs";
import path from "node:path";
import type { HomePreview, MediaAssetSource, MediaPlaceholder } from "@/lib/content/types";

interface MediaDimensions {
  width: number;
  height: number;
}

interface Mp4TrackMetadata {
  isVideo: boolean;
  dimensions: MediaDimensions | null;
}

const PUBLIC_DIR = path.join(process.cwd(), "public");
const MP4_CONTAINER_TYPES = new Set(["moov", "trak", "mdia", "minf", "stbl", "edts", "dinf", "udta", "meta"]);
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);
const localMediaMetadataCache = new Map<string, MediaDimensions | null>();
const localMediaExistenceCache = new Map<string, boolean>();

function isInternalMediaPath(src?: string): src is string {
  return Boolean(src && src.startsWith("/") && !src.startsWith("//"));
}

function toAspectRatioString({ width, height }: MediaDimensions) {
  return `${width} / ${height}`;
}

function normalizeMediaPath(src: string) {
  const [pathname] = src.split(/[?#]/, 1);
  return pathname || src;
}

function getMediaFilePath(src: string) {
  return path.join(PUBLIC_DIR, normalizeMediaPath(src).replace(/^\/+/, ""));
}

function doesInternalMediaExist(src: string) {
  const normalizedSrc = normalizeMediaPath(src);

  if (localMediaExistenceCache.has(normalizedSrc)) {
    return localMediaExistenceCache.get(normalizedSrc) ?? false;
  }

  const exists = fs.existsSync(getMediaFilePath(normalizedSrc));
  localMediaExistenceCache.set(normalizedSrc, exists);
  return exists;
}

function isFinitePositiveNumber(value: number) {
  return Number.isFinite(value) && value > 0;
}

function hasUsableDimensions(value: MediaDimensions | null | undefined): value is MediaDimensions {
  return Boolean(value && isFinitePositiveNumber(value.width) && isFinitePositiveNumber(value.height));
}

function parseSvgLength(rawValue: string | undefined) {
  if (!rawValue) {
    return null;
  }

  const match = rawValue.trim().match(/^([+-]?\d*\.?\d+)/);
  if (!match?.[1]) {
    return null;
  }

  const value = Number.parseFloat(match[1]);
  return isFinitePositiveNumber(value) ? value : null;
}

function readPngDimensions(buffer: Buffer): MediaDimensions | null {
  if (buffer.length < 24) {
    return null;
  }

  const pngSignature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== pngSignature) {
    return null;
  }

  const chunkType = buffer.subarray(12, 16).toString("ascii");
  if (chunkType !== "IHDR") {
    return null;
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function readSvgDimensions(source: string): MediaDimensions | null {
  const svgTagMatch = source.match(/<svg\b[^>]*>/i);
  if (!svgTagMatch) {
    return null;
  }

  const tag = svgTagMatch[0];
  const width = parseSvgLength(tag.match(/\bwidth\s*=\s*["']([^"']+)["']/i)?.[1]);
  const height = parseSvgLength(tag.match(/\bheight\s*=\s*["']([^"']+)["']/i)?.[1]);

  if (width && height) {
    return { width, height };
  }

  const viewBoxMatch = tag.match(/\bviewBox\s*=\s*["']([^"']+)["']/i)?.[1];
  if (!viewBoxMatch) {
    return null;
  }

  const parts = viewBoxMatch
    .trim()
    .split(/[\s,]+/)
    .map((value) => Number.parseFloat(value));

  if (parts.length !== 4) {
    return null;
  }

  const [, , viewBoxWidth, viewBoxHeight] = parts;
  if (!isFinitePositiveNumber(viewBoxWidth) || !isFinitePositiveNumber(viewBoxHeight)) {
    return null;
  }

  return {
    width: viewBoxWidth,
    height: viewBoxHeight
  };
}

function readMp4TrackMetadata(buffer: Buffer, start: number, end: number): Mp4TrackMetadata | null {
  let offset = start;
  let trackIsVideo = false;
  let trackHeaderDimensions: MediaDimensions | null = null;

  while (offset + 8 <= end) {
    const size32 = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");

    let headerSize = 8;
    let atomSize = size32;

    if (size32 === 1) {
      if (offset + 16 > end) {
        return null;
      }

      atomSize = Number(buffer.readBigUInt64BE(offset + 8));
      headerSize = 16;
    } else if (size32 === 0) {
      atomSize = end - offset;
    }

    if (atomSize < headerSize) {
      return null;
    }

    const contentStart = offset + headerSize;
    const contentEnd = offset + atomSize;

    if (contentEnd > end) {
      return null;
    }

    if (type === "hdlr" && contentStart + 12 <= contentEnd) {
      trackIsVideo = buffer.subarray(contentStart + 8, contentStart + 12).toString("ascii") === "vide";
    }

    if (type === "tkhd") {
      const version = buffer.readUInt8(contentStart);
      const fixedOffset = version === 1 ? 88 : 76;

      if (contentStart + fixedOffset + 8 <= contentEnd) {
        trackHeaderDimensions = {
          width: buffer.readUInt32BE(contentStart + fixedOffset) / 65536,
          height: buffer.readUInt32BE(contentStart + fixedOffset + 4) / 65536
        };
      }
    }

    if (MP4_CONTAINER_TYPES.has(type)) {
      const childStart = type === "meta" ? contentStart + 4 : contentStart;
      const nestedMetadata = readMp4TrackMetadata(buffer, childStart, contentEnd);
      if (nestedMetadata) {
        trackIsVideo ||= nestedMetadata.isVideo;
        trackHeaderDimensions ??= nestedMetadata.dimensions;
      }
    }

    offset = contentEnd;
  }

  return {
    isVideo: trackIsVideo,
    dimensions: hasUsableDimensions(trackHeaderDimensions) ? trackHeaderDimensions : null
  };
}

function readMp4Dimensions(buffer: Buffer): MediaDimensions | null {
  const metadata = readMp4TrackMetadata(buffer, 0, buffer.length);
  return metadata?.isVideo ? metadata.dimensions : null;
}

function readLocalMediaDimensions(filePath: string): MediaDimensions | null {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".svg") {
    return readSvgDimensions(fs.readFileSync(filePath, "utf8"));
  }

  if (extension === ".png") {
    return readPngDimensions(fs.readFileSync(filePath));
  }

  if (extension === ".mp4") {
    return readMp4Dimensions(fs.readFileSync(filePath));
  }

  return null;
}

export function getLocalMediaDimensions(src?: string): MediaDimensions | null {
  if (!isInternalMediaPath(src)) {
    return null;
  }

  const normalizedSrc = normalizeMediaPath(src);

  if (localMediaMetadataCache.has(normalizedSrc)) {
    return localMediaMetadataCache.get(normalizedSrc) ?? null;
  }

  const filePath = getMediaFilePath(normalizedSrc);

  if (!fs.existsSync(filePath)) {
    localMediaMetadataCache.set(normalizedSrc, null);
    return null;
  }

  const dimensions = readLocalMediaDimensions(filePath);
  localMediaMetadataCache.set(normalizedSrc, dimensions);
  return dimensions;
}

function getDerivedImageVariantPath(src: string, suffix: "@2x" | "-full") {
  const normalizedSrc = normalizeMediaPath(src);
  const extension = path.extname(normalizedSrc);

  if (!IMAGE_EXTENSIONS.has(extension.toLowerCase())) {
    return null;
  }

  const directory = path.posix.dirname(normalizedSrc);
  const basename = path.posix.basename(normalizedSrc, extension);
  return path.posix.join(directory, `${basename}${suffix}${extension}`);
}

function getExistingDerivedImageVariant(src: string, suffix: "@2x" | "-full") {
  const variantPath = getDerivedImageVariantPath(src, suffix);
  return variantPath && doesInternalMediaExist(variantPath) ? variantPath : null;
}

function toMimeType(extension: string) {
  switch (extension.toLowerCase()) {
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    default:
      return "";
  }
}

function getVideoSources(src: string): MediaAssetSource[] {
  const normalizedSrc = normalizeMediaPath(src);
  const extension = path.extname(normalizedSrc).toLowerCase();
  const basePath = normalizedSrc.slice(0, normalizedSrc.length - extension.length);
  const candidates = [`${basePath}.webm`, `${basePath}.mp4`];

  return candidates
    .filter((candidate) => doesInternalMediaExist(candidate))
    .map((candidate) => ({
      src: candidate,
      type: toMimeType(path.extname(candidate))
    }));
}

function getFullVideoSources(src: string): MediaAssetSource[] {
  const normalizedSrc = normalizeMediaPath(src);
  const extension = path.extname(normalizedSrc).toLowerCase();
  const basePath = normalizedSrc.slice(0, normalizedSrc.length - extension.length);
  const candidates = [`${basePath}-full.webm`, `${basePath}-full.mp4`];

  return candidates
    .filter((candidate) => doesInternalMediaExist(candidate))
    .map((candidate) => ({
      src: candidate,
      type: toMimeType(path.extname(candidate))
    }));
}

function getMp4SourceDimensions(sources: MediaAssetSource[], fallbackSrc?: string) {
  const mp4Source = sources.find((source) => path.extname(normalizeMediaPath(source.src)).toLowerCase() === ".mp4");
  const fallbackMp4Src =
    fallbackSrc && path.extname(normalizeMediaPath(fallbackSrc)).toLowerCase() === ".mp4" ? fallbackSrc : undefined;
  const canonicalSrc = mp4Source?.src ?? fallbackMp4Src;

  return canonicalSrc ? getLocalMediaDimensions(canonicalSrc) : null;
}

function hydrateDerivedMediaFields(src: string, kind: MediaPlaceholder["kind"] | HomePreview["kind"]) {
  if (kind === "video") {
    const videoSources = getVideoSources(src);
    const fullVideoSources = getFullVideoSources(src);
    const dimensions = getMp4SourceDimensions(videoSources, src) ?? getMp4SourceDimensions(fullVideoSources);

    return {
      dimensions,
      srcSet: undefined,
      fullSrc: undefined,
      fullDimensions: undefined,
      videoSources,
      fullVideoSources
    };
  }

  const dimensions = getLocalMediaDimensions(src);
  const retinaSrc = getExistingDerivedImageVariant(src, "@2x");
  const fullSrc = getExistingDerivedImageVariant(src, "-full");
  const fullDimensions = fullSrc ? getLocalMediaDimensions(fullSrc) : null;

  return {
    dimensions,
    srcSet: retinaSrc ? `${src} 1x, ${retinaSrc} 2x` : undefined,
    fullSrc,
    fullDimensions,
    videoSources: undefined,
    fullVideoSources: undefined
  };
}

export function hydrateMediaPlaceholder<T extends MediaPlaceholder>(media: T): T {
  if (!media.src) {
    return media;
  }

  const { dimensions, srcSet, fullSrc, fullDimensions, videoSources, fullVideoSources } = hydrateDerivedMediaFields(
    media.src,
    media.kind
  );

  return {
    ...media,
    aspectRatio: media.aspectRatio ?? (hasUsableDimensions(dimensions) ? toAspectRatioString(dimensions) : media.aspectRatio),
    intrinsicWidth: media.intrinsicWidth ?? dimensions?.width,
    intrinsicHeight: media.intrinsicHeight ?? dimensions?.height,
    srcSet: media.srcSet ?? srcSet,
    fullSrc: media.fullSrc ?? fullSrc ?? undefined,
    fullIntrinsicWidth: media.fullIntrinsicWidth ?? fullDimensions?.width,
    fullIntrinsicHeight: media.fullIntrinsicHeight ?? fullDimensions?.height,
    videoSources: media.videoSources ?? videoSources,
    fullVideoSources: media.fullVideoSources ?? fullVideoSources
  };
}

export function hydrateHomePreview<T extends HomePreview>(preview: T): T {
  if (!preview.src) {
    return preview;
  }

  const { dimensions, srcSet, fullSrc, fullDimensions, videoSources, fullVideoSources } = hydrateDerivedMediaFields(
    preview.src,
    preview.kind
  );

  return {
    ...preview,
    intrinsicWidth: preview.intrinsicWidth ?? dimensions?.width,
    intrinsicHeight: preview.intrinsicHeight ?? dimensions?.height,
    srcSet: preview.srcSet ?? srcSet,
    fullSrc: preview.fullSrc ?? fullSrc ?? undefined,
    fullIntrinsicWidth: preview.fullIntrinsicWidth ?? fullDimensions?.width,
    fullIntrinsicHeight: preview.fullIntrinsicHeight ?? fullDimensions?.height,
    videoSources: preview.videoSources ?? videoSources,
    fullVideoSources: preview.fullVideoSources ?? fullVideoSources
  };
}
