<template>
  <Modal
    :is-open="store.isLeaseModalOpen"
    :title="isEditing ? 'Edit Tenant Lease' : 'Add New Tenant Lease'"
    :subtitle="isEditing ? 'Modify lease dates, rent amount or agreement document' : 'Register a new tenant, shop unit, and rental agreement'"
    max-width="840px"
    @close="store.isLeaseModalOpen = false"
  >
    <form @submit.prevent="handleSubmit" id="leaseForm" class="lease-form-grid">
      <!-- Tenant Info -->
      <div class="form-group">
        <label for="tenantName">Tenant Full Name *</label>
        <input
          id="tenantName"
          v-model="form.tenant_name"
          type="text"
          class="input-control"
          placeholder="Tenant full name"
          required
        />
      </div>

      <div class="form-group">
        <label for="tenantMobile">Mobile Contact Number</label>
        <input
          id="tenantMobile"
          v-model="form.tenant_mobile"
          type="tel"
          class="input-control"
          placeholder="Mobile number"
        />
      </div>

      <div class="form-group">
        <label for="tenantEmail">Tenant Account Email (For Tenant Portal)</label>
        <input
          id="tenantEmail"
          v-model="form.tenant_email"
          type="email"
          class="input-control"
          placeholder="Tenant email address"
        />
      </div>

      <div class="form-group full-width">
        <label for="tenantAddress">Tenant Permanent Address *</label>
        <textarea
          id="tenantAddress"
          v-model="form.tenant_address"
          class="input-control"
          placeholder="Tenant permanent address or registered office"
          rows="2"
          required
        ></textarea>
      </div>

      <!-- Unit Info -->
      <div class="form-group">
        <label for="leaseProperty">Property / Commercial Location *</label>
        <select
          id="leaseProperty"
          v-model="form.property_id"
          class="input-control"
          required
        >
          <option value="" disabled>Select property location</option>
          <option v-for="p in store.properties" :key="p.id" :value="p.id">
            {{ p.name }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label for="shopName">Shop No. / Unit / Shop Name *</label>
        <input
          id="shopName"
          v-model="form.shop_name"
          type="text"
          class="input-control"
          placeholder="Shop number or unit name"
          required
        />
      </div>

      <!-- Dates -->
      <div class="form-group">
        <label for="startDate">Lease Start Date *</label>
        <input
          id="startDate"
          v-model="form.start_date"
          type="date"
          class="input-control"
          required
        />
      </div>

      <div class="form-group">
        <label for="endDate">Lease End Date *</label>
        <input
          id="endDate"
          v-model="form.end_date"
          type="date"
          class="input-control"
          required
        />
      </div>

      <!-- Rent Escrow -->
      <div class="form-group">
        <label for="baseRent">Base Monthly Rent (₹) *</label>
        <input
          id="baseRent"
          v-model.number="form.base_rent_amount"
          type="number"
          step="0.01"
          min="0"
          class="input-control"
          placeholder="Monthly rent amount"
          required
        />
      </div>

      <!-- Increment Type & Amount -->
      <div class="form-group full-width increment-box card-glass">
        <label class="increment-main-label">Annual Increment Escalation</label>
        <div class="increment-type-toggle">
          <button
            type="button"
            class="toggle-btn"
            :class="{ active: form.annual_increment_type === 'percent' }"
            @click="form.annual_increment_type = 'percent'"
          >
            Percentage (%)
          </button>
          <button
            type="button"
            class="toggle-btn"
            :class="{ active: form.annual_increment_type === 'fixed' }"
            @click="form.annual_increment_type = 'fixed'"
          >
            Fixed Amount (₹)
          </button>
        </div>

        <div v-if="form.annual_increment_type === 'percent'" class="increment-input-field">
          <label for="incrementPercent">Annual Increment Rate (%)</label>
          <div class="input-with-affix">
            <input
              id="incrementPercent"
              v-model.number="form.annual_increment_percent"
              type="number"
              step="0.1"
              min="0"
              class="input-control"
              placeholder="e.g. 5"
            />
            <span class="affix suffix">% / yr</span>
          </div>
          <small class="hint-text">Compounding annually on base rent</small>
        </div>

        <div v-else class="increment-input-field">
          <label for="incrementAmount">Annual Increment Fixed Amount (₹)</label>
          <div class="input-with-affix">
            <span class="affix prefix">₹</span>
            <input
              id="incrementAmount"
              v-model.number="form.annual_increment_amount"
              type="number"
              step="100"
              min="0"
              class="input-control with-prefix"
              placeholder="e.g. 1000"
            />
            <span class="affix suffix">/ yr</span>
          </div>
          <small class="hint-text">Flat rupee addition added for each completed year</small>
        </div>
      </div>

      <div class="form-group">
        <label for="dueDay">Monthly Rent Due Day (1-28)</label>
        <input
          id="dueDay"
          v-model.number="form.due_day"
          type="number"
          min="1"
          max="28"
          class="input-control"
          placeholder="Day of month (1–28)"
        />
      </div>

      <div class="form-group">
        <label for="manualStatus">Status Override</label>
        <select id="manualStatus" v-model="form.manual_status" class="input-control">
          <option :value="null">Auto Calculate (Recommended)</option>
          <option value="Active">Active</option>
          <option value="Renewal Due">Renewal Due</option>
          <option value="Expired">Expired</option>
        </select>
      </div>

      <!-- File Attachment -->
      <div class="form-group full-width">
        <label for="documentFile">Upload Agreement / Tenant KYC Document</label>
        <div class="file-upload-box">
          <input
            id="documentFile"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            :disabled="isUploading"
            @change="handleFileChange"
          />

          <div v-if="isUploading" class="upload-indicator">
            <Loader2 :size="15" class="spin" />
            <span>Uploading to Supabase Storage...</span>
          </div>

          <div v-else-if="fileName" class="selected-file-chip">
            <Paperclip :size="14" />
            <span class="file-name-text">{{ fileName }}</span>
            <a
              v-if="fileUrl"
              :href="fileUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="view-link-btn"
              title="Open uploaded file in new tab"
            >
              <ExternalLink :size="12" />
              <span>View</span>
            </a>
            <button
              type="button"
              class="clear-file-btn"
              @click="clearFile"
              title="Remove document"
            >
              ×
            </button>
          </div>

          <div v-if="uploadError" class="upload-error-msg">
            ⚠️ {{ uploadError }}
          </div>
        </div>
        <small class="hint-text">
          Stored securely in Supabase Storage. Clicking 'View' opens the verified cloud document in a new tab.
        </small>
      </div>

      <!-- Live Calculation Banner -->
      <div class="full-width calculation-preview card-glass">
        <div class="calc-header">
          <Info :size="16" />
          <span>
            {{ form.annual_increment_type === 'fixed' ? 'Real-time Fixed Escalation Preview' : 'Real-time Compounding Escalation Preview' }}
          </span>
        </div>
        <div class="calc-body">
          <div class="calc-item">
            <small>Effective Current Monthly Rent:</small>
            <strong>{{ previewCurrentRent }}</strong>
          </div>
          <div class="calc-item">
            <small>Calculated Status:</small>
            <span class="badge" :class="previewBadgeClass">{{ previewStatusText }}</span>
          </div>
        </div>
      </div>
    </form>

    <template #footer>
      <button
        type="button"
        class="btn btn-light"
        @click="store.isLeaseModalOpen = false"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="leaseForm"
        class="btn btn-primary"
        :disabled="store.loading.action"
      >
        {{ store.loading.action ? 'Saving...' : (isEditing ? 'Update Lease' : 'Register Lease') }}
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useLeaseStore } from '../stores/leaseStore';
import Modal from './Modal.vue';
import {
  formatMoney,
  calculateCurrentRent,
  getLeaseStatus,
  getTodayISO
} from '../utils/formatters';
import { Paperclip, Info, Loader2, ExternalLink } from 'lucide-vue-next';

