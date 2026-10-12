<template>
  <div class="toast-stack">
    <TransitionGroup name="toast">
      <div
        v-for="toast in store.toasts"
        :key="toast.id"
        class="toast-item"
        :class="'toast-' + toast.type"
      >
        <div class="toast-icon">
          <CheckCircle2 v-if="toast.type === 'success'" :size="18" />
          <AlertCircle v-else-if="toast.type === 'error'" :size="18" />
          <Info v-else :size="18" />
        </div>
        <div class="toast-content">
          <strong v-if="toast.title" class="toast-title">{{ toast.title }}</strong>
          <span class="toast-msg">{{ toast.message }}</span>
        </div>
        <button class="toast-close" @click="store.removeToast(toast.id)">
          <X :size="14" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { useNotificationStore } from '../stores/notificationStore';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-vue-next';

const store = useNotificationStore();
</script>

<style scoped>
.toast-stack {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 200;
  max-width: 420px;
  width: calc(100% - 48px);
  pointer-events: none;
}

.toast-item {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.18);
  font-size: 13.5px;
  background: #ffffff;
  border: 1px solid var(--border-light);
}

.toast-success {
  border-left: 4px solid var(--emerald-text);
  color: #065f46;
}
.toast-success .toast-icon {
  color: var(--emerald-text);
}

.toast-error {
  border-left: 4px solid var(--rose-text);
  color: #9f1239;
}
.toast-error .toast-icon {
  color: var(--rose-text);
}

.toast-info {
  border-left: 4px solid var(--primary);
  color: #1e40af;
}
.toast-info .toast-icon {
  color: var(--primary);
}

.toast-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  line-height: 1.35;
}

.toast-title {
  font-weight: 700;
  font-size: 13px;
  margin-bottom: 2px;
}

.toast-msg {
  font-size: 13px;
  color: var(--text-main);
}

.toast-close {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  display: flex;
  padding: 4px;
}
.toast-close:hover {
  color: var(--text-main);
}

/* Animations */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
