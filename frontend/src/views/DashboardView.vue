<template>
  <div class="dashboard-view animate-fade-in">
    <!-- Stat KPI Cards -->
    <div class="stats-grid">
      <StatCard
        label="Active Leases"
        :value="dashboardData?.activeLeasesCount || 0"
        subtext="Commercial contracts running"
        :icon="FileCheck"
        icon-bg="rgba(37, 99, 235, 0.12)"
        icon-color="#2563eb"
      />

      <StatCard
        label="Upcoming Renewals"
        :value="dashboardData?.upcomingRenewalsCount || 0"
        subtext="Expiring within 30 days"
        :icon="ClockAlert"
        icon-bg="rgba(245, 158, 11, 0.12)"
        icon-color="#d97706"
      />

      <StatCard
        label="Monthly Rent Due"
        :value="formatMoney(dashboardData?.monthlyRentDue)"
        :subtext="`Invoiced for ${currentMonthName}`"
        :icon="Receipt"
        icon-bg="rgba(99, 102, 241, 0.12)"
        icon-color="#6366f1"
      />

      <StatCard
        label="Monthly Rent Collected"
        :value="formatMoney(dashboardData?.monthlyRentCollected)"
        :subtext="`${collectionPercent}% collected`"
        :icon="CheckCircle2"
        icon-bg="rgba(16, 185, 129, 0.12)"
        icon-color="#059669"
      />
    </div>

    <!-- Monthly Collection Progress -->
    <div class="card-glass collection-bar-card">
      <div class="bar-header">
        <span class="bar-title">Monthly Rent Collection Progress ({{ currentMonthName }})</span>
        <span class="bar-stats">
          {{ formatMoney(dashboardData?.monthlyRentCollected) }} / {{ formatMoney(dashboardData?.monthlyRentDue) }}
        </span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: `${collectionPercent}%` }"></div>
      </div>
    </div>

    <!-- Two-column dashboard split -->
    <div class="dashboard-columns">
      <!-- Recent Leases Table -->
      <div class="card-glass content-card">
        <div class="card-title-row">
          <div>
            <h3>Active & Priority Leases</h3>
            <p>Overview of current commercial tenant agreements</p>
          </div>
          <router-link to="/leases" class="view-all-link">View All Leases →</router-link>
        </div>

        <!-- Desktop Table -->
        <div class="table-container desktop-table">
          <table class="modern-table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Property / Unit</th>
                <th>Current Rent</th>
                <th>End Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in recentLeases" :key="l.id">
                <td>
                  <strong>{{ l.tenant_name }}</strong>
                  <div v-if="l.tenant_mobile" class="sub-tenant">{{ l.tenant_mobile }}</div>
                </td>
                <td>
                  {{ l.property?.name || 'Property' }}
                  <span class="shop-pill">{{ l.shop_name }}</span>
                </td>
                <td class="money-cell">{{ formatMoney(l.current_rent) }}</td>
                <td>{{ formatDate(l.end_date) }}</td>
                <td>
                  <span class="badge" :class="getBadgeClass(l.status)">
                    {{ l.status }}
                  </span>
                </td>
              </tr>
              <tr v-if="recentLeases.length === 0">
                <td colspan="5" class="empty-state">No lease agreements found.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Recent Leases Card List -->
        <div class="mobile-card-list">
          <div v-for="l in recentLeases" :key="l.id" class="mobile-recent-lease card-glass">
            <div class="mrl-top">
              <div>
                <strong class="mrl-tenant">{{ l.tenant_name }}</strong>
                <span class="shop-pill">{{ l.property?.name || 'Property' }} • {{ l.shop_name }}</span>
              </div>
              <span class="badge" :class="getBadgeClass(l.status)">{{ l.status }}</span>
            </div>
            <div class="mrl-info">
              <strong class="money-cell">{{ formatMoney(l.current_rent) }}</strong>
              <span class="mrl-date">Expires {{ formatDate(l.end_date) }}</span>
            </div>
          </div>
          <div v-if="recentLeases.length === 0" class="empty-state">No lease agreements found.</div>
        </div>
      </div>

      <!-- Urgent Renewal Alerts Feed -->
      <div class="card-glass content-card">
        <div class="card-title-row">
          <div>
            <h3>30-Day Renewal Alerts</h3>
            <p>Expiring contracts requiring renewal discussion</p>
          </div>
          <router-link to="/renewals" class="view-all-link">View All →</router-link>
        </div>

        <div class="renewals-feed">
          <div
            v-for="l in urgentRenewals"
            :key="l.id"
            class="renewal-card-alert"
          >
            <div class="alert-top">
              <span class="tenant-headline">{{ l.tenant_name }} — {{ l.shop_name }}</span>
              <span class="days-chip">{{ l.days_remaining }} days left</span>
            </div>
            <div class="alert-details">
              <span>{{ l.property?.name }}</span>
              <span>• Ends {{ formatDate(l.end_date) }}</span>
              <span>• Current Rent {{ formatMoney(l.current_rent) }}</span>
            </div>
            <div class="alert-actions">
              <a v-if="l.tenant_mobile" :href="'tel:' + l.tenant_mobile" class="btn btn-sm btn-light">
                📞 Call Tenant
              </a>
              <button class="btn btn-sm btn-outline-primary" @click="store.openEditLease(l)">
                Edit / Renew
              </button>
            </div>
          </div>

          <div v-if="urgentRenewals.length === 0" class="empty-state alert-empty">
            <CheckCircle2 :size="32" class="empty-icon" />
            <p>All leases are in good standing.</p>
            <small>No contracts expiring within the next 30 days.</small>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useLeaseStore } from '../stores/leaseStore';
