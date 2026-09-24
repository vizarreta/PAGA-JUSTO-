// Live login regression: real API, PostgreSQL and SEP-53, with an ephemeral key.
// No wallet funding, transactions, private keys or JWTs are printed or saved.
const assert = require('node:assert/strict');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { Keypair } = require('../apps/api/node_modules/@stellar/stellar-sdk');
const { PrismaClient } = require('../apps/api/node_modules/@prisma/client');
require('../apps/api/node_modules/dotenv').config({ path: path.join(__dirname, '../apps/api/.env'), quiet: true });

const base = new URL(process.argv[2] || 'http://127.0.0.1:3001');
assert.ok(['127.0.0.1', 'localhost'].includes(base.hostname), 'Run against the local development server.');
const wallet = Keypair.random();
const publicKey = wallet.publicKey();
const prisma = new PrismaClient();

async function post(action, body) {
  return fetch(new URL(`/api/auth/${action}`, base), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(20_000),
  });
}

async function main() {
  try {
    const challengeRes = await post('challenge', { publicKey });
    assert.equal(challengeRes.status, 201, 'Challenge endpoint must be ready.');
    const { nonce, message } = await challengeRes.json();
    assert.match(nonce, /^[a-f0-9]{64}$/);
    assert.ok(message.includes(publicKey) && message.includes('Stellar Testnet'));
    const digest = createHash('sha256').update('Stellar Signed Message:\n').update(message).digest();
    const signature = Buffer.from(wallet.sign(digest)).toString('base64');
    const invalid = await post('verify', { publicKey, nonce, signature: Buffer.alloc(64).toString('base64') });
    assert.equal(invalid.status, 401, 'Invalid signatures must be rejected.');
    const attempts = await Promise.all([1, 2].map(() => post('verify', { publicKey, signature, nonce })));
    assert.deepEqual(attempts.map(r => r.status).sort(), [201, 401], 'Only one concurrent login can consume the challenge.');
    const { token, user } = await attempts.find(r => r.status === 201).json();
    assert.equal(user.address, publicKey);
    assert.ok(token);
    const me = await fetch(new URL('/api/auth/me', base), { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000) });
    assert.equal(me.status, 200);
    assert.equal((await me.json()).address, publicKey);
    const replay = await post('verify', { publicKey, signature, nonce });
    assert.equal(replay.status, 401, 'Consumed challenges cannot be replayed.');
    const noToken = await fetch(new URL('/api/auth/me', base), { signal: AbortSignal.timeout(20_000) });
    assert.equal(noToken.status, 401);
    console.log('PASS: challenge, invalid signature, valid login, concurrent replay rejection, JWT profile and unauthenticated rejection.');
  } finally {
    // Only rows belonging to the fresh random key created above are removed.
    try {
      await prisma.authChallenge.deleteMany({ where: { address: publicKey } });
      await prisma.user.deleteMany({ where: { address: publicKey } });
    } finally { await prisma.$disconnect(); }
  }
}

main().catch(error => { console.error('Auth check failed:', error.code || error.name, error instanceof assert.AssertionError ? error.message : 'Check API availability and database configuration.'); process.exitCode = 1; });
