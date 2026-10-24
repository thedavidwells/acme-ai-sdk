#!/usr/bin/env node
// preToolUse hook for Write/Edit tools (starter draft; VERIFY the tool_input field name for file paths in product).
// Denies edits to platform-owned paths before they happen. The CI check is the backstop either way.
import fs from 'node:fs';
import path from 'node:path';
let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
const ti = typeof input.tool_input === 'string' ? JSON.parse(input.tool_input || '{}') : input.tool_input || {};
const abs = String(ti.file_path || ti.path || ti.target_file || '');
const rel = abs ? path.relative(input.cwd || process.cwd(), abs) : '';
const PLATFORM = [/^\.github\//, /^\.cursor\//, /^\.agents\//, /^skills\//, /^tools\//, /^AGENTS\.md$/, /^pnpm-lock\.yaml$/, /^pnpm-workspace\.yaml$/, /^package\.json$/];
if (rel && PLATFORM.some(re => re.test(rel)) && process.env.ACME_PLATFORM_CHANGE !== '1') {
  console.log(JSON.stringify({ permission: 'deny', user_message: `Blocked edit to platform-owned path ${rel}.`, agent_message: `${rel} is platform-owned. Do not edit it in a first contribution. If the task truly needs it, stop and ask the human.` }));
} else {
  console.log(JSON.stringify({ permission: 'allow' }));
}
