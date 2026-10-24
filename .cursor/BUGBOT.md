# Review rules for Bugbot (optional, P3). .cursor/rules do not apply to Bugbot, so the review-critical rules are mirrored here.

- Flag provider options added without a test asserting the request body.
- Flag `JSON.parse` in package source, bare `zod` imports, and imports outside the package's declared dependencies.
- Flag changesets that are not `patch`.
- Flag public option changes without a docs update in content/providers/.