const store = useLeaseStore();

const isEditing = computed(() => !!store.editingLease);
const fileName = ref('');
const fileUrl = ref<string | null>(null);
const isUploading = ref(false);
const uploadError = ref('');

const form = ref({
  property_id: '',
  shop_name: '',
  tenant_name: '',
  tenant_email: '',
  tenant_mobile: '',
  tenant_address: '',
  start_date: getTodayISO(),
  end_date: '',
  base_rent_amount: 0,
  annual_increment_type: 'percent' as 'percent' | 'fixed',
  annual_increment_percent: 0,
  annual_increment_amount: 0,
  due_day: 1,
  manual_status: null as string | null
});

watch(
  () => store.isLeaseModalOpen,
  (open) => {
    uploadError.value = '';
    isUploading.value = false;
    if (open) {
      if (store.editingLease) {
        const l = store.editingLease;
        form.value = {
          property_id: l.property_id,
          shop_name: l.shop_name,
          tenant_name: l.tenant_name,
          tenant_email: l.tenant_email || '',
          tenant_mobile: l.tenant_mobile || '',
          tenant_address: l.tenant_address,
          start_date: l.start_date,
          end_date: l.end_date,
          base_rent_amount: l.base_rent_amount,
          annual_increment_type: l.annual_increment_type || (l.annual_increment_amount ? 'fixed' : 'percent'),
          annual_increment_percent: l.annual_increment_percent || 0,
          annual_increment_amount: l.annual_increment_amount || 0,
          due_day: l.due_day,
          manual_status: l.manual_status || null
        };
        fileName.value = l.document_name || '';
        fileUrl.value = l.document_url || null;
      } else {
        // Default 1-year from today
        const start = new Date();
        const end = new Date();
        end.setFullYear(end.getFullYear() + 1);

        form.value = {
          property_id: store.properties[0]?.id || '',
          shop_name: '',
          tenant_name: '',
          tenant_email: '',
          tenant_mobile: '',
          tenant_address: '',
          start_date: start.toISOString().slice(0, 10),
          end_date: end.toISOString().slice(0, 10),
          base_rent_amount: 0,
          annual_increment_type: 'percent',
          annual_increment_percent: 0,
          annual_increment_amount: 0,
          due_day: 1,
          manual_status: null
        };
        fileName.value = '';
        fileUrl.value = null;
      }
    }
  }
);

