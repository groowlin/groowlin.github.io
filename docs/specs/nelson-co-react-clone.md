# Nelson.co React Clone Specification

## 1. Title and Summary
A phase-based implementation of `nelson.co` on Next.js App Router with strong visual parity, Framer Motion-driven interaction behavior, and placeholder media for phase 1.

## 2. Goals and Success Criteria
- Deliver route-complete phase 1 clone for the approved main route set.
- Preserve key interaction patterns on home: hover tracking, liquid-glass highlight, preview panel, and spring motion.
- Maintain responsive behavior for desktop and mobile breakpoints.
- Enforce canonical redirect behavior with permanent redirects for extras/aliases.
- Keep codebase CMS-ready through typed content contracts and adapter boundary.

## 3. Scope / Out of Scope
In scope (phase 1):
- `/`, `/about`, `/connect`, `/features`, `/icon-design`, `/explorations`, and approved `/work/*` routes.
- Placeholder media and placeholder outbound URLs.
- EN-only content.

Out of scope (phase 1):
- Real media assets.
- RU localization.
- Full implementation of extra routes as unique pages.

## 4. Users and UX Flows
- Visitors browse a minimal editorial landing page with hover-preview work navigation.
- Visitors open case studies and read structured narrative blocks with media placeholders.
- Visitors navigate to profile pages (about/connect/features) with lightweight transitions.

## 5. Architecture and Components
- Framework: Next.js App Router + TypeScript.
- Motion: Framer Motion.
- Content model: typed schema under `lib/content`.
- Reusable layers:
  - `SiteShell` for common layout and identity.
  - `MotionPage` and `MotionItem` for animation primitives.
  - `MediaPlaceholderView` for image/video placeholders.
  - `WorkArticle` for structured case study rendering.
  - `HomeShowcase` for interactive landing experience.

## 6. Data Models and Schemas
- `PageMeta`
- `NavEntry`
- `SectionBlock`
- `MediaPlaceholder`
- `RedirectRule`
- `WorkCase`

## 7. APIs and Contracts
No remote API in phase 1. Content is provided via local typed adapter:
- `CmsContentAdapter.getWorkCases()`
- `CmsContentAdapter.getWorkCaseBySlug(slug)`

Redirect contract implemented in `next.config.mjs` with permanent redirects.

## 8. Security, Privacy, and Compliance
- No analytics or tracking scripts in phase 1.
- No user input forms or data collection flows.
- Placeholder outbound links reduce accidental data transfer.

## 9. Risks, Tradeoffs, and Mitigations
- Risk: Visual drift without original assets.
  - Mitigation: preserve dimensions, rhythm, and motion profiles with placeholder components.
- Risk: Home interactivity differs across devices.
  - Mitigation: hover-gated behavior and touch-safe fallback.

## 10. Test Plan and Acceptance Criteria
- Manual route smoke for all phase 1 pages.
- Manual verification of redirect rules.
- Manual interaction checks on home hover and preview transitions.
- Build and lint pass locally.

## 11. Rollout, Observability, and Rollback
- Deploy via Vercel preview.
- Promote verified preview to production.
- Roll back by restoring previous deployment if regressions appear.

## 12. Open Questions
No high-impact open questions for phase 1.
