# Wireless wizard accessibility refactor

## Intent
Make the existing wireless connection wizard usable with keyboard and assistive technology without changing the connection flows, REST contract, dashboard entry point, or ScrcpyDeck's teal visual identity. Baseline: `42df4aed93ec626a18c7633d5ef382fb6aacb09c` on `dev`.

## Scope
- In: the wizard's modal lifecycle, focus, form labels, tab disclosure, status announcements, and corresponding wizard CSS; one browserless regression check.
- Out: backend/adb, payload validation or flow changes, device-list redesign, landing-page patterns, new UI/test dependencies, and inherited ws-scrcpy files. Keep the existing two-flow information architecture and theme tokens.
- Safety: do not start the app, adb, or USB; do not open a browser, install dependencies, run `dist`, `build:exe`, or `clean`, change machine settings, remove user files, commit, push, or use network access. Preserve the pre-existing untracked `AGENTS.md` and `ScrcpyDeck*.zip`. These restrictions apply to verification too.

## Current evidence
- `src/app/chrome/AppHeader.ts:10-12,63-69` owns one wizard and calls only `open()` from the Add device button. `src/app/index.ts` mounts the header after the tracker; the inherited device list needs no edit.
- `src/app/wizard/WirelessWizard.ts:31-39,42-85` creates a persistent `div` overlay and toggles `.sd-visible`; `src/style/wizard.css:5-22` hides it by opacity/pointer events, leaving closed controls in keyboard order. The overlay has no dialog semantics, Escape behavior, focus placement/containment, or opener focus restoration.
- `WirelessWizard.ts:89-108` changes only CSS classes on the two tab buttons/panes; the active state is not exposed to assistive technology. `WirelessWizard.ts:171-178` creates placeholder-only inputs (including the six-digit pairing code). `WirelessWizard.ts:76-78,214-219` changes visible status text without a live region. The close button at `WirelessWizard.ts:56-59` is icon-only and has no accessible name.
- `src/style/wizard.css:133-140` removes native input outline and provides a focus replacement only for inputs; the close/tab/action buttons lack visible keyboard focus. `src/style/theme.css` already supplies teal light/dark tokens. `src/common/WirelessTypes.ts` owns the REST shapes; no changes needed.
- `package.json` has no working test script or DOM test dependency (`npm test` intentionally exits 1). Repository-wide `npm run lint` currently fails on roughly 13k inherited Prettier/CRLF findings; do not bulk-format to make this plan pass.

## Approach
Deepen the existing `WirelessWizard` module at its existing external seam: `new WirelessWizard().open()` remains the only caller-facing interface. Keep DOM creation, focus/lifecycle handling, tab switching, and status announcements inside that module rather than adding a pass-through controller or a new port. Replace the faux modal `div` with a native `<dialog>` opened by `showModal()` and closed by `close()`; native top-layer modal behavior handles background inertness, keyboard focus containment, and Escape. Explicitly focus the initial flow choice or heading on opening and restore focus to the invoking Add device button on every close path when it still exists. Do not add document-wide key handlers or focus-trap dependencies.

Retain the two ordinary tab *buttons* rather than introducing ARIA tab roles with an unimplemented arrow-key contract: set `aria-pressed`/`aria-controls`, keep the inactive pane genuinely hidden, and keep click/Enter/Space switching synchronized. Use actual associated labels for every input, `name` and suitable input hints (`inputmode="numeric"` and `spellcheck="false"` for the pairing code, preserving leading zeros as text); retain request values and backend error handling as-is. Mark the persistent status node `role="status"` (polite announcement) so pending/success/failure messages are readable without moving focus. Give the close button an `aria-label`, and link the dialog to its visible title. Preserve CSS token palette and spacing; move overlay dimming to `dialog::backdrop`, hide closed dialogs regardless of `.sd-visible`, and add `:focus-visible` styles to buttons plus a reduced-motion override if transitions remain. Native dialog replaces bespoke modal mechanics, not connection behavior.

