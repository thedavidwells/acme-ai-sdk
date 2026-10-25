#!/usr/bin/env bash
# demo-reset.sh - put the Acme take-home demo back to its starting state.
#
# What it does (and only this):
#   - Removes the "qa:approved" label from PR #4 (the intentionally unsigned,
#     green agent demo PR) so the QA sign-off step can be shown again.
#   - Prints PR #4's labels before and after.
# What it never does:
#   - Touch PR #5 or PR #11, merge anything, push code, or comment.
#
# Default is a dry run: it only lists what it WOULD do. Pass --apply to act.
# Usage (from the repo root):  tools/acme/demo-reset.sh [--apply]
# Exit codes: 0 = ok, 1 = something unexpected (read the message), 2 = bad usage.

set -euo pipefail

# Which repo to act on. Spelled out on purpose: in a fork, gh's "current repo"
# can resolve to the upstream (vercel/ai), and we must never touch that.
REPO="${ACME_REPO:-thedavidwells/acme-ai-sdk}"
TARGET_PR=4
LABEL="qa:approved"
PROTECTED_PRS=(5 11)   # demo fixtures that must stay exactly as they are

die() { echo "ERROR: $*" >&2; exit 1; }

# Step 0: read the one allowed flag. Anything else is a usage error.
APPLY=0
case "${1:-}" in
  "") ;;
  --apply) APPLY=1 ;;
  -h|--help) sed -n '2,13p' "$0"; exit 0 ;;
  *) echo "usage: $0 [--apply]" >&2; exit 2 ;;
esac
[ $# -le 1 ] || { echo "usage: $0 [--apply]" >&2; exit 2; }

# Step 1: safety guard. Refuse to run if someone edited TARGET_PR to a
# protected PR number. This script should only ever act on PR #4.
for p in "${PROTECTED_PRS[@]}"; do
  [ "$TARGET_PR" != "$p" ] || die "refusing to touch PR #$p (protected demo fixture)"
done

# Step 2: make sure gh is installed and signed in before we look at anything.
command -v gh >/dev/null 2>&1 || die "gh CLI not found (install: brew install gh)"
gh auth status >/dev/null 2>&1 || die "gh is not signed in (run: gh auth login)"

# Helper: print PR #4's labels, one per line (empty output = no labels).
labels() {
  gh pr view "$TARGET_PR" --repo "$REPO" --json labels --jq '.labels[].name'
}

# Step 3: check PR #4 is the PR we expect: it exists and is still open.
# A merged or closed PR #4 means the demo state is not what we think it is.
STATE="$(gh pr view "$TARGET_PR" --repo "$REPO" --json state --jq '.state')" \
  || die "could not read PR #$TARGET_PR in $REPO"
[ "$STATE" = "OPEN" ] || die "PR #$TARGET_PR is $STATE, expected OPEN; not changing anything"

# Step 4: show the current labels so you can see the starting point.
BEFORE="$(labels)"
echo "Repo:   $REPO"
echo "PR #$TARGET_PR labels now: ${BEFORE:-(none)}" | tr '\n' ' '; echo

# Step 5: decide what to do. If the label is not there, there is nothing to reset.
if ! grep -qx -- "$LABEL" <<<"$BEFORE"; then
  echo "Nothing to do: PR #$TARGET_PR does not have '$LABEL'."
  exit 0
fi

PLAN=(gh pr edit "$TARGET_PR" --repo "$REPO" --remove-label "$LABEL")
echo "Plan:   ${PLAN[*]}"
echo "Never:  touch PR #5 or PR #11, merge, push, or comment."

# Step 6: dry run stops here. Nothing was changed.
if [ "$APPLY" -ne 1 ]; then
  echo "Dry run only. Re-run with --apply to remove the label."
  exit 0
fi

# Step 7: apply the one change, then re-read the labels to prove it worked.
"${PLAN[@]}" >/dev/null
AFTER="$(labels)"
echo "PR #$TARGET_PR labels after: ${AFTER:-(none)}" | tr '\n' ' '; echo
if grep -qx -- "$LABEL" <<<"$AFTER"; then
  die "'$LABEL' is still on PR #$TARGET_PR after the edit"
fi
echo "Done: '$LABEL' removed from PR #$TARGET_PR."
