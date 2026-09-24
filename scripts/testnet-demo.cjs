// Deterministic integration demo with two newly generated test wallets; never loads user wallets.
// Secrets and signed envelopes stay in ignored .local/. Only public proof is written to docs/testnet/.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomBytes, createHash } = require('node:crypto');
const { createRequire } = require('node:module');
const apiRequire = createRequire(path.resolve(__dirname, '../apps/api/package.json'));
const { rpc, Keypair, Networks, TransactionBuilder, Operation, Address, Contract, nativeToScVal, scValToNative } = apiRequire('@stellar/stellar-sdk');
const { canonicalJson, RESOLUTION_POLICY, TESTNET_XLM } = apiRequire('@pagajusto/shared');
const root = path.resolve(__dirname, '..');
const local = path.join(root, '.local');
const proofs = path.join(root, 'docs/testnet');
const latest = path.join(local, 'latest-testnet-run.json');
const server = new rpc.Server('https://soroban-testnet.stellar.org', { timeout: 25 });
const json = x => JSON.stringify(x, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2) + '\n';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const u32 = v => nativeToScVal(v, { type: 'u32' });
const i128 = v => nativeToScVal(BigInt(v), { type: 'i128' });
const bytes = hex => nativeToScVal(Buffer.from(hex, 'hex'), { type: 'bytes' });
const address = v => new Address(v).toScVal();
let report;
let recovery;
function persist() {
  fs.mkdirSync(local, { recursive: true }); fs.mkdirSync(proofs, { recursive: true });
  fs.writeFileSync(latest, json(report));
  fs.writeFileSync(path.join(proofs, `${report.runId}.json`), json(report));
}
async function network() {
  const info = await server.getNetwork();
  assert.equal(info.passphrase, Networks.TESTNET, 'RPC must report Stellar Testnet');
}
async function reconcile(hash) {
  for (let i = 0; i < 45; i++) {
    const result = await server.getTransaction(hash);
    if (result.status === 'SUCCESS' || result.status === 'FAILED') return result;
    await pause(2000);
  }
  return { status: 'NOT_FOUND' };
}
async function execute(name, wallet, operation) {
  const account = await server.getAccount(wallet.publicKey());
  const raw = new TransactionBuilder(account, { fee: '100', networkPassphrase: Networks.TESTNET })
    .addOperation(operation).setTimeout(180).build();
  const tx = await server.prepareTransaction(raw);
  tx.sign(wallet);
  const hash = Buffer.from(tx.hash()).toString('hex');
  const row = { name, hash, network: 'testnet', status: 'submitted',
    feeLimitStroops: String(tx.fee), explorer: `https://stellar.expert/explorer/testnet/tx/${hash}` };
  report.transactions.push(row);
  recovery.envelopes.push({ hash, signedXdr: tx.toXDR() });
  fs.writeFileSync(path.join(local, `${report.runId}.private.json`), json(recovery), { mode: 0o600 });
  persist(); // Persist hash before network I/O so a disconnect never causes an implicit retry.
  console.log(`${name}: enviada ${hash}`);
  let result;
  try {
    const sent = await server.sendTransaction(tx);
    if (sent.status === 'ERROR') {
      row.status = 'failed'; persist(); throw new Error(`${name}: RPC rejected envelope`);
    }
    row.status = 'pending_confirmation'; persist();
    result = await reconcile(hash);
  } catch (err) {
    if (row.status !== 'failed') row.status = 'unknown'; persist(); throw err;
  }
  if (result.status !== 'SUCCESS') {
    row.status = result.status === 'FAILED' ? 'failed' : 'unknown'; persist();
    throw new Error(`${name}: ${row.status}; reconcile ${hash} before retrying`);
  }
  row.status = 'confirmed'; row.ledger = result.ledger;
  if (result.resultXdr) {
    const fee = typeof result.resultXdr.feeCharged === 'function' ? result.resultXdr.feeCharged() : result.resultXdr.feeCharged;
    if (fee != null) row.feeChargedStroops = fee.toString();
  }
  persist();
  return result.returnValue;
}
async function read(wallet, contractId, method, args = []) {
  const source = await server.getAccount(wallet.publicKey());
  const tx = new TransactionBuilder(source, { fee: '100', networkPassphrase: Networks.TESTNET })
    .addOperation(new Contract(contractId).call(method, ...args)).setTimeout(60).build();
  const simulation = await server.simulateTransaction(tx);
  if (!rpc.Api.isSimulationSuccess(simulation)) throw new Error(`Read failed: ${simulation.error || 'RPC unavailable'}`);
  return scValToNative(simulation.result.retval);
}
async function main() {
  await network();
  if (process.argv.includes('--reconcile')) {
    report = JSON.parse(fs.readFileSync(latest, 'utf8'));
    for (const row of report.transactions.filter(t => !['confirmed','failed'].includes(t.status))) {
      const result = await server.getTransaction(row.hash);
      row.status = result.status === 'SUCCESS' ? 'confirmed' : result.status === 'FAILED' ? 'failed' : 'unknown';
    }
    persist(); console.log('Hashes reconciliados. No se repitió ninguna operación. Revisa el estado del contrato antes de continuar.'); return;
  }
  if (fs.existsSync(latest)) {
    const previous = JSON.parse(fs.readFileSync(latest, 'utf8'));
    if (previous.status !== 'complete') throw new Error('Existe una ejecución incompleta. Ejecuta --reconcile y revisa .local/latest-testnet-run.json; no se repetirá el depósito automáticamente.');
  }
  const wasm = fs.readFileSync(path.join(root, 'target/wasm32v1-none/release/pagajusto_escrow.wasm'));
  const client = Keypair.random(); const freelancer = Keypair.random();
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  report = { runId, network: 'testnet', status: 'running', client: client.publicKey(), freelancer: freelancer.publicKey(),
    wasmSha256: createHash('sha256').update(wasm).digest('hex'), transactions: [], snapshots: [] };
  recovery = { clientSecret: client.secret(), freelancerSecret: freelancer.secret(), envelopes: [] };
  persist();
  fs.writeFileSync(path.join(local, `${runId}.private.json`), json(recovery), { mode: 0o600 });
  await Promise.all([client, freelancer].map(async wallet => {
    const response = await fetch(`https://friendbot.stellar.org?addr=${wallet.publicKey()}`, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`Friendbot: HTTP ${response.status}`);
  }));
  const now = new Date();
  const terms = { version: 1, title: 'Demo técnica PagaJusto', description: 'Página web de ejemplo para verificar escrow con XLM de prueba.',
    network: 'testnet', asset: { code: 'XLM', contractId: TESTNET_XLM }, clientAddress: client.publicKey(), freelancerAddress: freelancer.publicKey(),
    totalBudgetStroops: '1000000000', milestones: [30,40,30].map((amount, index) => ({ index,
      title: ['Diseño','Desarrollo','Publicación'][index], description: 'Entrega demostrativa', acceptanceCriteria: ['Revisión manual del cliente'],
      amountStroops: (BigInt(amount) * 10000000n).toString(), dueDate: new Date(now.getTime() + 86400000 * (index + 1)).toISOString() })),
    reviewPeriodHours: 48, revisionRounds: 2, clientMaterials: ['Logo de ejemplo'], scopeIncluded: ['Página web'], scopeExcluded: ['Hosting comercial'],
    resolutionPolicy: RESOLUTION_POLICY, createdAt: now.toISOString() };
  report.terms = terms;
  report.canonicalTerms = canonicalJson(terms);
  report.termsHash = createHash('sha256').update(report.canonicalTerms, 'utf8').digest('hex');
  const wasmHashVal = await execute('upload_wasm', client, Operation.uploadContractWasm({ wasm }));
  const wasmHash = Buffer.from(scValToNative(wasmHashVal));
  const deployed = await execute('deploy_atomic_constructor', client, Operation.createCustomContract({
    address: new Address(client.publicKey()), wasmHash, salt: randomBytes(32), constructorArgs: [
      address(client.publicKey()), address(freelancer.publicKey()), bytes(report.termsHash), u32(1), i128(1000000000),
      nativeToScVal([300000000n,400000000n,300000000n], { type: 'i128' }), u32(2),
    ],
  }));
  report.contractId = scValToNative(deployed);
  report.contractExplorer = `https://stellar.expert/explorer/testnet/contract/${report.contractId}`;
  persist();
  const contract = new Contract(report.contractId);
  const call = (name, wallet, ...args) => execute(name, wallet, contract.call(name, ...args));
  const snapshot = async (label, expected) => {
    const agreement = await read(client, report.contractId, 'get_agreement');
    assert.equal(agreement.deposited, agreement.pending + agreement.paid + agreement.refunded);
    for (const [field, value] of Object.entries(expected)) assert.equal(agreement[field].toString(), value, field);
    const sacBalance = await read(client, TESTNET_XLM, 'balance', [address(report.contractId)]);
    assert.equal(sacBalance, agreement.pending);
    report.snapshots.push({ label, at: new Date().toISOString(), contractState: agreement, nativeSacBalanceStroops: sacBalance });
    persist(); console.log(`${label}: depositado=${agreement.deposited}, pagado=${agreement.paid}, pendiente=${agreement.pending}, devuelto=${agreement.refunded}`);
  };
  await call('accept_agreement', client, address(client.publicKey()), u32(1), bytes(report.termsHash));
  await call('accept_agreement', freelancer, address(freelancer.publicKey()), u32(1), bytes(report.termsHash));
  await call('fund', client, address(client.publicKey()));
  await snapshot('Depósito 100 XLM', { deposited:'1000000000', paid:'0', pending:'1000000000' });
  const evidenceHash = createHash('sha256').update('Evidencia de ejemplo; no acredita calidad ni un archivo externo.').digest('hex');
  await call('submit_milestone', freelancer, address(freelancer.publicKey()), u32(0), bytes(evidenceHash));
  await call('approve_and_release', client, address(client.publicKey()), u32(0));
  await snapshot('Pago 30 XLM; saldo 70 XLM', { deposited:'1000000000', paid:'300000000', pending:'700000000' });
  await call('open_resolution', freelancer, address(freelancer.publicKey()));
  await call('propose_settlement', client, address(client.publicKey()), u32(0), i128(200000000), i128(500000000));
  await call('accept_settlement', freelancer, address(freelancer.publicKey()), u32(1), i128(200000000), i128(500000000));
  await snapshot('Cierre: 50 XLM adicionales al freelancer y 20 XLM devueltos', { deposited:'1000000000', paid:'800000000', pending:'0', refunded:'200000000' });
  report.status = 'complete'; persist();
  fs.writeFileSync(path.join(proofs, 'latest.json'), json(report));
  console.log(`Prueba completada. Contrato: ${report.contractId}`);
}
main().catch(error => {
  if (report) { report.status = 'incomplete'; report.error = error.message; persist(); }
  console.error(error.message); process.exitCode = 1;
});
