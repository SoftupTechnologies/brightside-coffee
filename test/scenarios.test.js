import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkForm } from '../src/checkout/order.js';
import { SCENARIOS, normalOrder, scenarioInput } from '../src/scenarios.js';

const NOW = new Date('2026-11-10T09:00:00Z');

test('the normal order and every scenario fill a form the checkout accepts', () => {
  for (const n of [0, ...SCENARIOS.map((s) => s.n)]) assert.deepEqual(checkForm(scenarioInput(n, NOW)), {}, `scenario ${n}`);
});

test('the scenarios are numbered 1 to 5 and each changes the normal order', () => {
  assert.deepEqual(SCENARIOS.map((s) => s.n), [1, 2, 3, 4, 5]);
  const normal = normalOrder(NOW);
  for (const s of SCENARIOS) assert.notDeepEqual(scenarioInput(s.n, NOW), normal, `scenario ${s.n}`);
  assert.throws(() => scenarioInput(6, NOW), /no scenario 6/);
});

test('the date scenario writes a day after the 12th as DD/MM/YYYY, and the normal order an ISO day ahead', () => {
  assert.equal(normalOrder(NOW).deliveryDate, '2026-11-14');
  assert.equal(scenarioInput(3, NOW).deliveryDate, '13/11/2026');
  assert.equal(scenarioInput(3, new Date('2026-11-28T09:00:00Z')).deliveryDate, '13/12/2026');
});
