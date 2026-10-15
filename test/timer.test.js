import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultTimer, clock, publicView, applyEdit, applyAction, InputError } from '../src/timer.js';

const T = Date.parse('2026-10-16T03:00:00Z');
const TARGET = '2026-10-16T03:30:00.000Z';

test('target mode hides the envelope until zero', () => {
  const p = applyEdit(defaultTimer(), { mode: 'target', targetAt: TARGET });
  const before = publicView(p, T);
  assert.equal(before.revealed, false);
  assert.equal(before.envelope, null);
  assert.equal(before.remainingSeconds, 30 * 60);
  const after = publicView(p, Date.parse(TARGET));
  assert.equal(after.revealed, true);
  assert.equal(after.envelope.title, p.envelope.title);
});

test('target mode with no time set stays closed', () => {
  const p = applyEdit(defaultTimer(), { mode: 'target' });
  assert.equal(publicView(p, T).revealed, false);
});

test('open now reveals early, back to timer hides again', () => {
  const p = defaultTimer();
  applyAction(p, 'reveal', T);
  assert.equal(publicView(p, T).revealed, true);
  applyAction(p, 'hide', T);
  assert.equal(publicView(p, T).revealed, false);
});

test('duration mode: start, pause, resume, reset', () => {
  const p = applyEdit(defaultTimer(), { mode: 'duration', durationSeconds: 60 });
  assert.equal(clock(p, T).remainingMs, 60_000);
  assert.throws(() => applyAction(p, 'pause', T), InputError);
  applyAction(p, 'start', T);
  assert.equal(clock(p, T + 20_000).remainingMs, 40_000);
  applyAction(p, 'pause', T + 20_000);
  assert.equal(p.remainingSeconds, 40);
  assert.equal(clock(p, T + 999_000).remainingMs, 40_000);
  applyAction(p, 'resume', T + 30_000);
  assert.equal(clock(p, T + 70_000).revealed, true);
  applyAction(p, 'hide', T + 70_000);
  assert.equal(p.status, 'idle');
  assert.equal(clock(p, T + 70_000).revealed, false);
});

test('start is refused in target mode', () => {
  const p = applyEdit(defaultTimer(), { mode: 'target', targetAt: TARGET });
  assert.throws(() => applyAction(p, 'start', T), /duration mode/);
});

test('edits are validated and trimmed', () => {
  const p = defaultTimer();
  assert.throws(() => applyEdit(p, { targetAt: 'not a date' }), InputError);
  assert.throws(() => applyEdit(p, { durationSeconds: 0 }), InputError);
  assert.throws(() => applyEdit(p, { mode: 'other' }), InputError);
  applyEdit(p, { headline: 'x'.repeat(200), envelope: { body: 'y'.repeat(900) } });
  assert.equal(p.headline.length, 80);
  assert.equal(p.envelope.body.length, 400);
});
