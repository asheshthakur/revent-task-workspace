// Finance Helper Functions & Type Definitions
import { queryFirst, queryAll, queryRun } from './db';

export interface FinanceOverviewStats {
  totalInvoices: number;
  totalInvoiceValue: number;
  totalPaid: number;
  totalOutstanding: number;
  pendingPaymentsValue: number;
  overdueCount: number;
  overdueValue: number;
  pdcsReceived: number;
  pdcsPending: number;
  pdcsDueSoon: number;
  pdcsCleared: number;
  pdcsBounced: number;
}

export function computeInvoiceStatus(
  dueDate: string,
  totalAmount: number,
  paidAmount: number,
  rawStatus: string
): string {
  if (rawStatus === 'Cancelled') return 'Cancelled';
  if (rawStatus === 'Draft') return 'Draft';

  const outstanding = Math.max(0, totalAmount - paidAmount);
  if (outstanding <= 0.001) return 'Paid';

  const todayStr = new Date().toISOString().split('T')[0];
  if (dueDate && dueDate < todayStr) {
    return 'Overdue';
  }

  if (paidAmount > 0.001) return 'Partially Paid';
  if (rawStatus === 'Sent') return 'Sent';
  return 'Pending';
}
