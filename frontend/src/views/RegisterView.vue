<template>
  <div class="auth-page">
    <div class="auth-card card-glass animate-fade-in">
      <div class="auth-header">
        <div class="brand-badge">🏢</div>
        <h2>Create an Account</h2>
        <p>Register as a Landlord or Commercial Tenant</p>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <!-- Role Selection -->
        <div class="form-group">
          <label>I am registering as: *</label>
          <div class="role-grid">
            <label
              class="role-card"
              :class="{ 'role-selected': role === 'landlord' }"
            >
              <input type="radio" v-model="role" value="landlord" class="role-radio" />
              <span class="role-icon">👑</span>
              <div class="role-text">
                <strong>Property Owner / Landlord</strong>
                <small>Manage buildings, tenants & collections</small>
              </div>
            </label>

            <label
              class="role-card"
              :class="{ 'role-selected': role === 'tenant' }"
            >
              <input type="radio" v-model="role" value="tenant" class="role-radio" />
              <span class="role-icon">🏪</span>
              <div class="role-text">
                <strong>Commercial Tenant</strong>
                <small>View my unit, lease & invoices</small>
              </div>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label for="fullName">Full Name *</label>
          <input
            id="fullName"
            v-model="fullName"
            type="text"
            class="input-control"
            placeholder="e.g. Rajiv Goswami or Cafe Mocha"
            required
          />
        </div>

        <div class="form-group">
          <label for="email">Email Address *</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="input-control"
            placeholder="e.g. name@company.com"
            required
          />
        </div>

        <div class="form-group">
          <label for="phone">Phone Number</label>
          <input
            id="phone"
            v-model="phone"
            type="tel"
            class="input-control"
            placeholder="e.g. +91 98765 43210"
          />
        </div>

        <div class="form-group">
          <label for="password">Password *</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="input-control"
            placeholder="At least 6 characters"
            minlength="6"
            required
          />
        </div>

        <button
          type="submit"
          class="btn btn-primary submit-btn"
          :disabled="auth.loading"
        >
          {{ auth.loading ? 'Creating Account...' : 'Complete Registration' }}
        </button>
      </form>

      <div class="auth-footer">
        <p>Already have an account? <router-link to="/login">Sign In</router-link></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import { UserRole } from '../types';

const router = useRouter();
const auth = useAuthStore();

const role = ref<UserRole>('landlord');
const fullName = ref('');
const email = ref('');
const phone = ref('');
const password = ref('');

async function handleSubmit() {
  try {
    const profile = await auth.register({
      email: email.value,
      password: password.value,
      full_name: fullName.value,
      phone: phone.value,
      role: role.value
    });

    if (profile.role === 'tenant') {
      router.push('/tenant-portal');
    } else {
      router.push('/');
    }
  } catch {
    // Handled in store
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
  max-width: 520px;
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

.role-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 6px;
}

.role-card {
  border: 1.5px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: 12px;
  cursor: pointer;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  transition: all var(--transition-fast);
  background: #f8fafc;
}
.role-card:hover {
  border-color: var(--primary-border);
}

.role-selected {
  border-color: var(--primary);
  background: #eff6ff;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
}

.role-radio {
  display: none;
}

.role-icon {
  font-size: 20px;
}

.role-text {
  display: flex;
  flex-direction: column;
}

.role-text strong {
  font-size: 13px;
  color: var(--text-main);
}

.role-text small {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
  line-height: 1.25;
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

@media (max-width: 540px) {
  .role-grid {
    grid-template-columns: 1fr;
  }
}
</style>
