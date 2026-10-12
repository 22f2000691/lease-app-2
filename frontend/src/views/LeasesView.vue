<template>
  <div class="leases-view animate-fade-in">
    <div class="card-glass leases-card">
      <div class="card-toolbar">
        <div>
          <h2>Tenant & Lease Register</h2>
          <p>Complete record of active tenant contracts, compounded escalation, and agreement documents</p>
        </div>
        <button class="btn btn-primary" @click="store.openAddLease()">
          <Plus :size="16" />
          <span>Add Tenant Lease</span>
        </button>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="filter-bar">
        <div class="search-box">
          <Search :size="16" class="search-icon" />
          <input
            v-model="store.leaseSearch"
            type="text"
            class="search-input"
            placeholder="Search tenant name, shop unit, phone..."
            @input="handleSearch"
          />
        </div>

        <div class="filter-controls">
          <select
            v-model="store.leaseStatusFilter"
            class="filter-select"
            @change="handleSearch"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Renewal Due">Renewal Due (Next 30 Days)</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </div>

      <!-- Data Table -->
      <div class="table-container">
        <table class="modern-table">
          <thead>
            <tr>
              <th>Tenant Name</th>
              <th>Property & Unit</th>
              <th>Lease Period</th>
              <th>Current Rent</th>
              <th>Annual Escalation</th>
              <th>Status</th>
              <th>Agreement Doc</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in store.leases" :key="l.id">
              <td>
                <div class="tenant-cell">
                  <strong>{{ l.tenant_name }}</strong>
                  <a v-if="l.tenant_mobile" :href="'tel:' + l.tenant_mobile" class="tenant-phone">
                    <Phone :size="12" />
                    <span>{{ l.tenant_mobile }}</span>
                  </a>
                  <span class="tenant-addr">{{ l.tenant_address }}</span>
                </div>
              </td>
              <td>
                <strong>{{ l.property?.name || 'Property' }}</strong>
                <span class="shop-badge">{{ l.shop_name }}</span>
              </td>
              <td>
                <div class="date-period">
                  <span>{{ formatDate(l.start_date) }}</span>
                  <span class="date-arrow">→</span>
                  <span>{{ formatDate(l.end_date) }}</span>
                </div>
              </td>
              <td>
                <strong class="rent-amount">{{ formatMoney(l.current_rent) }}</strong>
                <small class="base-amount">Base: {{ formatMoney(l.base_rent_amount) }}</small>
              </td>
              <td>
                <span class="increment-pill">+{{ l.annual_increment_percent }}% / yr</span>
              </td>
              <td>
                <span class="badge" :class="getBadgeClass(l.status)">
                  {{ l.status }}
                </span>
                <div v-if="l.status === 'Renewal Due'" class="days-hint">
                  {{ l.days_remaining }} days left
                </div>
              </td>
              <td>
                <button
                  v-if="l.document_name"
                  class="btn btn-sm btn-light doc-btn"
                  @click="openDoc(l)"
                >
                  <FileText :size="13" />
                  <span class="doc-text">{{ l.document_name }}</span>
                </button>
                <span v-else class="text-muted">-</span>
              </td>
              <td style="text-align: right;">
                <div class="table-actions">
                  <button class="btn btn-sm btn-light" @click="store.openEditLease(l)">
                    <Edit3 :size="14" />
                    <span>Edit</span>
                  </button>
                  <button class="btn btn-sm btn-danger" @click="store.removeLease(l.id)">
                    <Trash2 :size="14" />
                    <span>Delete</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="store.leases.length === 0">
              <td colspan="8" class="empty-state">
                No leases matching your search query or status filter.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useLeaseStore } from '../stores/leaseStore';
import { formatMoney, formatDate } from '../utils/formatters';
import {
  Plus,
  Search,
  Phone,
  FileText,
  Edit3,
  Trash2
} from 'lucide-vue-next';

const store = useLeaseStore();

onMounted(async () => {
  await store.loadProperties();
  await store.loadLeases();
});

function handleSearch() {
  store.loadLeases();
}

function getBadgeClass(status?: string) {
  if (status === 'Active') return 'badge-active';
  if (status === 'Renewal Due') return 'badge-renewal';
  return 'badge-expired';
}

function openDoc(lease: any) {
  if (lease.document_url) {
    window.open(lease.document_url, '_blank');
  } else {
    alert(`Document "${lease.document_name}" is attached to this record.`);
  }
}
</script>

<style scoped>
.leases-card {
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

.filter-bar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 240px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.search-input {
  width: 100%;
  padding: 9px 12px 9px 36px;
  border: 1.5px solid var(--border-light);
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: 13.5px;
  outline: none;
  background: #ffffff;
  transition: all var(--transition-fast);
}
.search-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.filter-select {
  padding: 9px 14px;
  border: 1.5px solid var(--border-light);
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: 13.5px;
  outline: none;
  background: #ffffff;
  color: var(--text-main);
}
.filter-select:focus {
  border-color: var(--primary);
}

.tenant-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tenant-phone {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
}
.tenant-phone:hover {
  text-decoration: underline;
}

.tenant-addr {
  font-size: 11.5px;
  color: var(--text-muted);
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shop-badge {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.date-period {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #334155;
}

.date-arrow {
  color: var(--text-muted);
}

.rent-amount {
  display: block;
  font-size: 14.5px;
  color: var(--text-main);
}

.base-amount {
  font-size: 11.5px;
  color: var(--text-muted);
}

.increment-pill {
  display: inline-flex;
  padding: 3px 8px;
  background: #eff6ff;
  color: #1e40af;
  border-radius: var(--radius-full);
  font-size: 11.5px;
  font-weight: 700;
}

.days-hint {
  font-size: 11px;
  color: var(--amber-text);
  font-weight: 600;
  margin-top: 2px;
}

.doc-btn {
  max-width: 160px;
}

.doc-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-actions {
  display: inline-flex;
  gap: 6px;
}

.empty-state {
  text-align: center;
  padding: 40px 16px;
  color: var(--text-muted);
}
</style>
