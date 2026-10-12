import { defineStore } from 'pinia';
import { ref } from 'vue';
import { ToastMessage } from '../types';

export const useNotificationStore = defineStore('notification', () => {
  const toasts = ref<ToastMessage[]>([]);

  function addToast(message: string, type: 'success' | 'error' | 'info' = 'info', title?: string, duration = 3500) {
    const id = 'toast-' + Date.now() + Math.random().toString(36).substring(2, 5);
    const toast: ToastMessage = { id, message, type, title, duration };
    toasts.value.push(toast);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }

  function removeToast(id: string) {
    toasts.value = toasts.value.filter(t => t.id !== id);
  }

  return {
    toasts,
    addToast,
    removeToast
  };
});
