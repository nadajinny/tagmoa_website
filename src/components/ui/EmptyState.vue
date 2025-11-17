<script setup lang="ts">
defineProps<{
  title: string
  message?: string
}>()
</script>

<template>
  <div class="empty-state card-surface">
    <div class="empty-state__icon">🌱</div>
    <h4>{{ title }}</h4>
    <p v-if="message" class="text-support">
      {{ message }}
    </p>
    <slot />
  </div>
</template>

<style scoped>
.empty-state {
  padding: 2rem;
  border-radius: 28px;
  text-align: center;
  color: var(--text-secondary);
}

.empty-state__icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.empty-state h4 {
  margin-bottom: 0.35rem;
}
</style>
