# Contributing

## Conventions

- **English only** for all repository artifacts: code, identifiers, comments,
  documentation, and commit messages.
- **TypeScript `strict`** is on. Avoid `any`; prefer the shared contracts in
  `src/common/`.
- Keep the dependency rule intact: `api → wireless → adb`. Don't call adb from
  the UI; the UI talks REST only.
- New wireless behavior goes through `WirelessService` (business logic) and
  `AdbBinary` (I/O); controllers stay thin.

## Tooling

```bash
npm run lint      # eslint
npm run format    # eslint --fix
npm run dist:dev  # type-check + build (fast, source maps)
```

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(wireless): add Android 11+ pairing wizard
fix(adb): detect device IP from default route as fallback
docs: document the classic tcpip flow
```

## Adding a REST endpoint

1. Add the request/response types to `src/common/WirelessTypes.ts`.
2. Implement logic in `src/server/wireless/WirelessService.ts`.
3. Wire a thin handler in `src/server/api/WirelessRouter.ts`.
4. Call it from the wizard in `src/app/wizard/WirelessWizard.ts`.

## Relationship to ws-scrcpy

ScrcpyDeck is a fork of ws-scrcpy (MIT). Prefer adding new code in the
ScrcpyDeck modules above rather than editing inherited files, so future upstream
merges stay manageable. When an inherited file must change, keep the diff small
and comment why.
