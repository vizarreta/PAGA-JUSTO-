export interface User {
  id: string;
  address: string;
  publicKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  agreementId: string;
  index: number;
  title?: string;
  description?: string;
  acceptanceCriteria?: string[];
  amount: number;
  amountStroops?: string;
  status: 'pending' | 'delivered' | 'paid' | 'changes_requested';
  evidenceHash?: string;
  evidenceUrl?: string;
  dueDate?: string;
  deliveredAt?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Agreement {
  id: string;
  clientAddress: string;
  freelancerAddress: string;
  token: string;
  totalAmount: number;
  deposited: number;
  paid: number;
  refunded: number;
  status: 'Created' | 'Funded' | 'Active' | 'Completed' | 'InResolution' | 'ClosedBySettlement';
  milestoneCount: number;
  currentMilestone: number;
  termsHash: string;
  clientAcceptedAt?: string;
  freelancerAcceptedAt?: string;
  fundedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  milestones: Milestone[];
  evidences?: Evidence[];
  transactions?: Transaction[];
  settlements?: SettlementProposal[];
  agentActivities?: AgentActivity[];
  client?: User;
  freelancer?: User;
}

export interface Evidence {
  id: string;
  agreementId: string;
  milestoneIndex: number;
  submittedByRole: 'client' | 'freelancer';
  hash: string;
  url?: string;
  description?: string;
  version: number;
  submittedAt: string;
}

export interface Transaction {
  id: string;
  agreementId: string;
  type: 'deposit' | 'milestone_payment' | 'refund' | 'settlement';
  status: 'pending' | 'confirmed' | 'failed';
  hash?: string;
  amount: number;
  fromAddress: string;
  toAddress: string;
  network: string;
  milestoneIndex?: number;
  error?: string;
  submittedAt: string;
  confirmedAt?: string;
}

export interface SettlementProposal {
  id: string;
  agreementId: string;
  proposedByRole: 'client' | 'freelancer';
  version: number;
  referenceBalance: number;
  clientAmount: number;
  freelancerAmount: number;
  description?: string;
  status: 'proposed' | 'accepted' | 'executed' | 'rejected';
  proposedAt: string;
  acceptedAt?: string;
  executedAt?: string;
}

export interface AgentActivity {
  id: string;
  agreementId: string;
  tool: string;
  input: Record<string, any>;
  output: Record<string, any>;
  reason: string;
  executedAt: string;
}

export interface Notification {
  id: string;
  agreementId?: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isConnecting: boolean;
  freighter: any;
  network: 'testnet' | 'mainnet';
}

export interface CreateAgreementData {
  client: string;
  freelancer: string;
  token: string;
  totalAmount: string;
  milestones: string[];
  termsHash: string;
}

export interface DraftAgreementOutput {
  terms: {
    version: number;
    title: string;
    description: string;
    network: string;
    asset: { code: string; contractId: string };
    totalBudgetStroops: string;
    clientAddress: string;
    freelancerAddress: string;
    milestones: Array<{
      index: number;
      title: string;
      description: string;
      acceptanceCriteria: string[];
      amountStroops: string;
      dueDate?: string;
    }>;
    reviewPeriodHours: number;
    revisionRounds: number;
    clientMaterials: string[];
    scopeIncluded: string[];
    scopeExcluded: string[];
    resolutionPolicy: string;
    createdAt: string;
    updatedAt: string;
  };
  questions: string[];
  warnings: string[];
}

export function formatXLM(stroops: number | string): string {
  const value = typeof stroops === 'string' ? parseFloat(stroops) : stroops;
  const xlm = value / 10_000_000;
  if (xlm === Math.floor(xlm)) {
    return `${xlm} XLM`;
  }
  return `${xlm.toFixed(7).replace(/\.?0+$/, '')} XLM`;
}

export function formatXLMShort(stroops: number | string): string {
  const value = typeof stroops === 'string' ? parseFloat(stroops) : stroops;
  const xlm = value / 10_000_000;
  if (xlm >= 1000) {
    return `${(xlm / 1000).toFixed(1)}K XLM`;
  }
  return `${xlm.toFixed(7).replace(/\.?0+$/, '')} XLM`;
}

export function xlmToStroops(xlm: string): string {
  const [whole, frac = ''] = xlm.split('.');
  const paddedFrac = (frac + '0000000').slice(0, 7);
  return (parseInt(whole) * 10_000_000 + parseInt(paddedFrac)).toString();
}

export function stroopsToXlm(stroops: string | number): string {
  const value = typeof stroops === 'string' ? parseFloat(stroops) : stroops;
  const xlm = Math.floor(value / 10_000_000);
  const remainder = value % 10_000_000;
  if (remainder === 0) return `${xlm} XLM`;
  const frac = remainder.toString().padStart(7, '0').replace(/0+$/, '');
  return `${xlm}.${frac} XLM`;
}

export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Lima',
    });
  } catch {
    return '—';
  }
}

export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays < 7) return `Hace ${diffDays} d`;
    return formatDate(dateString);
  } catch {
    return '—';
  }
}

export const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  Created: { bg: 'bg-muted/20', text: 'text-text-muted', dot: 'bg-text-muted' },
  Funded: { bg: 'bg-primary/20', text: 'text-primary', dot: 'bg-primary' },
  Active: { bg: 'bg-primary/20', text: 'text-primary', dot: 'bg-primary' },
  Completed: { bg: 'bg-success/20', text: 'text-success', dot: 'bg-success' },
  InResolution: { bg: 'bg-warning/20', text: 'text-accent', dot: 'bg-accent' },
  ClosedBySettlement: { bg: 'bg-secondary/20', text: 'text-secondary', dot: 'bg-secondary' },
};

export const milestoneStatusColors: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-muted/20', text: 'text-text-muted', dot: 'bg-text-muted' },
  delivered: { bg: 'bg-primary/20', text: 'text-primary', dot: 'bg-primary' },
  paid: { bg: 'bg-success/20', text: 'text-success', dot: 'bg-success' },
  changes_requested: { bg: 'bg-warning/20', text: 'text-accent', dot: 'bg-accent' },
};

export function getStatusConfig(status: string) {
  return statusColors[status] || statusColors.Created;
}

export function getMilestoneStatusConfig(status: string) {
  return milestoneStatusColors[status] || milestoneStatusColors.pending;
}