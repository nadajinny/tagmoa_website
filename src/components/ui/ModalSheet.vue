<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    width?: string
  }>(),
  {
    width: 'min(560px, 92vw)',
  },
)

const emit = defineEmits<{
  'update:modelValue': [boolean]
  close: []
}>()

function close() {
  emit('update:modelValue', false)
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="props.modelValue" class="modal-sheet__backdrop" @click.self="close">
        <section class="modal-sheet card-surface" :style="{ width: props.width }">
          <header class="modal-sheet__header" v-if="title">
            <h2>{{ title }}</h2>
            <button type="button" class="modal-sheet__close" @click="close" aria-label="닫기">
              ×
            </button>
          </header>
          <div class="modal-sheet__body">
            <slot />
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-sheet__backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(6, 10, 25, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  overflow-y: auto;
}

.modal-sheet {
  border-radius: 28px;
  padding: 1.5rem;
  box-shadow: var(--shadow-elevated);
  max-height: 90vh;
  overflow-y: auto;
}

.modal-sheet__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.modal-sheet__header h2 {
  font-size: 1.35rem;
  font-weight: 700;
}

.modal-sheet__close {
  border: none;
  background: var(--surface-muted);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 1.35rem;
  cursor: pointer;
}

.modal-sheet__body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
