import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { agreementsApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { formatXLM, getStatusConfig } from '../types';
import { CheckCircle, AlertCircle, Loader2, ChevronLeft, ExternalLink, Hash, Calendar } from 'lucide-react';
import { cn } from '../utils/helpers';

const milestoneStatusLabels: Record<string, string> = {
  pending: 'Pendiente',
  delivered: 'Entregado',
  paid: 'Pagado',
  changes_requested: 'Ajustes solicitados',
};

function formatDate(dateString?: string) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima'
  });
}

export function MilestoneReview() {
  const { id, index } = useParams<{ id: string; index: string }>();
  const milestoneIndex = parseInt(index || '0', 10);
  const navigate = useNavigate();
  const { user, freighter } = useAuthStore();
  const [milestone, setMilestone] = useState<any>(null);
  const [agreement, setAgreement] = useState<any>(null);
  const [evidences, setEvidences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [evidenceHash, setEvidenceHash] = useState('');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const isClient = agreement?.clientAddress === user?.address;
  const isFreelancer = agreement?.freelancerAddress === user?.address;
  const myRole = isClient ? 'client' : isFreelancer ? 'freelancer' : null;

  useEffect(() => {
    if (id) loadData();
  }, [id, milestoneIndex]);

  const loadData = async () => {
    try {
      setLoading(true);
      const agreementRes = await agreementsApi.get(id!);
      setAgreement(agreementRes.data);
      setMilestone(agreementRes.data.milestones?.[milestoneIndex]);
      const allEvidences: any[] = agreementRes.data.evidences ?? [];
      setEvidences(allEvidences.filter((e: any) => Number(e.milestoneIndex) === milestoneIndex));
    } catch (err) {
      setError('Error al cargar el hito');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!evidenceUrl.trim() || !evidenceHash.trim()) {
      setError('URL de evidencia y hash son obligatorios');
      return;
    }
    setActionLoading('submit');
    try {
      await agreementsApi.submitMilestone(id!, milestoneIndex, {
        freelancer: user?.address ?? '',
        evidenceHash,
        evidenceUrl,
        description: evidenceDescription,
      });
      await loadData();
      setEvidenceUrl('');
      setEvidenceDescription('');
      setEvidenceHash('');
    } catch (err) {
      setError('Error al entregar');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestChanges = async () => {
    setActionLoading('changes');
    try {
      await agreementsApi.requestChanges(id!, milestoneIndex, user?.address ?? '');
      await loadData();
    } catch (err) {
      setError('Error al solicitar ajustes');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async () => {
    if (!freighter) return;
    try {
      setActionLoading('approve');
      const publicKey = await freighter.getPublicKey();
      
      // In production, this would be a properly built Soroban transaction
      // For now, we'll use a placeholder
      const txHash = 'placeholder_tx_hash';
      
      await agreementsApi.approveMilestone(id!, milestoneIndex, { client: publicKey, txHash });
      await loadData();
    } catch (err) {
      setError('Error al aprobar');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAISummary = async () => {
    if (!evidenceDescription.trim()) return;
    setAiLoading(true);
    try {
      const response = await fetch('/api/agent/summarize-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreementId: id!,
          milestoneIndex,
          evidenceDescription,
        }),
      });
      const data = await response.json();
      setAiSummary(data.summary || 'Resumen generado');
    } catch (err) {
      setError('Error al generar resumen');
    } finally {
      setAiLoading(false);
    }
  };

  const copyHash = async () => {
    if (milestone?.evidenceHash) {
      await navigator.clipboard.writeText(milestone.evidenceHash);
      alert('Hash copiado');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error && !milestone) {
    return (
      <div className="card text-center py-12">
        <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p className="text-text-secondary mb-4">{error}</p>
        <button onClick={loadData} className="btn-outline">Reintentar</button>
      </div>
    );
  }

  if (!milestone) return null;

  const config = getStatusConfig(milestone.status);
  const canDeliver = myRole === 'freelancer' && ['pending', 'changes_requested'].includes(milestone.status);
  const canApprove = myRole === 'client' && milestone.status === 'delivered';
  const canRequestChanges = myRole === 'client' && milestone.status === 'delivered';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-text-primary">Hito {milestoneIndex + 1}: {milestone.title}</h1>
          <span className={cn('badge', config.text, config.bg)}>
            {milestoneStatusLabels[milestone.status] || milestone.status}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-1 space-y-4">
          <div className="card">
            <h3 className="font-semibold text-text-primary mb-4">Detalles del hito</h3>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-text-muted">Importe</dt>
                <dd className="font-mono text-lg text-text-primary mt-1">{formatXLM(milestone.amount)}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Entregable</dt>
                <dd className="text-text-secondary mt-1">{milestone.description}</dd>
              </div>
              {milestone.dueDate && (
                <div>
                  <dt className="text-text-muted">Fecha límite</dt>
                  <dd className="flex items-center gap-2 text-text-secondary mt-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(milestone.dueDate)}
                  </dd>
                </div>
              )}
              {milestone.deliveredAt && (
                <div>
                  <dt className="text-text-muted">Entregado</dt>
                  <dd className="text-success mt-1">{formatDate(milestone.deliveredAt)}</dd>
                </div>
              )}
              {milestone.paidAt && (
                <div>
                  <dt className="text-text-muted">Pagado</dt>
                  <dd className="text-success mt-1">{formatDate(milestone.paidAt)}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="card">
            <h3 className="font-semibold text-text-primary mb-4">Criterios de aceptación</h3>
            <ul className="space-y-2">
              {milestone.acceptanceCriteria?.map((c: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-text-muted" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-primary">Evidencias</h3>
              <div className="flex items-center gap-2">
                {milestone.evidenceHash && (
                  <button onClick={copyHash} className="btn-ghost p-1" title="Copiar hash">
                    <Hash className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-3">
              {evidences.length === 0 ? (
                <p className="text-text-muted text-center py-4">No hay evidencias aún</p>
              ) : (
                evidences.map((ev) => (
                  <div key={ev.id} className="p-3 bg-bg-dark rounded-lg border border-border">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-text-primary text-sm">{ev.description || 'Evidencia'}</p>
                        <p className="text-xs text-text-muted mt-1">
                          v{ev.version} · {ev.submittedByRole === 'freelancer' ? 'Freelancer' : 'Cliente'}
                          · {formatDate(ev.submittedAt)}
                        </p>
                        {ev.url && (
                          <a href={ev.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            Ver enlace
                          </a>
                        )}
                      </div>
                      <button onClick={() => navigator.clipboard.writeText(ev.hash)} className="btn-ghost p-1">
                        <Hash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {canDeliver && (
            <div className="card border-primary/30">
              <h3 className="font-semibold text-text-primary mb-4">Entregar hito</h3>
              <div className="space-y-3">
                <div>
                  <label className="label">URL de la evidencia *</label>
                  <input
                    type="url"
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    placeholder="https://figma.com/design/... o https://github.com/..."
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Hash de la evidencia (SHA-256) *</label>
                  <input
                    type="text"
                    value={evidenceHash}
                    onChange={(e) => setEvidenceHash(e.target.value)}
                    placeholder="sha256:..."
                    className="input font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="label">Descripción</label>
                  <textarea
                    value={evidenceDescription}
                    onChange={(e) => setEvidenceDescription(e.target.value)}
                    placeholder="Breve descripción de lo entregado"
                    className="input"
                    rows={3}
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={actionLoading === 'submit' || !evidenceUrl || !evidenceHash}
                  className="btn-primary w-full"
                >
                  {actionLoading === 'submit' ? (
                    <> <Loader2 className="w-4 h-4 animate-spin" /> Enviando... </>
                  ) : (
                    'Entregar hito'
                  )}
                </button>
              </div>
            </div>
          )}

          {canRequestChanges && (
            <div className="card border-warning/30">
              <h3 className="font-semibold text-text-primary mb-4">Solicitar ajustes</h3>
              <p className="text-sm text-text-secondary mb-4">
                El hito volverá al freelancer para realizar los cambios solicitados.
              </p>
              <button
                onClick={handleRequestChanges}
                disabled={actionLoading === 'changes'}
                className="btn-outline w-full text-accent border-accent/30"
              >
                {actionLoading === 'changes' ? 'Solicitando...' : 'Solicitar ajustes'}
              </button>
            </div>
          )}

          {canApprove && (
            <div className="card border-success/30">
              <h3 className="font-semibold text-text-primary mb-4">Aprobar y pagar</h3>
              <p className="text-sm text-text-secondary mb-4">
                Al aprobar, se liberarán <strong>{formatXLM(milestone.amount)}</strong> al freelancer.
                Firmarás la transacción con Freighter.
              </p>
              <div className="p-3 bg-bg-dark rounded-lg border border-border mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Importe</span>
                  <span className="font-mono text-text-primary">{formatXLM(milestone.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Destinatario</span>
                  <span className="font-mono text-text-secondary truncate max-w-[200px]">
                    {agreement.freelancerAddress}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Red</span>
                  <span className="text-primary">Stellar Testnet</span>
                </div>
              </div>
              <button
                onClick={handleApprove}
                disabled={actionLoading === 'approve'}
                className="btn-success w-full"
              >
                {actionLoading === 'approve' ? (
                  <> <Loader2 className="w-4 h-4 animate-spin" /> Aprobando... </>
                ) : (
                  <> <CheckCircle className="w-4 h-4" /> Aprobar y pagar {formatXLM(milestone.amount)} </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {aiSummary && (
        <div className="card border-primary/30 bg-primary/5">
          <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
            <span className="w-5 h-5" style={{background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', borderRadius: '50%'}} />
            Resumen de IA
          </h3>
          <p className="text-text-secondary">{aiSummary}</p>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-text-primary">Asistente de IA</h3>
          <button
            onClick={handleAISummary}
            disabled={aiLoading || !evidenceDescription.trim()}
            className="btn-outline text-sm"
          >
            {aiLoading ? (
              <> <Loader2 className="w-4 h-4 animate-spin" /> Generando... </>
            ) : (
              <> <span className="w-4 h-4" style={{background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', borderRadius: '50%'}} /> Resumir evidencia </>
            )}
          </button>
        </div>
        <p className="text-sm text-text-muted mb-3">
          Pega la descripción de la evidencia entregada y la IA la comparará con los criterios.
        </p>
        <textarea
          value={evidenceDescription}
          onChange={(e) => setEvidenceDescription(e.target.value)}
          placeholder="Pega aquí la descripción de la evidencia para generar un resumen..."
          className="input min-h-[100px]"
          rows={4}
        />
      </div>
    </div>
  );
}