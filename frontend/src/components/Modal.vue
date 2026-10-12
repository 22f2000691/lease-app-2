<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isOpen" class="modal-backdrop" @click.self="emit('close')">
        <div class="modal-dialog card-glass" :style="{ maxWidth: maxWidth || '720px' }">
          <div class="modal-header">
            <div>
              <h2 class="modal-title">{{ title }}</h2>
              <p v-if="subtitle" class="modal-subtitle">{{ subtitle }}</p>
            </div>
            <button class="modal-close-btn" @click="emit('close')">
              <X :size="18" />
            </button>
          </div>

          <div class="modal-body">
            <slot></slot>
          </div>

          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { X } from 'lucide-vue-next';

const props = defineProps<{
  isOpen: boolean;
  title: string;
  subtitle?: string;
  maxWidth?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close');
  }
}

onMounted(() => window.addEventListener('keydown', onKeyDown));
onUnmounted(() => window.removeEventListener('keydown', onKeyDown));
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(11, 21, 45, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 100;
}

.modal-dialog {
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  background: #ffffff;
  border-radius: var(--radius-lg);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-light);
}

.modal-title {
  font-size: 19px;
  font-weight: 800;
  color: var(--text-main);
}

.modal-subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 2px;
}

.modal-close-btn {
  background: #f1f5f9;
  border: none;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64748b;
  transition: all var(--transition-fast);
}
.modal-close-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-light);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: #f8fafc;
}

/* Animations */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
