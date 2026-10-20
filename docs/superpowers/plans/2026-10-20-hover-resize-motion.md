# Hover labels and responsive icon spacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace slow native tooltips with bottom-line names, equalize resized sidebar icon spacing, and refine the arrow and line animation.

**Architecture:** Keep the plugin's single client bundle and delegated events. CSS owns spacing/breathing/faded ends; one ResizeObserver reuses the existing WAAPI FLIP approach only for sidebar width changes. Existing data and drag behavior stay unchanged.

**Tech Stack:** Browser DOM/CSS/WAAPI/ResizeObserver, Node test runner + JSDOM, Chromium visual smoke.

## Global Constraints

- Retain the existing package name `dsh-nav-fold` and legacy localStorage keys.
- Do not touch workspaces/conversations or add dependencies.
- Restore host `title` on expand/disable; native title must not appear while collapsed.
- Reduced-motion skips position and breathing animations.
- All published screenshots use fictitious information.

---

### Task 1: Immediate hover name in bottom line

**Files:** Modify `lib/client.js:62-99,206-250`; test `test/client.test.js:140-168`.

- [ ] Add a failing test: after `pointerover` on a collapsed panel row, the center label immediately matches its `aria-label`, row `title` is absent, and `pointerout` restores the arrow. Add quick A→B hover, keyboard focus, current language update, expand/disable restoration checks.
- [ ] Run `node --test --test-name-pattern='hover' test/client.test.js` and confirm the new assertion fails because the bottom label is missing.
- [ ] Keep two alternating aria-hidden label spans in the existing toggle. Delegate `pointerover/out` and `focusin/out` to the managed navigation; on row change, populate the inactive span and cross-fade it ~90ms without delay; hide the SVG in collapsed hover. Remove injected native title when collapsed; restore original host title when expanded/disabled. Keep the toggle's accessible name unchanged.
- [ ] Run `npm test` and confirm no drag, remount, locale or cleanup regressions.

### Task 2: Equal spacing with responsive motion

**Files:** Modify `lib/client.js:8-16,101-135,206-250`; test `test/client.test.js:53-105`.

- [ ] Add a failing test that folded CSS has `column-gap: 0` plus `justify-content: space-evenly`, and a mocked ResizeObserver observes managed nav, retargets item animations on resize, disconnects on disable and skips animations under `prefers-reduced-motion`.
- [ ] Run the focused test to confirm failure from fixed-width gap layout.
- [ ] Set the folded flex row spacing as above. On ResizeObserver updates, compare last measured button rectangles with fresh rectangles and WAAPI animate only changed transforms from current on-screen position to target, canceling obsolete animations. Preserve `align-content:flex-start` to prevent flex-line stretch.
- [ ] Run `npm test`, then use Chromium narrow/wide geometry measurements and rapid resize to verify each full row's left/right and inter-icon spaces match and the icon positions move between endpoints.

### Task 3: Low-key breathable arrow and faded separator

**Files:** Modify `lib/client.js:17-45`; test `test/client.test.js:53-73`; update `README.md`, `docs/preview.html`, `docs/images/*.png`.

- [ ] Add a failing CSS regression requiring fade masks on both line ends, a low-opacity breathing keyframe on the arrow in both states and reduced-motion disabling it.
- [ ] Run the focused test and observe missing mask/breathing rules.
- [ ] Let two flex line segments grow around the center label. Apply a gradient mask fading only each outside edge, animate arrow opacity gently (~3–4s), and pause/hide it while a name is shown. Retain button focus ring and 24px hit target.
- [ ] Run `npm test`, `node --check lib/client.js`, Chromium screenshots and PNG metadata check; regenerate only synthetic README screenshots. Bump version, commit, push, publish and independently download/check the new `.tgz` when the interaction is accepted.
