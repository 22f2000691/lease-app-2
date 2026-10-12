import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { Property, Lease, RentRecord, DashboardSummary } from '../types';
import { ApiClient } from '../api/client';
import { getCurrentMonthISO } from '../utils/formatters';
import { useNotificationStore } from './notificationStore';

export const useLeaseStore = defineStore('leases', () => {
  const notify = useNotificationStore();

  const properties = ref<Property[]>([]);
  const leases = ref<Lease[]>([]);
  const rents = ref<RentRecord[]>([]);
  const dashboard = ref<DashboardSummary | null>(null);

  const selectedMonth = ref<string>(getCurrentMonthISO());
  const leaseSearch = ref<string>('');
  const leaseStatusFilter = ref<string>('');

  const apiMode = ref<'live' | 'mock'>(ApiClient.getMode());
  const isBackendOnline = ref<boolean>(false);

  const loading = ref({
    dashboard: false,
    properties: false,
    leases: false,
    rents: false,
    action: false
  });

  // Modals state
  const isPropertyModalOpen = ref<boolean>(false);
  const editingProperty = ref<Property | null>(null);

  const isLeaseModalOpen = ref<boolean>(false);
  const editingLease = ref<Lease | null>(null);

  // Check connection status
  async function checkConnectivity() {
    isBackendOnline.value = await ApiClient.checkLiveHealth();
  }

  function setMode(mode: 'live' | 'mock') {
    apiMode.value = mode;
    ApiClient.setMode(mode);
    notify.addToast(`Switched to ${mode === 'live' ? 'Live Cloudflare / Supabase API' : 'Local Demo Mode'}`, 'info');
    refreshAll();
  }

  // Dashboard
  async function loadDashboard() {
    loading.value.dashboard = true;
    try {
      dashboard.value = await ApiClient.getDashboardSummary();
    } catch (err: any) {
      notify.addToast(`Failed to load dashboard: ${err.message}`, 'error');
    } finally {
      loading.value.dashboard = false;
    }
  }

  // Properties
  async function loadProperties() {
    loading.value.properties = true;
    try {
      properties.value = await ApiClient.getProperties();
    } catch (err: any) {
      notify.addToast(`Failed to load properties: ${err.message}`, 'error');
    } finally {
      loading.value.properties = false;
    }
  }

  async function saveProperty(propertyData: { id?: string; name: string; address: string; total_units: number }) {
    loading.value.action = true;
    try {
      if (propertyData.id) {
        await ApiClient.updateProperty(propertyData.id, propertyData);
        notify.addToast('Property updated successfully', 'success');
      } else {
        await ApiClient.createProperty({
          name: propertyData.name,
          address: propertyData.address,
          total_units: propertyData.total_units
        });
        notify.addToast('New property registered', 'success');
      }
      isPropertyModalOpen.value = false;
      editingProperty.value = null;
      await loadProperties();
      await loadDashboard();
    } catch (err: any) {
      notify.addToast(`Failed to save property: ${err.message}`, 'error');
      throw err;
    } finally {
      loading.value.action = false;
    }
  }

  async function removeProperty(id: string) {
    if (!confirm('Are you sure you want to delete this property?')) return;
    loading.value.action = true;
    try {
      await ApiClient.deleteProperty(id);
      notify.addToast('Property removed', 'success');
      await loadProperties();
      await loadDashboard();
    } catch (err: any) {
      notify.addToast(err.message, 'error');
    } finally {
      loading.value.action = false;
    }
  }

  // Leases
  async function loadLeases() {
    loading.value.leases = true;
    try {
      leases.value = await ApiClient.getLeases({
        search: leaseSearch.value,
        status: leaseStatusFilter.value
      });
    } catch (err: any) {
      notify.addToast(`Failed to load leases: ${err.message}`, 'error');
    } finally {
      loading.value.leases = false;
    }
  }

  async function saveLease(leaseData: any) {
    loading.value.action = true;
    try {
      if (leaseData.id) {
        await ApiClient.updateLease(leaseData.id, leaseData);
        notify.addToast('Lease details updated successfully', 'success');
      } else {
        await ApiClient.createLease(leaseData);
        notify.addToast('New tenant lease added to register', 'success');
      }
      isLeaseModalOpen.value = false;
      editingLease.value = null;
      await loadLeases();
      await loadDashboard();
      if (rents.value.length > 0) {
        await loadRents();
      }
    } catch (err: any) {
      notify.addToast(`Error saving lease: ${err.message}`, 'error');
      throw err;
    } finally {
      loading.value.action = false;
    }
  }

  async function removeLease(id: string) {
    if (!confirm('Delete this tenant lease and all its associated rent invoices?')) return;
    loading.value.action = true;
    try {
      await ApiClient.deleteLease(id);
      notify.addToast('Lease and records removed', 'success');
      await loadLeases();
      await loadDashboard();
      await loadRents();
    } catch (err: any) {
      notify.addToast(err.message, 'error');
    } finally {
      loading.value.action = false;
    }
  }

  // Rent Collection
  async function loadRents(month: string = selectedMonth.value) {
    loading.value.rents = true;
    try {
      rents.value = await ApiClient.getRents(month);
    } catch (err: any) {
      notify.addToast(`Failed to load rent records: ${err.message}`, 'error');
    } finally {
      loading.value.rents = false;
    }
  }

  async function generateMonthlyRents() {
    loading.value.action = true;
    try {
      const res = await ApiClient.generateRents(selectedMonth.value);
      notify.addToast(res.message, res.count > 0 ? 'success' : 'info');
      await loadRents(selectedMonth.value);
      await loadDashboard();
    } catch (err: any) {
      notify.addToast(`Rent generation failed: ${err.message}`, 'error');
    } finally {
      loading.value.action = false;
    }
  }

  async function toggleRentStatus(rent: RentRecord) {
    const nextStatus = rent.status === 'Paid' ? 'Pending' : 'Paid';
    loading.value.action = true;
    try {
      await ApiClient.updateRentStatus(rent.id, nextStatus);
      notify.addToast(`Rent marked as ${nextStatus}`, 'success');
      await loadRents(selectedMonth.value);
      await loadDashboard();
    } catch (err: any) {
      notify.addToast(`Could not update rent: ${err.message}`, 'error');
    } finally {
      loading.value.action = false;
    }
  }

  // Modal open helpers
  function openAddProperty() {
    editingProperty.value = null;
    isPropertyModalOpen.value = true;
  }

  function openEditProperty(p: Property) {
    editingProperty.value = p;
    isPropertyModalOpen.value = true;
  }

  function openAddLease() {
    editingLease.value = null;
    isLeaseModalOpen.value = true;
  }

  function openEditLease(l: Lease) {
    editingLease.value = l;
    isLeaseModalOpen.value = true;
  }

  async function refreshAll() {
    await Promise.all([
      loadDashboard(),
      loadProperties(),
      loadLeases(),
      loadRents(selectedMonth.value)
    ]);
  }

  return {
    properties,
    leases,
    rents,
    dashboard,
    selectedMonth,
    leaseSearch,
    leaseStatusFilter,
    apiMode,
    isBackendOnline,
    loading,
    isPropertyModalOpen,
    editingProperty,
    isLeaseModalOpen,
    editingLease,
    checkConnectivity,
    setMode,
    loadDashboard,
    loadProperties,
    saveProperty,
    removeProperty,
    loadLeases,
    saveLease,
    removeLease,
    loadRents,
    generateMonthlyRents,
    toggleRentStatus,
    openAddProperty,
    openEditProperty,
    openAddLease,
    openEditLease,
    refreshAll
  };
});
