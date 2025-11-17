<script setup lang="ts">
import { computed } from 'vue'
import type { SubTask } from '../../types/models'
import { formatDate, isDueToday, isOverdue } from '../../utils/dates'

const props = defineProps<{
  item: SubTask
}>()

const emit = defineEmits<{
  toggle: [SubTask]
  edit: [SubTask]
  delete: [SubTask]
}>()

const priorityLabel = ['💡', '🔥', '🚀', '⭐️']

const dueLabel = computed(() => {
  if (isDueToday(props.item.dueDate)) {
    return '오늘 마감'
  }
  if (isOverdue(props.item.dueDate)) {
    return '기한 지남'
  }
  return props.item.dueDate ? formatDate(props.item.dueDate) : '마감일 없음'
})
</script>

<template>
  <div class="sub-task">
    <label class="sub-task__checkbox">
      <input
        type="checkbox"
        :checked="item.isCompleted"
        @change="emit('toggle', { ...item, isCompleted: !item.isCompleted })"
      />
      <span />
    </label>

    <div class="sub-task__details">
      <p :class="{ 'sub-task__title--done': item.isCompleted }">
        <span class="emoji">{{ priorityLabel[item.priority] ?? '•' }}</span>
        {{ item.content }}
      </p>
      <small>{{ dueLabel }}</small>
    </div>

    <div class="sub-task__actions">
      <button type="button" @click="emit('edit', item)">수정</button>
      <button type="button" class="danger" @click="emit('delete', item)">삭제</button>
    </div>
  </div>
</template>

<style scoped>
.sub-task {
  display: flex;
  gap: 0.9rem;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(10, 20, 35, 0.05);
}

.sub-task:last-child {
  border-bottom: none;
}

.sub-task__checkbox {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--border-color);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.sub-task__checkbox span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-image: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
  opacity: 0;
  transition: opacity 0.2s ease;
}

.sub-task__checkbox input {
  display: none;
}

.sub-task__checkbox input:checked + span {
  opacity: 1;
}

.sub-task__details {
  flex: 1;
}

.sub-task__details p {
  font-size: clamp(0.95rem, 0.6vw + 0.5rem, 1.2rem);
  font-weight: 600;
}

.sub-task__title--done {
  text-decoration: line-through;
  color: var(--text-muted);
}

.sub-task__details small {
  color: var(--text-muted);
  font-size: clamp(0.78rem, 0.4vw + 0.45rem, 0.95rem);
}

.emoji {
  margin-right: 0.4rem;
}

.sub-task__actions {
  display: inline-flex;
  gap: 0.5rem;
}

.sub-task__actions button {
  border: 1px solid var(--border-color);
  background: #fff;
  font-weight: 600;
  cursor: pointer;
  padding: 0.35rem 0.8rem;
  border-radius: 10px;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.sub-task__actions button:hover {
  background-color: var(--surface-muted);
  border-color: rgba(17, 24, 39, 0.2);
}

.sub-task__actions .danger {
  color: #ff5e62;
}
</style>
