# Decisions (Acme First Contribution Accelerator)

Context: Acme's platform team wants new engineers to land a clean first change in the core library faster, without more review churn or production risk. This repo is a fork of vercel/ai standing in for Acme's core library. Owner: platform team (CODEOWNERS). Status is accepted unless marked Planned. Updated Sat Oct 24, 11:41 AM MT.

## D1. Stand-in library

- **Decision:** vercel/ai (AI SDK v7), pinned to `fce9210`.
- **Why:** a large, convention-heavy TypeScript monorepo (84 packages) with fast per-package tests (47 Cartesia tests in under 1 s). It already ships AGENTS.md, skills, and a hooks file. I know it as a user, not a contributor, which is the new hire's seat.
- **Alternatives considered:** scikit-image (its AI policy conflicts with the demo, and it needs a build step), MONAI (Python and torch setup), diffusers (already ships its own agent tooling).
- **Trade-off:** it is my employer's library, so I use public information only (D19).

## D2. Source hosting

- **Decision:** a GitHub fork (`thedavidwells/acme-ai-sdk`).
- **Why:** Actions, rulesets, Environments, and Cursor Automation PR triggers all work there.
- **Alternatives considered:** Cursor Origin (no forks, no Actions).
- **Trade-off:** this doesn't showcase Origin.

## D3. What to solve first

- **Decision:** the first-contribution loop: scaffold the right change, then catch problems before review, with boundaries enforced.
- **Why:** slow ramp and review rework share one cause: conventions that live in reviewers' heads. Encoding and enforcing them helps every PR, and Security's boundary concern is covered by the same enforcement.
- **Alternatives considered:** docs search or RAG; thin coverage of all five needs.
- **Trade-off:** less on onboarding docs and long-tail tasks. I'd revisit if discovery shows CI capacity or review staffing is the bottleneck.

## D4. Relationship to upstream agent files

- **Decision:** overlay. Four small `.cursor/rules/acme-*.mdc` files, a new skill in `skills/`, and an extended `.cursor/hooks.json` that keeps upstream `pnpm fix`.
- **Why:** AGENTS.md stays the one source of truth, the diff from upstream stays small, and rebases stay easy.
- **Alternatives considered:** replacing AGENTS.md and the skills; ignoring them.
- **Trade-off:** there are two layers to read.

## D5. Deterministic checker plus agent judgment

- **Decision:** a deterministic, diff-aware script (`tools/acme/check-contribution.mjs`) handles everything mechanical. Agents (the skill and the planned PR-review Automation) and humans handle judgment.
- **Why:** the script is predictable, explainable, fast (under 0.1 s), and owned by humans. One script runs in the stop hook, in CI, and by hand, so there's one source of truth. Today it produced 7 findings on PR #5, each with a plain-English fix. Scope, changeset, and test-presence checks span files, which lint can't do.
- **Alternatives considered:** LLM review only; lint plugin rules only.
- **Trade-off:** heuristics miss semantic issues, so review covers those. In-file rules (the `JSON.parse` ban) should later move into the repo's oxlint plugin.

## D6. Legacy violations

- **Decision:** check added lines only (a ratchet).
- **Why:** 25 existing `JSON.parse` uses in package source should not block a newcomer.
- **Alternatives considered:** fail on all violations; a baseline file.
- **Trade-off:** legacy debt doesn't shrink unless Acme funds a cleanup.

## D7. Deprecated API list

- **Decision:** computed at runtime from `@deprecated` JSDoc on exported symbols in core packages (41 symbols at `e729d58`).
- **Why:** it stays current without anyone maintaining a list.
- **Alternatives considered:** a hand-maintained list.
- **Trade-off:** it only catches symbols that have JSDoc deprecation notes, and common names could produce false positives. If that gets noisy, scope matches by import source.

## D8. Scope model: one package per first contribution

- **Decision:** structural scope. One published package per contribution, plus a platform-owned path denylist and a dependency boundary. It is enforced in three places: the rules, the `preToolUse` hook, and the checker.
- **Why:** there's nothing per task to maintain or forge, and it matches the typical shape of an outside PR (one changeset, one source file, its test, docs, and an example). Today PR #4 stayed inside `@ai-sdk/cartesia` (7 files), and PR #5 failed `[scope]` for touching two packages.
- **Alternatives considered:** a per-task allowlist file.
- **Trade-off:** real cross-package work needs a `platform-change` PR or a stop-and-ask.

## D9. How an approved task becomes an agent run (Planned: Block C, Sat night)

