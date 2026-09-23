import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { agreementsApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { formatXLM, getStatusConfig } from '../types';
import { Shield, Zap, CheckCircle, AlertTriangle, Loader2, ExternalLink, Copy, ChevronRight, MessageSquare, Calendar } from 'lucide-react';
import { cn } from '../utils/helpers';

const statusLabels: Record<string, string> = {
  Created: 'Borrador',
  Funded: 'Fondeado · Pendiente de inicio',
  Active: 'En progreso',
  InResolution: 'En revisión',
  Completed: 'Completado',
  ClosedBySettlement: 'Cerrado por acuerdo',
};

const milestoneStatusLabels: Record<string, string> = {
  pending: 'Pendiente',
  delivered: 'Entregado · Pendiente de revisión',
  paid: 'Pagado',
  changes_requested: 'Ajustes solicitados',
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima',
  });
}

function formatAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function AgreementDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [agreement, setAgreement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadAgreement();
  }, [id]);

  const loadAgreement = async () => {
    try {
      setLoading(true);
      const response = await agreementsApi.get(id!);
      setAgreement(response.data);
    } catch (err) {
      setError('Error al cargar el acuerdo');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopySuccess(label);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const handleFund = async () => {
    alert('Funcionalidad de depósito: conecta Freighter y firma la transacción de depósito al contrato');
  };

  const handleApproveMilestone = async (milestoneIndex: number) => {
    navigate(`/agreement/${id}/milestone/${milestoneIndex}`);
  };

  const handleOpenResolution = async () => {
    navigate(`/agreement/${id}/resolution`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !agreement) {
    return (
      <div className="card text-center py-12">
        <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-text-primary mb-2">{error || 'Acuerdo no encontrado'}</h2>
        <Link to="/" className="btn-primary inline-flex mt-4">Volver al inicio</Link>
      </div>
    );
  }

  const config = getStatusConfig(agreement.status);
  const currentMilestone = agreement.milestones?.[agreement.currentMilestone];
  const isClient = agreement.clientAddress === user?.address;
  const isFreelancer = agreement.freelancerAddress === user?.address;
  const myRole = isClient ? 'client' : isFreelancer ? 'freelancer' : 'unknown';
  const canAct = agreement.status === 'Active' && currentMilestone;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary truncate max-w-md">
              {agreement.title || 'Acuerdo sin título'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn('badge', config.text, config.bg)}>
                {statusLabels[agreement.status] || agreement.status}
              </span>
              <span className="badge badge-muted">{agreement.network === 'testnet' ? 'Testnet' : 'Mainnet'}</span>
              {myRole && (
                <span className="badge badge-primary">
                  {myRole === 'client' ? 'Cliente' : 'Freelancer'}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleCopy(agreement.id, 'ID copiado')}
            className="btn-ghost p-2"
            title="Copiar ID"
          >
            <Copy className="w-5 h-5" />
          </button>
          {agreement.contractId && (
            <a
              href={`https://stellar.expert/explorer/testnet/contract/${agreement.contractId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline"
            >
              <ExternalLink className="w-4 h-4" />
              Ver contrato
            </a>
          )}
        </div>
      </div>

      {copySuccess && (
        <div className="fixed bottom-4 right-4 bg-success/90 text-bg-dark px-4 py-2 rounded-lg shadow-lg animate-in z-50">
          {copySuccess}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card text-center">
          <p className="text-text-muted text-sm">En garantía</p>
          <p className="text-3xl font-bold text-text-primary mt-1">{formatXLM(agreement.deposited)}</p>
        </div>
        <div className="card text-center">
          <p className="text-text-muted text-sm">Pagado</p>
          <p className="text-3xl font-bold text-success mt-1">{formatXLM(agreement.paid)}</p>
        </div>
        <div className="card text-center">
          <p className="text-text-muted text-sm">Devuelto</p>
          <p className="text-3xl font-bold text-secondary mt-1">{formatXLM(agreement.refunded)}</p>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-text-primary mb-4">Hitos</h3>
        <div className="space-y-3">
          {agreement.milestones?.map((milestone: any, idx: number) => {
            const mConfig = getStatusConfig(milestone.status);
            const isCurrent = idx === agreement.currentMilestone;
            const isCompleted = ['paid', 'closed_by_resolution'].includes(milestone.status);

            return (
              <div
                key={milestone.id}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-lg border transition-all',
                  isCurrent ? 'border-primary/30 bg-primary/5' : 'border-border bg-bg-dark'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                  isCompleted ? 'bg-success/20 text-success' :
                  milestone.status === 'delivered' ? 'bg-primary/20 text-primary' :
                  milestone.status === 'changes_requested' ? 'bg-accent/20 text-accent' :
                  'bg-border text-text-muted'
                )}>
                  {isCompleted ? <CheckCircle className="w-5 h-5" /> : <span className="font-medium">{idx + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-text-primary">{milestone.title}</h4>
                    <span className={cn('badge text-xs', mConfig.text, mConfig.bg)}>
                      {milestoneStatusLabels[milestone.status] || milestone.status}
                    </span>
                    {isCurrent && <span className="badge badge-primary text-xs">Actual</span>}
                  </div>
                  <p className="text-sm text-text-secondary mt-1">{milestone.description}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                    <span className="font-mono text-text-primary">{formatXLM(milestone.amount)}</span>
                    {milestone.dueDate && (
                      <span className="flex items-center gap-1 text-text-muted">
                        <Calendar className="w-3 h-3" />
                        Vence {formatDate(milestone.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
                {canAct && milestone.status === 'delivered' && myRole === 'client' && (
                  <button
                    onClick={() => handleApproveMilestone(idx)}
                    className="btn-primary"
                  >
                    Revisar
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
                {canAct && milestone.status === 'pending' && myRole === 'freelancer' && (
                  <button
                    onClick={() => navigate(`/agreement/${id}/milestone/${idx}`)}
                    className="btn-secondary"
                  >
                    Entregar
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Actividad del agente</h3>
            <span className="badge badge-muted">IA</span>
          </div>
          {agreement.agentActivities?.length > 0 ? (
            <div className="space-y-3">
              {agreement.agentActivities.slice(0, 10).map((activity: any) => (
                <div key={activity.id} className="card-hover p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">{activity.tool.replace('_', ' ')}</span>
                        <span className="text-sm text-text-muted">{formatDate(activity.executedAt)}</span>
                      </div>
                      <p className="text-sm text-text-secondary mt-1">{activity.reason}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-8 text-text-muted">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay actividad del agente aún</p>
            </div>
          )}

          <div className="card">
            <h3 className="font-semibold text-text-primary mb-4">Transacciones recientes</h3>
            {agreement.transactions?.length > 0 ? (
              <div className="space-y-2">
                {agreement.transactions.slice(0, 5).map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-bg-dark rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={cn('badge text-xs',
                        tx.type === 'deposit' && 'badge-primary',
                        tx.type === 'milestone_payment' && 'badge-success',
                        tx.type === 'settlement_payment' && 'badge-secondary',
                        tx.type === 'refund' && 'badge-warning'
                      )}>
                        {tx.type.replace('_', ' ')}
                      </span>
                      <span className="font-mono text-text-primary">{formatXLM(tx.amount)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className={cn('badge text-xs',
                        tx.status === 'confirmed' && 'badge-success',
                        tx.status === 'pending' && 'badge-primary',
                        tx.status === 'failed' && 'badge-danger',
                        'badge-muted'
                      )}>
                        {tx.status.replace('_', ' ')}
                      </span>
                      {tx.hash && (
                        <a
                          href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-ghost p-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-muted text-center py-4">No hay transacciones aún</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-text-primary mb-4">Participantes</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-bg-dark rounded-lg">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary">Cliente</p>
                  <p className="text-sm text-text-muted font-mono truncate">{formatAddress(agreement.clientAddress)}</p>
                </div>
                {agreement.clientAcceptedAt && <CheckCircle className="w-5 h-5 text-success" />}
              </div>
              <div className="flex items-center gap-3 p-3 bg-bg-dark rounded-lg">
                <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary">Freelancer</p>
                  <p className="text-sm text-text-muted font-mono truncate">{formatAddress(agreement.freelancerAddress)}</p>
                </div>
                {agreement.freelancerAcceptedAt && <CheckCircle className="w-5 h-5 text-success" />}
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-text-primary mb-4">Acciones</h3>
            <div className="space-y-2">
              {agreement.status === 'Created' && myRole === 'client' && (
                <button className="btn-primary w-full justify-start">Enviar a freelancer</button>
              )}
              {agreement.status === 'Created' && myRole === 'freelancer' && (
                <button className="btn-primary w-full justify-start">Aceptar acuerdo</button>
              )}
              {agreement.status === 'Funded' && myRole === 'client' && (
                <button onClick={handleFund} className="btn-primary w-full justify-start">
                  Depositar {formatXLM(agreement.totalAmount)}
                </button>
              )}
              {agreement.status === 'Funded' && (
                <span className="badge badge-primary w-full text-center py-2">
                  Fondeado · Esperando primera entrega
                </span>
              )}
              {agreement.status === 'Active' && currentMilestone && currentMilestone.status === 'delivered' && myRole === 'client' && (
                <button onClick={() => handleApproveMilestone(agreement.currentMilestone)} className="btn-primary w-full justify-start">
                  Aprobar y pagar {formatXLM(currentMilestone.amount)}
                </button>
              )}
              {agreement.status === 'Active' && currentMilestone && currentMilestone.status === 'pending' && myRole === 'freelancer' && (
                <button className="btn-secondary w-full justify-start" onClick={() => navigate(`/agreement/${id}/milestone/${agreement.currentMilestone}`)}>
                  Entregar hito actual
                </button>
              )}
              {agreement.status === 'Active' && currentMilestone && currentMilestone.status === 'changes_requested' && myRole === 'freelancer' && (
                <button className="btn-secondary w-full justify-start" onClick={() => navigate(`/agreement/${id}/milestone/${agreement.currentMilestone}`)}>
                  Entregar ajustes
                </button>
              )}
              {(agreement.status === 'Active' || agreement.status === 'Funded') && (
                <button onClick={handleOpenResolution} className="btn-outline w-full justify-start text-accent border-accent/30 hover:bg-accent/5">
                  <AlertTriangle className="w-4 h-4" />
                  Abrir revisión / desacuerdo
                </button>
              )}
              {agreement.status === 'InResolution' && (
                <Link to={`/agreement/${id}/resolution`} className="btn-primary w-full justify-start">
                  Ver y resolver desacuerdo
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}