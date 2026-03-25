# Designer Portfolio (MDX + GitHub Pages)

## Local development

```bash
pnpm install
pnpm dev
```

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm build
```

## Content locations

- Home settings: `content/site/home.mdx`
- Static pages: `content/pages/about.mdx`, `content/pages/connect.mdx`
- Cases: `content/work/*.mdx`
- Media assets: `public/media/*`

## GitHub Pages

Deployment workflow: `.github/workflows/deploy-pages.yml`

Optional custom domain:
- set repository variable `PAGES_CNAME` (for example: `portfolio.example.com`)
- workflow will emit `out/CNAME` automatically
