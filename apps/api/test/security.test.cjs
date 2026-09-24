require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Keypair, Asset, Networks } = require('@stellar/stellar-sdk');
const { TESTNET_XLM } = require('@pagajusto/shared');
const { AuthService } = require('../dist/from-src/auth/auth.service');
const { messageDigest, verifyWalletMessage } = require('../dist/from-src/auth/wallet-signature');
const { jwtSecret } = require('../dist/from-src/auth/jwt-secret');
const { ChainPendingGuard } = require('../dist/from-src/agreements/chain-pending.guard');
const { AgreementsController } = require('../dist/from-src/agreements/agreements.controller');
const { AgreementsService } = require('../dist/from-src/agreements/agreements.service');

test('native XLM address is derived from Testnet, not configurable', () => assert.equal(Asset.native().contractId(Networks.TESTNET), TESTNET_XLM));
test('official SEP-53 signature vector verifies and raw signatures do not', () => {
  const address = 'GBXFXNDLV4LSWA4VB7YIL5GBD7BVNR22SGBTDKMO2SBZZHDXSKZYCP7L';
  const signature = 'fO5dbYhXUhBMhe6kId/cuVq/AfEnHRHEvsP8vXh03M1uLpi5e46yO2Q8rEBzu3feXQewcQE5GArp88u6ePK6BA==';
  assert.equal(verifyWalletMessage(address, 'Hello, World!', signature), true);
  assert.equal(verifyWalletMessage(address, 'Different', signature), false);
  const kp = Keypair.random();
  assert.equal(verifyWalletMessage(kp.publicKey(), 'Hello', Buffer.from(kp.sign(Buffer.from('Hello'))).toString('base64')), false);
});
test('reject weak JWT configuration', () => { assert.throws(() => jwtSecret(undefined)); assert.throws(() => jwtSecret('dev-secret')); });

function authFixture() {
  const rows = new Map();
  const prisma = { authChallenge: {
    create: async ({data}) => { rows.set(data.nonce, { ...data, usedAt: null }); },
    findUnique: async ({where}) => rows.has(where.nonce) ? { ...rows.get(where.nonce) } : null,
    updateMany: async ({where, data}) => {
      const row = rows.get(where.nonce);
      if (!row || row.usedAt || row.address !== where.address || row.expiresAt <= where.expiresAt.gt) return { count: 0 };
      Object.assign(row, data); return { count: 1 };
    },
  }, user: { upsert: async ({create}) => ({ id: 'user', ...create }) } };
  return { service: new AuthService(prisma, { sign: () => 'test-token' }), rows };
}
test('challenge is single use even for concurrent valid signatures', async () => {
  const { service } = authFixture(); const kp = Keypair.random();
  const c = await service.getChallenge(kp.publicKey());
  const sig = Buffer.from(kp.sign(messageDigest(c.message))).toString('base64');
  const results = await Promise.allSettled([1,2].map(() => service.verifySignature(kp.publicKey(), sig, c.nonce)));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  await assert.rejects(() => service.verifySignature(kp.publicKey(), sig, c.nonce));
});
test('expired challenges and impersonation are rejected', async () => {
  const { service, rows } = authFixture(); const kp = Keypair.random(); const stranger = Keypair.random();
  const c = await service.getChallenge(kp.publicKey());
  await assert.rejects(() => service.verifySignature(stranger.publicKey(), Buffer.from(stranger.sign(messageDigest(c.message))).toString('base64'), c.nonce));
  rows.get(c.nonce).expiresAt = new Date(0);
  await assert.rejects(() => service.verifySignature(kp.publicKey(), Buffer.from(kp.sign(messageDigest(c.message))).toString('base64'), c.nonce));
  await assert.rejects(() => service.getChallenge('invalid'));
});
test('all legacy financial transition routes fail closed until RPC integration', () => {
  assert.throws(() => new ChainPendingGuard().canActivate(), /Soroban/);
  for (const route of ['acceptTerms','fundAgreement','submitMilestone','requestChanges','approveMilestone','openResolution','proposeSettlement','acceptSettlement']) {
    assert.ok(Reflect.getMetadata('__guards__', AgreementsController.prototype[route]).includes(ChainPendingGuard), route);
  }
});
test('knowing an agreement id does not grant private access', async () => {
  const service = new AgreementsService({ agreement: { findUnique: async () => ({ clientAddress: 'client', freelancerAddress: 'freelancer' }) } });
  await assert.rejects(() => service.getPrivateAgreement('agreement', 'stranger'), /no encontrado/);
});