// Calculation preview
const previewCurrentRent = computed(() => {
  if (!form.value.start_date || !form.value.base_rent_amount) return '₹0.00';
  const val = calculateCurrentRent({
    start_date: form.value.start_date,
    base_rent_amount: form.value.base_rent_amount,
    annual_increment_type: form.value.annual_increment_type,
    annual_increment_percent: form.value.annual_increment_percent,
    annual_increment_amount: form.value.annual_increment_amount
  });
  return formatMoney(val);
});

const previewStatus = computed(() => {
  if (!form.value.end_date) return { status: 'Active', daysRemaining: 0 };
  return getLeaseStatus({
    manual_status: form.value.manual_status,
    end_date: form.value.end_date
  });
});

const previewStatusText = computed(() => {
  const { status, daysRemaining } = previewStatus.value;
  if (status === 'Renewal Due') return `Renewal Due (${daysRemaining} days left)`;
  if (status === 'Expired') return 'Expired';
  return 'Active';
});

const previewBadgeClass = computed(() => {
  const s = previewStatus.value.status;
  if (s === 'Renewal Due') return 'badge-renewal';
  if (s === 'Expired') return 'badge-expired';
  return 'badge-active';
});

async function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  uploadError.value = '';
  isUploading.value = true;
  fileName.value = file.name;

  try {
    const res = await store.uploadDocument(file);
    fileUrl.value = res.url;
  } catch (err: any) {
    console.error('File upload error:', err);
    uploadError.value = err.message || 'File upload failed';
  } finally {
    isUploading.value = false;
  }
}

function clearFile() {
  fileName.value = '';
  fileUrl.value = null;
  uploadError.value = '';
  const input = document.getElementById('documentFile') as HTMLInputElement;
  if (input) input.value = '';
}