## Acceptance criteria
- [ ] Add device opens one modal; focus enters it; background controls cannot receive keyboard focus. Escape, close button, and backdrop click close it and restore focus to the Add device button if still mounted. Reopening does not duplicate nodes or listeners and preserves the selected flow and entered values.
- [ ] Closed wizard cannot be tabbed into. Every input has a visible associated label; the close control has an accessible name; the active flow is exposed and the inactive flow is hidden from keyboard and assistive technology. Both flow choices work with pointer and keyboard.
- [ ] Pending, success, backend failure, and network failure statuses are announced without focus theft. Classic `/tcpip`, Android 11+ `/pair` then `/connect`, diagnostic `/adb-info`, payloads, error messages, and successful connection reload timing remain unchanged.
- [ ] Existing light/dark teal presentation remains; all wizard actions show visible keyboard focus, and reduced-motion preference suppresses nonessential entrance motion.
- [ ] One runnable browserless regression check passes with mocked DOM/dialog/fetch. Any broader lint/type failures are reported separately from the known inherited formatting baseline; no unrelated files are reformatted.

## Risks and open questions
- Native `<dialog>` needs a real `showModal()`/`close()` lifecycle. Handle its `close` event (including Escape) in one place; do not rely on removing a class to close it. Test rapid open/close against any scheduled animation frame so it cannot re-show a closed dialog.
- A fake DOM check can verify wiring but not actual browser focus containment or contrast. Browser/device verification is intentionally not permitted in this run; record that limitation, not a claim of full end-to-end accessibility validation.
- No decision or user approval is needed: the smallest viable choice is native dialog + native buttons/labels, with no new dependency.

## Tasks

### 1. Refactor the wizard's existing seam
- **Files/area:** `src/app/wizard/WirelessWizard.ts`.
- **Behavior:** Build a labelled native dialog once, use `showModal()` from public `open()`, route close button/backdrop/Escape through native closure and one focus-restoration path; ensure the backdrop handler fires only for clicks outside the inner panel. Synchronize `aria-pressed` and hidden panes when switching flows. Replace placeholder-only inputs with labelled controls and make the status node live; retain REST paths, payloads, user steps, diagnostics, success reload, and tab/input persistence.
- **Constraints:** No new exported interface, framework, focus-trap package, backend edits, or changes to `AppHeader.ts`/`WirelessTypes.ts` unless the existing interface cannot be preserved. Avoid stale animation-frame reopen; keep asynchronous response handling safe if the dialog closes before completion.
- **Acceptance:** Code review against the checklist above; TypeScript strict checks if they can be run without forbidden builds; focused regression check in task 3.
- **Depends on:** none.
- **Workspace:** sequential.

### 2. Adapt only wizard styling
- **Files/area:** `src/style/wizard.css` (read `src/style/theme.css`; leave it unchanged).
- **Behavior:** Style the dialog/backdrop in the existing flat teal theme; guarantee `[open]` vs closed display semantics, retain layout and scrolling on small viewports, make every wizard button visibly focused under `:focus-visible`, and disable entrance transitions for reduced motion.
- **Constraints:** Keep `sd-` selectors and light/dark theme tokens; no landing-page design system, palette reset, or inherited stylesheet formatting.
- **Acceptance:** CSS inspection confirms no hidden-but-focusable overlay, no outline removed without replacement, and no color/IA regression from the existing wizard rules.
- **Depends on:** task 1.
- **Workspace:** sequential.

### 3. Add one targeted browserless check and review-fix loop
- **Files/area:** one small `tests/wireless-wizard.test.cjs` using Node's built-in `node:test`/`assert`, the already-installed `typescript` transpiler, and a minimal fake DOM/dialog/fetch; avoid a new test runner or changing `package.json` scripts. The test should exercise public `open()` and visible control events rather than private methods.
- **Behavior:** Assert single creation/reopen, `showModal`/close on close button and Escape, opener focus restoration, labelled fields, accessible flow switching and hidden inactive pane, status announcement for failed mocked request, and unchanged endpoint/payload on a mocked pair or classic action. Stub `requestAnimationFrame`/timers as needed; never hit live HTTP or trigger actual reload.
- **Constraints:** Keep the fake limited to DOM operations this wizard uses; do not pretend fake-dialog focus containment proves native browser semantics. One runnable command: `node --test tests/wireless-wizard.test.cjs`. If the fake grows into a DOM framework, shrink assertions to the highest-risk lifecycle/contract behaviors rather than add a dependency.
- **Acceptance:** The command exits 0, and the test fails when dialog close/focus restoration or flow announcement wiring is removed. Then inspect `git diff --check` and diff scope, fix any issues in tasks 1-3, rerun the same check, and document any baseline-limited lint/type result without mass formatting. Do not run the app/browser/device or forbidden builds.
- **Depends on:** tasks 1-2.
- **Workspace:** sequential.
