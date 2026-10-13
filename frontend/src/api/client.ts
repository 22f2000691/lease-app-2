import { Property, Lease, RentRecord, DashboardSummary, UserProfile, TenantDashboardData } from '../types';
import { INITIAL_PROPERTIES, INITIAL_LEASES, INITIAL_RENTS, DEMO_LANDLORD, DEMO_TENANT } from './mockData';
import {
  calculateCurrentRent,
  getLeaseStatus,
  buildDueDate,
  getCurrentMonthISO,
  getTodayISO
} from '../utils/formatters';

const STORAGE_KEYS = {
  MODE: 'leaseTracker_apiMode',
  PROPERTIES: 'leaseTracker_properties_v3',
  LEASES: 'leaseTracker_leases_v3',
  RENTS: 'leaseTracker_rents_v3'
};

class LocalMockStorage {
  getProperties(): Property[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PROPERTIES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(INITIAL_PROPERTIES));
      return INITIAL_PROPERTIES;
    }
    return JSON.parse(raw);
  }

  saveProperties(list: Property[]) {
    localStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(list));
  }

  getLeases(): Lease[] {
    const raw = localStorage.getItem(STORAGE_KEYS.LEASES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.LEASES, JSON.stringify(INITIAL_LEASES));
      return INITIAL_LEASES;
    }
    return JSON.parse(raw);
  }

  saveLeases(list: Lease[]) {
    localStorage.setItem(STORAGE_KEYS.LEASES, JSON.stringify(list));
  }

  getRents(): RentRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.RENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.RENTS, JSON.stringify(INITIAL_RENTS));
      return INITIAL_RENTS;
    }
    return JSON.parse(raw);
  }

  saveRents(list: RentRecord[]) {
    localStorage.setItem(STORAGE_KEYS.RENTS, JSON.stringify(list));
  }

  resetAll() {
    localStorage.removeItem(STORAGE_KEYS.PROPERTIES);
    localStorage.removeItem(STORAGE_KEYS.LEASES);
    localStorage.removeItem(STORAGE_KEYS.RENTS);
  }
}

