import { createHash } from 'node:crypto';
import { Keypair, StrKey } from '@stellar/stellar-sdk';

export function messageDigest(message: string): Buffer {
  return createHash('sha256').update('Stellar Signed Message:\n', 'utf8').update(message, 'utf8').digest();
}

export function verifyWalletMessage(address: string, message: string, signature: string): boolean {
  if (!StrKey.isValidEd25519PublicKey(address) || typeof signature !== 'string' ||
      !/^[A-Za-z0-9+/]{86}==$/.test(signature)) return false;
  const bytes = Buffer.from(signature, 'base64');
  if (bytes.length !== 64 || bytes.toString('base64') !== signature) return false;
  try { return Keypair.fromPublicKey(address).verify(messageDigest(message), bytes); }
  catch { return false; }
}
