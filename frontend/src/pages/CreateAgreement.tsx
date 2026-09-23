import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { agentApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export function CreateAgreement() {
  const navigate = useNavigate();
  const { user, network } = useAuthStore();
  const [step, setStep] = useState<'input' | 'review' | 'acceptance'>('input');
  const [naturalLanguage, setNaturalLanguage] = useState('');
  const [draft, setDraft] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<any[]>([]);

  const totalBudget = milestones.reduce((sum, m) => sum + BigInt(m.amountStroops || '0'), 0n);

  useEffect(() => {
    if (network !== 'testnet') {
      setError('PagaJusto MVP requiere Stellar Testnet. Cambia la red en Freighter.');
    }
  }, [network]);

  const handleGenerateDraft = async () => {
    if (!naturalLanguage.trim()) {
      setError('Describe el trabajo antes de generar el borrador');
      return;
    }
    if (!user) {
      setError('Debes estar autenticado');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await agentApi.draft({
        naturalLanguage,
        clientAddress: user.address,
        freelancerAddress: '',
        network,
      });
      const result = response.data;
      setDraft(result);
      const parsedMilestones = result.terms.milestones.map((m: any, i: number) => ({
        id: crypto.randomUUID(),
        agreementId: '',
        index: i,
        title: m.title,
        description: m.description,
        acceptanceCriteria: [...m.acceptanceCriteria],
        amountStroops: m.amountStroops.toString(),
        amount: Number(m.amountStroops) / 10_000_000,
        dueDate: m.dueDate,
        status: 'pending' as const,
        evidenceHash: undefined,
        evidenceUrl: undefined,
        deliveredAt: undefined,
        paidAt: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      setMilestones(parsedMilestones);
      setStep('review');
    } catch (err) {
      setError('Error al generar el borrador. Intenta crear el acuerdo manualmente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateMilestone = (index: number, field: string, value: any) => {
    setMilestones(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  const addCriterion = (milestoneIndex: number) => {
    setMilestones(prev => prev.map((m, i) => 
      i === milestoneIndex 
        ? { ...m, acceptanceCriteria: [...(m.acceptanceCriteria || []), ''] }
        : m
    ));
  };

  const removeCriterion = (milestoneIndex: number, criterionIndex: number) => {
    setMilestones(prev => prev.map((m, i) =>
      i === milestoneIndex
        ? { ...m, acceptanceCriteria: (m.acceptanceCriteria || []).filter((_: any, ci: number) => ci !== criterionIndex) }
        : m
    ));
  };

  const addMilestone = () => {
    if (milestones.length >= 3) return;
    const newIndex = milestones.length;
    setMilestones(prev => [...prev, {
      id: crypto.randomUUID(),
      agreementId: '',
      index: newIndex,
      title: '',
      description: '',
      acceptanceCriteria: [''],
      amount: 0,
      amountStroops: '0',
      dueDate: undefined,
      status: 'pending' as const,
      evidenceHash: undefined,
      evidenceUrl: undefined,
      deliveredAt: undefined,
      paidAt: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }]);
  };

  const removeMilestone = (index: number) => {
    if (milestones.length <= 1) return;
    setMilestones(prev => prev.filter((_: any, i: number) => i !== index).map((m, i) => ({ ...m, index: i })));
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (milestones.length === 0) {
      setError('Debe haber al menos un hito');
      return;
    }
    if (milestones.some(m => !m.title?.trim() || !m.description?.trim() || BigInt(m.amountStroops || '0') <= 0)) {
      setError('Todos los hitos deben tener título, descripción e importe mayor a 0');
      return;
    }
    if (totalBudget === 0n) {
      setError('El presupuesto total debe ser mayor a 0');
      return;
    }

    setLoading(true);
    try {
      const terms = draft!.terms;
      const updatedTerms = {
        ...terms,
        totalBudgetStroops: totalBudget.toString(),
        milestones,
        clientAddress: user.address,
        freelancerAddress: '',
        updatedAt: new Date().toISOString(),
      };

      const response = await fetch('/api/agreements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTerms),
      });

      if (!response.ok) throw new Error('Error al crear borrador');

      const agreement = await response.json();
      navigate(`/agreement/${agreement.id}`);
    } catch (err) {
      setError('Error al guardar el acuerdo');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatXLM = (stroops: string | number): string => {
    const value = typeof stroops === 'string' ? parseFloat(stroops) : stroops;
    const xlm = value / 10_000_000;
    if (xlm === Math.floor(xlm)) return `${xlm} XLM`;
    return `${xlm.toFixed(7).replace(/\.?0+$/, '')} XLM`;
  };

  const xlmToStroops = (xlm: string): string => {
    const [whole, frac = ''] = xlm.split('.');
    const paddedFrac = (frac + '0000000').slice(0, 7);
    return (parseInt(whole) * 10_000_000 + parseInt(paddedFrac)).toString();
  };

  const stroopsToXlm = (stroops: string | number): string => {
    const value = typeof stroops === 'string' ? parseFloat(stroops) : stroops;
    const xlm = Math.floor(value / 10_000_000);
    const remainder = value % 10_000_000;
    if (remainder === 0) return `${xlm} XLM`;
    const frac = remainder.toString().padStart(7, '0').replace(/0+$/, '');
    return `${xlm}.${frac} XLM`;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Crear Acuerdo con IA</h1>
          <p className="text-text-secondary mt-1">Describe el trabajo y la IA estructurará hitos, criterios y pagos</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="badge badge-primary">
            <span className="w-3 h-3" style={{background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', borderRadius: '50%'}} />
            IA Asistida
          </span>
          <span className="badge badge-muted">Testnet</span>
        </div>
      </div>

      {error && (
        <div className="card border-danger/20 bg-danger/5 flex items-start gap-3 p-4">
          <span className="w-5 h-5 text-danger mt-0.5" style={{borderRadius: '50%', background: '#ef4444'}} />
          <p className="text-danger">{error}</p>
        </div>
      )}

      {step === 'input' && (
        <div className="card animate-in">
          <div className="space-y-4">
            <label className="label">¿Qué trabajo necesitas hacer?</label>
            <textarea
              value={naturalLanguage}
              onChange={(e) => setNaturalLanguage(e.target.value)}
              className="input min-h-[140px] resize-none"
              placeholder="Ej: Pagaré 100 XLM por una página web para mi cafetería en tres etapas: diseño en Figma, desarrollo en React, y publicación en Vercel. El cliente entrega logo y textos."
              rows={6}
            />
            <p className="text-sm text-text-muted">
              Sé específico: menciona presupuesto, número de etapas, tipo de entregables y cualquier condición importante.
            </p>
            <button
              onClick={handleGenerateDraft}
              disabled={loading || !naturalLanguage.trim()}
              className="btn-primary w-full py-3"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 animate-spin" style={{border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%'}} />
                  Generando borrador...
                </>
              ) : (
                <>
                  <span className="w-5 h-5" style={{background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', borderRadius: '50%'}} />
                  Generar borrador con IA
                </>
              )}
            </button>
            <p className="text-center text-sm text-text-muted">
              ¿Sin IA configurada? <button className="text-primary hover:underline">Crear manualmente</button>
            </p>
          </div>
        </div>
      )}

      {step === 'review' && draft && (
        <div className="space-y-6">
          <div className="card animate-in">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Detalles del Acuerdo</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Título</label>
                <input
                  type="text"
                  value={draft.terms.title}
                  onChange={(e) => setDraft((d: any) => d ? { ...d, terms: { ...d.terms, title: e.target.value } } : null)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Presupuesto total</label>
                <div className="input bg-bg-card font-mono text-lg text-text-primary flex items-center justify-between px-4">
                  <span>{formatXLM(totalBudget)}</span>
                  <span className="text-sm text-text-muted">(~${Number(stroopsToXlm(totalBudget)) * 0.1} USD estimado)</span>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Descripción</label>
                <textarea
                  value={draft.terms.description}
                  onChange={(e) => setDraft((d: any) => d ? { ...d, terms: { ...d.terms, description: e.target.value } } : null)}
                  className="input min-h-[80px]"
                  rows={3}
                />
              </div>
              <div>
                <label className="label">Plazo de revisión (horas)</label>
                <input
                  type="number"
                  value={draft.terms.reviewPeriodHours}
                  onChange={(e) => setDraft((d: any) => d ? { ...d, terms: { ...d.terms, reviewPeriodHours: parseInt(e.target.value) } } : null)}
                  className="input"
                  min="1"
                  max="168"
                />
              </div>
              <div>
                <label className="label">Rondas de ajustes</label>
                <input
                  type="number"
                  value={draft.terms.revisionRounds}
                  onChange={(e) => setDraft((d: any) => d ? { ...d, terms: { ...d.terms, revisionRounds: parseInt(e.target.value) } } : null)}
                  className="input"
                  min="0"
                  max="5"
                />
              </div>
            </div>
          </div>

          <div className="card animate-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">Hitos ({milestones.length}/3)</h2>
              {milestones.length < 3 && (
                <button onClick={addMilestone} className="btn-outline text-sm">
                  <span className="w-4 h-4" style={{border: '2px solid #06b6d4', borderRadius: '50%'}} />
                  Añadir hito
                </button>
              )}
            </div>

            <div className="space-y-4">
              {milestones.map((milestone: any, idx: number) => (
                <div key={milestone.id} className="border border-border rounded-lg p-4 bg-bg-dark">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-text-muted/50">{idx + 1}</span>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={milestone.title}
                          onChange={(e) => updateMilestone(idx, 'title', e.target.value)}
                          placeholder="Título del hito (ej. Diseño, Desarrollo, Publicación)"
                          className="bg-transparent border-none focus:ring-0 text-lg font-medium text-text-primary w-full"
                        />
                        <textarea
                          value={milestone.description}
                          onChange={(e) => updateMilestone(idx, 'description', e.target.value)}
                          placeholder="Descripción del entregable"
                          className="bg-transparent border-none focus:ring-0 text-text-secondary mt-1 w-full resize-none"
                          rows={2}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="input w-28 text-center font-mono text-text-primary" style={{pointerEvents: 'none'}}>
                          {formatXLM(milestone.amountStroops)}
                        </span>
                        <input
                          type="text"
                          value={formatXLM(milestone.amountStroops)}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^\d*\.?\d*$/.test(val)) {
                              updateMilestone(idx, 'amountStroops', xlmToStroops(val || '0'));
                            }
                          }}
                          placeholder="XLM"
                          className="input w-28 text-center font-mono"
                          aria-label="Importe en XLM"
                        />
                        {milestones.length > 1 && (
                          <button
                            onClick={() => removeMilestone(idx)}
                            className="btn-ghost text-danger hover:bg-danger/10 p-1"
                            aria-label="Eliminar hito"
                          >
                            <span className="w-4 h-4" style={{border: '2px solid #ef4444', borderRadius: '50%', borderTopColor: 'transparent'}} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="label text-sm">Criterios de aceptación</label>
                    <div className="space-y-2">
                      {(milestone.acceptanceCriteria || []).map((criterion: string, cIdx: number) => (
                        <div key={cIdx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={criterion}
                            onChange={(e) => {
                              const newCriteria = [...(milestone.acceptanceCriteria || [])];
                              newCriteria[cIdx] = e.target.value;
                              updateMilestone(idx, 'acceptanceCriteria', newCriteria);
                            }}
                            placeholder="Ej. Incluye versión móvil y escritorio"
                            className="input flex-1"
                          />
                          {(milestone.acceptanceCriteria?.length || 0) > 1 && (
                            <button
                              onClick={() => removeCriterion(idx, cIdx)}
                              className="btn-ghost text-danger hover:bg-danger/10 p-1"
                            >
                              <span className="w-4 h-4" style={{border: '2px solid #ef4444', borderRadius: '50%', borderTopColor: 'transparent'}} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => addCriterion(idx)}
                        className="btn-outline text-sm w-full justify-start"
                      >
                        <span className="w-4 h-4" style={{border: '2px solid #06b6d4', borderRadius: '50%'}} />
                        Añadir criterio
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                    <label className="label text-sm mb-0 flex items-center gap-2 cursor-pointer">
                      <input
                        type="date"
                        value={milestone.dueDate ? milestone.dueDate.split('T')[0] : ''}
                        onChange={(e) => updateMilestone(idx, 'dueDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                        className="input w-auto"
                      />
                      <span className="w-4 h-4" style={{background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', borderRadius: '50%'}} />
                      Fecha de entrega
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {draft.questions.length > 0 && (
            <div className="card animate-in border-warning/20 bg-warning/5">
              <h3 className="font-medium text-accent mb-3 flex items-center gap-2">
                <span className="w-5 h-5" style={{background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', borderRadius: '50%'}} />
                Preguntas pendientes
              </h3>
              <ul className="space-y-1">
                {draft.questions.map((q: string, i: number) => (
                  <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {draft.warnings.length > 0 && (
            <div className="card animate-in border-danger/20 bg-danger/5">
              <h3 className="font-medium text-danger mb-3 flex items-center gap-2">
                <span className="w-5 h-5" style={{background: 'linear-gradient(135deg, #ef4444, #f87171)', borderRadius: '50%'}} />
                Advertencias
              </h3>
              <ul className="space-y-1">
                {draft.warnings.map((w: string, i: number) => (
                  <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-danger mt-2 flex-shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={() => setStep('input')} className="btn-outline">
              Volver
            </button>
            <button onClick={handleSubmit} disabled={loading} className="btn-primary">
              {loading ? (
                <>
                  <span className="w-4 h-4 animate-spin" style={{border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%'}} />
                  Guardando...
                </>
              ) : (
                'Crear acuerdo y enviar para aceptación'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}