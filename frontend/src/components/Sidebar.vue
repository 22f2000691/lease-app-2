<template>
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-icon">🏢</div>
      <div class="brand-text">
        <span class="brand-title">LEASE TRACKER</span>
        <span class="brand-subtitle">Commercial Property Pro</span>
      </div>
    </div>

    <!-- Navigation Menu based on User Role -->
    <nav class="nav-menu">
      <!-- Landlord Navigation -->
      <template v-if="auth.isLandlord">
        <router-link to="/" class="nav-item" active-class="active">
          <LayoutDashboard :size="18" />
          <span>Dashboard</span>
        </router-link>

        <router-link to="/properties" class="nav-item" active-class="active">
          <Building2 :size="18" />
          <span>Properties / Locations</span>
          <span v-if="propertiesCount > 0" class="nav-pill">{{ propertiesCount }}</span>
        </router-link>

        <router-link to="/leases" class="nav-item" active-class="active">
          <FileText :size="18" />
          <span>Tenants & Leases</span>
          <span v-if="activeLeasesCount > 0" class="nav-pill">{{ activeLeasesCount }}</span>
        </router-link>

        <router-link to="/rent-collection" class="nav-item" active-class="active">
          <IndianRupee :size="18" />
          <span>Monthly Collection</span>
        </router-link>

        <router-link to="/renewals" class="nav-item" active-class="active">
          <ClockAlert :size="18" />
          <span>Upcoming Renewals</span>
          <span v-if="renewalsCount > 0" class="nav-pill alert-pill">{{ renewalsCount }}</span>
        </router-link>
      </template>

      <!-- Tenant Navigation -->
      <template v-else>
        <router-link to="/tenant-portal" class="nav-item" active-class="active">
          <Store :size="18" />
          <span>My Lease & Unit</span>
        </router-link>
      </template>
    </nav>

    <!-- Sidebar Footer with User Profile & Logout -->
    <div class="sidebar-footer">
      <div v-if="auth.isAuthenticated" class="user-profile-card">
        <div class="user-avatar">
          {{ auth.isLandlord ? '👑' : '🏪' }}
        </div>
        <div class="user-info">
          <strong class="user-name">{{ auth.profile?.full_name }}</strong>
          <span class="user-role-tag" :class="auth.isLandlord ? 'tag-landlord' : 'tag-tenant'">
            {{ auth.isLandlord ? 'Landlord / Owner' : 'Tenant Portal' }}
          </span>
        </div>
        <button class="logout-btn" title="Sign Out" @click="handleLogout">
          <LogOut :size="16" />
        </button>
      </div>

      <div class="system-status">
        <span class="status-dot" :class="{ 'live-dot': store.apiMode === 'live' }"></span>
        <div class="status-info">
          <small class="status-mode">{{ store.apiMode === 'live' ? 'Cloudflare + Supabase' : 'Offline Demo Mode' }}</small>
          <button class="toggle-mode-btn" @click="toggleMode">
            Switch to {{ store.apiMode === 'live' ? 'Demo' : 'Live' }}
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useLeaseStore } from '../stores/leaseStore';
import { useAuthStore } from '../stores/authStore';
import {
  LayoutDashboard,
  Building2,
  FileText,
  IndianRupee,
  ClockAlert,
  Store,
  LogOut
} from 'lucide-vue-next';

const router = useRouter();
const store = useLeaseStore();
const auth = useAuthStore();

const propertiesCount = computed(() => store.properties.length);
const activeLeasesCount = computed(() => store.leases.filter(l => l.status === 'Active').length);
const renewalsCount = computed(() => store.leases.filter(l => l.status === 'Renewal Due').length);

function toggleMode() {
  store.setMode(store.apiMode === 'live' ? 'mock' : 'live');
}

function handleLogout() {
  auth.logout();
  router.push('/login');
}
</script>

<style scoped>
.sidebar {
  width: 260px;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  color: var(--sidebar-text);
  padding: 24px 16px;
  position: fixed;
  inset: 0 auto 0 0;
  display: flex;
  flex-direction: column;
  z-index: 40;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 20px;
}

.brand-icon {
  font-size: 24px;
  background: rgba(37, 99, 235, 0.25);
  border: 1px solid rgba(59, 130, 246, 0.4);
  border-radius: 10px;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-title {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #ffffff;
}

.brand-subtitle {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
}

.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  color: #94a3b8;
  text-decoration: none;
  font-size: 13.5px;
  font-weight: 600;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #ffffff;
  transform: translateX(2px);
}

.nav-item.active {
  background: linear-gradient(135deg, #1e3a8a, #2563eb);
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
}

.nav-pill {
  margin-left: auto;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.alert-pill {
  background: #f59e0b;
  color: #78350f;
}

.sidebar-footer {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-profile-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.06);
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.user-avatar {
  font-size: 18px;
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 12.5px;
  font-weight: 700;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role-tag {
  font-size: 10.5px;
  font-weight: 700;
}
.tag-landlord {
  color: #93c5fd;
}
.tag-tenant {
  color: #6ee7b7;
}

.logout-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color var(--transition-fast);
}
.logout-btn:hover {
  color: #ef4444;
}

.system-status {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.03);
  padding: 8px 12px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f59e0b;
  box-shadow: 0 0 6px #f59e0b;
}

.status-dot.live-dot {
  background: #10b981;
  box-shadow: 0 0 6px #10b981;
}

.status-info {
  display: flex;
  flex-direction: column;
}

.status-mode {
  font-size: 10.5px;
  color: #94a3b8;
  font-weight: 600;
}

.toggle-mode-btn {
  background: none;
  border: none;
  color: #60a5fa;
  font-size: 10.5px;
  font-weight: 600;
  padding: 0;
  text-align: left;
  cursor: pointer;
}
.toggle-mode-btn:hover {
  text-decoration: underline;
}

@media (max-width: 1024px) {
  .sidebar {
    width: 80px;
    padding: 20px 10px;
  }
  .brand-text, .nav-item span, .nav-pill, .status-info, .user-info {
    display: none;
  }
  .brand {
    justify-content: center;
    padding-bottom: 16px;
  }
  .nav-item {
    justify-content: center;
    padding: 12px;
  }
  .user-profile-card {
    justify-content: center;
    padding: 8px;
  }
  .system-status {
    justify-content: center;
    padding: 8px;
  }
}

@media (max-width: 768px) {
  .sidebar {
    inset: auto 0 0 0;
    width: 100%;
    height: 65px;
    flex-direction: row;
    padding: 6px 12px;
    border-right: none;
    border-top: 1px solid var(--sidebar-border);
  }
  .brand, .sidebar-footer {
    display: none;
  }
  .nav-menu {
    flex-direction: row;
    justify-content: space-around;
    width: 100%;
  }
  .nav-item {
    flex-direction: column;
    gap: 4px;
    padding: 8px;
    font-size: 10px;
  }
  .nav-item span {
    display: block;
  }
}
</style>
