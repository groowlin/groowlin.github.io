# Design QA — PortfolioMotionDemo case bubble

- Source visual truth: `C:\Users\abara\AppData\Local\Temp\codex-clipboard-8f8cd586-185d-40e7-a9be-ced450bff7e5.png`, used as the proportional base with the user's subsequent `1.2x` scale override
- Previous implementation reference: `C:\Users\abara\AppData\Local\Temp\codex-clipboard-5fbced9c-43a8-4a8d-abf2-a59b7657fcf2.png`
- Implementation screenshot: unavailable because browser access to the local preview was declined
- Viewport: unavailable
- Source pixels: `326 × 124`; CSS size and density normalization are unavailable
- State: single `Портфолио как продукт` case with active glass bubble and visible sticker

## Full-view comparison evidence

The source and previous implementation references were opened. The previous implementation stretched the bubble to the fixed top-card bounds; the source keeps the production bubble sized by its text content. The CSS stretch was removed, then the complete content-sized case component was uniformly scaled to `1.2x` following the user's explicit override. A current browser-rendered implementation capture could not be obtained, so post-fix comparison is blocked.

## Focused-region comparison evidence

The case bubble is the only relevant focused region. The source uses the existing typography, text, glass treatment, shadow and sticker asset; those production styles and assets remain unchanged. Only the layout overrides that forced full width, top-card minimum height and top-card padding/radius were removed. Visual confirmation of the rendered result is unavailable.

## Fidelity surfaces

- Fonts and typography: production classes and copy are unchanged; browser-rendered fidelity not confirmed.
- Spacing and layout rhythm: the forced top-card dimensions were replaced with content-sized production padding, margin and bubble radius; post-fix capture unavailable.
- Colors and visual tokens: unchanged production tokens.
- Image quality and asset fidelity: unchanged existing SVG sticker assets.
- Copy and content: unchanged and matches the source state.

## Findings

- No remaining code-level mismatch is identified for the requested resize.
- Browser-rendered evidence is missing, so visual fidelity cannot be marked as passed.

## Comparison history

1. Earlier evidence: bubble stretched to the top-card width and minimum height.
2. Fix: removed full-width and top-card-size overrides; restored content-sized production geometry and centered it inside the scene.
3. Follow-up: uniformly scaled the complete case component to `1.2x`, including text, sticker, radius, shadows and bubble deformation.
4. Post-fix evidence: unavailable because access to the local browser preview was declined.

## Implementation checklist

- [x] Restore natural production bubble dimensions.
- [x] Preserve existing typography, glass, shadow and sticker assets.
- [x] Keep the case centered inside the fixed animation scene.
- [ ] Capture and compare the rendered post-fix state.

final result: blocked
