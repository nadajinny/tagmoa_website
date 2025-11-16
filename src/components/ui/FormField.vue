<script setup lang="ts">
defineProps<{
  label: string
  hint?: string
  for?: string
}>()
</script>

<template>
  <label class="form-field" :for="for">
    <span>{{ label }}</span>
    <slot />
    <small v-if="hint">{{ hint }}</small>
  </label>
</template>

<style scoped>
.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  font-weight: 600;
}

.form-field span {
  color: var(--text-secondary);
}

.form-field small {
  color: var(--text-muted);
  font-weight: 400;
}

.form-field :slotted(input),
.form-field :slotted(textarea),
.form-field :slotted(select) {
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 0.85rem 1rem;
  background-color: #fff;
  font-weight: 500;
}

.form-field :slotted(textarea) {
  min-height: 120px;
  resize: vertical;
}
</style>
