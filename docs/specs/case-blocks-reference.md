# Case Blocks Reference

This file defines all supported `sections[]` block types for case JSON files in `content/cases/*.json`.

## Shared Rule for Media
`MediaItem` fields:
- `kind` (required): `"image" | "video" | "gif"`
- `aspectRatio` (optional): if omitted, ratio is inferred from loaded media
- `src` (optional): real media URL/path
- `placeholderToken` (optional): placeholder key
- `caption` (optional): text shown under media in smaller muted style

## 1) paragraph
Required:
- `type: "paragraph"`
- `body: string`

Optional:
- `title: string`

## 2) list
Required:
- `type: "list"`
- `items: string[]` (at least 1)

Optional:
- `title: string`

## 3) media
Required:
- `type: "media"`
- `media: MediaItem`

Optional:
- none

Note:
- `title` and `body` are not supported for this block.

## 4) quote
Required:
- `type: "quote"`
- `quote: string`

Optional:
- `attribution: string`

## 5) cta
Required:
- `type: "cta"`
- `label: string`
- `href: string`

Optional:
- `body: string`

## 6) gallery
Required:
- `type: "gallery"`
- `items: MediaItem[]` (at least 1)

Optional:
- `title: string`
- `body: string`
- `layout: "grid" | "carousel"`

## 7) metrics
Required:
- `type: "metrics"`
- `items: { value: string; label: string; note?: string }[]` (at least 1)

Optional:
- `title: string`

## 8) timeline
Required:
- `type: "timeline"`
- `items: { title: string; period?: string; body?: string; media?: MediaItem }[]` (at least 1)

Optional:
- `title: string`

## 9) twoColumn
Required:
- `type: "twoColumn"`
- `left: SimpleBlock[]` (at least 1)
- `right: SimpleBlock[]` (at least 1)

Optional:
- `title: string`

Where `SimpleBlock` can be only:
- `paragraph`
- `list`
- `media`
- `quote`
- `cta`

`twoColumn` recursion is not allowed.
