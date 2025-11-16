<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
  }>(),
  {
    open: false,
  },
)

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <Transition name="slide-panel">
    <aside v-if="props.open" class="side-panel card-surface">
      <header class="side-panel__header">
        <h2 v-if="props.title">{{ props.title }}</h2>
        <button type="button" class="side-panel__close" @click="emit('close')" aria-label="닫기">
          ×
        </button>
      </header>
      <div class="side-panel__body">
        <slot />
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.side-panel {
  width: clamp(320px, 32vw, 520px);
  min-height: calc(100vh - 4rem);
  margin: 1.5rem 0;
  padding: 1.5rem;
  border-radius: 32px;
  box-shadow: var(--shadow-elevated);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  position: sticky;
  top: 1.5rem;
  align-self: flex-start;
  overflow-y: auto;
  max-height: calc(100vh - 3rem);
}

.side-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.side-panel__header h2 {
  font-size: 1.35rem;
  font-weight: 700;
}

.side-panel__close {
  border: none;
  background: var(--surface-muted);
  width: 44px;
  height: 44px;
  border-radius: 999px;
  font-size: 1.5rem;
  cursor: pointer;
}

.side-panel__body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.slide-panel-enter-active,
.slide-panel-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.slide-panel-enter-from,
.slide-panel-leave-to {
  opacity: 0;
  transform: translateX(12px);
}

@media (max-width: 900px) {
  .side-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: auto;
    margin: 0;
    border-radius: 24px 0 0 24px;
    width: min(420px, 100vw);
    max-width: 100%;
    max-height: 100vh;
    box-shadow: -16px 0 36px rgba(12, 15, 39, 0.22);
    padding: 1.25rem;
    z-index: 70;
  }
}

@media (max-width: 640px) {
  .side-panel {
    width: 100%;
    border-radius: 0;
  }
}
</style>
