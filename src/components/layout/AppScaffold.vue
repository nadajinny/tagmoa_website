<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    padded?: boolean
  }>(),
  {
    description: '',
    padded: true,
  },
)
</script>

<template>
  <section class="scaffold app-max-width">
    <header class="scaffold__header">
      <div>
        <p class="brand-pill">Tagmoa</p>
        <h1>{{ props.title }}</h1>
        <p v-if="props.description" class="scaffold__description">
          {{ props.description }}
        </p>
      </div>
      <div class="scaffold__actions">
        <slot name="actions" />
      </div>
    </header>
    <div :class="['scaffold__body', { 'scaffold__body--padded': props.padded }]">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.scaffold {
  padding: 3rem 0 6rem;
  min-height: 100vh;
}

.scaffold__header {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 2rem;
  color: var(--text-primary);
}

.scaffold__header h1 {
  font-size: clamp(2rem, 4vw, 3rem);
  margin-top: 0.5rem;
}

.scaffold__description {
  color: var(--text-secondary);
  margin-top: 0.5rem;
  max-width: 46ch;
}

.scaffold__body--padded {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.scaffold__actions :slotted(*) {
  display: inline-flex;
}

@media (max-width: 768px) {
  .scaffold {
    padding-top: 2rem;
  }

  .scaffold__header {
    flex-direction: column;
  }
}
</style>
