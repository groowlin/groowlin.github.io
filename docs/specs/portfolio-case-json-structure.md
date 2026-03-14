# Portfolio Case JSON Structure

## 1. Purpose
Define a single JSON-based source of truth for:
- case item rendering on `/`
- case content rendering on `/work/[slug]`

## 2. Storage
- Directory: `content/cases`
- File pattern: `${slug}.json`
- `index.json` is not used.

## 3. Loading and Validation
- Cases are loaded server-side from filesystem (`fs`) at build/runtime on server.
- Every file is validated with Zod.
- Unknown fields are stripped by schema parsing.
- All cases are sorted by `sortOrder` ascending.
- `id` and `slug` must be unique across all files.

## 4. Publication Rules
- `status` supports:
  - `published`
  - `hidden`
- `hidden` cases:
  - do not appear on `/`
  - return 404 on `/work/[slug]`

## 5. Root Contract
```json
{
  "schemaVersion": "1.0",
  "id": "case_linear_navigation_2025",
  "slug": "linear-26",
  "status": "published",
  "sortOrder": 20,
  "summary": {
    "title": "Linear Navigation",
    "year": "2025",
    "category": "Product and interaction design",
    "preview": {
      "kind": "video",
      "aspectRatio": "9 / 16",
      "src": "/media/work/linear-navigation/preview.mp4",
      "placeholderToken": "linear-nav-preview",
      "centered": true
    }
  },
  "meta": {
    "title": "Linear Navigation",
    "description": "Case study about navigation redesign.",
    "ogImage": "/media/work/linear-navigation/og.jpg",
    "ogType": "article"
  },
  "sections": []
}
```

## 6. `summary` Usage
- Home list item is derived from:
  - `summary.title`
  - `summary.year`
  - `summary.category`
  - `summary.preview`
- Home subtitle in UI is assembled from `summary.year` + `summary.category`.
- Home item URL is generated as `/work/${slug}`.

## 7. `meta` Usage
- `meta.title` and `meta.description` are required.
- Canonical URL is computed in code: `/work/${slug}`.

## 8. Media Contract
Media object fields:
- `kind`: `"image" | "video" | "gif"`
- `aspectRatio?`: optional, inferred automatically for case-section media when omitted
- `src?`: optional real media URL/path
- `placeholderToken?`: optional placeholder key
- `caption?`: optional caption

Render behavior:
- if `src` exists, render real media
- otherwise render placeholder based on `placeholderToken`

## 9. Section Blocks (`sections`)
Supported section types:
- `paragraph`
- `media`
- `list`
- `quote`
- `cta`
- `gallery`
- `metrics`
- `timeline`
- `twoColumn`

Detailed block contract reference:
- `docs/specs/case-blocks-reference.md`

### `gallery`
```json
{
  "type": "gallery",
  "title": "Reference snapshots",
  "layout": "grid",
  "items": [{ "kind": "image", "aspectRatio": "16 / 10", "placeholderToken": "snap-1" }]
}
```

### `metrics`
```json
{
  "type": "metrics",
  "title": "Outcomes",
  "items": [{ "value": "34%", "label": "Faster task setup", "note": "vs baseline" }]
}
```

### `timeline`
```json
{
  "type": "timeline",
  "title": "Milestones",
  "items": [{ "title": "Prototype convergence", "period": "Week 2-3", "body": "Merged patterns." }]
}
```

### `twoColumn`
`left` and `right` accept only simple blocks:
- `paragraph`
- `media`
- `list`
- `quote`
- `cta`

Example:
```json
{
  "type": "twoColumn",
  "title": "Wrap-up",
  "left": [{ "type": "paragraph", "body": "Key takeaway." }],
  "right": [{ "type": "quote", "quote": "Final insight." }]
}
```

## 10. Current Path to Types and Loader
- TS contracts: `lib/content/types.ts`
- JSON loader + Zod schema: `lib/content/work.server.ts`