async function handleSubmit() {
  if (new Date(form.value.end_date) <= new Date(form.value.start_date)) {
    alert('Rental end date must be strictly after the start date.');
    return;
  }

  if (isUploading.value) {
    alert('Please wait for the document upload to finish.');
    return;
  }

  await store.saveLease({
    id: store.editingLease?.id,
    ...form.value,
    document_name: fileName.value || null,
    document_url: fileUrl.value || null
  });
}
</script>

<style scoped>
.lease-form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.full-width {
  grid-column: 1 / -1;
}

/* Increment Toggle Box */
.increment-box {
  background: var(--bg-hover, #f8fafc);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-md, 8px);
  padding: 14px;
}

.increment-main-label {
  display: block;
  font-size: 13.5px;
  font-weight: 600;
  margin-bottom: 10px;
  color: var(--text-main, #0f172a);
}

.increment-type-toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.toggle-btn {
  flex: 1;
  padding: 8px 12px;
  border-radius: var(--radius-md, 6px);
  border: 1px solid var(--border-color, #cbd5e1);
  background: #ffffff;
  color: var(--text-muted, #64748b);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.toggle-btn:hover {
  background: #f1f5f9;
  color: var(--text-main, #0f172a);
}

.toggle-btn.active {
  background: var(--primary, #2563eb);
  color: #ffffff;
  border-color: var(--primary, #2563eb);
  box-shadow: 0 1px 3px rgba(37, 99, 235, 0.2);
}

.increment-input-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-with-affix {
  display: flex;
  align-items: center;
  position: relative;
}

.input-with-affix .input-control {
  width: 100%;
}

.input-with-affix .input-control.with-prefix {
  padding-left: 28px;
}

.affix {
  position: absolute;
  color: var(--text-muted, #64748b);
  font-size: 13.5px;
  font-weight: 600;
  pointer-events: none;
}

.affix.prefix {
  left: 10px;
}

.affix.suffix {
  right: 12px;
}

.hint-text {
  font-size: 12px;
  color: var(--text-muted, #64748b);
  margin-top: 2px;
}

/* File Upload Box */
.file-upload-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upload-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--primary, #2563eb);
  font-size: 13px;
  font-weight: 500;
  padding: 8px 12px;
  background: var(--primary-subtle, #eff6ff);
  border-radius: var(--radius-md, 6px);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.selected-file-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: var(--primary-subtle, #eff6ff);
  color: var(--primary, #2563eb);
  border: 1px solid var(--primary-border, #bfdbfe);
  padding: 6px 12px;
  border-radius: var(--radius-md, 6px);
  font-size: 13px;
  font-weight: 500;
  width: fit-content;
  max-width: 100%;
}

.file-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

.view-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #ffffff;
  color: var(--primary, #2563eb);
  border: 1px solid var(--primary-border, #bfdbfe);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11.5px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s ease;
}

.view-link-btn:hover {
  background: var(--primary, #2563eb);
  color: #ffffff;
}

.clear-file-btn {
  background: none;
  border: none;
  color: var(--primary, #2563eb);
  font-size: 18px;
  cursor: pointer;
  line-height: 1;
  padding: 0 4px;
}

.upload-error-msg {
  color: #ef4444;
  font-size: 12.5px;
  font-weight: 500;
}

.calculation-preview {
  background: #f8fafc;
  border: 1px solid var(--border-light, #e2e8f0);
  border-left: 4px solid var(--primary, #2563eb);
  padding: 14px 18px;
  border-radius: var(--radius-md, 8px);
}

.calc-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--primary, #2563eb);
  margin-bottom: 8px;
}

.calc-body {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.calc-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
}

.calc-item small {
  color: var(--text-muted, #64748b);
}

.calc-item strong {
  color: var(--text-main, #0f172a);
  font-size: 15px;
}

@media (max-width: 680px) {
  .lease-form-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }
  .calc-body {
    flex-direction: column;
    gap: 8px;
  }
  .file-name-text {
    max-width: 140px;
  }
}
</style>
