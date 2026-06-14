# ScrcpyDeck — Claude Code Instructions

## Language

All repository artifacts must be in **English**: identifiers, comments, documentation, README,
commit messages, branch names, and PR/issue titles. Chat with the user may be in any language.

## Git Workflow

### Branch model

```
master          — stable, production-ready
└── dev         — integration branch; all features merge here first
    ├── feat/<name>     — new features
    ├── fix/<name>      — bug fixes
    ├── refactor/<name> — refactoring with no behavior change
    ├── docs/<name>     — documentation only
    └── chore/<name>    — build, tooling, deps
```

### Rules

- Never commit directly to `master`.
- Never commit directly to `dev` unless the change is trivial (typo, one-liner).
- Branch from `dev`, merge back to `dev` via PR.
- `dev` merges to `master` only for releases.
- Upstream ws-scrcpy updates: `git fetch upstream && git merge upstream/master` into `dev`,
  resolve conflicts, then merge to `master` after verification.

### Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(wireless): add Android 11+ pairing wizard
fix(adb): detect device IP from default route as fallback
docs: update wireless-flows troubleshooting table
chore: bump @devicefarmer/adbkit to 3.2.1
```

- Subject line: imperative mood, no trailing period, max 72 chars.
- No `Co-Authored-By` lines.
- Body is optional; use it for non-obvious context (why, not what).

## Architecture

Dependency rule: `api → wireless → adb`. The UI never calls adb directly; it speaks REST only.

```
src/common/          — shared types (REST payloads, constants)
src/server/adb/      — thin adb binary resolver and executor
src/server/wireless/ — business logic (classic tcpip + Android 11+ pair)
src/server/api/      — thin Express controllers
src/app/wizard/      — Wireless Connect Wizard UI
```

Prefer adding new code in the ScrcpyDeck modules above rather than editing inherited ws-scrcpy
files. When an inherited file must change, keep the diff minimal and note why.

## Code Style

- TypeScript `strict` mode is on. Avoid `any`.
- No comments that explain *what* the code does — only *why* when non-obvious.
- No multi-paragraph docstrings or multi-line comment blocks.
- ESLint + Prettier enforced: `npm run lint` / `npm run format`.

## Remotes

- `origin`   → `git@github.com:sakku116/scrcpy-deck.git` (this fork)
- `upstream` → `https://github.com/NetrisTV/ws-scrcpy.git` (ws-scrcpy source)