- **Decision:** a GitHub Action (`acme-launch-agent.yml`) on `acme:approved` checks the approver, then calls the Cursor Cloud Agents API through `tools/acme/cursor-agent.mjs`. The local IDE path stays available.
- **Why:** the approval check and the launch live in code next to the repo. Launches are idempotent through an issue marker, any front door can trigger one, and token usage is reported per task.
- **Alternatives considered:** an Automation on the issue label; Grok Bot delegating directly to a Cloud Agent; local runs only.
- **Trade-off:** there is one API key to protect (in an Environment secret), and the launcher polls until webhooks ship. Code is merged but has not run yet.

## D10. Where approvals are recorded

- **Decision:** labels (`acme:approved`, `qa:approved`) verified against `.github/acme/approvers.yml`, plus a sign-off comment, enforced by a required check.
- **Why:** labels persist, are attributable to a named person, and are enforced by the ruleset. Verified today: PR #4's sign-off turned `acme-signoff` green.
- **Alternatives considered:** bot chat only; PR review approvals.
- **Trade-off:** label permissions have to be managed, and in the demo one account plays every role.

## D11. CI scope in the fork

- **Decision:** a targeted subset (`acme-guardrails.yml`: PR title, checker, `pnpm check`, `pnpm konsistent`, type-check and tests for the touched package, plus checker fixtures) and upstream `verify-changesets.yml`. Upstream `ci.yml` is disabled in the Actions UI, not deleted.
- **Why:** runs take minutes instead of a long matrix, using the same commands upstream uses.
- **Alternatives considered:** keeping upstream `ci.yml`.
- **Trade-off:** no bundle-size, load-time, or cross-Node matrix in the fork.

## D12. Upstream contribution

- **Decision:** none. All work stays in the fork.
- **Why:** CONTRIBUTING.md discourages PRs that implement issues authored by others. Maintainers work those with their own agents.
- **Alternatives considered:** opening the Cartesia PR upstream.
- **Trade-off:** no upstream credit. Outside PR #23497 for the same issue is a comparison point instead.

## D13. Status view

- **Decision:** the GitHub issue and PR (labels as a state machine, links as comments) plus answers from the bot.
- **Why:** there's no new system to maintain, and PM, QA, and DevOps can read it.
- **Alternatives considered:** a new dashboard.
- **Trade-off:** no portfolio view across tasks. A Grok Bot page or a project board can add one later.

## D14. Demo task

- **Decision:** upstream issue #23430 (Cartesia `locale` and `normalization` speech options), with the fork pinned to `fce9210`, the base commit of outside PR #23497. Backup: CONTRIBUTING.md drift (it says pnpm v11, and one example path is stale).
- **Why:** real, precisely specified, limited to one package, and testable without API keys. Pinning keeps the comparison with #23497 exact.
- **Alternatives considered:** #23488 (Azure transcription options), which needs design judgment and is too big to run live.
- **Trade-off:** someone else's PR already implements the feature. The evaluation is the workflow, not the feature.

## D15. Agent status mechanism (Planned with D9)

- **Decision:** poll `GET /v1/agents/{id}/runs/{runId}` every 30 s, with a timeout.
- **Why:** Cloud Agents API v1 webhooks are not available yet.
- **Alternatives considered:** webhooks.
- **Trade-off:** extra API calls and latency. Switch when webhooks ship.

## D16. Deploy (Planned: Sunday)

- **Decision:** a real build and pack, then a mocked publish gated by a `staging` GitHub Environment with DevOps as the required reviewer (`acme-release.yml`).
- **Why:** it shows the path to production and the human gate without faking a release.
- **Alternatives considered:** no deploy step; publishing to a real registry.
- **Trade-off:** the publish is an echo, labeled as mocked. The workflow is merged, but the Environment does not exist yet.

## D17. Automated review (Planned: Sunday)

- **Decision:** a custom PR-review Automation that only comments, with Memories off. Bugbot is optional, with `.cursor/BUGBOT.md`.
- **Why:** it can be tuned to Acme conventions, `.cursor/rules` do not apply to Bugbot, and cost stays under control.
- **Alternatives considered:** Bugbot only.
- **Trade-off:** one more prompt to maintain.

## D18. Ambiguous conventions in the checker

