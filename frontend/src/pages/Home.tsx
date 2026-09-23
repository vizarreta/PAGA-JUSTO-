import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { agreementsApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { formatXLM, getStatusConfig } from '../types';
import { Plus, Shield, ChevronRight, ExternalLink, Loader2, Zap } from 'lucide-react';
import { cn } from '../utils/helpers';

const statusLabels: Record<string, string> = {
  Created: 'Borrador',
  Funded: 'Fondeado',
  Active: 'En progreso',
  InResolution: 'En revisión',
  Completed: 'Completado',
  ClosedBySettlement: 'Cerrado por acuerdo',
};

export function Home() {
  const { user, isAuthenticated } = useAuthStore();
  const [agreements, setAgreements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadAgreements();
    }
  }, [isAuthenticated]);

  const loadAgreements = async () => {
    try {
      setLoading(true);
      const response = await agreementsApi.list(user?.address || '');
      setAgreements(response.data);
    } catch (err) {
      setError('Error al cargar acuerdos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getNextAction = (agreement: any) => {
    const currentUserRole = agreement.clientAddress === user?.address ? 'client' : 'freelancer';
    const currentMilestone = agreement.milestones?.[agreement.currentMilestone];

    switch (agreement.status) {
      case 'Created':
        return currentUserRole === 'client' ? 'Enviar a freelancer' : 'Revisar y aceptar';
      case 'Funded':
        return currentUserRole === 'client' ? 'Depositar fondos' : 'Esperando depósito';
      case 'Active':
        if (!currentMilestone) return 'Completado';
        if (currentMilestone.status === 'pending') {
          return currentUserRole === 'freelancer' ? 'Entregar hito' : 'Esperando entrega';
        }
        if (currentMilestone.status === 'delivered') {
          return currentUserRole === 'client' ? 'Revisar y aprobar' : 'Esperando revisión';
        }
        if (currentMilestone.status === 'changes_requested') {
          return currentUserRole === 'freelancer' ? 'Entregar ajustes' : 'Esperando ajustes';
        }
        return 'Próximo hito';
      case 'InResolution':
        return 'Resolver desacuerdo';
      case 'Completed':
      case 'ClosedBySettlement':
        return 'Finalizado';
      default:
        return '—';
    }
  };

  const getProgress = (agreement: any) => {
    if (!agreement.milestones?.length) return 0;
    const paid = agreement.milestones.filter((m: any) => m.status === 'paid').length;
    return Math.round((paid / agreement.milestones.length) * 100);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Mis Acuerdos</h1>
          <p className="text-text-secondary mt-1">Gestiona tus proyectos freelance con pagos protegidos por hitos</p>
        </div>
        <Link to="/create" className="btn-primary">
          <Plus className="w-5 h-5" />
          Nuevo Acuerdo
        </Link>
      </div>

      {error && (
        <div className="card border-danger/20 bg-danger/5">
          <p className="text-danger">{error}</p>
          <button onClick={loadAgreements} className="btn-outline mt-2">Reintentar</button>
        </div>
      )}

      {agreements.length === 0 ? (
        <div className="card text-center py-12">
          <Shield className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-medium text-text-primary mb-2">No tienes acuerdos aún</h2>
          <p className="text-text-secondary mb-6 max-w-md mx-auto">
            Crea tu primer acuerdo con IA y protege tus pagos con contratos inteligentes en Stellar.
          </p>
          <Link to="/create" className="btn-primary inline-flex">
            <Plus className="w-5 h-5" />
            Crear mi primer acuerdo
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agreements.map((agreement) => {
            const config = getStatusConfig(agreement.status);
            const progress = getProgress(agreement);
            const nextAction = getNextAction(agreement);
            const client = { address: agreement.clientAddress };
            const freelancer = { address: agreement.freelancerAddress };

            return (
              <Link
                key={agreement.id}
                to={`/agreement/${agreement.id}`}
                className="card-hover group"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text-primary truncate">{agreement.title || 'Sin título'}</h3>
                    <p className="text-sm text-text-secondary mt-1 line-clamp-2">{agreement.description}</p>
                  </div>
                  <span className={cn('badge', config.text, config.bg)}>
                    {statusLabels[agreement.status] || agreement.status}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-text-secondary">Progreso</span>
                    <span className="font-medium text-text-primary">{progress}%</span>
                  </div>
                  <div className="h-2 bg-bg-dark rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300 group-hover:opacity-100"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-text-secondary mb-4">
                  <span className="flex items-center gap-1" title="Cliente">
                    <Shield className="w-3 h-3" />
                    {formatAddress(client.address)}
                  </span>
                  <span className="flex items-center gap-1" title="Freelancer">
                    <Zap className="w-3 h-3" />
                    {formatAddress(freelancer.address)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-text-muted">Presupuesto:</span>
                    <span className="font-mono font-medium text-text-primary">
                      {formatXLM(agreement.totalAmount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-primary font-medium group-hover:gap-2 transition-all">
                    <span>{nextAction}</span>
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </Link>
            );
          })}
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
            Explorador Testnet
          </a>
        </div>
      </div>
    </div>
  );
}

function formatAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}