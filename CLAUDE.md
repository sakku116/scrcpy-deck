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

## Release Process

When the user says "make a release" or "release vX.Y.Z", execute these steps in order.
**Always confirm the version number with the user before proceeding.**

### Steps

1. **Verify `dev` is clean and builds**
   ```bash
   git checkout dev && git status   # must be clean
   npm run dist:dev                 # must compile successfully
   ```

2. **Merge `dev` → `master`**
   ```bash
   git checkout master
   git merge --no-ff dev -m "chore(release): merge dev into master for vX.Y.Z"
   ```

3. **Determine version** — follow [SemVer](https://semver.org/):
   - `PATCH` (0.0.x): bug fixes only
   - `MINOR` (0.x.0): new features, backwards-compatible
   - `MAJOR` (x.0.0): breaking changes

4. **Generate changelog** — list all commits on `dev` since the last tag:
   ```bash
   git log <last-tag>..HEAD --pretty="- %s" --no-merges
   ```
   Group into `### Features`, `### Fixes`, `### Chores`. Skip merge commits.

5. **Tag**
   ```bash
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin master --tags
   ```

6. **Build executable**
   ```bash
   npm i -D @yao-pkg/pkg   # skip if already installed
   npm run build:exe        # output: dist-exe/
   ```

7. **Package and upload**
   ```bash
   # PowerShell
   Compress-Archive -Path dist-exe\* -DestinationPath ScrcpyDeck-vX.Y.Z-win-x64.zip
   gh release create vX.Y.Z ScrcpyDeck-vX.Y.Z-win-x64.zip `
     --title "ScrcpyDeck vX.Y.Z" `
     --notes "<changelog from step 4>"
   ```

8. **Push `dev` tag reference** (keeps dev in sync)
   ```bash
   git checkout dev
   git merge master -m "chore: sync dev with master after vX.Y.Z release"
   git push origin dev
   ```

### Notes
- `dist-exe/` and `*.zip` are gitignored — never commit them.
- `data/` (device history, config) is gitignored — never commit it.
- If `gh release create` fails, create the release manually at github.com and attach the zip.

## Remotes

- `origin`   → `git@github.com:sakku116/scrcpy-deck.git` (this fork)
- `upstream` → `https://github.com/NetrisTV/ws-scrcpy.git` (ws-scrcpy source)
