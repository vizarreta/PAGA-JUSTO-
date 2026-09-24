import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckCircle, Shield } from 'lucide-react';
import proof from '../../../../docs/testnet/latest.json';
import { formatXLM } from '../utils/money';

const actionLabels: Record<string, string> = {
  upload_wasm: 'Publicar código del contrato', deploy_atomic_constructor: 'Crear acuerdo',
  accept_agreement: 'Aceptar términos', fund: 'Depositar presupuesto', submit_milestone: 'Entregar primer hito',
  approve_and_release: 'Aprobar y pagar hito', open_resolution: 'Abrir revisión',
  propose_settlement: 'Proponer cierre', accept_settlement: 'Aceptar y ejecutar cierre',
};

function movement(name: string) {
  const first = proof.snapshots[1].contractState;
  const final = proof.snapshots[2].contractState;
  const short = (wallet: string) => `${wallet.slice(0, 6)}…${wallet.slice(-5)}`;
  if (name === 'fund') return <span title={proof.contractId}>{formatXLM(proof.snapshots[0].contractState.deposited)} → contrato {short(proof.contractId)}</span>;
  if (name === 'approve_and_release') return <span title={proof.freelancer}>{formatXLM(first.paid)} → freelancer {short(proof.freelancer)}</span>;
  if (name === 'accept_settlement') return <span><span className="block" title={proof.freelancer}>{formatXLM(BigInt(final.paid) - BigInt(first.paid))} → freelancer {short(proof.freelancer)}</span><span className="block" title={proof.client}>{formatXLM(final.refunded)} → cliente {short(proof.client)}</span></span>;
  return <span className="text-text-muted">Sin movimiento de presupuesto</span>;
}

export function TestnetProof() {
  return <main className="min-h-screen bg-bg-dark px-5 py-12">
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="flex flex-wrap gap-4 items-center justify-between">
        <Link to="/login" className="flex gap-2 items-center font-bold text-xl"><Shield className="text-primary" />PagaJusto</Link>
        <span className="badge badge-primary">Stellar Testnet · Solo XLM de prueba</span>
      </header>
      <section className="space-y-4 max-w-3xl">
        <p className="text-primary uppercase tracking-widest text-sm">Primera etapa · prueba técnica</p>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight">Un acuerdo.<br />Cada pago, verificable.</h1>
        <p className="text-lg text-text-secondary">Tu trabajo vale. Tu pago se protege.</p>
        <p className="text-text-muted">Esta ejecución usó dos wallets de prueba y el contrato real en Testnet. Los datos son el registro de la prueba, no una consulta de saldo en vivo. La firma de pagos desde la web y la IA siguen pendientes de integración.</p>
      </section>
      <section className="grid md:grid-cols-3 gap-4" aria-label="Recorrido verificado">
        {proof.snapshots.map((snapshot, i) => <article key={snapshot.label} className="card space-y-5">
          <div className="flex justify-between items-center text-primary"><span className="font-mono text-sm">0{i + 1}</span><CheckCircle size={20} /></div>
          <h2 className="font-semibold text-xl">{['Depósito completo', 'Primer hito pagado', 'Cierre bilateral'][i]}</h2>
          <p className="text-3xl font-bold">{formatXLM(snapshot.contractState.pending)}<span className="block text-sm font-normal text-text-muted mt-1">en garantía después de esta acción</span></p>
          <dl className="space-y-2 text-sm"><div className="flex justify-between"><dt>Depositado</dt><dd>{formatXLM(snapshot.contractState.deposited)}</dd></div>
            <div className="flex justify-between"><dt>Pagado al freelancer</dt><dd className="text-primary">{formatXLM(snapshot.contractState.paid)}</dd></div>
            <div className="flex justify-between"><dt>Devuelto al cliente</dt><dd>{formatXLM(snapshot.contractState.refunded)}</dd></div></dl>
          <p className="text-xs text-text-muted">{new Date(snapshot.at).toLocaleString('es-PE', { timeZone: 'America/Lima' })} · Perú</p>
        </article>)}
      </section>
      <section className="card space-y-4">
        <h2 className="text-xl font-semibold">Prueba pública del contrato</h2>
        <a className="text-primary flex items-start gap-2 break-all" href={proof.contractExplorer} target="_blank" rel="noreferrer">{proof.contractId}<ArrowUpRight size={20} className="shrink-0" /></a>
        <p className="text-text-secondary">Las comisiones se pagan aparte. El presupuesto del acuerdo conserva la igualdad: depositado = pendiente + pagado + devuelto.</p>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="text-text-muted border-b border-border"><th className="py-3">Operación confirmada</th><th>Importe y destinatario</th><th>Comisión XLM</th><th>Hash verificable</th></tr></thead>
          <tbody>{proof.transactions.map(tx => <tr key={tx.hash} className="border-b border-border/50"><td className="py-3 pr-4">{actionLabels[tx.name] || tx.name}</td><td className="pr-4 min-w-[220px]">{movement(tx.name)}</td><td className="pr-4 whitespace-nowrap">{'feeChargedStroops' in tx ? formatXLM(tx.feeChargedStroops) : 'No disponible'}</td><td><a className="text-primary underline" title={tx.hash} href={tx.explorer} target="_blank" rel="noreferrer">{tx.hash.slice(0, 8)}…</a></td></tr>)}</tbody></table></div>
      </section>
      <section className="card border-accent/30 space-y-2"><h2 className="font-semibold">La revisión requiere acuerdo de ambas partes</h2><p className="text-text-secondary">Sin cierre bilateral, el saldo queda bloqueado en este MVP. No hay devolución automática por vencimiento ni mediación externa. Esta prueba no constituye una auditoría de seguridad.</p></section>
      <Link to="/login" className="btn-primary inline-flex">Conectar Freighter y crear un borrador</Link>
    </div>
  </main>;
}
