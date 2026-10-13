import { Lease } from '../types';

export function formatMoney(val: number | string | undefined | null): string {
  const num = Number(val || 0);
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr + 'T00:00:00Z');
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getCurrentMonthISO(): string {
  return new Date().toISOString().slice(0, 7);
}

export function daysBetween(dateA: string, dateB: string): number {
  const d1 = new Date(dateA + 'T00:00:00Z');
  const d2 = new Date(dateB + 'T00:00:00Z');
  return Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

export function calculateCurrentRent(
  lease: {
    start_date: string;
    base_rent_amount: number;
    annual_increment_percent?: number;
    annual_increment_type?: 'percent' | 'fixed';
    annual_increment_amount?: number;
  },
  targetDate: Date = new Date()
): number {
  const baseRent = Number(lease.base_rent_amount || 0);
  const incType = lease.annual_increment_type || 'percent';
  const incrementPercent = Number(lease.annual_increment_percent || 0);
  const incrementAmount = Number(lease.annual_increment_amount || 0);
  const start = new Date(lease.start_date + 'T00:00:00Z');

  let years = targetDate.getFullYear() - start.getFullYear();
  const anniversary = new Date(Date.UTC(targetDate.getFullYear(), start.getMonth(), start.getDate()));
  if (targetDate < anniversary) {
    years--;
  }
  years = Math.max(0, years);

  if (incType === 'fixed') {
    const total = baseRent + (incrementAmount * years);
    return Math.round(total * 100) / 100;
  } else {
    const compounded = baseRent * Math.pow(1 + incrementPercent / 100, years);
    return Math.round(compounded * 100) / 100;
  }
}

export function getLeaseStatus(lease: { manual_status?: string | null; end_date: string }): {
  status: 'Active' | 'Renewal Due' | 'Expired';
  daysRemaining: number;
} {
  const today = getTodayISO();
  const daysRemaining = daysBetween(today, lease.end_date);

  if (lease.manual_status && ['Active', 'Renewal Due', 'Expired'].includes(lease.manual_status)) {
    return {
      status: lease.manual_status as 'Active' | 'Renewal Due' | 'Expired',
      daysRemaining
    };
  }

  if (daysRemaining < 0) {
    return { status: 'Expired', daysRemaining };
  }
  if (daysRemaining <= 60) {
    return { status: 'Renewal Due', daysRemaining };
  }
  return { status: 'Active', daysRemaining };
}

export function buildDueDate(monthStr: string, day: number): string {
  const [yearStr, monthNumStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthNumStr, 10);
  const maxDay = new Date(year, month, 0).getDate();
  const safeDay = Math.min(Math.max(1, day), maxDay);
  return `${monthStr}-${String(safeDay).padStart(2, '0')}`;
}
