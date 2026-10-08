---
name: feature-brief-interview
description: Prepare a precise, approval-ready brief before implementing a large feature or materially changing product behavior. Use when requirements, states, motion, edge cases, or acceptance criteria need clarification; do not use for small isolated fixes.
---

# Feature Brief Interview

Inspect the current implementation, `AGENTS.md`, relevant specs, and design-system rules before asking questions. Ask only about decisions that cannot be established from those sources.

## Workflow

1. Restate the intended outcome and known constraints.
2. Identify missing decisions. Ask compact batches, prioritizing blockers.
3. Produce a brief containing:
   - problem and desired outcome;
   - current and target behavior;
   - scope and non-scope;
   - states, transitions, and failure/empty/loading states;
   - desktop/mobile and mouse/touch/keyboard behavior;
   - accessibility and reduced-motion behavior;
   - data, analytics, persistence, and privacy implications;
   - affected code, design-system sections, specs, and structural JSON;
   - observable acceptance criteria and applicable checks.
4. Mark unresolved items explicitly. Never silently choose visual or product behavior.
5. Request explicit approval of the brief before implementation.

For a large or risky feature, ask a separate read-only agent to apply `$feature-reviewer` to the approved brief before implementation. Do not treat visual review as completed unless the user performs it.
