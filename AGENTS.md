# Agent Instructions

## .archive/ is out of bounds
- Never read, edit, create, move, or delete anything inside `.archive/`.
- Do not search, grep, index, or include `.archive/` contents in context.
- Do not build, test, lint, or commit anything from `.archive/`.
- It is local reference material only; ignore it entirely.
- Do not even list or peek into it to "check": it contains nothing relevant to
  any task in this repo, and reads under `.archive/**` fail immediately via
  permission rules anyway. Skip straight to the paths below.

## Where this repo's work actually happens
Start here instead of exploring:
- `src/` — library TypeScript sources (`index.ts`, `generateFromColor.ts`)
- `tests/` — vitest suite (`npm test`)
- `dist/index.html` — the demo page UI served at localhost:8000
- `build.js`, `tsconfig.json`, `package.json` — build and tooling
- `README.md` / `CHANGELOG.md` — docs to keep in sync

`HANDOFF_fastpalette.md` is historical context only: its feature is already
implemented and documented in the README.
