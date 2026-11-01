// Run: npm test   (Node >= 22.18 strips TypeScript types natively)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  evaluate,
  explain,
  judge,
  type Rule,
  type PacketSpec,
} from '../src/game/engine.ts';
import { CAMPAIGN, dailyLevel } from '../src/game/levels.ts';

const allowWeb: Rule = { action: 'allow', app: 'web', from: 'internet', to: 'web' };
const denySsh: Rule = { action: 'deny', app: 'ssh', from: 'any', to: 'any' };
const allowBranchSsh: Rule = { action: 'allow', app: 'ssh', from: 'branch', to: 'any' };

test('first matching rule decides', () => {
  const p: PacketSpec = { app: 'ssh', from: 'branch', to: 'db' };
  assert.equal(evaluate([denySsh, allowBranchSsh], p).action, 'deny');
  assert.equal(evaluate([allowBranchSsh, denySsh], p).action, 'allow');
  assert.equal(evaluate([allowBranchSsh, denySsh], p).matchIndex, 0);
});

test('no match falls through to implicit default deny', () => {
  const v = evaluate([allowWeb], { app: 'smb', from: 'internet', to: 'db' });
  assert.deepEqual(v, { matchIndex: -1, action: 'deny' });
});

test('empty slots are skipped', () => {
  const v = evaluate([null, allowWeb], { app: 'web', from: 'internet', to: 'web' });
  assert.equal(v.matchIndex, 1);
});

test('judge maps verdict pairs to outcomes', () => {
  const A = { matchIndex: 0, action: 'allow' as const };
  const D = { matchIndex: 0, action: 'deny' as const };
  assert.equal(judge(A, A), 'served');
  assert.equal(judge(D, D), 'blocked');
  assert.equal(judge(A, D), 'breach');
  assert.equal(judge(D, A), 'outage');
});

test('SENTRY explains a shadowed allow', () => {
  const p: PacketSpec = { app: 'ssh', from: 'branch', to: 'db' };
  const rules = [denySsh, allowBranchSsh];
  const msg = explain('outage', p, evaluate(rules, p), rules);
  assert.match(msg, /rule #1/);
  assert.match(msg, /move the ALLOW above/);
});

test('every campaign level is solvable by its own solution and dealt cards', () => {
  for (const lvl of CAMPAIGN) {
    assert.ok(lvl.solution.length <= lvl.slots, `${lvl.id} solution fits`);
    for (const r of lvl.solution) {
      assert.ok(
        lvl.cards.some((c) => JSON.stringify(c) === JSON.stringify(r)),
        `${lvl.id} deals every solution card`,
      );
    }
    assert.ok(lvl.packets.length >= 5, `${lvl.id} has enough packets`);
  }
});

test('daily puzzle is deterministic per date and differs across dates', () => {
  const a = dailyLevel('2026-11-18');
  const b = dailyLevel('2026-11-18');
  const c = dailyLevel('2026-11-19');
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.solution, c.solution);
});

test('daily puzzles over a year are well-formed and non-trivial', () => {
  const start = new Date('2026-11-01T00:00:00Z');
  for (let d = 0; d < 365; d++) {
    const day = new Date(start.getTime() + d * 86400000).toISOString().slice(0, 10);
    const lvl = dailyLevel(day);
    assert.equal(lvl.cards.length, lvl.solution.length + 1, day);
    const naive = lvl.cards.slice(0, lvl.slots);
    const naiveOk = lvl.packets.every(
      (p) => evaluate(naive, p).action === evaluate(lvl.solution, p).action,
    );
    assert.equal(naiveOk, false, `${day} should not be solved by dealt order`);
  }
});
