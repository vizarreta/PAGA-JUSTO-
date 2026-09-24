const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const s = require('../dist');
const valid = () => ({ version: 1, title: 'Web', description: 'Una página', network: 'testnet',
  asset: { code: 'XLM', contractId: s.TESTNET_XLM }, clientAddress: 'G' + 'A'.repeat(55), freelancerAddress: 'G' + 'B'.repeat(55),
  totalBudgetStroops: '1000000000', milestones: [30,40,30].map((amount, index) => ({ index, title: 'Hito',
    description: 'Entrega', amountStroops: String(amount * 10000000), acceptanceCriteria: ['Carga correctamente'], dueDate: '2026-12-01T05:00:00.000Z' })),
  reviewPeriodHours: 48, revisionRounds: 2, clientMaterials: [], scopeIncluded: ['Página'], scopeExcluded: [],
  resolutionPolicy: s.RESOLUTION_POLICY, createdAt: '2026-09-24T05:00:00.000Z' });

test('100 XLM equals one billion stroops, exactly', () => assert.equal(s.xlmToStroops('100'), '1000000000'));
test('maximum native amount survives round trip beyond Number precision', () => {
  const value = '922337203685.4775807'; assert.equal(s.stroopsToXlm(s.xlmToStroops(value)), value);
});
test('decimal boundaries are exact', () => {
  assert.equal(s.xlmToStroops('0.0000001'), '1'); assert.equal(s.stroopsToXlm('300000000'), '30');
  assert.equal(s.stroopsToXlm(1000000000n - 300000000n), '70');
});
test('reject exponent, sign, whitespace, rounding, leading zero and overflow', () => {
  for (const x of ['-1','+1','1e2',' 1','1.00000001','01','NaN','922337203685.4775808']) assert.throws(() => s.xlmToStroops(x));
});
test('canonical serialization is recursively independent of object key order', () => {
  const a = { z: [{ c: 1, a: 'Perú' }], a: true }; const b = { a: true, z: [{ a: 'Perú', c: 1 }] };
  assert.equal(s.canonicalJson(a), s.canonicalJson(b));
  assert.equal(s.canonicalJson(a), '{"a":true,"z":[{"a":"Perú","c":1}]}');
});
test('canonical format rejects lossy numbers, undefined and special objects', () => {
  for (const x of [NaN, 0.1, Number.MAX_SAFE_INTEGER + 1, { x: undefined }, new Date(), 1n]) assert.throws(() => s.canonicalJson(x));
});
test('terms hash changes when criteria or money change', () => {
  const hash = x => createHash('sha256').update(s.canonicalJson(x)).digest('hex');
  const a = valid(); const b = valid(); b.milestones[0].acceptanceCriteria = ['Criterio distinto'];
  assert.notEqual(hash(a), hash(b)); assert.equal(hash(a).length, 64);
});
test('strict terms accept 30/40/30 with UTC dates', () => assert.equal(s.termsSchema.safeParse(valid()).success, true));
test('terms reject mismatched totals and reordered indices', () => {
  const a = valid(); a.totalBudgetStroops = '999'; assert.equal(s.termsSchema.safeParse(a).success, false);
  const b = valid(); b.milestones[1].index = 0; assert.equal(s.termsSchema.safeParse(b).success, false);
});
test('terms reject same wallets, Mainnet and unapproved asset', () => {
  for (const change of [a => a.freelancerAddress = a.clientAddress, a => a.network = 'mainnet', a => a.asset.code = 'USDC']) {
    const a = valid(); change(a); assert.equal(s.termsSchema.safeParse(a).success, false);
  }
});
test('invalid or malicious model outputs cannot inject actions or recipients', () => {
  for (const bad of [{ terms: valid(), questions: [], warnings: [], action: 'pay' }, { terms: null, questions: [], warnings: [] },
    { terms: { ...valid(), totalBudgetStroops: 'not-an-integer' }, questions: [], warnings: [] }])
    assert.equal(s.aiDraftSchema.safeParse(bad).success, false);
  const a = valid(); a.milestones[0].amountStroops = '1e7';
  assert.equal(s.aiDraftSchema.safeParse({ terms: a, questions: [], warnings: [] }).success, false);
});
test('agent can ask clarifying questions without inventing terms', () =>
  assert.equal(s.aiDraftSchema.safeParse({ terms: null, questions: ['¿Presupuesto?'], warnings: [] }).success, true));
test('disconnect or missing transaction is unknown, never failed or confirmed', () => {
  assert.equal(s.confirmationState(undefined, false), 'unknown');
  assert.equal(s.confirmationState('NOT_FOUND', false), 'unknown');
});
test('SUCCESS requires independent contract effect verification', () => {
  assert.equal(s.confirmationState('SUCCESS', false), 'unknown'); assert.equal(s.confirmationState('SUCCESS', true), 'confirmed');
  assert.equal(s.confirmationState('PENDING', false), 'pending_confirmation'); assert.equal(s.confirmationState('FAILED', false), 'failed');
});
