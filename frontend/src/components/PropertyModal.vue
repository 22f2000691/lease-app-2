<template>
  <Modal
    :is-open="store.isPropertyModalOpen"
    :title="isEditing ? 'Edit Property / Location' : 'Add Property / Location'"
    :subtitle="isEditing ? 'Update property details and shop capacity' : 'Register a new commercial building or complex'"
    max-width="560px"
    @close="store.isPropertyModalOpen = false"
  >
    <form @submit.prevent="handleSubmit" id="propertyForm" class="property-form">
      <div class="form-group">
        <label for="propName">Property / Location Name *</label>
        <input
          id="propName"
          v-model="name"
          type="text"
          class="input-control"
          placeholder="e.g. City Centre Complex, Fancy Bazar"
          required
        />
      </div>

      <div class="form-group">
        <label for="propUnits">Total Shops / Units</label>
        <input
          id="propUnits"
          v-model.number="totalUnits"
          type="number"
          min="0"
          class="input-control"
          placeholder="e.g. 12"
        />
      </div>

      <div class="form-group">
        <label for="propAddress">Property Address *</label>
        <textarea
          id="propAddress"
          v-model="address"
          class="input-control"
          placeholder="Complete street address, area, pin code..."
          rows="3"
          required
        ></textarea>
      </div>
    </form>

    <template #footer>
      <button
        type="button"
        class="btn btn-light"
        @click="store.isPropertyModalOpen = false"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="propertyForm"
        class="btn btn-primary"
        :disabled="store.loading.action"
      >
        {{ store.loading.action ? 'Saving...' : (isEditing ? 'Update Property' : 'Save Property') }}
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useLeaseStore } from '../stores/leaseStore';
import Modal from './Modal.vue';

const store = useLeaseStore();

const name = ref('');
const address = ref('');
const totalUnits = ref<number>(0);

const isEditing = computed(() => !!store.editingProperty);

watch(
  () => store.isPropertyModalOpen,
  (open) => {
    if (open) {
      if (store.editingProperty) {
        name.value = store.editingProperty.name;
        address.value = store.editingProperty.address;
        totalUnits.value = store.editingProperty.total_units || 0;
      } else {
        name.value = '';
        address.value = '';
        totalUnits.value = 1;
      }
    }
  }
);

async function handleSubmit() {
  await store.saveProperty({
    id: store.editingProperty?.id,
    name: name.value,
    address: address.value,
    total_units: totalUnits.value
  });
}
</script>

<style scoped>
.property-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
