import { z } from 'zod';

export const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';
export const TESTNET_RPC = 'https://soroban-testnet.stellar.org';
export const TESTNET_XLM = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
export const MAX_STROOPS = 9223372036854775807n;
export const RESOLUTION_POLICY = 'Los pagos realizados no se revierten. El saldo pendiente solo se distribuye con aceptación de ambas partes. Sin acuerdo bilateral los fondos permanecen bloqueados; no hay mediación ni devolución automática por vencimiento en este MVP.';

export function xlmToStroops(value: string): string {
  if (!/^(0|[1-9]\d*)(\.\d{1,7})?$/.test(value)) throw new Error('Importe XLM inválido: usa hasta 7 decimales, sin signos ni exponentes.');
  const [whole, fraction = ''] = value.split('.');
  const amount = BigInt(whole) * 10000000n + BigInt(fraction.padEnd(7, '0'));
  if (amount > MAX_STROOPS) throw new Error('Importe fuera del rango admitido por XLM.');
  return amount.toString();
}

export function stroopsToXlm(value: string | bigint): string {
  const text = value.toString();
  if (!/^(0|[1-9]\d*)$/.test(text)) throw new Error('Se requieren stroops enteros no negativos.');
  const amount = BigInt(text);
  const fraction = (amount % 10000000n).toString().padStart(7, '0').replace(/0+$/, '');
  return `${amount / 10000000n}${fraction ? '.' + fraction : ''}`;
}

export const stroopsSchema = z.string().regex(/^(0|[1-9]\d*)$/).refine(v => {
  try { return BigInt(v) <= MAX_STROOPS; } catch { return false; }
}, 'Importe fuera de rango');
const positiveStroops = stroopsSchema.refine(v => /^\d+$/.test(v) && BigInt(v) > 0n, 'El importe debe ser positivo');
const text = z.string().trim().min(1).max(4000);
// The API additionally checks the StrKey checksum with Stellar SDK.
export const walletSchema = z.string().regex(/^G[A-Z2-7]{55}$/);
export const milestoneSchema = z.object({
  index: z.number().int().min(0).max(2),
  title: text.max(160), description: text,
  acceptanceCriteria: z.array(text).min(1).max(20),
  amountStroops: positiveStroops,
  dueDate: z.string().datetime(),
}).strict();

export const termsSchema = z.object({
  version: z.number().int().min(1).max(2147483647),
  title: text.max(160), description: text,
  network: z.literal('testnet'),
  asset: z.object({ code: z.literal('XLM'), contractId: z.literal(TESTNET_XLM) }).strict(),
  clientAddress: walletSchema, freelancerAddress: walletSchema,
  totalBudgetStroops: positiveStroops,
  milestones: z.array(milestoneSchema).min(1).max(3),
  reviewPeriodHours: z.number().int().min(1).max(720),
  revisionRounds: z.number().int().min(0).max(20),
  clientMaterials: z.array(text).max(30),
  scopeIncluded: z.array(text).min(1).max(30),
  scopeExcluded: z.array(text).max(30),
  resolutionPolicy: z.literal(RESOLUTION_POLICY),
  createdAt: z.string().datetime(),
}).strict().superRefine((terms, context) => {
  if (terms.clientAddress === terms.freelancerAddress) context.addIssue({ code: 'custom', message: 'Las wallets deben ser diferentes' });
  if (terms.milestones.some((m, i) => m.index !== i)) context.addIssue({ code: 'custom', message: 'Los hitos deben ser secuenciales desde cero' });
  // Refinements also run after a field validation fails; do not throw on malformed model output.
  if (terms.milestones.every(m => /^\d+$/.test(m.amountStroops)) && /^\d+$/.test(terms.totalBudgetStroops)) {
    if (terms.milestones.reduce((sum, m) => sum + BigInt(m.amountStroops), 0n) !== BigInt(terms.totalBudgetStroops))
      context.addIssue({ code: 'custom', message: 'Los hitos deben sumar exactamente el presupuesto' });
  }
});
export type AgreementTerms = z.infer<typeof termsSchema>;

/** PagaJusto canonical JSON v1: recursively sorted object keys, ordered arrays,
 * JSON string escaping, finite safe integers only, no undefined or prototypes.
 * Hash the UTF-8 bytes of this exact string with SHA-256. See docs/canonical-terms.md.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isSafeInteger(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype)
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalJson((value as Record<string, unknown>)[key])).join(',') + '}';
  throw new Error('Valor no admitido en JSON canónico');
}

export const aiDraftSchema = z.object({
  terms: termsSchema.nullable(),
  questions: z.array(text).max(20),
  warnings: z.array(text).max(20),
}).strict().refine(v => v.terms !== null || v.questions.length > 0, 'La IA debe proponer términos válidos o hacer preguntas');

export const transactionStates = ['pending_signature', 'submitted', 'pending_confirmation', 'confirmed', 'failed', 'unknown'] as const;
export type TransactionState = typeof transactionStates[number];
/** A successful RPC result alone is insufficient: independently reconcile contract state. */
export function confirmationState(rpcStatus: string | undefined, effectVerified: boolean): TransactionState {
  if (rpcStatus === 'FAILED') return 'failed';
  if (rpcStatus === 'SUCCESS') return effectVerified ? 'confirmed' : 'unknown';
  if (rpcStatus === 'PENDING') return 'pending_confirmation';
  return 'unknown';
}
