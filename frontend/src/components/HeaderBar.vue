<template>
  <header class="header-bar">
    <div class="header-titles">
      <h1 class="page-title">{{ title }}</h1>
      <p class="page-subtitle">{{ subtitle }}</p>
    </div>

    <div class="header-actions">
      <div class="connection-badge" :class="store.apiMode === 'live' ? 'conn-live' : 'conn-mock'">
        <span class="pulse-dot"></span>
        <span class="badge-text-desktop">{{ store.apiMode === 'live' ? 'Connected: Cloudflare Edge + Supabase' : 'Running: Local Mock Store' }}</span>
        <span class="badge-text-mobile">{{ store.apiMode === 'live' ? 'Live' : 'Demo' }}</span>
      </div>

      <button class="btn btn-light desktop-only" @click="store.openAddProperty()">
        <Plus :size="16" />
        <span>Add Property</span>
      </button>

      <button class="btn btn-primary desktop-only" @click="store.openAddLease()">
        <Plus :size="16" />
        <span>Add Lease</span>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useLeaseStore } from '../stores/leaseStore';
import { Plus } from 'lucide-vue-next';

defineProps<{
  title: string;
  subtitle: string;
}>();

const store = useLeaseStore();
</script>

<style scoped>
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 28px;
}

.header-titles {
  display: flex;
  flex-direction: column;
}

.page-title {
  font-size: 26px;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-size: 13.5px;
  color: var(--text-muted);
  margin-top: 3px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.connection-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-light);
  background: #ffffff;
}

.conn-live {
  color: #047857;
  background: #ecfdf5;
  border-color: #a7f3d0;
}
.conn-live .pulse-dot {
  background: #10b981;
}

.conn-mock {
  color: #b45309;
  background: #fffbeb;
  border-color: #fde68a;
}
.conn-mock .pulse-dot {
  background: #f59e0b;
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  animation: pulse 1.8s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.8; }
}

.badge-text-mobile {
  display: none;
}

@media (max-width: 768px) {
  .header-bar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .page-title {
    font-size: 20px;
  }
  .page-subtitle {
    font-size: 12px;
  }
  .header-actions {
    width: auto;
    justify-content: flex-end;
  }
  .badge-text-desktop {
    display: none;
  }
  .badge-text-mobile {
    display: inline;
  }
  .connection-badge {
    padding: 5px 10px;
    font-size: 11px;
  }
}
</style>
