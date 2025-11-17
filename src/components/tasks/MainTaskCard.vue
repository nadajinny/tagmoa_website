<script setup lang="ts">
import { computed } from 'vue'
import type { MainTask, SubTask, Tag } from '../../types/models'
import { formatDateRange, isDueToday, isOverdue } from '../../utils/dates'

const props = defineProps<{
  task: MainTask
  subtasks?: SubTask[]
  tags?: Tag[]
}>()

const emit = defineEmits<{
  open: [MainTask]
  'toggle-complete': [MainTask]
  menu: [MainTask]
}>()

const completedSubtasks = computed(
  () => props.subtasks?.filter((sub) => sub.isCompleted).length ?? 0,
)
const totalSubtasks = computed(() => props.subtasks?.length ?? 0)
const completionRatio = computed(() => {
  if (!totalSubtasks.value) {
    return props.task.isCompleted ? 1 : 0
  }
  return completedSubtasks.value / totalSubtasks.value
})

const scheduleLabel = computed(() => {
  const label = formatDateRange(props.task.startDate, props.task.endDate)
  return label || '기간 미정'
})

const deadline = computed(() => props.task.endDate ?? props.task.startDate ?? null)

const statusText = computed(() => {
  if (props.task.isCompleted) return '완료됨'
  if (deadline.value && isDueToday(deadline.value)) return '오늘 마감'
  if (deadline.value && isOverdue(deadline.value)) return '지연됨'
  return '진행 중'
})

const statusTone = computed(() => {
  if (props.task.isCompleted) return '#52a79c'
  if (deadline.value && isOverdue(deadline.value)) return '#ff5e62'
  if (deadline.value && isDueToday(deadline.value)) return '#ffb347'
  return '#5577ff'
})
</script>

<template>
  <article class="task-card card-surface" @click="emit('open', task)">
    <div class="task-card__accent" :style="{ background: task.mainColor }" />
    <div class="task-card__body">
      <header>
        <div>
          <p class="task-card__status" :style="{ color: statusTone }">
            {{ statusText }}
          </p>
          <h3>{{ task.title || '제목 없는 일정' }}</h3>
        </div>
        <button
          class="task-card__toggle"
          type="button"
          @click.stop="emit('toggle-complete', task)"
        >
          <span v-if="task.isCompleted">되돌리기</span>
          <span v-else>완료</span>
        </button>
      </header>
      <p class="task-card__description">
        {{ task.description || '설명 없음' }}
      </p>

      <div class="task-card__meta">
        <span class="pill-muted">{{ scheduleLabel }}</span>
        <div class="task-card__tags" v-if="tags?.length">
          <span v-for="tag in tags" :key="tag.id" class="tag-pill">
            <span class="dot" :style="{ backgroundColor: tag.color }"></span>
            {{ tag.name }}
          </span>
        </div>
      </div>

      <div class="task-card__progress" v-if="totalSubtasks">
        <div class="task-card__progress-bar">
          <span
            class="task-card__progress-fill"
            :style="{ width: `${Math.round(completionRatio * 100)}%`, backgroundColor: task.mainColor }"
          />
        </div>
        <span class="task-card__progress-label">
          세부 일정 {{ completedSubtasks }} / {{ totalSubtasks }}
        </span>
      </div>
    </div>

    <button class="task-card__menu" type="button" @click.stop="emit('menu', task)">
      ⋯
    </button>
  </article>
</template>

<style scoped>
.task-card {
  position: relative;
  display: flex;
  gap: 1.25rem;
  padding: 1.5rem;
  border-radius: 28px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 25px 40px rgba(20, 35, 80, 0.15);
}

.task-card__accent {
  width: 6px;
  border-radius: 99px;
}

.task-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.task-card header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.task-card__status {
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.task-card h3 {
  font-size: 1.25rem;
  margin-top: 0.25rem;
}

.task-card__description {
  color: var(--text-secondary);
}

.task-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.task-card__tags {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.tag-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.8rem;
  border-radius: 999px;
  font-size: 0.78rem;
  background-color: var(--surface-muted);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-flex;
}

.task-card__progress {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.task-card__progress-bar {
  flex: 1;
  height: 6px;
  border-radius: 99px;
  background-color: var(--surface-muted);
}

.task-card__progress-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.task-card__progress-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.task-card__toggle {
  border: none;
  background-color: var(--surface-muted);
  border-radius: 999px;
  padding: 0.35rem 0.9rem;
  font-weight: 600;
  cursor: pointer;
}

.task-card__menu {
  position: absolute;
  top: 1rem;
  right: 1rem;
  border: none;
  background: transparent;
  font-size: 1.35rem;
  cursor: pointer;
  color: var(--text-muted);
}

@media (max-width: 640px) {
  .task-card {
    padding: 1.25rem;
  }
}
</style>
