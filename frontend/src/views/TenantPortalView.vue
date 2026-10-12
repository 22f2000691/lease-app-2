<template>
  <div class="tenant-portal-view animate-fade-in">
    <!-- Loading State -->
    <div v-if="loading" class="card-glass loading-card">
      <div class="spinner"></div>
      <p>Loading your tenant dashboard...</p>
    </div>

    <!-- No Active Lease State -->
    <div v-else-if="!data?.lease" class="card-glass empty-lease-card">
      <Building2 :size="48" class="empty-icon" />
      <h2>Welcome, {{ auth.profile?.full_name }}!</h2>
      <p>There is currently no active commercial lease registered under your email address (<strong>{{ auth.profile?.email }}</strong>).</p>
      <div class="info-callout">
        <Info :size="16" />
        <span>Please ask your building manager or landlord to assign your lease agreement to <strong>{{ auth.profile?.email }}</strong>.</span>
      </div>
    </div>

    <!-- Active Tenant Dashboard -->
    <div v-else class="portal-content">
      <!-- Tenant Unit Banner -->
      <div class="card-glass hero-card">
        <div class="hero-main">
          <div class="unit-icon-box">🏪</div>
          <div>
            <div class="unit-tag">{{ data.lease.shop_name }}</div>
            <h1 class="property-title">{{ data.lease.property?.name }}</h1>
            <p class="property-address">{{ data.lease.property?.address }}</p>
          </div>
        </div>
        <div class="status-badge-wrap">
          <span class="badge" :class="getLeaseBadge(data.lease.status)">
            Lease Status: {{ data.lease.status }}
          </span>
          <span v-if="data.lease.status === 'Renewal Due'" class="renewal-countdown">
            ⏳ {{ data.daysRemaining }} days left on agreement
          </span>
        </div>
      </div>

      <!-- Key Figures Grid -->
      <div class="metrics-grid">
        <div class="card-glass metric-box">
          <span class="m-label">Current Monthly Rent</span>
          <strong class="m-val">{{ formatMoney(data.lease.current_rent) }}</strong>
          <span class="m-sub">Base ₹{{ formatMoney(data.lease.base_rent_amount) }} (+{{ data.lease.annual_increment_percent }}%/yr increment)</span>
        </div>

        <div class="card-glass metric-box">
          <span class="m-label">Current Month Invoice</span>
          <div class="m-status-row">
            <span
              v-if="data.currentMonthInvoice"
              class="badge"
              :class="getRentBadge(data.currentMonthInvoice.status)"
            >
              {{ data.currentMonthInvoice.status }}
            </span>
            <span v-else class="badge badge-pending">Not Invoiced Yet</span>
            <strong v-if="data.currentMonthInvoice" class="m-val-sm">
              {{ formatMoney(data.currentMonthInvoice.amount) }}
            </strong>
          </div>
          <span class="m-sub">Due on {{ formatDate(data.currentMonthInvoice?.due_date) }}</span>
        </div>

        <div class="card-glass metric-box">
          <span class="m-label">Agreement Term</span>
          <strong class="m-val-sm">{{ formatDate(data.lease.start_date) }} → {{ formatDate(data.lease.end_date) }}</strong>
          <span class="m-sub">{{ data.daysRemaining > 0 ? `${data.daysRemaining} days remaining` : 'Agreement Expired' }}</span>
        </div>
      </div>

      <!-- Agreement Document & Landlord Contact Row -->
      <div class="two-box-row">
        <!-- Agreement Document Card -->
        <div class="card-glass section-box">
          <div class="box-header">
            <FileText :size="18" class="header-icon" />
            <h3>Lease Agreement Deed</h3>
          </div>
          <div v-if="data.lease.document_name" class="doc-container">
            <div class="doc-info">
              <span class="doc-title">{{ data.lease.document_name }}</span>
              <span class="doc-type">Official Contract / KYC Attachment</span>
            </div>
            <button class="btn btn-outline-primary" @click="openAgreement">
              <ExternalLink :size="15" />
              <span>View / Download Agreement</span>
            </button>
          </div>
          <div v-else class="empty-doc">
            <p>No scanned document attached to this lease agreement yet.</p>
          </div>
        </div>

        <!-- Landlord Contact Card -->
        <div class="card-glass section-box">
          <div class="box-header">
            <UserCheck :size="18" class="header-icon" />
            <h3>Estate & Landlord Contact</h3>
          </div>
          <div class="landlord-info">
            <div class="landlord-name">
              <strong>{{ data.landlordContact?.name || 'Commercial Property Management' }}</strong>
              <small>Building Administration Office</small>
            </div>
            <div class="landlord-actions">
              <a
                v-if="data.landlordContact?.phone"
                :href="'tel:' + data.landlordContact.phone"
                class="btn btn-light"
              >
                <Phone :size="14" />
                <span>{{ data.landlordContact.phone }}</span>
              </a>
              <a
                v-if="data.landlordContact?.email"
                :href="'mailto:' + data.landlordContact.email"
                class="btn btn-light"
              >
                <Mail :size="14" />
                <span>Email Management</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Rent Invoices & Payment Ledger -->
      <div class="card-glass section-box">
        <div class="box-header">
          <Receipt :size="18" class="header-icon" />
          <div>
            <h3>Monthly Rent Invoices & Receipts</h3>
            <p class="box-sub">Complete payment history and pending rental disbursements</p>
          </div>
        </div>

        <div class="table-container">
          <table class="modern-table">
            <thead>
              <tr>
                <th>Billing Month</th>
                <th>Rent Amount</th>
                <th>Due Date</th>
                <th>Payment Status</th>
                <th>Payment / Clearance Date</th>
                <th>Payment Reference</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in data.rents" :key="r.id">
                <td>
                  <strong>{{ formatMonthName(r.month) }}</strong>
                </td>
                <td class="money-cell">{{ formatMoney(r.amount) }}</td>
                <td>{{ formatDate(r.due_date) }}</td>
                <td>
                  <span class="badge" :class="getRentBadge(r.status)">
                    {{ r.status }}
                  </span>
                </td>
                <td>
                  <span v-if="r.paid_date" class="paid-chip">
                    ✓ {{ formatDate(r.paid_date) }}
                  </span>
                  <span v-else class="text-muted">-</span>
                </td>
                <td>
                  <span v-if="r.notes" class="receipt-note">{{ r.notes }}</span>
                  <span v-else class="text-muted">-</span>
                </td>
              </tr>
              <tr v-if="data.rents.length === 0">
                <td colspan="6" class="empty-state">
                  No rent billing invoices generated for this unit yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/authStore';
