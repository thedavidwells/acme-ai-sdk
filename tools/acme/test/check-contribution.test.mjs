// Fixture tests for the checker itself: known-good and known-bad diffs in throwaway git repos.
// Run: node --test tools/acme/test/*.test.mjs   (also runs in CI as the checker-fixtures job)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CHECKER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../check-contribution.mjs');

function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acme-fixture-'));
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8' });
  const write = (f, body) => { fs.mkdirSync(path.join(dir, path.dirname(f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), body); };
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'fixture@example.com');
  git('config', 'user.name', 'fixture');
  write('packages/cartesia/package.json', JSON.stringify({ name: '@ai-sdk/cartesia', dependencies: { '@ai-sdk/provider-utils': '1.0.0', zod: '4.0.0' } }));
  write('packages/cartesia/src/cartesia-speech-model-options.ts', "import { z } from 'zod/v4';\nexport const options = z.object({\n  language: z.string().nullish(),\n  speed: z.number().nullish(),\n});\n");
  write('packages/cartesia/src/cartesia-speech-model.ts', "export function speak() {\n  return 1;\n}\n");
  write('packages/cartesia/src/cartesia-speech-model.test.ts', "import { it, expect } from 'vitest';\nit('speaks', () => { expect(1).toBe(1); });\n");
  write('packages/openai/package.json', JSON.stringify({ name: '@ai-sdk/openai' }));
  write('packages/openai/src/index.ts', 'export const x = 1;\n');
  git('add', '-A');
  git('commit', '-qm', 'baseline');
  git('checkout', '-qb', 'task');
  return { dir, write, append: (f, body) => fs.appendFileSync(path.join(dir, f), body) };
}

function run(dir, env = {}) {
  const r = spawnSync('node', [CHECKER, '--base', 'main', '--json'], { cwd: dir, encoding: 'utf8', env: { ...process.env, ACME_EXCEPTION_BY: '', ...env } });
  return { code: r.status, out: JSON.parse(r.stdout) };
}

function goodChange(repo) {
  repo.append('packages/cartesia/src/cartesia-speech-model-options.ts', 'export const locale = z.string().nullish();\n');
  repo.append('packages/cartesia/src/cartesia-speech-model.ts', 'export const withLocale = true;\n');
  repo.append('packages/cartesia/src/cartesia-speech-model.test.ts', "it('sends locale', () => { expect(true).toBe(true); });\n");
  repo.write('.changeset/cartesia-locale.md', "---\n'@ai-sdk/cartesia': patch\n---\n\nAdd locale option.\n");
}

test('known-good diff passes with no failures', () => {
  const repo = makeRepo();
  goodChange(repo);
  const { code, out } = run(repo.dir);
  assert.equal(code, 0, JSON.stringify(out.failures));
  assert.equal(out.failures.length, 0);
});

test('known-bad diff fails on scope, boundary, convention, changeset, and tests', () => {
  const repo = makeRepo();
  repo.append('packages/cartesia/src/cartesia-speech-model.ts', "import { x } from '@ai-sdk/openai';\nexport const parsed = JSON.parse('{}');\n");
  repo.append('packages/openai/src/index.ts', 'export const y = 2;\n');
  const { code, out } = run(repo.dir);
  assert.equal(code, 1);
  const checks = new Set(out.failures.map(f => f.check));
  for (const c of ['scope', 'boundary', 'convention', 'changeset', 'tests']) assert.ok(checks.has(c), `expected a ${c} failure`);
});

test('.optional() in a .nullish() options file warns but never blocks (D18)', () => {
  const repo = makeRepo();
  goodChange(repo);
  repo.append('packages/cartesia/src/cartesia-speech-model-options.ts', 'export const normalization = z.boolean().optional();\n');
  const { code, out } = run(repo.dir);
  assert.equal(code, 0);
  assert.ok(out.warnings.some(w => w.msg.includes('.optional()')));
});

test('acme:exception by a CODEOWNER logs findings instead of failing', () => {
  const repo = makeRepo();
  goodChange(repo);
  repo.append('packages/cartesia/src/cartesia-speech-model.ts', "export const parsed = JSON.parse('{}');\n");
  const { code, out } = run(repo.dir, { ACME_EXCEPTION_BY: 'platform-owner' });
  assert.equal(code, 0);
  assert.ok(out.excepted.some(x => x.check === 'convention'));
});

test('acme:exception never excepts platform-owned paths', () => {
  const repo = makeRepo();
  goodChange(repo);
  repo.write('.github/workflows/ci.yml', 'name: weakened\n');
  const { code, out } = run(repo.dir, { ACME_EXCEPTION_BY: 'platform-owner' });
  assert.equal(code, 1);
  assert.ok(out.failures.some(f => f.check === 'scope'));
});
