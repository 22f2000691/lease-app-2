<template>
  <div v-if="isAuthRoute" class="auth-layout">
    <router-view />
    <ToastContainer />
  </div>

  <div v-else class="app-layout">
    <Sidebar />

    <main class="main-content">
      <div class="content-body">
        <HeaderBar
          :title="(route.meta.title as string) || 'Dashboard'"
          :subtitle="(route.meta.subtitle as string) || 'Property & Rent Management System'"
        />

        <router-view />
      </div>
    </main>

    <!-- Global Modals & Notifications for Landlords -->
    <PropertyModal v-if="authStore.isLandlord" />
    <LeaseModal v-if="authStore.isLandlord" />
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useLeaseStore } from './stores/leaseStore';
import { useAuthStore } from './stores/authStore';

import Sidebar from './components/Sidebar.vue';
import HeaderBar from './components/HeaderBar.vue';
import PropertyModal from './components/PropertyModal.vue';
import LeaseModal from './components/LeaseModal.vue';
import ToastContainer from './components/ToastContainer.vue';

const route = useRoute();
const store = useLeaseStore();
const authStore = useAuthStore();

const isAuthRoute = computed(() => {
  return route.name === 'login' || route.name === 'register' || route.meta.guestOnly === true;
});

onMounted(async () => {
  await authStore.initAuth();
  await store.checkConnectivity();
  if (authStore.isLandlord) {
    await store.refreshAll();
  }
});
</script>

<style scoped>
.auth-layout {
  min-height: 100vh;
  background-color: var(--color-bg);
  display: flex;
  flex-direction: column;
}
</style>
