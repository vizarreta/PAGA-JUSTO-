import { test } from 'node:test';
import assert from 'node:assert/strict';
import { postAuth, walletErrorMessage } from '../src/lib/authRequest.ts';

test('API stopped: an empty proxy 500 reports server availability', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 500 }));
  await assert.rejects(() => postAuth('challenge', { publicKey: 'wallet' }), /servidor de acceso no está disponible/);
});

test('network failure reports server availability', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(() => postAuth('verify', {}), /servidor de acceso no está disponible/);
});

test('a rejected signature preserves the actionable API message', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ message: 'Desafío expirado, utilizado o inválido' }, { status: 401 }));
  await assert.rejects(() => postAuth('verify', {}), /Desafío expirado, utilizado o inválido/);
});

test('invalid JSON cannot be treated as a prepared challenge', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>error</html>'));
  await assert.rejects(() => postAuth('challenge', {}), /respuesta incompleta/);
});

test('challenge is posted as JSON and returned on success', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/auth/challenge');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), { publicKey: 'wallet' });
    return Response.json({ nonce: 'nonce', message: 'message' }, { status: 201 });
  });
  assert.deepEqual(await postAuth('challenge', { publicKey: 'wallet' }), { nonce: 'nonce', message: 'message' });
});

test('Freighter error objects display their message, not object Object', () => {
  assert.equal(walletErrorMessage({ code: -1, message: 'User declined access' }, 'Fallback'), 'User declined access');
  assert.equal(walletErrorMessage('Cancelled', 'Fallback'), 'Cancelled');
  assert.equal(walletErrorMessage(undefined, 'Fallback'), 'Fallback');
});
