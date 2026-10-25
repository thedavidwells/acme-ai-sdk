#!/usr/bin/env node
// preToolUse hook for Write/Edit tools (VERIFY the tool_input field name for file paths in product).
// Denies edits to platform-owned paths before they happen. The CI check is the backstop either way.
import fs from 'node:fs';
import path from 'node:path';
let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
const ti = typeof input.tool_input === 'string' ? JSON.parse(input.tool_input || '{}') : input.tool_input || {};
const abs = String(ti.file_path || ti.path || ti.target_file || '');
const rel = abs ? path.relative(input.cwd || process.cwd(), abs) : '';
// Keep in sync with FORBIDDEN in tools/acme/check-contribution.mjs (same patterns, same order).
const PLATFORM = [
  /^\.github\//, /^\.cursor\//, /^\.agents\//, /^\.claude\//, /^\.codex\//, /^skills\//, /^tools\//,
  /^AGENTS\.md$/, /^pnpm-lock\.yaml$/, /^pnpm-workspace\.yaml$/, /^package\.json$/, /^\.changeset\/config\.json$/,
  /^packages\/codemod\//, /^content\/docs\/08-migration-guides\//,
];
if (rel && PLATFORM.some(re => re.test(rel)) && process.env.ACME_PLATFORM_CHANGE !== '1') {
  console.log(JSON.stringify({ permission: 'deny', user_message: `Blocked edit to platform-owned path ${rel}.`, agent_message: `${rel} is platform-owned. Do not edit it in a first contribution. If the task truly needs it, stop and ask the human.` }));
} else {
  console.log(JSON.stringify({ permission: 'allow' }));
}
