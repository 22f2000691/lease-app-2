<template>
  <div class="properties-view animate-fade-in">
    <div class="card-glass properties-card">
      <div class="card-toolbar">
        <div>
          <h2>Commercial Properties & Locations</h2>
          <p>Master registry of commercial buildings, complexes, and retail centers</p>
        </div>
        <button class="btn btn-primary" @click="store.openAddProperty()">
          <Plus :size="16" />
          <span>Add Property</span>
        </button>
      </div>

      <!-- Desktop Table -->
      <div class="table-container desktop-table">
        <table class="modern-table">
          <thead>
            <tr>
              <th>Property Name</th>
              <th>Location Address</th>
              <th>Total Units / Capacity</th>
              <th>Active Leases</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in store.properties" :key="p.id">
              <td>
                <div class="prop-name-box">
                  <Building2 :size="18" class="prop-icon" />
                  <strong>{{ p.name }}</strong>
                </div>
              </td>
              <td class="address-cell">{{ p.address }}</td>
              <td>
                <span class="units-badge">{{ p.total_units || 0 }} Units</span>
              </td>
              <td>
                <span class="active-leases-count">
                  {{ countActiveLeases(p.id) }} Active
                </span>
              </td>
              <td style="text-align: right;">
                <div class="table-actions">
                  <button class="btn btn-sm btn-light" @click="store.openEditProperty(p)">
                    <Edit3 :size="14" />
                    <span>Edit</span>
                  </button>
                  <button class="btn btn-sm btn-danger" @click="store.removeProperty(p.id)">
                    <Trash2 :size="14" />
                    <span>Delete</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="store.properties.length === 0">
              <td colspan="5" class="empty-state">
                No properties registered yet. Click "+ Add Property" to begin.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Touch-friendly Property Cards -->
      <div class="mobile-card-list">
        <div v-for="p in store.properties" :key="p.id" class="mobile-prop-card card-glass">
          <div class="mpc-header">
            <div class="prop-name-box">
              <Building2 :size="18" class="prop-icon" />
              <strong class="mpc-title">{{ p.name }}</strong>
            </div>
            <span class="units-badge">{{ p.total_units || 0 }} Units</span>
          </div>

          <p class="mpc-address">{{ p.address }}</p>

          <div class="mpc-meta">
            <span class="active-leases-count">
              {{ countActiveLeases(p.id) }} Active Leases
            </span>
          </div>

          <div class="mpc-actions">
            <button class="btn btn-sm btn-light mpc-btn" @click="store.openEditProperty(p)">
              <Edit3 :size="14" />
              <span>Edit</span>
            </button>
            <button class="btn btn-sm btn-danger mpc-btn" @click="store.removeProperty(p.id)">
              <Trash2 :size="14" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        <div v-if="store.properties.length === 0" class="empty-state">
          No properties registered yet. Click "+ Add Property" to begin.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useLeaseStore } from '../stores/leaseStore';
import { Building2, Plus, Edit3, Trash2 } from 'lucide-vue-next';

const store = useLeaseStore();

onMounted(async () => {
  await store.loadProperties();
  if (store.leases.length === 0) {
    await store.loadLeases();
  }
});

function countActiveLeases(propertyId: string): number {
  return store.leases.filter(l => l.property_id === propertyId && l.status === 'Active').length;
}
</script>

<style scoped>
.properties-card {
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

.prop-name-box {
  display: flex;
  align-items: center;
  gap: 10px;
}

.prop-icon {
  color: var(--primary);
}

.address-cell {
  max-width: 320px;
  white-space: normal;
  color: var(--text-muted);
  font-size: 13px;
}

.units-badge {
  display: inline-flex;
  padding: 4px 10px;
  background: #f1f5f9;
  color: #334155;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 700;
}

.active-leases-count {
  font-weight: 600;
  color: var(--emerald-text);
  font-size: 13px;
}

.table-actions {
  display: inline-flex;
  gap: 8px;
}

.empty-state {
  text-align: center;
  padding: 40px 16px;
  color: var(--text-muted);
}

/* Mobile Property Cards */
.mobile-prop-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
}

.mpc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.mpc-title {
  font-size: 15px;
  color: var(--text-main);
}

.mpc-address {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.4;
}

.mpc-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mpc-actions {
  display: flex;
  gap: 8px;
}

.mpc-btn {
  flex: 1;
  min-height: 40px;
}

@media (max-width: 640px) {
  .properties-card {
    padding: 16px;
  }
  .card-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .card-toolbar button {
    width: 100%;
  }
}
</style>
