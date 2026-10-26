#!/usr/bin/env node
/**
 * Automated gate before agent handoff or PR review.
 * Runs lint + typecheck + full unit tests + Edge Function Deno tests (frozen lockfile).
 * Prints logic-review reminders for the agent.
 */
const { execSync } = require('child_process');
const { getWorktreeFingerprint, writeStamp } = require('./pre-handoff-utils');

const LOGIC_REVIEW = [
  'RxJS + session: Is logout (null) visible to distinctUntilChanged (not hidden by filter)?',
  'Cache: Does every write path invalidate (logout, admin map/unmap, account switch)?',
  'Async races: Are in-flight loads ignored when loadedEmail / session / route changes?',
  'Empty vs missing: Can UI show stale data when list id exists but members are empty?',
  'Angular DI: Any new root-service constructor cycle (use lazy Injector.get if needed)?',
  'OnPush: markForCheck or signals after subscribe/async updates?',
  'Bug fixes: Regression test that fails without the fix (not only happy-path)?',
];

function run(command, label) {
  console.log(`\n▶ ${label}\n`);
  execSync(command, { stdio: 'inherit', env: process.env });
}

console.log('Pre-handoff gate (Prayer App)\n');
console.log('After this passes, agents must still run ReadLints on touched files');
console.log('and complete the logic review below.\n');
console.log('Logic review — answer for each item that applies to your diff:');
LOGIC_REVIEW.forEach((line, index) => {
  console.log(`  ${index + 1}. ${line}`);
});

try {
  run('npm run lint', 'ESLint (errors only)');
  run('npm run verify', 'Typecheck + unit tests');
  run('npm run test:deno', 'Edge Function Deno tests (frozen deno.lock)');
} catch {
  console.error('\n✗ Pre-handoff failed. Fix the errors above, then re-run: npm run pre-handoff\n');
  process.exit(1);
}

const fingerprint = getWorktreeFingerprint();
if (fingerprint) {
  writeStamp(fingerprint);
}

console.log('\n✓ Automated pre-handoff passed.');
console.log('  • ReadLints on every file you edited');
console.log('  • Logic review: .cursor/rules/verify-before-done.mdc');
console.log('  • Skill: .cursor/skills/pre-handoff/SKILL.md');
console.log('  • Optional: run your review agent on the branch diff\n');
