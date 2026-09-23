import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
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

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function generateTermsHash(terms: any): string {
  const serialized = JSON.stringify({
    version: terms.version,
    title: terms.title,
    description: terms.description,
    network: terms.network,
    asset: terms.asset,
    totalBudgetStroops: terms.totalBudgetStroops,
    clientAddress: terms.clientAddress,
    freelancerAddress: terms.freelancerAddress,
    milestones: terms.milestones.map((m: any) => ({
      index: m.index,
      title: m.title,
      description: m.description,
      acceptanceCriteria: m.acceptanceCriteria,
      amountStroops: m.amountStroops,
      dueDate: m.dueDate,
    })),
    reviewPeriodHours: terms.reviewPeriodHours,
    revisionRounds: terms.revisionRounds,
    clientMaterials: terms.clientMaterials,
    scopeIncluded: terms.scopeIncluded,
    scopeExcluded: terms.scopeExcluded,
    resolutionPolicy: terms.resolutionPolicy,
    createdAt: terms.createdAt,
    updatedAt: terms.updatedAt,
  });

  // Simple hash for demo - in production use crypto.subtle.digest
  let hash = 0;
  for (let i = 0; i < serialized.length; i++) {
    const char = serialized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}