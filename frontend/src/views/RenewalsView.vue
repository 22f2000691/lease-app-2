<template>
  <div class="renewals-view animate-fade-in">
    <div class="card-glass renewals-card">
      <div class="card-toolbar">
        <div>
          <h2>Upcoming Lease Renewals (30-Day Reminder)</h2>
          <p>Tenants whose commercial lease agreements expire within the next 30 days</p>
        </div>
        <span class="due-count-pill">{{ renewalDueLeases.length }} Leases Requiring Action</span>
      </div>

      <div class="renewals-grid">
        <div
          v-for="l in renewalDueLeases"
          :key="l.id"
          class="renewal-item-card card-glass"
        >
          <div class="card-top">
            <div>
              <h3 class="tenant-heading">{{ l.tenant_name }}</h3>
              <span class="unit-tag">{{ l.property?.name }} — {{ l.shop_name }}</span>
            </div>
            <div class="days-indicator">
              <span class="days-num">{{ l.days_remaining }}</span>
              <span class="days-text">days left</span>
            </div>
          </div>

          <div class="info-rows">
            <div class="info-row">
              <span class="label">End Date:</span>
              <strong class="val">{{ formatDate(l.end_date) }}</strong>
            </div>
            <div class="info-row">
              <span class="label">Current Rent:</span>
              <strong class="val text-primary">{{ formatMoney(l.current_rent) }}</strong>
            </div>
            <div class="info-row">
              <span class="label">Annual Escalation:</span>
              <span class="val">+{{ l.annual_increment_percent }}%</span>
            </div>
            <div v-if="l.tenant_mobile" class="info-row">
              <span class="label">Tenant Phone:</span>
              <a :href="'tel:' + l.tenant_mobile" class="val text-link">{{ l.tenant_mobile }}</a>
            </div>
          </div>

          <div class="card-footer-actions">
            <a
              v-if="l.tenant_mobile"
              :href="'tel:' + l.tenant_mobile"
              class="btn btn-sm btn-light"
            >
              <Phone :size="13" />
              <span>Call Tenant</span>
            </a>
            <button
              class="btn btn-sm btn-primary"
              @click="store.openEditLease(l)"
            >
              <FileCheck :size="13" />
              <span>Renew / Extend Lease</span>
            </button>
          </div>
        </div>

        <div v-if="renewalDueLeases.length === 0" class="empty-renewals-box">
          <CheckCircle2 :size="48" class="check-icon" />
          <h3>All leases are up to date!</h3>
          <p>There are no commercial leases terminating within the next 30 calendar days.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useLeaseStore } from '../stores/leaseStore';
import { formatMoney, formatDate } from '../utils/formatters';
import { Phone, FileCheck, CheckCircle2 } from 'lucide-vue-next';

const store = useLeaseStore();

onMounted(async () => {
  await store.loadProperties();
  await store.loadLeases();
});

const renewalDueLeases = computed(() =>
  store.leases.filter(l => l.status === 'Renewal Due')
);
</script>

<style scoped>
.renewals-card {
  padding: 24px;
}

.card-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
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

.due-count-pill {
  padding: 6px 14px;
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
  border-radius: var(--radius-full);
  font-size: 12.5px;
  font-weight: 700;
}

.renewals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
}

.renewal-item-card {
  border: 1px solid var(--border-light);
  border-left: 5px solid #f59e0b;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.tenant-heading {
  font-size: 16px;
  font-weight: 800;
  color: var(--text-main);
}

.unit-tag {
  font-size: 12.5px;
  color: var(--text-muted);
  display: block;
  margin-top: 2px;
}

.days-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #fef3c7;
  border: 1px solid #fde68a;
  padding: 4px 10px;
  border-radius: var(--radius-md);
}

.days-num {
  font-size: 18px;
  font-weight: 800;
  color: #92400e;
  line-height: 1.1;
}

.days-text {
  font-size: 10px;
  font-weight: 700;
  color: #b45309;
  text-transform: uppercase;
}

.info-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #f8fafc;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  font-size: 13px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-row .label {
  color: var(--text-muted);
}

.info-row .val {
  color: var(--text-main);
  font-weight: 600;
}

.text-primary {
  color: var(--primary);
  font-weight: 800;
}

.text-link {
  color: var(--primary);
  text-decoration: none;
}
.text-link:hover {
  text-decoration: underline;
}

.card-footer-actions {
  display: flex;
  gap: 10px;
  margin-top: auto;
}

.empty-renewals-box {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.check-icon {
  color: var(--emerald-text);
  margin-bottom: 8px;
}

.empty-renewals-box h3 {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main);
}

.empty-renewals-box p {
  color: var(--text-muted);
  font-size: 14px;
}
</style>
