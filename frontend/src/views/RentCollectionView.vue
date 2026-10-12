<template>
  <div class="rent-view animate-fade-in">
    <div class="card-glass rent-card">
      <div class="card-toolbar">
        <div>
          <h2>Monthly Rent Collection</h2>
          <p>Generate, monitor, and record monthly rental disbursements from commercial tenants</p>
        </div>
        <div class="month-actions">
          <div class="month-picker-wrap">
            <Calendar :size="16" class="calendar-icon" />
            <input
              v-model="store.selectedMonth"
              type="month"
              class="month-input"
              @change="handleMonthChange"
            />
          </div>
          <button
            class="btn btn-primary"
            :disabled="store.loading.action"
            @click="store.generateMonthlyRents()"
          >
            <Sparkles :size="16" />
            <span>{{ store.loading.action ? 'Generating...' : 'Generate Month Invoices' }}</span>
          </button>
        </div>
      </div>

      <!-- Month Summary Bar -->
      <div class="month-metrics card-glass">
        <div class="metric-block">
          <span class="m-label">Invoices</span>
          <strong class="m-val">{{ store.rents.length }} Total</strong>
        </div>
        <div class="metric-divider"></div>
        <div class="metric-block">
          <span class="m-label">Total Due</span>
          <strong class="m-val text-primary">{{ formatMoney(totalDue) }}</strong>
        </div>
        <div class="metric-divider"></div>
        <div class="metric-block">
          <span class="m-label">Collected</span>
          <strong class="m-val text-emerald">{{ formatMoney(totalCollected) }}</strong>
        </div>
        <div class="metric-divider"></div>
        <div class="metric-block">
          <span class="m-label">Pending / Overdue</span>
          <strong class="m-val text-amber">{{ formatMoney(totalPending) }}</strong>
        </div>
      </div>

      <!-- Invoices Table -->
      <div class="table-container">
        <table class="modern-table">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Property / Unit</th>
              <th>Monthly Rent</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Payment Date</th>
              <th style="text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in store.rents" :key="r.id">
              <td>
                <div class="tenant-cell">
                  <strong>{{ r.lease?.tenant_name || 'Tenant' }}</strong>
                  <span v-if="r.lease?.tenant_mobile" class="sub-text">{{ r.lease.tenant_mobile }}</span>
                </div>
              </td>
              <td>
                <strong>{{ r.lease?.property?.name || 'Property' }}</strong>
                <span class="sub-text">{{ r.lease?.shop_name || 'Shop' }}</span>
              </td>
              <td>
                <strong class="rent-val">{{ formatMoney(r.amount) }}</strong>
              </td>
              <td>
                <span :class="{ 'overdue-date': r.status === 'Overdue' }">
                  {{ formatDate(r.due_date) }}
                </span>
              </td>
              <td>
                <span class="badge" :class="getBadgeClass(r.status)">
                  {{ r.status }}
                </span>
              </td>
              <td>
                <span v-if="r.paid_date" class="paid-date-chip">
                  ✓ {{ formatDate(r.paid_date) }}
                </span>
                <span v-else class="text-muted">-</span>
              </td>
              <td style="text-align: right;">
                <button
                  v-if="r.status === 'Paid'"
                  class="btn btn-sm btn-light"
                  @click="store.toggleRentStatus(r)"
                >
                  <RotateCcw :size="13" />
                  <span>Undo Payment</span>
                </button>
                <button
                  v-else
                  class="btn btn-sm btn-primary"
                  @click="store.toggleRentStatus(r)"
                >
                  <CheckCircle2 :size="14" />
                  <span>Mark Paid</span>
                </button>
              </td>
            </tr>
            <tr v-if="store.rents.length === 0">
              <td colspan="7" class="empty-state">
                <Receipt :size="32" class="empty-icon" />
                <p>No rent invoices recorded for {{ store.selectedMonth }}.</p>
                <button class="btn btn-sm btn-primary mt-2" @click="store.generateMonthlyRents()">
                  Generate Current Lease Rent Now
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useLeaseStore } from '../stores/leaseStore';
import { formatMoney, formatDate } from '../utils/formatters';
import {
  Calendar,
  Sparkles,
  Receipt,
  CheckCircle2,
  RotateCcw
} from 'lucide-vue-next';

const store = useLeaseStore();

onMounted(async () => {
  await store.loadProperties();
  await store.loadLeases();
  await store.loadRents();
});

function handleMonthChange() {
  store.loadRents(store.selectedMonth);
}

const totalDue = computed(() =>
  store.rents.reduce((acc, r) => acc + Number(r.amount || 0), 0)
);

const totalCollected = computed(() =>
  store.rents
    .filter(r => r.status === 'Paid')
    .reduce((acc, r) => acc + Number(r.amount || 0), 0)
);

const totalPending = computed(() =>
  store.rents
    .filter(r => r.status !== 'Paid')
    .reduce((acc, r) => acc + Number(r.amount || 0), 0)
);

function getBadgeClass(status: string) {
  if (status === 'Paid') return 'badge-paid';
  if (status === 'Overdue') return 'badge-overdue';
  return 'badge-pending';
}
</script>

<style scoped>
.rent-card {
  padding: 24px;
}

.card-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
}

.card-toolbar h2 {
  font-size: 19px;
  font-weight: 800;
  color: var(--text-main);
}

.card-toolbar p {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 3px;
}

.month-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.month-picker-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.calendar-icon {
  position: absolute;
  left: 12px;
  color: var(--text-muted);
  pointer-events: none;
}

.month-input {
  padding: 8px 12px 8px 36px;
  border: 1.5px solid var(--border-light);
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-main);
  background: #ffffff;
  outline: none;
}
.month-input:focus {
  border-color: var(--primary);
}

.month-metrics {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 16px 24px;
  background: #f8fafc;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.metric-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.metric-divider {
  width: 1px;
  height: 36px;
  background: var(--border-light);
}

.m-label {
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.04em;
}

.m-val {
  font-size: 17px;
  font-weight: 800;
}

.text-primary { color: var(--primary); }
.text-emerald { color: var(--emerald-text); }
.text-amber { color: var(--amber-text); }

.tenant-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sub-text {
  font-size: 12px;
  color: var(--text-muted);
}

.rent-val {
  font-size: 14.5px;
  color: var(--text-main);
}

.overdue-date {
  color: var(--rose-text);
  font-weight: 700;
}

.paid-date-chip {
  font-size: 12px;
  color: var(--emerald-text);
  font-weight: 600;
}

.empty-state {
  text-align: center;
  padding: 48px 16px;
  color: var(--text-muted);
}

.empty-icon {
  margin-bottom: 8px;
  color: var(--text-subtle);
}

.mt-2 {
  margin-top: 12px;
}

@media (max-width: 768px) {
  .metric-divider {
    display: none;
  }
  .month-metrics {
    justify-content: space-between;
  }
}
</style>
