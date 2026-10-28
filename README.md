# Acme AI SDK

This fork of [Vercel’s AI SDK](https://github.com/vercel/ai) is the stand-in for Acme’s core library: a TypeScript monorepo with one interface for many model providers. Published packages live under `packages/`. How they depend on each other is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Package usage examples stay in [packages/ai/README.md](packages/ai/README.md).

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
