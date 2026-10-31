# Acme AI SDK

This fork of [Vercel’s AI SDK](https://github.com/vercel/ai) is the stand-in for Acme’s core library: a TypeScript monorepo with one interface for many model providers. Published packages live under `packages/`. Package usage examples stay in [packages/ai/README.md](packages/ai/README.md).

## Understand the codebase

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). It has two diagrams: which packages import which, and one OpenAI chat call through `generateText`. The slide snapshot of the package diagram is [docs/architecture-packages.svg](docs/architecture-packages.svg).

In Cursor, run `/acme-codebase-tour` for a read-only orientation. The skill is stored at [`skills/acme-codebase-tour/SKILL.md`](skills/acme-codebase-tour/SKILL.md) and exposed through the repository skill links. Add a package or task if you already know the area. If it is not visible in an existing session, reload the Cursor window and start a new chat. The tour does not implement the change. Implementation stays on `/acme-first-contribution`, which now includes a brief architecture orientation.

How to open the diagrams from the repo, and how that differs from reopening a saved local canvas, is in the guide under “Opening this map.” The canvas is not published.

## Run

Node.js 22 or newer and pnpm 11.

```bash
pnpm install --frozen-lockfile
pnpm build:packages
```

From a package directory, `pnpm test` runs that package’s Vitest suite. Those tests do not call provider APIs and do not need API keys.

## Demo

From `examples/ai-functions`, this script calls `generateText` with `MockLanguageModelV3` and prints the mock text. It does not use a provider key.

```bash
cd examples/ai-functions
FAIL_ON_ERROR=1 pnpm tsx src/generate-text/mock/basic.ts
```

## First-contribution checker

`tools/acme/check-contribution.mjs` checks a diff for first-contribution limits (one package, no new dependencies, a patch changeset when package source changes).

Cursor is instructed to stay off platform-owned paths by the always-on rule in [`.cursor/rules/acme-core.mdc`](.cursor/rules/acme-core.mdc), with the other files in [`.cursor/rules/`](.cursor/rules/). [`.cursor/hooks.json`](.cursor/hooks.json) wires that up in the editor: `preToolUse` runs `tools/acme/hooks/guard-write.mjs` before Write and Edit tools, and the `stop` hook runs `tools/acme/hooks/stop-check.mjs`, which runs the checker when an agent turn completes.

[`.github/CODEOWNERS`](.github/CODEOWNERS) names an owner for those paths. Code-owner review is not required on `main` yet, so that file does not block a merge by itself.
