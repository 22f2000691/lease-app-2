<template>
  <div class="auth-page">
    <div class="auth-card card-glass animate-fade-in">
      <div class="auth-header">
        <div class="brand-badge">🏢</div>
        <h2>Welcome to LeaseTracker</h2>
        <p>Commercial Property & Tenant Rent Portal</p>
      </div>

      <!-- Quick 1-Click Demo Buttons for Instant Evaluation -->
      <div class="demo-box">
        <span class="demo-label">✨ Instant Demo Access (1-Click)</span>
        <div class="demo-buttons">
          <button type="button" class="btn btn-outline-primary demo-btn" @click="handleDemo('landlord')">
            <span>👑 Landlord Demo (Property Owner)</span>
          </button>
          <button type="button" class="btn btn-light demo-btn" @click="handleDemo('tenant')">
            <span>🏪 Tenant Demo</span>
          </button>
        </div>
      </div>

      <div class="divider">
        <span>or sign in with credentials</span>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="form-group">
          <label for="email">Email Address</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="input-control"
            placeholder="Email address"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="input-control"
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          class="btn btn-primary submit-btn"
          :disabled="auth.loading"
        >
          {{ auth.loading ? 'Signing in...' : 'Sign In to Portal' }}
        </button>
      </form>

      <div class="auth-footer">
        <p>Don't have an account? <router-link to="/register">Create an account</router-link></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';

const router = useRouter();
const auth = useAuthStore();

const email = ref('');
const password = ref('');

async function handleSubmit() {
  try {
    const profile = await auth.login(email.value, password.value);
    if (profile.role === 'tenant') {
      router.push('/tenant-portal');
    } else {
      router.push('/');
    }
  } catch {
    // Toast handled in store
  }
}

function handleDemo(role: 'landlord' | 'tenant') {
  auth.loginAsDemo(role);
  if (role === 'tenant') {
    router.push('/tenant-portal');
  } else {
    router.push('/');
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at top, #1e293b, #0f172a);
  padding: 24px;
}

.auth-card {
  width: 100%;
  max-width: 440px;
  padding: 36px 32px;
  background: #ffffff;
  border-radius: var(--radius-lg);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
}

.auth-header {
  text-align: center;
  margin-bottom: 24px;
}

.brand-badge {
  font-size: 32px;
  width: 56px;
  height: 56px;
  background: var(--primary-subtle);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
}

.auth-header h2 {
  font-size: 22px;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: -0.02em;
}

.auth-header p {
  font-size: 13.5px;
  color: var(--text-muted);
  margin-top: 4px;
}

.demo-box {
  background: #f8fafc;
  border: 1px dashed var(--primary-border);
  border-radius: var(--radius-md);
  padding: 14px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.demo-label {
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--primary);
  letter-spacing: 0.04em;
  text-align: center;
}

.demo-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.demo-btn {
  width: 100%;
  font-size: 13px;
  padding: 8px 12px;
}

.divider {
  position: relative;
  text-align: center;
  margin: 20px 0;
}
.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--border-light);
}
.divider span {
  position: relative;
  background: #ffffff;
  padding: 0 12px;
  font-size: 12px;
  color: var(--text-muted);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.submit-btn {
  width: 100%;
  padding: 11px;
  font-size: 14px;
  margin-top: 8px;
}

.auth-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 13px;
  color: var(--text-muted);
}
.auth-footer a {
  color: var(--primary);
  font-weight: 700;
  text-decoration: none;
}
.auth-footer a:hover {
  text-decoration: underline;
}
</style>
