#!/usr/bin/env node
// Cursor stop hook (starter draft). Runs the Acme guardrail check when the agent finishes a turn.
// On failure it returns followup_message so the agent fixes the findings, bounded by loop_limit in hooks.json.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
if (input.status && input.status !== 'completed') { console.log('{}'); process.exit(0); }

const run = spawnSync('node', ['tools/acme/check-contribution.mjs'], { encoding: 'utf8' });
fs.mkdirSync('.acme', { recursive: true });
fs.appendFileSync('.acme/hook-audit.log', `${new Date().toISOString()} stop loop=${input.loop_count ?? '?'} exit=${run.status}\n`);
if (run.status === 0) { console.log('{}'); process.exit(0); }
console.log(JSON.stringify({
  followup_message: `Acme guardrails failed. Fix each finding below, then stop again. Do not edit platform-owned paths to make a check pass; if a finding needs a scope change, stop and ask the human instead.\n\n${run.stdout}`,
}));
