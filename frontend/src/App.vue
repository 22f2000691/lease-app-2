<template>
  <div class="app-layout">
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

    <!-- Global Modals & Notifications -->
    <PropertyModal />
    <LeaseModal />
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useLeaseStore } from './stores/leaseStore';

import Sidebar from './components/Sidebar.vue';
import HeaderBar from './components/HeaderBar.vue';
import PropertyModal from './components/PropertyModal.vue';
import LeaseModal from './components/LeaseModal.vue';
import ToastContainer from './components/ToastContainer.vue';

const route = useRoute();
const store = useLeaseStore();

onMounted(async () => {
  await store.checkConnectivity();
  await store.refreshAll();
});
</script>

<style scoped>
/* App layout styles defined in main.css */
</style>