- **Decision:** warn and defer. First case: `.optional()` vs `.nullish()` in provider options. AGENTS.md says `.optional()`, but Cartesia's options file uses `.nullish()`. The checker warns only when an added line breaks the file's own majority style, and it never blocks.
- **Why:** blocking a newcomer for matching the code in front of them is a false positive that costs trust. Fixture tests and a CODEOWNER-only `acme:exception` label cover the rest.
- **Alternatives considered:** enforcing AGENTS.md literally; enforcing whatever the file does.
- **Trade-off:** the inconsistency stays until a code owner decides. Then it becomes a hard rule.

## D19. Employer boundary

- **Decision:** only the public repo, public docs, and public issues and PRs. No internal knowledge, plans, or customer information. No upstream PRs.
- **Why:** it keeps the exercise fair and reproducible by anyone.
- **Alternatives considered:** none.
- **Trade-off:** none worth naming.

## D20. Label actor verified from the issue events API

- **Decision:** `acme-signoff` (and the `acme:exception` step) read who applied a label from `GET /repos/{repo}/issues/{n}/events`, keep only `actor.type == "User"`, and match the login against `approvers.yml` (or against CODEOWNERS read from the base branch).
- **Why:** the label alone proves nothing. The events API is GitHub's own record of who applied it, so bots and non-allowlisted users are ignored, and a PR can't add itself as an owner.
- **Alternatives considered:** trusting the label's presence; a PR review approval (one account can't approve its own PR).
- **Trade-off:** the labeler comes from the issue events API and must also still be on the PR, so removing `qa:approved` revokes the sign-off (added in PR #6). The bot and non-allowlisted cases are not yet tested with a second account.

## D21. The bot acts as the signed-in human

- **Decision:** Acme Dev Desk uses the GitHub connector as the signed-in person, behind an approval card, and doesn't use a bot account or a shared token.
- **Why:** every approval is attributable. On PR #4 the `qa:approved` actor is `thedavidwells` and the comment reads "QA sign-off by David Wells: ...", so the required check can verify a real person.
- **Alternatives considered:** a shared service account for the bot; a comment-to-label workflow.
- **Trade-off:** each approver needs their own connector login. Service accounts still fit non-approval automation (launcher, Automations).

## D22. Branches inside the fork, not forks of the fork

- **Decision:** all task and demo PRs come from branches in `thedavidwells/acme-ai-sdk` (`task/...`, `demo/...`, `platform/...`).
- **Why:** Cursor Automation PR triggers don't run on PRs opened from forks, and fork PRs get no secrets or write tokens. Branches inside the repo keep the planned review Automation and the workflows working. The fork guard also keeps every PR, bot action, and API call off `vercel/ai`.
- **Alternatives considered:** contributors work from personal forks.
- **Trade-off:** contributors need write access to the repo. The ruleset on main, not repo permissions, is the gate.

## D23. Required checks in a ruleset, not required reviews

- **Decision:** ruleset `main-protection` on main: PR required, required checks `guardrails`, `checker-fixtures`, and `acme-signoff`, with force pushes and deletion blocked. Zero required approvals for now.
- **Why:** one account plays every role, and GitHub doesn't let an author approve their own PR. Required checks still enforce the gates, and QA sign-off arrives as a verified check.
- **Alternatives considered:** classic branch protection; requiring code owner review now.
- **Trade-off:** until code owner review is required, a PR that edits a workflow runs its own edited copy. Turn on code owner review once Acme has real separate reviewers.

## D24. PR title format in CI

- **Decision:** `guardrails` fails unless the title matches `type(scope): summary` (feat, fix, chore, docs, test, refactor, perf).
- **Why:** it matches upstream's PR titles and gives reviewers and changelogs a consistent shape. It caught a bad title on PR #5's first run.
- **Alternatives considered:** leaving titles to review.
- **Trade-off:** small friction on platform and docs PRs, which must still use the format.

## D25. Required checks must run on every PR

- **Decision:** removed upstream `verify-changesets` from the required checks. It still runs, but it no longer blocks merges.
- **Why:** it only triggers on PRs that touch `packages/` or `.changeset/`. On a workflow-only PR ([PR #6](https://github.com/thedavidwells/acme-ai-sdk/pull/6)) it never reported, so the ruleset waited forever. The checker's `[changeset]` rule inside `guardrails` covers the same risk and runs on every PR.
- **Alternatives considered:** removing the path filter from the upstream workflow (diverges from upstream), or admin bypass on platform PRs (weakens the audit trail).
- **Trade-off:** upstream's own changeset check becomes advisory. If Acme wants it enforced, give it a no-op job that always reports so it can be required safely.
