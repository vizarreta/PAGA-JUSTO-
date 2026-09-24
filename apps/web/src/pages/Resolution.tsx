import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { agreementsApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { formatXLM, formatDate, xlmToStroops } from '../types';
import { CheckCircle, AlertTriangle, Loader2, ExternalLink, ChevronLeft, AlertCircle, Loader } from 'lucide-react';
import { cn } from '../utils/helpers';
import { StageNotice } from '../components/StageNotice';

const resolutionStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'Abierta', color: 'text-accent', bg: 'bg-warning/20' },
  proposal_pending: { label: 'Propuesta pendiente', color: 'text-primary', bg: 'bg-primary/20' },
  accepted: { label: 'Aceptada', color: 'text-success', bg: 'bg-success/20' },
  executed: { label: 'Ejecutada', color: 'text-text-muted', bg: 'bg-muted/20' },
  rejected: { label: 'Rechazada', color: 'text-danger', bg: 'bg-danger/20' },
}

export function Resolution() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [agreement, setAgreement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [proposalForm, setProposalForm] = useState({
    clientAmount: '',
    freelancerAmount: '',
    description: '',
  });
  const [showPropose, setShowPropose] = useState(false);

  const isClient = agreement?.clientAddress === user?.address;
  const isFreelancer = agreement?.freelancerAddress === user?.address;
  const myRole = isClient ? 'client' : isFreelancer ? 'freelancer' : null;
  const remainingBalance = BigInt(agreement?.deposited || '0') - BigInt(agreement?.paid || '0') - BigInt(agreement?.refunded || '0');

  useEffect(() => {
    if (id) loadAgreement();
  }, [id]);

  const loadAgreement = async () => {
    try {
      setLoading(true);
      const response = await agreementsApi.get(id!);
      setAgreement(response.data);
    } catch (err) {
      setError('Error al cargar la revisión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenResolution = async () => {
    if (!agreement) return;
    setActionLoading('open');
    try {
      await agreementsApi.openResolution(agreement.id, user?.address ?? '');
      await loadAgreement();
    } catch (err) {
      setError('Error al abrir revisión');
    } finally {
      setActionLoading(null);
    }
  };

  const handleProposeSettlement = async () => {
    if (!agreement) return;
    let clientAmt: bigint;
    let freelancerAmt: bigint;
    try {
      clientAmt = BigInt(xlmToStroops(proposalForm.clientAmount || '0'));
      freelancerAmt = BigInt(xlmToStroops(proposalForm.freelancerAmount || '0'));
    } catch { setError('Usa importes positivos con hasta siete decimales.'); return; }
    if (clientAmt + freelancerAmt !== remainingBalance) {
      setError(`La suma debe ser exactamente ${formatXLM(remainingBalance)}`);
      return;
    }

    setActionLoading('propose');
    try {
      await agreementsApi.proposeSettlement(agreement.id, {
        proposedByRole: myRole!,
        clientAmount: clientAmt.toString(),
        freelancerAmount: freelancerAmt.toString(),
        description: proposalForm.description,
      });
      setShowPropose(false);
      await loadAgreement();
    } catch (err) {
      setError('Error al proponer acuerdo');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptSettlement = async (proposalId: string) => {
    if (!agreement) return;
    if (!window.confirm('¿Aceptar esta propuesta de cierre? Se distribuirán los fondos y el acuerdo se cerrará.')) return;
    
    setActionLoading('accept');
    try {
      await agreementsApi.acceptSettlement(agreement.id, proposalId, user?.address ?? '');
      await loadAgreement();
    } catch (err) {
      setError('Error al aceptar propuesta');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error && !agreement) {
    return (
      <div className="card text-center py-12">
        <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p className="text-text-secondary mb-4">{error}</p>
        <button onClick={loadAgreement} className="btn-outline">Reintentar</button>
      </div>
    );
  }

  if (!agreement) return null;

  if (!agreement.chainVerified) return <div className="space-y-4"><StageNotice />
    <p>Sin cierre bilateral los fondos permanecen bloqueados. Los vencimientos no generan devoluciones automáticas.</p>
    <Link to={`/agreement/${id}`} className="btn-outline">Volver al acuerdo</Link></div>;

  const proposedTotal = () => {
    try { return formatXLM(BigInt(xlmToStroops(proposalForm.clientAmount || '0')) + BigInt(xlmToStroops(proposalForm.freelancerAmount || '0'))); }
    catch { return 'Importes inválidos'; }
  };

  const paidMilestones = agreement.milestones?.filter((m: any) => m.status === 'paid').length || 0;

  const canPropose = agreement.status === 'InResolution' && myRole && !agreement.settlements?.some((s: any) => 
    ['proposal_pending', 'accepted'].includes(s.status)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/agreement/${id}`} className="btn-ghost p-2">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Revisión y Cierre</h1>
          <p className="text-text-secondary">{agreement.title}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card text-center">
          <p className="text-text-muted text-sm">Presupuesto total</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{formatXLM(agreement.totalAmount)}</p>
        </div>
        <div className="card text-center">
          <p className="text-text-muted text-sm">Ya pagado ({paidMilestones} hitos)</p>
          <p className="text-2xl font-bold text-success mt-1">{formatXLM(agreement.paid)}</p>
        </div>
        <div className="card text-center border-primary">
          <p className="text-text-muted text-sm">Saldo pendiente a resolver</p>
          <p className="text-2xl font-bold text-primary mt-1">{formatXLM(remainingBalance)}</p>
        </div>
      </div>

      {agreement.status !== 'InResolution' && (
        <div className="card border-warning/30 bg-warning/5">
          <div className="flex items-center gap-4">
            <AlertTriangle className="w-8 h-8 text-accent" />
            <div>
              <h3 className="font-semibold text-text-primary">Acuerdo no está en revisión</h3>
              <p className="text-text-secondary">
                Para resolver un desacuerdo, primero debes abrir la revisión. Esto pausará los pagos ordinarios.
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenResolution}
            disabled={actionLoading === 'open'}
            className="btn-outline mt-4 text-accent border-accent/30"
          >
            {actionLoading === 'open' ? (
              <> <Loader className="w-4 h-4 animate-spin" /> Abriendo... </>
            ) : (
              <> <AlertTriangle className="w-4 h-4" /> Abrir revisión / desacuerdo </>
            )}
          </button>
        </div>
      )}

      {agreement.status === 'InResolution' && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="font-semibold text-text-primary mb-4">Propuestas de distribución</h2>
            <p className="text-text-secondary mb-4">
              Cualquiera de las partes puede proponer cómo repartir el saldo pendiente de <strong>{formatXLM(remainingBalance)}</strong>.
              La otra parte debe aceptar exactamente la misma propuesta para ejecutar el reparto.
            </p>

            {agreement.settlements?.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                <span className="w-12 h-12 mx-auto mb-3 opacity-30" style={{border: '2px solid #06b6d4', borderRadius: '50%', borderRightColor: 'transparent'}} />
                <p>No hay propuestas aún</p>
              </div>
            ) : (
              <div className="space-y-4">
                {agreement.settlements?.map((proposal: any) => {
                  const config = resolutionStatusConfig[proposal.status];
                  const isProposer = proposal.proposedByRole === myRole;
                  const canAcceptThis = proposal.status === 'proposal_pending' && !isProposer;

                  return (
                    <div key={proposal.id} className="card border-border-hover">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className={cn('badge', config.color, config.bg)}>
                            {config.label}
                          </span>
                          <span className="badge badge-muted">
                            Propuesto por: {proposal.proposedByRole === 'client' ? 'Cliente' : 'Freelancer'}
                          </span>
                        </div>
                        <span className="text-sm text-text-muted">{formatDate(proposal.proposedAt)}</span>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="text-center p-3 bg-bg-dark rounded-lg">
                          <p className="text-text-muted text-sm">Al cliente</p>
                          <p className="font-mono text-lg text-text-primary">{formatXLM(proposal.clientAmount)}</p>
                        </div>
                        <div className="text-center p-3 bg-bg-dark rounded-lg">
                          <p className="text-text-muted text-sm">Al freelancer</p>
                          <p className="font-mono text-lg text-success">{formatXLM(proposal.freelancerAmount)}</p>
                        </div>
                        <div className="text-center p-3 bg-bg-dark rounded-lg">
                          <p className="text-text-muted text-sm">Total</p>
                          <p className="font-mono text-lg text-primary">
                            {formatXLM(BigInt(proposal.clientAmount) + BigInt(proposal.freelancerAmount))}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-text-secondary mt-3">{proposal.description}</p>

                      <div className="flex gap-2 pt-3 border-t border-border">
                        {canAcceptThis && proposal.status === 'proposal_pending' && (
                          <button
                            onClick={() => handleAcceptSettlement(proposal.id)}
                            disabled={actionLoading === 'accept'}
                            className="btn-success"
                          >
                            {actionLoading === 'accept' ? (
                              <> <Loader className="w-4 h-4 animate-spin" /> Aceptando... </>
                            ) : (
                              <> <CheckCircle className="w-4 h-4" /> Aceptar y cerrar acuerdo </>
                            )}
                          </button>
                        )}
                        {isProposer && proposal.status === 'proposal_pending' && (
                          <span className="badge badge-primary flex-1 text-center py-2">
                            Esperando a que la otra parte acepte
                          </span>
                        )}
                        {proposal.status === 'executed' && (
                          <span className="badge badge-success flex-1 text-center py-2">
                            <CheckCircle className="w-3 h-3" />
                            Ejecutada - Acuerdo cerrado
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {canPropose && !showPropose && (
              <button
                onClick={() => setShowPropose(true)}
                className="btn-primary w-full mt-4"
              >
                <span className="w-4 h-4" style={{border: '2px solid #06b6d4', borderRadius: '50%', borderRightColor: 'transparent'}} />
                Proponer distribución del saldo
              </button>
            )}

            {showPropose && (
              <div className="border-t border-border pt-4 animate-in">
                <h3 className="font-semibold text-text-primary mb-3">Crear nueva propuesta</h3>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label">Al cliente (XLM)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={proposalForm.clientAmount}
                        onChange={(e) => setProposalForm(p => ({ ...p, clientAmount: e.target.value }))}
                        className="input"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="label">Al freelancer (XLM)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={proposalForm.freelancerAmount}
                        onChange={(e) => setProposalForm(p => ({ ...p, freelancerAmount: e.target.value }))}
                        className="input"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">Descripción de la propuesta</label>
                    <textarea
                      value={proposalForm.description}
                      onChange={(e) => setProposalForm(p => ({ ...p, description: e.target.value }))}
                      className="input"
                      rows={2}
                      placeholder="Motivo del cierre: cancelación mutua, trabajo parcial completado, etc."
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="text-sm text-text-muted flex items-center gap-2">
                      Suma: <strong>{proposedTotal()}</strong> /
                      <strong>{formatXLM(remainingBalance.toString())}</strong>
                    </div>
                    <button
                      onClick={handleProposeSettlement}
                      disabled={actionLoading === 'propose' || !proposalForm.clientAmount || !proposalForm.freelancerAmount}
                      className="btn-primary"
                    >
                      {actionLoading === 'propose' ? (
                        <> <Loader className="w-4 h-4 animate-spin" /> Proponiendo... </>
                      ) : (
                        'Proponer reparto'
                      )}
                    </button>
                    <button onClick={() => setShowPropose(false)} className="btn-outline">
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {agreement.settlements?.some((s: any) => s.status === 'accepted') && (
            <div className="card border-success/30 bg-success/5">
              <h3 className="font-semibold text-success mb-3">Propuesta aceptada</h3>
              <p className="text-text-secondary">
                Ambas partes han acordado el reparto. La ejecución distribuirá los fondos y cerrará el acuerdo.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="card border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-text-primary">Stellar Testnet</h3>
            <p className="text-sm text-text-secondary">Todos los fondos son XLM de prueba. No tienen valor real.</p>
          </div>
          <a
            href="https://stellar.expert/explorer/testnet"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Explorador
          </a>
        </div>
      </div>
    </div>
  );
}
