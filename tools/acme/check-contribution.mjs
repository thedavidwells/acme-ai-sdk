#!/usr/bin/env node

// This is our first-contribution guardrail script.
// This same script runs in the Cursor stop hook and in the CI pipeline.
// Deterministic (same diff, same verdict) so it can safely block a merge. No network and no
// dependencies, so it runs identically offline, adds no supply-chain risk, and starts in seconds.
// Usage: node tools/acme/check-contribution.mjs [--base <ref>] [--json]
// Exit 0 = pass (warnings allowed), 1 = at least one failure.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Parse command-line arguments, looking for --base <ref> and --json.
const args = process.argv.slice(2);
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : process.env.ACME_BASE || 'origin/main';
const asJson = args.includes('--json');
const sh = cmd => execSync(cmd, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

// Committed + staged + unstaged + untracked changes relative to the merge base.
const mergeBase = sh(`git merge-base ${base} HEAD`).trim();
const tracked = sh(`git diff --name-only ${mergeBase}`).split('\n').filter(Boolean);
const untracked = sh('git ls-files --others --exclude-standard').split('\n').filter(Boolean);
// .acme/ holds local hook audit logs (gitignored in the fork); never part of a contribution.
const changed = [...new Set([...tracked, ...untracked])].filter(f => !f.startsWith('.acme/')).filter(f => fs.existsSync(f) || tracked.includes(f));
const addedLines = file => {
  if (untracked.includes(file)) return fs.readFileSync(file, 'utf8').split('\n');
  return sh(`git diff -U0 ${mergeBase} -- "${file}"`).split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++')).map(l => l.slice(1));
};

const failures = [];
const warnings = [];
const fail = (check, msg, fix) => failures.push({ check, msg, fix });
const warn = (check, msg, fix) => warnings.push({ check, msg, fix });

// 1. Scope: Certain paths are off limits for first-contributions. A first contribution is only allowed to touch one published package.
const FORBIDDEN = [
  /^\.github\//, /^\.cursor\//, /^\.agents\//, /^\.claude\//, /^\.codex\//, /^skills\//, /^tools\//,
  /^AGENTS\.md$/, /^pnpm-lock\.yaml$/, /^pnpm-workspace\.yaml$/, /^package\.json$/, /^\.changeset\/config\.json$/,
  /^packages\/codemod\//, /^content\/docs\/08-migration-guides\//,
];
for (const f of changed) {
  if (FORBIDDEN.some(re => re.test(f))) fail('scope', `\`${f}\` is a platform-owned path.`, 'Revert it. Platform files change only through a platform-change PR reviewed by CODEOWNERS.');
}
const pkgOf = f => (f.match(/^packages\/([^/]+)\//) || [])[1];
const touchedPkgs = [...new Set(changed.map(pkgOf).filter(Boolean))];
if (touchedPkgs.length > 1) fail('scope', `Touches ${touchedPkgs.length} packages (${touchedPkgs.join(', ')}).`, 'Split into one PR per package. First contributions stay inside one package.');

// Mirrors upstream .github/workflows/actions/verify-changesets isCodeFile().
const TEST_RE = /\.(test|spec)\.(ts|tsx|js|jsx|mts|mjs|cts|cjs)$|\.test-d\.ts$/;
const isCode = f => f.startsWith('packages/') && !/^packages\/[^/]+\/(scripts|examples|docs)\//.test(f) && !TEST_RE.test(f) && !f.endsWith('.md') && /\.(ts|tsx|js|jsx|mts|mjs|cts|cjs)$/.test(f);
const codeFiles = changed.filter(f => isCode(f) && fs.existsSync(f));
const pkgJson = p => JSON.parse(fs.readFileSync(`packages/${p}/package.json`, 'utf8'));

// 2. Dependency boundary: no new dependencies, no imports outside the package's declared deps, no escaping relative imports.
for (const p of touchedPkgs) {
  const file = `packages/${p}/package.json`;
  if (!changed.includes(file)) continue;
  let before = {};
  try { before = JSON.parse(sh(`git show ${mergeBase}:${file}`)); } catch {}
  const after = pkgJson(p);
  for (const field of ['dependencies', 'peerDependencies', 'devDependencies', 'optionalDependencies']) {
    for (const dep of Object.keys(after[field] || {})) {
      if (!(before[field] || {})[dep]) fail('boundary', `New ${field} entry \`${dep}\` in ${file}.`, 'New dependencies need platform approval (label platform:dep-approved plus CODEOWNERS review).');
    }
  }
}
const IMPORT_RE = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/g;
for (const f of codeFiles) {
  const p = pkgOf(f);
  const meta = pkgJson(p);
  const allowed = new Set([...Object.keys(meta.dependencies || {}), ...Object.keys(meta.peerDependencies || {}), ...Object.keys(meta.devDependencies || {})]);
  for (const line of addedLines(f)) {
    for (const m of line.matchAll(IMPORT_RE)) {
      const spec = m[1];
      if (spec.startsWith('node:')) continue;
      if (spec.startsWith('.')) {
        const resolved = path.normalize(path.join(path.dirname(f), spec));
        if (!resolved.startsWith(`packages/${p}/`)) fail('boundary', `\`${f}\` imports \`${spec}\`, which resolves outside packages/${p}.`, `Import through a declared dependency of @ai-sdk/${p} instead.`);
        continue;
      }
      const root = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
      if (!allowed.has(root)) fail('boundary', `\`${f}\` imports \`${spec}\`, which is not a declared dependency of ${meta.name}.`, 'Use an existing dependency, or request platform approval for a new one.');
    }
  }
}

// 3. Conventions from AGENTS.md that lint does not enforce today (checked on added lines only, so legacy code does not block).
for (const f of codeFiles) {
  const lines = addedLines(f);
  lines.forEach(line => {
    if (/\bJSON\.parse\s*\(/.test(line)) fail('convention', `\`${f}\` adds \`JSON.parse\`: "${line.trim()}"`, 'Use parseJSON or safeParseJSON from @ai-sdk/provider-utils (AGENTS.md, JSON parsing).');
    if (/\brequire\s*\(/.test(line)) fail('convention', `\`${f}\` adds \`require()\`.`, 'Use ESM imports (AGENTS.md, Do Not).');
    if (/from\s+['"]zod['"]/.test(line)) fail('convention', `\`${f}\` imports bare \`zod\`.`, "Import from 'zod/v4' (konsistent rule package-must-import-zod-from-v4).");
    if (/console\.log\(/.test(line)) warn('convention', `\`${f}\` adds console.log.`, 'Remove debug logging from library code.');
  });
}

// 3b. Deliberately NOT enforced: .optional() vs .nullish() in provider options (see DECISIONS.md D18).
//     AGENTS.md says .optional(); existing provider files (Cartesia's options file) use .nullish(). 
//     New contributors should be able to match the existing code patterns, so we only warn when an added line breaks the
//     file's own majority style, and defer to the package's local convention.
for (const f of codeFiles.filter(f => /-options\.ts$/.test(f))) {
  const src = fs.readFileSync(f, 'utf8');
  const nullish = (src.match(/\.nullish\(\)/g) || []).length;
  const optional = (src.match(/\.optional\(\)/g) || []).length;
  const local = nullish > optional ? '.nullish()' : optional > nullish ? '.optional()' : null;
  if (!local) continue;
  const other = local === '.nullish()' ? '.optional()' : '.nullish()';
  if (addedLines(f).some(line => line.includes(other))) warn('convention', `\`${f}\` adds ${other}, but this file uses ${local} (${nullish} nullish, ${optional} optional).`, `Advisory only (not enforced): match the file's ${local}, and note the AGENTS.md conflict under Future Work so the code owner can decide.`);
}
for (const f of changed.filter(f => TEST_RE.test(f) && fs.existsSync(f))) {
  for (const line of addedLines(f)) {
    if (/\b(it|test|describe)\.only\s*\(/.test(line)) fail('tests', `\`${f}\` adds a focused test (.only).`, 'Remove .only so the whole suite runs.');
    if (/\b(it|test|describe)\.skip\s*\(/.test(line)) warn('tests', `\`${f}\` adds a skipped test.`, 'Explain the skip in the PR or remove it.');
  }
}

// 4. Deprecated APIs: registry built from @deprecated JSDoc on exported symbols in core packages.
//    This is a best-effort check to help new contributors avoid using deprecated APIs.
const deprecated = new Map();
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => {
  const full = path.join(dir, d.name);
  if (d.isDirectory()) return d.name === 'node_modules' ? [] : walk(full);
  return full.endsWith('.ts') && !TEST_RE.test(full) ? [full] : [];
});
for (const root of ['packages/ai/src', 'packages/provider/src', 'packages/provider-utils/src']) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    const src = fs.readFileSync(file, 'utf8');
    const re = /\/\*\*((?:(?!\*\/)[\s\S])*?@deprecated((?:(?!\*\/)[\s\S])*?))\*\/\s*export\s+(?:declare\s+)?(?:async\s+)?(?:const|function|class|type|interface|enum)\s+([A-Za-z0-9_$]+)/g;
    for (const m of src.matchAll(re)) deprecated.set(m[3], m[2].replace(/\s*\*\s*/g, ' ').trim().slice(0, 140));
  }
}
for (const f of changed.filter(f => /\.(ts|tsx)$/.test(f) && fs.existsSync(f) && !f.startsWith('packages/ai/src') && !f.startsWith('packages/provider'))) {
  for (const line of addedLines(f)) {
    for (const [name, hint] of deprecated) {
      if (new RegExp(`\\b${name.replace(/\$/g, '\\$')}\\b`).test(line)) fail('deprecated', `\`${f}\` uses deprecated \`${name}\`.`, hint || 'See the @deprecated note at the declaration.');
    }
  }
}

// 5. Changesets: a changeset is a small .changeset/*.md file that tells the release tool which
//    package to bump and what to put in the changelog. Any source change in a published package
//    needs one that names that package, and it must be a patch bump. Maintainers decide minor
//    and major versions (CONTRIBUTING.md), so a first contribution never picks them.
const changesets = changed.filter(f => /^\.changeset\/[a-z0-9-]+\.md$/.test(f) && fs.existsSync(f));
const bumps = {};
for (const f of changesets) {
  const fm = (fs.readFileSync(f, 'utf8').match(/---\n([\s\S]+?)\n---/) || [])[1] || '';
  for (const line of fm.split('\n')) {
    const [name, bump] = line.split(':').map(s => s && s.trim().replace(/^['"]|['"]$/g, ''));
    if (!name) continue;
    bumps[name] = bump;
    if (bump !== 'patch') fail('changeset', `${f} uses \`${bump}\` for ${name}.`, 'Use patch. Maintainers decide on minor or major (CONTRIBUTING.md).');
  }
}
for (const p of [...new Set(codeFiles.map(pkgOf))]) {
  const name = pkgJson(p).name;
  if (pkgJson(p).private) continue;
  if (!bumps[name]) fail('changeset', `Code in ${name} changed but no changeset names it.`, `Run \`pnpm changeset\`, select ${name}, choose patch, and describe the change for users.`);
}

// 6. Tests: changed source needs a new or updated test case with an assertion in the same package.
for (const p of [...new Set(codeFiles.map(pkgOf))]) {
  const tests = changed.filter(f => f.startsWith(`packages/${p}/`) && TEST_RE.test(f) && fs.existsSync(f));
  if (tests.length === 0) { fail('tests', `Source in packages/${p} changed with no test changes.`, 'Add a colocated *.test.ts case that fails without your change.'); continue; }
  const added = tests.flatMap(addedLines).join('\n');
  if (!/\b(it|test)\s*\(/.test(added)) fail('tests', `Test changes in packages/${p} add no new test case.`, 'Add an it(...) case for the new behavior, not only edits to existing ones.');
  if (!/\bexpect\s*\(|toMatchInlineSnapshot|toMatchSnapshot/.test(added)) fail('tests', `New tests in packages/${p} contain no assertions.`, 'Assert on the request body, warnings, or result.');
  for (const f of codeFiles.filter(f => pkgOf(f) === p)) {
    const colocated = f.replace(/\.(ts|tsx)$/, '.test.$1');
    if (fs.existsSync(colocated) && !changed.includes(colocated) && !/-options\.ts$|-api-types\.ts$|index\.ts$/.test(f)) warn('tests', `\`${f}\` changed but its colocated test \`${path.basename(colocated)}\` did not.`, 'Cover the change next to the code it changes.');
  }
}

// Exception override: CI sets ACME_EXCEPTION_BY only when a CODEOWNER (not a bot) applied the acme:exception label.
// Excepted findings are logged in the summary. Platform-path scope failures are never excepted.
const exceptionBy = process.env.ACME_EXCEPTION_BY || '';
const excepted = [];
if (exceptionBy) {
  for (const x of failures.splice(0)) (x.check === 'scope' && /platform-owned/.test(x.msg) ? failures : excepted).push(x);
}

const result = { base, mergeBase, changed, packages: touchedPkgs, deprecatedSymbolsIndexed: deprecated.size, failures, warnings, excepted, exceptionBy };
if (asJson) { console.log(JSON.stringify(result, null, 2)); }
else {
  const row = x => `- [${x.check}] ${x.msg}\n  Fix: ${x.fix}`;
  console.log(`Acme guardrails: ${failures.length} failure(s), ${warnings.length} warning(s). ${changed.length} changed file(s), package(s): ${touchedPkgs.join(', ') || 'none'}. ${deprecated.size} deprecated symbols indexed.`);
  if (failures.length) console.log(`\nFailures:\n${failures.map(row).join('\n')}`);
  if (warnings.length) console.log(`\nWarnings:\n${warnings.map(row).join('\n')}`);
  if (excepted.length) console.log(`\nExcepted by @${exceptionBy} (acme:exception, CODEOWNER):\n${excepted.map(row).join('\n')}`);
}
process.exit(failures.length ? 1 : 0);
