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
          placeholder="e.g. Rajesh Sharma"
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
          placeholder="e.g. +91 98765 43210"
        />
      </div>

      <div class="form-group full-width">
        <label for="tenantAddress">Tenant Permanent Address *</label>
        <textarea
          id="tenantAddress"
          v-model="form.tenant_address"
          class="input-control"
          placeholder="Tenant permanent address or registered office..."
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
          placeholder="e.g. Shop 101 - Apex Electronics"
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
          placeholder="e.g. 35000"
          required
        />
      </div>

      <div class="form-group">
        <label for="incrementPercent">Annual Increment (%)</label>
        <input
          id="incrementPercent"
          v-model.number="form.annual_increment_percent"
          type="number"
          step="0.1"
          min="0"
          class="input-control"
          placeholder="e.g. 10.0"
        />
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
          placeholder="e.g. 5"
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
            @change="handleFileChange"
          />
          <div v-if="fileName" class="selected-file-chip">
            <Paperclip :size="14" />
            <span>{{ fileName }}</span>
            <button type="button" class="clear-file-btn" @click="clearFile">×</button>
          </div>
        </div>
      </div>

      <!-- Live Calculation Banner -->
      <div class="full-width calculation-preview card-glass">
        <div class="calc-header">
          <Info :size="16" />
          <span>Real-time Compounding Escalation Preview</span>
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
import { Paperclip, Info } from 'lucide-vue-next';

const store = useLeaseStore();

const isEditing = computed(() => !!store.editingLease);
const fileName = ref('');
const fileDataUrl = ref<string | null>(null);

const form = ref({
  property_id: '',
  shop_name: '',
  tenant_name: '',
  tenant_mobile: '',
  tenant_address: '',
  start_date: getTodayISO(),
  end_date: '',
  base_rent_amount: 25000,
  annual_increment_percent: 5,
  due_day: 5,
  manual_status: null as string | null
});

watch(
  () => store.isLeaseModalOpen,
  (open) => {
    if (open) {
      if (store.editingLease) {
        const l = store.editingLease;
        form.value = {
          property_id: l.property_id,
          shop_name: l.shop_name,
          tenant_name: l.tenant_name,
          tenant_mobile: l.tenant_mobile || '',
          tenant_address: l.tenant_address,
          start_date: l.start_date,
          end_date: l.end_date,
          base_rent_amount: l.base_rent_amount,
          annual_increment_percent: l.annual_increment_percent,
          due_day: l.due_day,
          manual_status: l.manual_status || null
        };
        fileName.value = l.document_name || '';
        fileDataUrl.value = l.document_url || null;
      } else {
        // Default 1-year from today
        const start = new Date();
        const end = new Date();
        end.setFullYear(end.getFullYear() + 1);

        form.value = {
          property_id: store.properties[0]?.id || '',
          shop_name: '',
          tenant_name: '',
          tenant_mobile: '',
          tenant_address: '',
          start_date: start.toISOString().slice(0, 10),
          end_date: end.toISOString().slice(0, 10),
          base_rent_amount: 30000,
          annual_increment_percent: 5,
          due_day: 5,
          manual_status: null
        };
        fileName.value = '';
        fileDataUrl.value = null;
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
    annual_increment_percent: form.value.annual_increment_percent
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

function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  fileName.value = file.name;
  const reader = new FileReader();
  reader.onload = () => {
    fileDataUrl.value = reader.result as string;
  };
  reader.readAsDataURL(file);
}

function clearFile() {
  fileName.value = '';
  fileDataUrl.value = null;
  const input = document.getElementById('documentFile') as HTMLInputElement;
  if (input) input.value = '';
}

async function handleSubmit() {
  if (new Date(form.value.end_date) <= new Date(form.value.start_date)) {
    alert('Rental end date must be strictly after the start date.');
    return;
  }

  await store.saveLease({
    id: store.editingLease?.id,
    ...form.value,
    document_name: fileName.value || null,
    document_url: fileDataUrl.value || null
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

.file-upload-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selected-file-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--primary-subtle);
  color: var(--primary);
  border: 1px solid var(--primary-border);
  padding: 6px 12px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 600;
  width: fit-content;
}

.clear-file-btn {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 16px;
  cursor: pointer;
  line-height: 1;
}

.calculation-preview {
  background: #f8fafc;
  border: 1px solid var(--border-light);
  border-left: 4px solid var(--primary);
  padding: 14px 18px;
  border-radius: var(--radius-md);
}

.calc-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--primary);
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
  color: var(--text-muted);
}

.calc-item strong {
  color: var(--text-main);
  font-size: 15px;
}

@media (max-width: 680px) {
  .lease-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
