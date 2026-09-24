import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { agreementsApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { RESOLUTION_POLICY, TESTNET_XLM, termsSchema, xlmToStroops } from '@pagajusto/shared';

const newMilestone = () => ({ title: '', description: '', amount: '', criteria: '', due: '' });
const lines = (value: string) => value.split('\n').map(v => v.trim()).filter(Boolean);

export function CreateAgreement() {
  const navigate = useNavigate();
  const { user, network } = useAuthStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [freelancer, setFreelancer] = useState('');
  const [budget, setBudget] = useState('');
  const [milestones, setMilestones] = useState([newMilestone()]);
  const [materials, setMaterials] = useState('');
  const [included, setIncluded] = useState('');
  const [excluded, setExcluded] = useState('');
  const [reviewHours, setReviewHours] = useState('48');
  const [rounds, setRounds] = useState('2');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const update = (i: number, field: keyof ReturnType<typeof newMilestone>, value: string) =>
    setMilestones(old => old.map((m, index) => index === i ? { ...m, [field]: value } : m));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await useAuthStore.getState().checkNetwork();
      if (useAuthStore.getState().network !== 'testnet') throw new Error('Selecciona Testnet en Freighter.');
      const terms = termsSchema.parse({
        version: 1, title, description, network: 'testnet',
        asset: { code: 'XLM', contractId: TESTNET_XLM },
        clientAddress: user?.address, freelancerAddress: freelancer.trim(),
        totalBudgetStroops: xlmToStroops(budget),
        milestones: milestones.map((m, index) => ({ index, title: m.title, description: m.description,
          amountStroops: xlmToStroops(m.amount), acceptanceCriteria: lines(m.criteria),
          dueDate: m.due ? new Date(m.due + ':00-05:00').toISOString() : '' })),
        reviewPeriodHours: Number(reviewHours), revisionRounds: Number(rounds),
        clientMaterials: lines(materials), scopeIncluded: lines(included), scopeExcluded: lines(excluded),
        resolutionPolicy: RESOLUTION_POLICY, createdAt: new Date().toISOString(),
      });
      const response = await agreementsApi.create(terms);
      navigate(`/agreement/${response.data.id}`);
    } catch (err: any) {
      setError(err?.issues?.map((i: any) => `${i.path.join('.')}: ${i.message}`).join(' · ') ||
        (typeof err?.response?.data?.message === 'string' ? err.response.data.message : err.message) || 'No se pudo guardar.');
    } finally { setLoading(false); }
  }

  return <form onSubmit={save} className="max-w-4xl mx-auto space-y-6">
    <div><span className="badge badge-primary">Stellar Testnet · XLM de prueba</span>
      <h1 className="text-3xl font-bold mt-3">Crear acuerdo</h1>
      <p className="text-text-secondary mt-2">Define el trabajo, los criterios de entrega y el importe de cada hito.</p></div>
    <div className="card border-primary/30" role="status">
      <strong>Creación manual disponible</strong>
      <p className="text-text-secondary mt-1">La IA está pendiente de integración. Guardar este borrador no acepta condiciones ni mueve fondos. Las firmas y pagos desde la web se habilitarán al completar la conexión con Soroban.</p>
    </div>
    {error && <div className="card border-danger text-danger" role="alert">{error}</div>}
    <section className="card space-y-4">
      <h2 className="text-xl font-semibold">01 · Trabajo y participantes</h2>
      <label className="block">Título<input required maxLength={160} className="input mt-1" value={title} onChange={e => setTitle(e.target.value)} /></label>
      <label className="block">Descripción del servicio<textarea required className="input mt-1" value={description} onChange={e => setDescription(e.target.value)} /></label>
      <label className="block">Wallet del cliente<input readOnly className="input mt-1 font-mono text-sm" value={user?.address || ''} /></label>
      <label className="block">Wallet del freelancer<input required className="input mt-1 font-mono text-sm" placeholder="G…" value={freelancer} onChange={e => setFreelancer(e.target.value)} /></label>
      <label className="block">Presupuesto total en XLM de prueba<input required inputMode="decimal" className="input mt-1" placeholder="100" value={budget} onChange={e => setBudget(e.target.value)} /></label>
    </section>
    <section className="card space-y-5">
      <h2 className="text-xl font-semibold">02 · Hitos secuenciales</h2>
      <p className="text-text-secondary">De uno a tres. Sus importes deben sumar exactamente el presupuesto.</p>
      {milestones.map((m, i) => <fieldset key={i} className="border border-border rounded-xl p-4 space-y-3">
        <legend className="px-2 text-primary">Hito {i + 1}</legend>
        <label className="block">Título<input required className="input mt-1" value={m.title} onChange={e => update(i, 'title', e.target.value)} /></label>
        <label className="block">Entregable<textarea required className="input mt-1" value={m.description} onChange={e => update(i, 'description', e.target.value)} /></label>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">Importe en XLM<input required inputMode="decimal" className="input mt-1" value={m.amount} onChange={e => update(i, 'amount', e.target.value)} /></label>
          <label className="block">Fecha límite · hora de Perú<input required type="datetime-local" className="input mt-1" value={m.due} onChange={e => update(i, 'due', e.target.value)} /></label>
        </div>
        <label className="block">Criterios de aceptación · uno por línea<textarea required className="input mt-1" rows={3} value={m.criteria} onChange={e => update(i, 'criteria', e.target.value)} /></label>
        {milestones.length > 1 && <button type="button" className="btn-outline" onClick={() => setMilestones(old => old.filter((_, j) => j !== i))}>Eliminar hito {i + 1}</button>}
      </fieldset>)}
      <button type="button" className="btn-outline" disabled={milestones.length >= 3} onClick={() => setMilestones(old => [...old, newMilestone()])}>Añadir hito {milestones.length >= 3 ? '· máximo 3' : ''}</button>
    </section>
    <section className="card space-y-4">
      <h2 className="text-xl font-semibold">03 · Condiciones</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <label>Plazo de revisión en horas<input required type="number" min="1" max="720" className="input mt-1" value={reviewHours} onChange={e => setReviewHours(e.target.value)} /></label>
        <label>Rondas de ajustes por hito<input required type="number" min="0" max="20" className="input mt-1" value={rounds} onChange={e => setRounds(e.target.value)} /></label>
      </div>
      <label className="block">Materiales del cliente y fechas · uno por línea<textarea className="input mt-1" value={materials} onChange={e => setMaterials(e.target.value)} /></label>
      <label className="block">Alcance incluido · uno por línea<textarea required className="input mt-1" value={included} onChange={e => setIncluded(e.target.value)} /></label>
      <label className="block">Exclusiones · una por línea<textarea className="input mt-1" value={excluded} onChange={e => setExcluded(e.target.value)} /></label>
      <p className="rounded-lg border border-accent/40 p-4 text-text-secondary">{RESOLUTION_POLICY}</p>
      <p className="text-sm text-text-muted">Se guardará una versión inmutable y su SHA-256. Para modificarla, crea un nuevo acuerdo que ambas partes deberán aceptar.</p>
    </section>
    <button type="submit" className="btn-primary" disabled={loading || network !== 'testnet'}>{loading ? 'Guardando…' : 'Guardar borrador y revisar términos'}</button>
    {network !== 'testnet' && <p role="status">Selecciona Testnet en Freighter y comprueba la red en la barra superior.</p>}
  </form>;
}
