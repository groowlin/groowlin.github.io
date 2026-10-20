# Designer Portfolio (MDX + GitHub Pages)

## Local development

```bash
pnpm install
pnpm dev
```

## Checks

Run checks and existing relevant tests only for changes that can affect the build, as specified in `AGENTS.md` sections 9–10. Documentation-only and UI changes do not trigger typecheck, lint, build, tests, browser smoke tests, or visual inspection. A commit, PR, delivery, or deployment is not an additional trigger.

The following commands are references, not a mandatory checklist for every edit:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

## Content locations

- Home settings: `content/site/home.mdx`
- Top-card settings: `content/site/top-card-*.mdx`
- Static pages: `content/pages/about.mdx`
- Cases: `content/work/*.mdx`
- Media assets: `public/media/*`

## Specs

- UI contract: `design-system-spec.md`
- Case MDX contract: `docs/specs/portfolio-case-json-structure.md`
- Site/static pages contract: `docs/specs/site-and-pages-mdx-structure.md`
- MDX blocks reference: `docs/specs/case-blocks-reference.md`

Update the affected design-system sections and specifications immediately in the same change as an approved implementation change. When structure changes, synchronize both `portfolio-structure.json` and `portoflio-structure.json`. Replace superseded rules instead of leaving conflicting descriptions. See `AGENTS.md` section 12 for approval and synchronization rules.

## GitHub Pages

Deployment workflow: `.github/workflows/deploy-pages.yml`

Games use the server-side build flag `ENABLE_GAMES` (`lib/features.ts`), disabled by default. Set `ENABLE_GAMES=true` locally to enable the game experience, mascot, bootstrap and home game entries, including the planned `mini-games` item. GitHub Pages explicitly builds with `ENABLE_GAMES=false`; changing this flag requires rebuilding the static site. Game sources remain in the repository and files from `public/media/games` remain publicly accessible by direct URL.

The GitHub Pages workflow runs `node --test tests/content-validation.test.mjs` and `pnpm content:validate` before `pnpm build`. A failed regression test or content validation stops the build and artifact upload, so deployment cannot publish invalid content. The separate `.github/workflows/content-validation.yml` also runs these checks for relevant pushes and pull requests.

The validator classifies MDX files by their first directory relative to `content`: `work`, `pages`, or `site`. Checkout ancestor names such as `/home/runner/work/` do not affect classification. Work slug/canonical checks apply only to cases; pages receive required metadata checks, while site settings receive frontmatter parsing and shared media/link checks. Complete file-specific Zod schemas remain in `lib/content/schemas.ts` and are applied during the build. Regression tests cover POSIX and Windows paths, paths outside the content root, distinct content rules, and CLI execution under `work/pages` checkout ancestors.

The agent check policy above does not require an additional local validation build or test run for UI/documentation edits; the publishing workflow runs its gate automatically.

Optional custom domain:
- set repository variable `PAGES_CNAME` (for example: `portfolio.example.com`)
- workflow will emit `out/CNAME` automatically