import StatCard from '../components/StatCard.vue';
import { formatMoney, formatDate } from '../utils/formatters';
import {
  FileCheck,
  ClockAlert,
  Receipt,
  CheckCircle2
} from 'lucide-vue-next';

const store = useLeaseStore();

onMounted(async () => {
  await store.loadDashboard();
});

const dashboardData = computed(() => store.dashboard);
const recentLeases = computed(() => store.dashboard?.recentLeases || store.leases.slice(0, 6));
const urgentRenewals = computed(() => store.dashboard?.urgentRenewals || store.leases.filter(l => l.status === 'Renewal Due').slice(0, 5));

const collectionPercent = computed(() => {
  const due = dashboardData.value?.monthlyRentDue || 0;
  const collected = dashboardData.value?.monthlyRentCollected || 0;
  if (!due || due <= 0) return 0;
  return Math.min(100, Math.round((collected / due) * 100));
});

const currentMonthName = computed(() => {
  const m = dashboardData.value?.currentMonth || store.selectedMonth;
  const [y, mon] = m.split('-');
  const date = new Date(parseInt(y), parseInt(mon) - 1, 1);
  return date.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
});

function getBadgeClass(status?: string) {
  if (status === 'Active') return 'badge-active';
  if (status === 'Renewal Due') return 'badge-renewal';
  return 'badge-expired';
}
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.collection-bar-card {
  padding: 18px 24px;
  margin-bottom: 24px;
}

.bar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.bar-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-main);
}

.bar-stats {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--primary);
}

.progress-track {
  width: 100%;
  height: 9px;
  background: #f1f5f9;
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2563eb, #10b981);
  border-radius: var(--radius-full);
  transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.dashboard-columns {
  display: grid;
  grid-template-columns: 1.35fr 0.95fr;
  gap: 24px;
}

.content-card {
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.card-title-row h3 {
  font-size: 17px;
  font-weight: 800;
  color: var(--text-main);
}

.card-title-row p {
  font-size: 12.5px;
  color: var(--text-muted);
  margin-top: 2px;
}

.view-all-link {
  font-size: 13px;
  font-weight: 700;
  color: var(--primary);
  text-decoration: none;
}
.view-all-link:hover {
  text-decoration: underline;
}

.sub-tenant {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.shop-pill {
  display: block;
  font-size: 11.5px;
  color: var(--text-muted);
  margin-top: 2px;
}

.money-cell {
  font-weight: 700;
  color: var(--text-main);
}

.renewals-feed {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.renewal-card-alert {
  border: 1px solid #fed7aa;
  border-left: 4px solid #f59e0b;
  border-radius: var(--radius-md);
  padding: 14px 16px;
  background: #fffdfa;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.alert-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tenant-headline {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
}

.days-chip {
  font-size: 11.5px;
  font-weight: 700;
  background: #fef3c7;
  color: #92400e;
  padding: 3px 8px;
  border-radius: var(--radius-full);
}

.alert-details {
  font-size: 12.5px;
  color: var(--text-muted);
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.alert-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.empty-state {
  text-align: center;
  padding: 32px 16px;
  color: var(--text-muted);
  font-size: 13.5px;
}

.alert-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.empty-icon {
  color: var(--emerald-text);
  margin-bottom: 4px;
}

/* Mobile Recent Leases */
.mobile-recent-lease {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
}

.mrl-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.mrl-tenant {
  font-size: 14.5px;
  color: var(--text-main);
  display: block;
}

.mrl-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  background: #f8fafc;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
}

.mrl-date {
  font-size: 12px;
  color: var(--text-muted);
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .dashboard-columns {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  .collection-bar-card {
    padding: 16px;
  }
  .bar-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  .content-card {
    padding: 16px;
  }
  .alert-actions {
    flex-direction: column;
  }
  .alert-actions .btn {
    width: 100%;
  }
}
</style>
