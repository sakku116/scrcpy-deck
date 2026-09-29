# Dashboard visual refresh

## Intent
Make the **actual device dashboard** visibly more deliberate after the accessibility-only wizard refactor. Reading this as a brand-preserving local device tool: teal, calm, practical; variance 5, motion 3, density 4. Apply redesign-preservation principles, not landing-page hero, photography, or asset rules (dashboards and wizards are outside that skill's Section 13 scope). **Implement immediately after this plan; no approval gate.**

## Scope and baseline
- **In:** header branding alignment; no-device empty state and persistent Add device card; wireless dialog layout. Allowed production edits only: `src/app/chrome/AppHeader.ts`, `src/app/wizard/WirelessWizard.ts`, `src/style/chrome.css`, `src/style/devicelist.css`, `src/style/wizard.css`, plus `src/style/theme.css` only for light-theme contrast calibration found during visual QA. Allowed test edit: `tests/wireless-wizard.test.cjs`. Inherited markup/CSS remain read-only. No other files.
- **Out:** backend, adb/USB, REST shapes, navigation/text/flow rewrite, new design system or dependency, photography, fake device previews, inherited ws-scrcpy CSS, mirror/player surfaces. Do not change the `AppHeader.mount()` or `WirelessWizard.open()` interface; keep the logo, copy, and two flow buttons.
- **Working tree:** `refactor/wireless-wizard-accessibility` contains uncommitted wizard/dialog changes and pre-existing untracked files. Build on those changes, not `HEAD`; preserve `AGENTS.md`, `ScrcpyDeck*.zip`, existing tests and plan. No commits, deletes, app/backend launch, install, dist, build-exe, or clean.

## Visible before / after
| Surface | Before | After |
| --- | --- | --- |
| Header | Brand centered in fixed 64px bar | Same logo/wordmark and bar, **left-aligned** to the device-list 760px content edge; clear page anchor without new navigation or copy. |
| No devices | Tall centered dashed button (88px vertical padding), muted action | **Solid surfaced empty-state composition**: left-aligned title and hint, right-aligned teal Add device action within the same single button. At narrow widths action moves below copy, left aligned. Distinct from the compact, always-last Add device card when devices exist. |
| Wizard | Tight 480px flat vertical stack: steps followed by fields | Around **840px desktop dialog** with full-width title and flow chooser, then an instruction panel **beside** a form/action panel; pairing and connect remain ordered within that form. Under 700px, one scrollable column, instructions first, then form and status. |

## Approach
Reuse existing CSS custom properties, typography, logo SVG, plus SVG, native `<dialog>`, two button-based flow choices, labeled controls, live status, and `sd-` selectors. Light retains background `hsl(200,20%,98%)`, white surface, `hsl(205,16%,91%)` borders and teal hue; dark retains background `hsl(206,22%,9%)`, surface `hsl(206,18%,13%)`, border `hsl(206,12%,25%)`, light text and teal `hsl(176,60%,52%)`. During local screenshot QA, computed light contrast was 3.30:1 white on teal CTA, 4.00:1 muted text on white, 3.45:1 success and 2.63:1 pending status. Calibrate only light `--sd-accent`, `--sd-accent-hover`, `--sd-text-muted`, `--sd-ok`, `--sd-pending` to reach at least 4.5:1; dark tokens stay unchanged. Give input placeholders an explicit theme-aware color and full opacity. Use the existing `--sd-surface-2` for subtle instruction-panel separation and `--sd-accent-contrast` for the primary action. No second accent, gradient, or inversion between surfaces. Keep existing 14px card / 9px control radii; use 24-32px container padding, ~24px major gaps, 8-12px field spacing, existing font family, ~20px title / 14px body hierarchy. No automatic new motion; retain brief hover/press feedback only, disable nonessential transitions under reduced motion.

Keep markup edits local: `AppHeader.buildAddCard()` may add only a noninteractive grouping/class within the existing button if CSS alone cannot compose hint and action; do not add a second CTA, header nav, or change the observer's list/order logic. `WirelessWizard.buildClassicPane()` and `buildAndroid11Pane()` may wrap their existing steps and fields in instruction/form containers for CSS Grid; keep field IDs/names, labels, click handlers, tab IDs, order, status outside the panes, and dialog lifecycle unchanged. Avoid new exported modules or synthetic seams: existing module interfaces already hide the layout.

## Acceptance criteria
- [ ] At desktop width (e.g. 1280px), header wordmark aligns to list left edge; empty state reads left-to-right copy then prominent teal action, not a giant dashed box. With devices, the compact Add device card remains last and opens the same wizard.
- [ ] Both wireless flows show steps beside their corresponding controls at desktop widths; Android 11+ Pair precedes Connect. At 375px width the header, empty card, dialog, tabs, form fields, footer/status all fit and scroll vertically without horizontal clipping.
- [ ] Light **and** dark maintain the existing teal brand, readable text/helper/status colors, clear surface layering, visible hover and `:focus-visible` states (including Add device), AA text/button contrast, and usable touch targets. Reduced-motion mode has no nonessential entrance animation.
- [ ] Keyboard: Add device opens the native modal, focus enters, both flow buttons work, inputs remain labeled, status is announced, Escape/close/backdrop restore opener focus. No endpoint, payload, diagnostics, or reload-timing change.
- [ ] Focused browserless regression passes: `node --test tests/wireless-wizard.test.cjs`; run a non-outputting TypeScript check if feasible and `git diff --check`, inspect changed-file scope. Visually compare empty/populated dashboard and both modal flows at desktop/mobile in **both OS color schemes** using only a static/mocked UI preview built under OS temp and the existing localhost UI preview path (parent refreshes it later). Never launch the app/backend or connect hardware. Report any unverified browser behavior or inherited tool baseline failure, not a false pass.

## Tasks

### 1. Recompose the header and empty state
- **Files/area:** `src/style/chrome.css`, `src/style/devicelist.css`; `src/style/theme.css` for the light contrast calibration above; `src/app/chrome/AppHeader.ts` only for a small noninteractive grouping if needed.
- **Behavior:** Left-align `.sd-header-inner` while retaining 760px content alignment and fixed 64px header. Replace *empty-only* dashed/centered treatment with surface, restrained border, 2-column text/action grid (roughly 2:1), ~32px padding, 20px title, readable hint, prominent teal action; keep single-button semantics, compact populated-state styling, observer, and copy. Below ~700px use stacked left-aligned content with 20px padding and no overflow. Provide explicit Add card focus-visible outline and pointer states.
- **Constraints:** No inherited selector edits outside these files; no extra action or logo change; use theme tokens in both modes.
- **Acceptance:** Static UI preview shows before/after difference for empty and populated lists in light/dark desktop and 375px layouts; keyboard focus visible on Add device.
- **Depends on:** none. **Workspace:** sequential.

### 2. Recompose the wireless dialog without changing behavior
- **Files/area:** `src/app/wizard/WirelessWizard.ts`, `src/style/wizard.css` (including theme-aware placeholder contrast).
- **Behavior:** Keep native dialog and full-width header/tabs. Add only layout wrappers for step instructions and each flow's fields/actions; desktop instruction panel next to form (about 40/60), controlled max-width around 840px, internal max-height `calc(100dvh - 48px)` with scrolling; mobile one column below ~700px. Use surface-2, border, spacing and label/button hierarchy to distinguish guidance, pair/connect and feedback. Preserve `[hidden]` panes, focus, buttons, forms, REST calls and status.
- **Constraints:** Existing uncommitted accessibility work is the starting point; no tab-role rewrite, request logic edits, third-party UI, or fake preview.
- **Acceptance:** Both flow layouts clearly side-by-side on desktop, stacked on mobile, with dialog close and status accessible in short viewports; no flow/keyboard regressions.
- **Depends on:** task 1 (same working tree). **Workspace:** sequential.

### 3. Check visual and behavioral acceptance
- **Files/area:** `tests/wireless-wizard.test.cjs` if necessary for small public-UI assertions; otherwise inspection only. Static UI preview output may live only under OS temp, never in repo.
- **Behavior:** Extend current fake-DOM assertions minimally for instruction/form grouping and preserved labeled controls/active pane; run existing Node test, non-output TypeScript check where feasible, diff check. Compare actual CSS/markup through mocked preview in light/dark at 1280px/375px, empty/populated and Classic/Android 11+; verify focus and reduced motion. Record limitations without operating hardware or backend.
- **Constraints:** No test dependency, no device operations, no dist or source-file fixture writes outside allowed files; do not reformat inherited files to fix unrelated lint.
- **Acceptance:** Focused test exits 0, diff scope is restricted above, and preview visibly matches each before/after acceptance item in both modes/sizes; document any limitation before declaring implementation done.
- **Depends on:** tasks 1-2. **Workspace:** sequential.

## Risks and open questions
- The dashboard is dynamically created by the tracker; CSS must target only the empty class and existing card so populated-list and mirror layouts stay intact. Mocked preview cannot prove native browser focus trapping or actual device connectivity; keep existing DOM regression and inspect native dialog manually only if a safe UI preview permits it.
- **Open decisions:** none; execute directly without further user approval.
