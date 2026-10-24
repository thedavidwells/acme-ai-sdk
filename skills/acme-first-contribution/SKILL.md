---
name: acme-first-contribution
description: Take one scoped Acme task (a GitHub issue labeled acme:task) from issue to a convention-correct PR in a single AI SDK package. Use when asked to work an acme task or issue number.
disable-model-invocation: true
---

# Acme first contribution

Goal: a PR a maintainer would accept on the first review round. Small, one package, tests that would fail without the change, a patch changeset, docs and example when the public API changes.

## Inputs

- An issue number or task text. If you have an issue number and `gh` is available, run `gh issue view <n> --json title,body,labels`.

## Steps

1. **Restate the task.** Package, behavior change, acceptance criteria, what is out of scope. If the task needs more than one package or any platform-owned path (see `.cursor/rules/acme-core.mdc`), stop and say why.
2. **Load only the context you need.** Read, in this order: `AGENTS.md` (Provider Development, Testing, Changesets, Task Completion Guidelines), the relevant guide in `contributing/` (`add-new-model.md`, `provider-architecture.md`, `testing.md`), then the closest sibling implementation named in the task (for example `packages/elevenlabs/src/elevenlabs-speech-model-options.ts`). Do not read the whole repo.
3. **Plan.** Write a 5 to 8 line plan: files to change, the test cases you will add, and any convention conflict you noticed. In an IDE session, stop and wait for the human to approve the plan. In a Cloud Agent run, put the plan at the top of the PR description and continue.
4. **Tests with the change.** Add `it(...)` cases to the colocated `*.test.ts` that fail without your change. Follow the file's existing helpers (for example `prepareAudioResponse()` before calling `doGenerate`, then assert on `await server.calls[0].requestBodyJson`). Cover the happy path, the precedence rule, and any warning or error.
5. **Implement the minimum.** Match the surrounding file's style. Provider options override generic options; when a generic value is ignored, push an `unsupported` warning with the `feature` name.
6. **Public surface.** If you added or changed a provider option: update the provider page in `content/providers/01-ai-sdk-providers/`, and add or extend an example under `examples/ai-functions/src/<function>/<provider>/`.
7. **Changeset.** Create `.changeset/<kebab-name>.md` naming the package with `patch` and one user-facing sentence.
8. **Verify locally.** From the repo root:
   - `pnpm exec turbo build --filter=<npm-name>^...` (first time only)
   - `pnpm --filter <npm-name> type-check`
   - `pnpm --filter <npm-name> test`
   - `pnpm check`
   - `node tools/acme/check-contribution.mjs`
     Fix every failure. Never edit a check, a rule, or a workflow to make it pass.
9. **PR.** Title `feat(<provider>): ...` or `fix(<provider>): ...`. Fill the repo PR template: Background, Summary, End-to-End Verification (say plainly that verification is unit-level with the test server and no provider API key), Checklist, Future Work (list any convention conflict you saw), Related Issues (`Closes #<n>`).

## Stop and ask a human when

- The change needs a new dependency, a second package, or a platform-owned path.
- Two conventions conflict and the file gives no precedent.
- A test can only pass by calling a real provider API.
