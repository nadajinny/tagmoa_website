<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string
    color?: string
    selected?: boolean
    clickable?: boolean
  }>(),
  {
    color: '#5577ff',
    selected: false,
    clickable: false,
  },
)

const emit = defineEmits<{
  click: [MouseEvent]
}>()

function handleClick(event: MouseEvent) {
  if (!props.clickable) return
  emit('click', event)
}
</script>

<template>
  <button
    class="tag-chip"
    :class="{
      'tag-chip--selected': props.selected,
      'tag-chip--clickable': props.clickable,
    }"
    type="button"
    @click="handleClick"
  >
    <span class="tag-chip__dot" :style="{ backgroundColor: color }" />
    <span>{{ label }}</span>
  </button>
</template>

<style scoped>
.tag-chip {
  border: none;
  background-color: rgba(84, 116, 255, 0.08);
  color: var(--text-primary);
  border-radius: 999px;
  padding: 0.35rem 0.9rem;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: default;
}

.tag-chip--clickable {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.tag-chip--clickable:hover {
  background-color: rgba(84, 116, 255, 0.2);
}

.tag-chip--selected {
  background-color: rgba(63, 124, 255, 0.25);
}

.tag-chip__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-flex;
}
</style>