const localMock = new LocalMockStorage();

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
function getApiUrl(path: string): string {
  return API_BASE ? `${API_BASE}${path}` : path;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('leaseTracker_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Detect or override API mode: 'live' | 'mock'
let currentMode: 'live' | 'mock' = (localStorage.getItem(STORAGE_KEYS.MODE) as any) ||
  (import.meta.env.VITE_API_URL ? 'live' : 'mock');

export const ApiClient = {
  getMode(): 'live' | 'mock' {
    return currentMode;
  },

  setMode(mode: 'live' | 'mock') {
    currentMode = mode;
    localStorage.setItem(STORAGE_KEYS.MODE, mode);
  },

  async checkLiveHealth(): Promise<boolean> {
    try {
      const res = await fetch(getApiUrl('/api/health'), { method: 'GET', signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  },

  // ================= PROPERTIES =================
  async getProperties(): Promise<Property[]> {
    if (currentMode === 'live') {
      const res = await fetch(getApiUrl('/api/properties'));
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    }
    return localMock.getProperties();
  },

  async createProperty(property: Omit<Property, 'id'>): Promise<Property> {
    if (currentMode === 'live') {
      const res = await fetch(getApiUrl('/api/properties'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(property)
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    }
    const list = localMock.getProperties();
    const created: Property = {
      ...property,
      id: 'prop-' + Date.now(),
      created_at: new Date().toISOString()
    };
    list.unshift(created);
    localMock.saveProperties(list);
    return created;
  },

  async updateProperty(id: string, updates: Partial<Property>): Promise<Property> {
    if (currentMode === 'live') {
      const res = await fetch(getApiUrl(`/api/properties/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    }
    const list = localMock.getProperties();
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Property not found');
    list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
    localMock.saveProperties(list);
    return list[idx];
  },

  async deleteProperty(id: string): Promise<void> {
    if (currentMode === 'live') {
      const res = await fetch(getApiUrl(`/api/properties/${id}`), { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return;
    }
    const leases = localMock.getLeases();
    if (leases.some(l => l.property_id === id)) {
      throw new Error('Cannot delete property: active or expired leases are associated with it.');
    }
    const list = localMock.getProperties().filter(p => p.id !== id);
    localMock.saveProperties(list);
  },

  // ================= LEASES =================
  async getLeases(filter?: { status?: string; search?: string }): Promise<Lease[]> {
    if (currentMode === 'live') {
      const params = new URLSearchParams();
      if (filter?.status) params.set('status', filter.status);
      if (filter?.search) params.set('search', filter.search);
      const res = await fetch(getApiUrl(`/api/leases?${params.toString()}`));
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    }

    const properties = localMock.getProperties();
    const propMap = new Map(properties.map(p => [p.id, p]));

    let list = localMock.getLeases().map(l => {
      const { status, daysRemaining } = getLeaseStatus(l);
      const currentRent = calculateCurrentRent(l);
      return {
        ...l,
        current_rent: currentRent,
        status,
        days_remaining: daysRemaining,
        property: propMap.get(l.property_id)
      };
    });

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(l =>
        l.tenant_name.toLowerCase().includes(q) ||
        l.shop_name.toLowerCase().includes(q) ||
        (l.property?.name && l.property.name.toLowerCase().includes(q)) ||
        (l.tenant_mobile && l.tenant_mobile.includes(q))
      );
    }

    if (filter?.status) {
      list = list.filter(l => l.status === filter.status);
    }

    return list.sort((a, b) => a.end_date.localeCompare(b.end_date));
  },

  async createLease(lease: Omit<Lease, 'id'>): Promise<Lease> {
    if (currentMode === 'live') {
      const res = await fetch(getApiUrl('/api/leases'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lease)
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    }
    const list = localMock.getLeases();
    const created: Lease = {
      ...lease,
      id: 'lease-' + Date.now(),
      created_at: new Date().toISOString()
    };
    list.unshift(created);
    localMock.saveLeases(list);

    const properties = localMock.getProperties();
    const { status, daysRemaining } = getLeaseStatus(created);
    return {
      ...created,
      current_rent: calculateCurrentRent(created),
      status,
      days_remaining: daysRemaining,
      property: properties.find(p => p.id === created.property_id)
    };
  },

  async updateLease(id: string, updates: Partial<Lease>): Promise<Lease> {
    if (currentMode === 'live') {
      const res = await fetch(getApiUrl(`/api/leases/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    }
    const list = localMock.getLeases();
    const idx = list.findIndex(l => l.id === id);
    if (idx === -1) throw new Error('Lease not found');
    list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
    localMock.saveLeases(list);

    const properties = localMock.getProperties();
    const { status, daysRemaining } = getLeaseStatus(list[idx]);
    return {
      ...list[idx],
      current_rent: calculateCurrentRent(list[idx]),
      status,
      days_remaining: daysRemaining,
      property: properties.find(p => p.id === list[idx].property_id)
    };
  },

  async deleteLease(id: string): Promise<void> {
    if (currentMode === 'live') {
      const res = await fetch(getApiUrl(`/api/leases/${id}`), { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return;
    }
    const list = localMock.getLeases().filter(l => l.id !== id);
    localMock.saveLeases(list);
    // Also remove rents
    const rents = localMock.getRents().filter(r => r.lease_id !== id);
    localMock.saveRents(rents);
  },

  // ================= RENTS =================
  async getRents(month: string): Promise<RentRecord[]> {
    if (currentMode === 'live') {
      const res = await fetch(getApiUrl(`/api/rents?month=${month}`));
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    }

    const leases = await this.getLeases();
    const leaseMap = new Map(leases.map(l => [l.id, l]));
    const today = getTodayISO();

    const rents = localMock.getRents().filter(r => r.month === month);
    return rents.map(r => {
      let status = r.status;
      if (status !== 'Paid' && r.due_date < today) {
        status = 'Overdue';
      }
      return {
        ...r,
        status,
        lease: leaseMap.get(r.lease_id)
      };
    }).sort((a, b) => a.due_date.localeCompare(b.due_date));
  },

  async generateRents(month: string): Promise<{ count: number; message: string }> {
    if (currentMode === 'live') {
      const res = await fetch(getApiUrl('/api/rents/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return { count: json.generatedCount || 0, message: json.message };
    }

    const leases = localMock.getLeases();
    const existingRents = localMock.getRents();
    const existingIds = new Set(existingRents.filter(r => r.month === month).map(r => r.lease_id));
    const targetDate = new Date(`${month}-15T00:00:00Z`);

    let generatedCount = 0;
    for (const l of leases) {
      const startMonth = l.start_date.slice(0, 7);
      const endMonth = l.end_date.slice(0, 7);
      if (month < startMonth || month > endMonth) continue;
      if (existingIds.has(l.id)) continue;

      const rentAmount = calculateCurrentRent(l, targetDate);
      const dueDate = buildDueDate(month, l.due_day || 5);

      existingRents.push({
        id: 'rent-' + Date.now() + Math.random().toString(36).substring(2, 6),
        lease_id: l.id,
        month,
        amount: rentAmount,
        due_date: dueDate,
        status: 'Pending',
        paid_date: null
      });
      generatedCount++;
    }

    localMock.saveRents(existingRents);
    return {
      count: generatedCount,
      message: `Generated ${generatedCount} rent invoice(s) for ${month}`
    };
  },

  async updateRentStatus(id: string, status: 'Paid' | 'Pending'): Promise<RentRecord> {
    if (currentMode === 'live') {
      const res = await fetch(getApiUrl(`/api/rents/${id}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    }

    const rents = localMock.getRents();
    const idx = rents.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Rent record not found');

    const today = getTodayISO();
    rents[idx].status = status;
    rents[idx].paid_date = status === 'Paid' ? today : null;
    localMock.saveRents(rents);

    const leases = await this.getLeases();
    return {
      ...rents[idx],
      lease: leases.find(l => l.id === rents[idx].lease_id)
    };
  },

  // ================= DASHBOARD & RENEWALS =================
  async getDashboardSummary(): Promise<DashboardSummary> {
    if (currentMode === 'live') {
      const res = await fetch(getApiUrl('/api/dashboard/summary'));
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    }

    const leases = await this.getLeases();
    const currentMonth = getCurrentMonthISO();
    const rents = await this.getRents(currentMonth);

    const activeCount = leases.filter(l => l.status === 'Active').length;
    const renewalCount = leases.filter(l => l.status === 'Renewal Due').length;

    const monthlyDue = rents.reduce((s, r) => s + Number(r.amount || 0), 0);
    const monthlyCollected = rents
      .filter(r => r.status === 'Paid')
      .reduce((s, r) => s + Number(r.amount || 0), 0);

    const urgentRenewals = leases.filter(l => l.status === 'Renewal Due').slice(0, 5);

    return {
      activeLeasesCount: activeCount,
      upcomingRenewalsCount: renewalCount,
      monthlyRentDue: Math.round(monthlyDue * 100) / 100,
      monthlyRentCollected: Math.round(monthlyCollected * 100) / 100,
      currentMonth,
      recentLeases: leases.slice(0, 8),
      urgentRenewals
    };
  },

  async getRenewals(): Promise<Lease[]> {
    if (currentMode === 'live') {
      const res = await fetch(getApiUrl('/api/renewals'));
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    }

    const leases = await this.getLeases();
    return leases.filter(l => l.status === 'Renewal Due');
  },

  // ================= AUTH =================
  async login(email: string, password: string): Promise<{ profile: UserProfile; token: string }> {
    if (currentMode === 'live') {
      const res = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return { profile: json.data.profile, token: json.data.session.access_token };
    }

    // Mock Login
    if (email.toLowerCase().includes('tenant') || email.toLowerCase().includes('priyanka')) {
      return { profile: DEMO_TENANT, token: 'mock-tenant-jwt-token' };
    }
    return {
      profile: {
        id: 'mock-landlord-id',
        email,
        full_name: email.split('@')[0],
        role: 'landlord'
      },
      token: 'mock-landlord-jwt-token'
    };
  },

  async register(data: { email: string; password: string; full_name: string; phone?: string; role: 'landlord' | 'tenant' }): Promise<{ profile: UserProfile; token: string }> {
    if (currentMode === 'live') {
      const res = await fetch(getApiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return { profile: json.data.profile, token: json.data.session?.access_token || 'registered' };
    }

    const profile: UserProfile = {
      id: 'mock-user-' + Date.now(),
      email: data.email,
      full_name: data.full_name,
      phone: data.phone,
      role: data.role
    };
    return { profile, token: 'mock-jwt-token-' + Date.now() };
  },

  async getMe(): Promise<UserProfile | null> {
    if (currentMode === 'live') {
      try {
        const res = await fetch(getApiUrl('/api/auth/me'), {
          headers: getAuthHeaders()
        });
        const json = await res.json();
        if (!json.success) return null;
        return json.data;
      } catch {
        return null;
      }
    }
    const raw = localStorage.getItem('leaseTracker_profile');
    return raw ? JSON.parse(raw) : null;
  },

  // ================= TENANT PORTAL =================
  async getTenantDashboard(): Promise<TenantDashboardData> {
    if (currentMode === 'live') {
      const res = await fetch(getApiUrl('/api/tenant/dashboard'), {
        headers: getAuthHeaders()
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    }

    // Mock tenant dashboard: find lease for DEMO_TENANT
    const rawProfile = localStorage.getItem('leaseTracker_profile');
    const profile: UserProfile = rawProfile ? JSON.parse(rawProfile) : DEMO_TENANT;
    const leases = await this.getLeases();
    const myLease = leases.find(l => l.tenant_email === profile.email || l.tenant_user_id === profile.id) || leases[1] || null;

    const currentMonth = getCurrentMonthISO();
    const rents = myLease ? (await this.getRents(currentMonth)).filter(r => r.lease_id === myLease.id) : [];
    const currentMonthInvoice = rents.find(r => r.month === currentMonth) || null;

    return {
      profile,
      lease: myLease,
      rents,
      daysRemaining: myLease?.days_remaining || 0,
      currentMonthInvoice,
      landlordContact: {
        name: '',
        phone: '',
        email: ''
      }
    };
  }
};
