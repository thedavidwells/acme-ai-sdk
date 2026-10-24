#!/usr/bin/env node
// beforeShellExecution hook (starter draft). Denies network fetches to hosts outside the allowlist,
// force pushes, pushes to main, and package publishing. failClosed: true in hooks.json.
import fs from 'node:fs';
const ALLOWED_HOSTS = ['registry.npmjs.org', 'github.com', 'api.github.com', 'codeload.github.com'];
let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
const cmd = String(input.command || '');
const deny = reason => { console.log(JSON.stringify({ permission: 'deny', user_message: `Blocked by Acme guardrail: ${reason}`, agent_message: `Blocked: ${reason}. Do not retry with a different command; ask the human if this is needed.` })); process.exit(0); };
if (/\b(npm|pnpm|changeset)\s+publish\b/.test(cmd)) deny('publishing packages is a release-pipeline action');
if (/git\s+push\b.*(--force|-f\b|--force-with-lease)/.test(cmd)) deny('force push');
if (/git\s+push\b.*\b(main|master)\b/.test(cmd)) deny('direct push to main');
if (/\b(curl|wget|nc)\b/.test(cmd)) {
  const hosts = [...cmd.matchAll(/https?:\/\/([^/\s'"]+)/g)].map(m => m[1].toLowerCase());
  if (hosts.length === 0 || hosts.some(h => !ALLOWED_HOSTS.includes(h))) deny(`network call to a host outside the allowlist (${hosts.join(', ') || 'unknown host'})`);
}
console.log(JSON.stringify({ permission: 'allow' }));
