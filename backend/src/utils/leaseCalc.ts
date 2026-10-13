import { Lease } from '../types';

export function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getCurrentMonthISO(): string {
  return new Date().toISOString().slice(0, 7);
}

export function daysBetween(dateA: string, dateB: string): number {
  const d1 = new Date(dateA + 'T00:00:00Z');
  const d2 = new Date(dateB + 'T00:00:00Z');
  const diffMs = d2.getTime() - d1.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculates current rent for a lease based on completed years since start date.
 * Supports both percentage compounding and fixed rupee increments.
 */
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
  const startDateStr = lease.start_date;
  const baseRent = Number(lease.base_rent_amount || 0);
  const incType = lease.annual_increment_type || 'percent';
  const incrementPercent = Number(lease.annual_increment_percent || 0);
  const incrementAmount = Number(lease.annual_increment_amount || 0);

  const start = new Date(startDateStr + 'T00:00:00Z');
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

/**
 * Determines lease status: 'Active', 'Renewal Due' (within 60 days of end date), or 'Expired'.
 */
export function getLeaseStatus(lease: { manual_status?: string | null; end_date: string }): { status: 'Active' | 'Renewal Due' | 'Expired'; daysRemaining: number } {
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

/**
 * Decorates a raw database lease with computed fields (current_rent, status, days_remaining).
 */
export function enrichLease(lease: any): Lease {
  const { status, daysRemaining } = getLeaseStatus({
    manual_status: lease.manual_status,
    end_date: lease.end_date
  });

  const incType = lease.annual_increment_type || 'percent';
  const incPercent = Number(lease.annual_increment_percent || 0);
  const incAmount = Number(lease.annual_increment_amount || 0);

  const currentRent = calculateCurrentRent({
    start_date: lease.start_date,
    base_rent_amount: Number(lease.base_rent_amount),
    annual_increment_percent: incPercent,
    annual_increment_type: incType,
    annual_increment_amount: incAmount
  });

  return {
    ...lease,
    base_rent_amount: Number(lease.base_rent_amount),
    annual_increment_percent: incPercent,
    annual_increment_type: incType,
    annual_increment_amount: incAmount,
    due_day: Number(lease.due_day || 5),
    current_rent: currentRent,
    status,
    days_remaining: daysRemaining
  };
}

/**
 * Builds due date in 'YYYY-MM-DD' from a month ('YYYY-MM') and a due day, clamping to end of month.
 */
export function buildDueDate(monthStr: string, day: number): string {
  const [yearStr, monthNumStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthNumStr, 10);
  const maxDay = new Date(year, month, 0).getDate();
  const safeDay = Math.min(Math.max(1, day), maxDay);
  return `${monthStr}-${String(safeDay).padStart(2, '0')}`;
}
