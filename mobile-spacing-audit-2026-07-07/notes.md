# Mobile Spacing Audit, 2026-07-07

## Scope
- Viewport model: 390px wide mobile screen.
- Routes reviewed from source/layout contracts: `/`, `/about`, `/work/familia`, `/work/globus`, `/work/goldenapple`, `/work/medicine`, `/work/portfoliocase`, `/work/vk`, `/work/zvuk`.
- Screenshot capture was blocked by browser security policy for `http://127.0.0.1:4123`, so this audit is source-based, not visual-screenshot-based.

## Key Layout Values
- Mobile main top padding: `40px`.
- Top card height: about `104px` (`20px` padding + `64px` avatar row + `20px` padding).
- Gap between top card and title block: `60px`.
- Gap between title block and body/list: `40px`.
- Mobile surface side padding: `16px`.
- Mobile content side padding: `32px`.

## Estimated First Content Positions
- `/about`: first body text starts at about `263px`.
- `/work/*`: first body text starts at about `283px`.
- `/`: first section title starts at about `263px`; first clickable case starts at about `322px`.

## Verdict
The mobile header area is too large for a portfolio/product case experience. The card itself is acceptable, but the accumulated vertical rhythm is heavy on mobile. The main issue is that desktop-scale title rhythm (`60px` before title, `40px` after title) is reused unchanged on mobile after a full-width top card.

## Risk
On common smaller mobile screens, the first meaningful content starts too low. This weakens orientation and makes the page feel like a profile header before it becomes a portfolio or case page.

## Stronger Direction
Keep the top card, but use a mobile-specific rhythm after it:
- reduce top-card to title gap from `60px` to around `32px`;
- reduce title to body/list gap from `40px` to around `24px` or `32px`;
- consider reducing mobile main top padding from `40px` to `24px` or `32px` if the page still feels tall.

Do not change spacing with one-off values in component CSS; update the design-system tokens first if this direction is approved.
