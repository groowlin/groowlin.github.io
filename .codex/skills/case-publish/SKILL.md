---
name: case-publish
description: Publish an already approved portfolio case and its media into this repository's MDX structure. Use after copy and assets are approved; do not rewrite the story or make visual judgments.
---

# Case Publish

Read the three case specifications referenced by `AGENTS.md`. Confirm that copy and assets are approved before writing.

## Workflow

1. Confirm slug, frontmatter, subtitle, description, canonical, status, MDX body, `shortSummary`, and media mapping.
2. For source images, run `pnpm media:prepare -- --slug <slug> --input <path> --role <body|short|preview> --dry-run`, review the mapping, then rerun without `--dry-run`.
3. Place only approved text in `content/work/<slug>.mdx`; do not creatively rewrite it.
4. Run `pnpm content:validate`.
5. If media paths, frontmatter, slug, or MDX parsing changed, follow the build-impact rules in `AGENTS.md`.

Never overwrite media unless the user explicitly authorizes it. Never remove orphan candidates automatically.
