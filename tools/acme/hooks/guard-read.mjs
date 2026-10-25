#!/usr/bin/env node
// beforeReadFile hook. Keeps secrets out of agent context.
import fs from 'node:fs';
let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
const file = String(input.file_path || input.path || '');
if (/(^|\/)\.env(\.|$)|\.pem$|\.key$|(^|\/)\.npmrc$/.test(file) && !/\.env\.example$/.test(file)) {
  console.log(JSON.stringify({ permission: 'deny', user_message: `Blocked read of ${file} (secrets stay out of agent context).` }));
} else {
  console.log(JSON.stringify({ permission: 'allow' }));
}