import { ApiClient } from '../api/client';
import { TenantDashboardData } from '../types';
import { formatMoney, formatDate } from '../utils/formatters';
import {
  Building2,
  FileText,
  ExternalLink,
  Phone,
  Mail,
  Receipt,
  UserCheck,
  Info
} from 'lucide-vue-next';

const auth = useAuthStore();
const loading = ref(true);
const data = ref<TenantDashboardData | null>(null);

onMounted(async () => {
  try {
    data.value = await ApiClient.getTenantDashboard();
  } catch (err: any) {
    console.error('Error fetching tenant dashboard:', err);
  } finally {
    loading.value = false;
  }
});

function getLeaseBadge(status?: string) {
  if (status === 'Active') return 'badge-active';
  if (status === 'Renewal Due') return 'badge-renewal';
  return 'badge-expired';
}

function getRentBadge(status: string) {
  if (status === 'Paid') return 'badge-paid';
  if (status === 'Overdue') return 'badge-overdue';
  return 'badge-pending';
}

function formatMonthName(monthStr: string) {
  try {
    const [y, m] = monthStr.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    return date.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  } catch {
    return monthStr;
  }
}

function openAgreement() {
  if (data.value?.lease?.document_url) {
    window.open(data.value.lease.document_url, '_blank');
  } else {
    alert(`Attached document: "${data.value?.lease?.document_name}". Contact your landlord for a physical/cloud copy.`);
  }
}
</script>

<style scoped>
.tenant-portal-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.loading-card, .empty-lease-card {
  padding: 60px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-icon {
  color: var(--primary);
  margin-bottom: 8px;
}

.info-callout {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #eff6ff;
  border: 1px solid var(--primary-border);
  padding: 10px 16px;
  border-radius: var(--radius-md);
  font-size: 13px;
  color: #1e40af;
  margin-top: 12px;
}

.portal-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.hero-card {
  padding: 24px 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  background: linear-gradient(135deg, #ffffff, #f8fafc);
}

.hero-main {
  display: flex;
  align-items: center;
  gap: 16px;
}

.unit-icon-box {
  font-size: 32px;
  width: 58px;
  height: 58px;
  background: var(--primary-subtle);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.unit-tag {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--primary);
  letter-spacing: 0.05em;
}

.property-title {
  font-size: 22px;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: -0.02em;
  margin: 2px 0;
}

.property-address {
  font-size: 13px;
  color: var(--text-muted);
}

.status-badge-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.renewal-countdown {
  font-size: 12px;
  font-weight: 700;
  color: var(--amber-text);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.metric-box {
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.m-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.m-val {
  font-size: 26px;
  font-weight: 800;
  color: var(--text-main);
}

.m-val-sm {
  font-size: 16px;
  font-weight: 800;
  color: var(--text-main);
}

.m-sub {
  font-size: 12px;
  color: var(--text-muted);
}

.m-status-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 4px 0;
}

.two-box-row {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 20px;
}

.section-box {
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.box-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.header-icon {
  color: var(--primary);
}

.box-header h3 {
  font-size: 16px;
  font-weight: 800;
  color: var(--text-main);
}

.box-sub {
  font-size: 12.5px;
  color: var(--text-muted);
  margin-top: 2px;
}

.doc-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px;
  background: #f8fafc;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  flex-wrap: wrap;
  gap: 12px;
}

.doc-info {
  display: flex;
  flex-direction: column;
}

.doc-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
}

.doc-type {
  font-size: 12px;
  color: var(--text-muted);
}

.empty-doc {
  padding: 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

.landlord-info {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.landlord-name {
  display: flex;
  flex-direction: column;
}

.landlord-name strong {
  font-size: 14px;
  color: var(--text-main);
}

.landlord-name small {
  font-size: 12px;
  color: var(--text-muted);
}

.landlord-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.money-cell {
  font-weight: 700;
}

.paid-chip {
  font-size: 12px;
  color: var(--emerald-text);
  font-weight: 600;
}

.receipt-note {
  font-size: 12px;
  color: var(--text-muted);
}

.empty-state {
  text-align: center;
  padding: 36px 16px;
  color: var(--text-muted);
}

@media (max-width: 900px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  .two-box-row {
    grid-template-columns: 1fr;
  }
  .status-badge-wrap {
    align-items: flex-start;
  }
}
</style>
