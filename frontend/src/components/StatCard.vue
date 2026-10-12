<template>
  <div class="stat-card card-glass">
    <div class="stat-header">
      <span class="stat-label">{{ label }}</span>
      <div v-if="iconBg" class="stat-icon-wrap" :style="{ background: iconBg, color: iconColor }">
        <component :is="icon" :size="20" />
      </div>
    </div>
    <div class="stat-value">{{ value }}</div>
    <div class="stat-subtext">{{ subtext }}</div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{
  label: string;
  value: string | number;
  subtext: string;
  icon?: Component;
  iconBg?: string;
  iconColor?: string;
}>();
</script>

<style scoped>
.stat-card {
  padding: 22px 24px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.stat-label {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.stat-icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-value {
  font-size: 30px;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.stat-subtext {
  font-size: 12.5px;
  color: var(--text-muted);
  margin-top: 6px;
  font-weight: 500;
}
</style>
