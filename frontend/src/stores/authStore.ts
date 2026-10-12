import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { UserProfile, UserRole } from '../types';
import { ApiClient } from '../api/client';
import { DEMO_LANDLORD, DEMO_TENANT } from '../api/mockData';
import { useNotificationStore } from './notificationStore';

const STORAGE_KEYS = {
  TOKEN: 'leaseTracker_token',
  PROFILE: 'leaseTracker_profile'
};

export const useAuthStore = defineStore('auth', () => {
  const notify = useNotificationStore();

  function getInitialProfile(): UserProfile | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  const token = ref<string | null>(localStorage.getItem(STORAGE_KEYS.TOKEN));
  const profile = ref<UserProfile | null>(getInitialProfile());
  const loading = ref(false);

  const isAuthenticated = computed(() => !!token.value && !!profile.value);
  const isLandlord = computed(() => profile.value?.role === 'landlord');
  const isTenant = computed(() => profile.value?.role === 'tenant');
  const userRole = computed<UserRole>(() => profile.value?.role || 'landlord');

  function setSession(newToken: string, newProfile: UserProfile) {
    token.value = newToken;
    profile.value = newProfile;
    localStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(newProfile));
  }

  function clearSession() {
    token.value = null;
    profile.value = null;
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
  }

  async function login(email: string, pass: string) {
    loading.value = true;
    try {
      const res = await ApiClient.login(email, pass);
      setSession(res.token, res.profile);
      notify.addToast(`Welcome back, ${res.profile.full_name}!`, 'success');
      return res.profile;
    } catch (err: any) {
      notify.addToast(err.message || 'Login failed', 'error');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function register(data: { email: string; password: string; full_name: string; phone?: string; role: UserRole }) {
    loading.value = true;
    try {
      const res = await ApiClient.register(data);
      setSession(res.token, res.profile);
      notify.addToast(`Account created as ${data.role}!`, 'success');
      return res.profile;
    } catch (err: any) {
      notify.addToast(err.message || 'Registration failed', 'error');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    clearSession();
    notify.addToast('Signed out successfully', 'info');
  }

  // Quick 1-click Demo Switchers
  function loginAsDemo(role: 'landlord' | 'tenant') {
    if (role === 'landlord') {
      setSession('demo-landlord-token', DEMO_LANDLORD);
      notify.addToast('Logged in as Rajiv Goswami (Landlord Demo)', 'success');
      return DEMO_LANDLORD;
    } else {
      setSession('demo-tenant-token', DEMO_TENANT);
      notify.addToast('Logged in as Priyanka Das (Tenant Demo)', 'success');
      return DEMO_TENANT;
    }
  }

  async function initAuth() {
    if (token.value) {
      try {
        const freshProfile = await ApiClient.getMe();
        if (freshProfile) {
          profile.value = freshProfile;
          localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(freshProfile));
        }
      } catch {
        // Keep stored profile if offline
      }
    }
  }

  return {
    token,
    profile,
    loading,
    isAuthenticated,
    isLandlord,
    isTenant,
    userRole,
    login,
    register,
    logout,
    loginAsDemo,
    initAuth
  };
});
