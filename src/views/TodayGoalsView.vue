<script setup lang="ts">
import { computed, onMounted, ref, watchEffect } from 'vue'
import { storeToRefs } from 'pinia'
import AppScaffold from '../components/layout/AppScaffold.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import { useWorkspaceStore } from '../stores/workspace'
import { useTodayGoalsStore } from '../stores/todayGoals'
import type { MainTask, SubTask } from '../types/models'
import { formatDateRange, formatTime } from '../utils/dates'

const workspace = useWorkspaceStore()
const { allSubTasks, allMainTasks } = storeToRefs(workspace)

const goalStore = useTodayGoalsStore()
const { goalIds } = storeToRefs(goalStore)

const search = ref('')
const isDropActive = ref(false)
const dragSource = ref<'pool' | 'goal' | null>(null)
const draggedGoalIndex = ref<number | null>(null)

const priorityIcons = ['💡', '🔥', '🚀', '⭐️'] as const

const mainTaskLookup = computed<Record<string, MainTask>>(() => {
  const map: Record<string, MainTask> = {}
  allMainTasks.value.forEach((task) => {
    map[task.id] = task
  })
  return map
})

const subTaskLookup = computed<Record<string, SubTask>>(() => {
  const map: Record<string, SubTask> = {}
  allSubTasks.value.forEach((task) => {
    map[task.id] = task
  })
  return map
})

onMounted(() => {
  goalStore.refreshToday()
})

watchEffect(() => {
  const ids = [...goalIds.value]
  ids.forEach((id) => {
    if (!subTaskLookup.value[id]) {
      goalStore.removeGoal(id)
    }
  })
})

const availableSubTasks = computed(() => {
  const query = search.value.trim().toLowerCase()
  return allSubTasks.value.filter((task) => {
    if (task.isCompleted) return false
    if (goalIds.value.includes(task.id)) return false
    if (!query) return true
    const parent = mainTaskLookup.value[task.mainTaskId]
    const parentTitle = parent?.title?.toLowerCase() ?? ''
    return (
      task.content.toLowerCase().includes(query) || parentTitle.includes(query)
    )
  })
})

type GoalCard = {
  id: string
  task: SubTask
  parentTitle: string
  parentColor: string
  scheduleLabel: string
  timeLabel: string
}

const goalCards = computed<GoalCard[]>(() =>
  goalIds.value
    .map((id) => {
      const task = subTaskLookup.value[id]
      if (!task) return null
      const parent = mainTaskLookup.value[task.mainTaskId]
      return {
        id,
        task,
        parentTitle: parent?.title ?? '주요 일정 없음',
        parentColor: parent?.mainColor ?? '#dfe6ff',
        scheduleLabel: formatDateRange(task.startDate, task.endDate) || '기간 미정',
        timeLabel: buildTimeLabel(task),
      }
    })
    .filter((card): card is GoalCard => Boolean(card)),
)

function buildTimeLabel(task: SubTask) {
  const start = formatTime(task.startDate)
  const end = formatTime(task.endDate)
  if (start && end) {
    if (start === end) return start
    return `${start} ~ ${end}`
  }
  return start || end || ''
}

function formatParentLabel(task: SubTask) {
  return mainTaskLookup.value[task.mainTaskId]?.title ?? '주요 일정 없음'
}

function formatSchedule(task: SubTask) {
  const schedule = formatDateRange(task.startDate, task.endDate)
  if (schedule && buildTimeLabel(task)) {
    return `${schedule} · ${buildTimeLabel(task)}`
  }
  return schedule || buildTimeLabel(task) || ''
}

function assignGoal(id: string) {
  goalStore.assignGoal(id)
}

function removeGoal(id: string) {
  goalStore.removeGoal(id)
}

function startPoolDrag(event: DragEvent, id: string) {
  dragSource.value = 'pool'
  event.dataTransfer?.setData('text/plain', id)
}

function startGoalDrag(event: DragEvent, id: string, index: number) {
  dragSource.value = 'goal'
  draggedGoalIndex.value = index
  event.dataTransfer?.setData('text/plain', id)
  event.dataTransfer?.setData('text/goal-index', String(index))
}

function endDrag() {
  dragSource.value = null
  draggedGoalIndex.value = null
  isDropActive.value = false
}

function onDropZoneEnter(event: DragEvent) {
  if (!dragSource.value) return
  event.preventDefault()
  isDropActive.value = true
}

function onDropZoneLeave(event: DragEvent) {
  if (!dragSource.value) return
  const related = event.relatedTarget as HTMLElement | null
  const current = event.currentTarget as HTMLElement | null
  if (!current || !related || !current.contains(related)) {
    isDropActive.value = false
  }
}

function onDrop(event: DragEvent) {
  if (!dragSource.value) return
  event.preventDefault()
  const id = event.dataTransfer?.getData('text/plain')
  if (!id) {
    endDrag()
    return
  }
  if (dragSource.value === 'goal') {
    const fromIndex = getDraggedGoalIndex(event)
    if (fromIndex !== null) {
      goalStore.reorderGoals(fromIndex, goalIds.value.length)
    }
  } else {
    goalStore.assignGoal(id)
  }
  endDrag()
}

function onGoalDrop(event: DragEvent, targetIndex: number) {
  if (!dragSource.value) return
  event.preventDefault()
  const id = event.dataTransfer?.getData('text/plain')
  if (!id) return
  if (dragSource.value === 'goal') {
    const fromIndex = getDraggedGoalIndex(event)
    if (fromIndex !== null) {
      const normalizedIndex = fromIndex < targetIndex ? targetIndex - 1 : targetIndex
      goalStore.reorderGoals(fromIndex, Math.max(0, normalizedIndex))
    }
  } else {
    goalStore.assignGoal(id, targetIndex)
  }
  endDrag()
}

function getDraggedGoalIndex(event: DragEvent) {
  const indexText =
    event.dataTransfer?.getData('text/goal-index') ??
    (draggedGoalIndex.value !== null ? String(draggedGoalIndex.value) : '')
  const parsed = Number(indexText)
  if (Number.isNaN(parsed)) return null
  return parsed
}
</script>

<template>
  <AppScaffold
    title="오늘의 목표"
    description="세부 일정을 드래그해서 오른쪽 영역으로 이동하면 오늘 집중할 항목으로 모아볼 수 있어요."
  >
    <div class="goal-board">
      <section class="goal-column card-surface">
        <header class="goal-column__header">
          <div>
            <p class="pill-muted">Sub Tasks</p>
            <h2>세부 일정 리스트</h2>
          </div>
          <span class="goal-column__count">{{ availableSubTasks.length }}건</span>
        </header>
        <input
          v-model="search"
          type="search"
          class="goal-search"
          placeholder="세부 일정 내용, 주요 일정으로 검색"
        />
        <ul v-if="availableSubTasks.length" class="goal-pool">
          <li
            v-for="task in availableSubTasks"
            :key="task.id"
            class="pool-card"
            draggable="true"
            @dragstart="startPoolDrag($event, task.id)"
            @dragend="endDrag"
          >
            <div class="pool-card__header">
              <p class="pool-card__title">
                <span class="priority">{{ priorityIcons[task.priority] ?? '•' }}</span>
                {{ task.content || '내용 없음' }}
              </p>
              <button type="button" class="pool-card__assign" @click="assignGoal(task.id)">
                오늘 목표로
              </button>
            </div>
            <small class="pool-card__meta">
              {{ formatParentLabel(task) }}
              <template v-if="formatSchedule(task)"> · {{ formatSchedule(task) }}</template>
            </small>
          </li>
        </ul>
        <EmptyState
          v-else
          title="할당 가능한 세부 일정이 없어요"
          message="검색 키워드를 조정하거나 새로운 세부 일정을 추가해보세요."
        />
      </section>

      <section class="goal-column card-surface goal-column--target">
        <header class="goal-column__header">
          <div>
            <p class="pill-muted">Focus</p>
            <h2>오늘의 목표</h2>
          </div>
          <button
            class="btn-link"
            type="button"
            @click="goalStore.clearGoals"
            :disabled="!goalCards.length"
          >
            모두 비우기
          </button>
        </header>
        <div
          class="goal-dropzone"
          :class="{ 'goal-dropzone--active': isDropActive }"
          @dragenter="onDropZoneEnter"
          @dragover.prevent="onDropZoneEnter"
          @dragleave="onDropZoneLeave"
          @drop="onDrop"
        >
          <p class="goal-dropzone__hint">
            왼쪽 세부 일정을 이 영역으로 드래그하면 오늘의 목표로 빠르게 배정돼요.
          </p>
          <p v-if="!goalCards.length" class="goal-dropzone__empty">
            아직 선택된 목표가 없어요. 드래그하거나 버튼으로 추가해보세요.
          </p>
          <ul v-else class="goal-grid">
            <li
              v-for="(goal, index) in goalCards"
              :key="goal.id"
              class="goal-card"
              draggable="true"
              @dragstart="startGoalDrag($event, goal.id, index)"
              @dragend="endDrag"
              @dragover.prevent
              @drop="onGoalDrop($event, index)"
            >
              <div class="goal-card__badge" :style="{ backgroundColor: goal.parentColor }" />
              <div class="goal-card__body">
                <p class="goal-card__title">
                  <span class="priority">
                    {{ priorityIcons[goal.task.priority] ?? '•' }}
                  </span>
                  {{ goal.task.content || '내용 없음' }}
                </p>
                <small class="goal-card__meta">
                  {{ goal.parentTitle }}
                  <template v-if="goal.scheduleLabel">
                    · {{ goal.scheduleLabel }}
                  </template>
                  <template v-if="goal.timeLabel">
                    · {{ goal.timeLabel }}
                  </template>
                </small>
              </div>
              <div class="goal-card__actions">
                <button class="ghost danger" type="button" @click="removeGoal(goal.id)">
                  제거
                </button>
              </div>
            </li>
          </ul>
        </div>
      </section>
    </div>
  </AppScaffold>
</template>

<style scoped>
.goal-board {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
  align-items: flex-start;
}

.goal-column {
  padding: 1.75rem;
  border-radius: 32px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.goal-column__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.goal-column__count {
  font-weight: 600;
  color: var(--text-muted);
}

.goal-search {
  border: 1px solid var(--border-color);
  border-radius: 18px;
  padding: 0.85rem 1rem;
  font-size: var(--text-size-base);
}

.goal-pool {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.pool-card {
  border: 1px solid rgba(25, 30, 58, 0.08);
  border-radius: 18px;
  padding: 1rem;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  cursor: grab;
}

.pool-card__header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: flex-start;
}

.pool-card__title {
  font-weight: 600;
  font-size: 1rem;
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
}

.pool-card__assign {
  border: none;
  background: rgba(84, 118, 255, 0.15);
  color: var(--brand-primary);
  border-radius: 999px;
  padding: 0.3rem 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.pool-card__meta {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.priority {
  font-size: 1.1rem;
}

.goal-column--target .goal-dropzone {
  flex: 1;
}

.goal-dropzone {
  border: 2px dashed rgba(51, 65, 92, 0.2);
  border-radius: 28px;
  min-height: 280px;
  padding: 1.2rem;
  background: rgba(255, 255, 255, 0.6);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.goal-dropzone--active {
  border-color: var(--brand-primary);
  background: rgba(84, 118, 255, 0.15);
}

.goal-dropzone__hint {
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.goal-dropzone__empty {
  border-radius: 20px;
  background: rgba(25, 30, 58, 0.04);
  padding: 1.25rem;
  text-align: center;
  color: var(--text-muted);
}

.goal-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.goal-card {
  border-radius: 20px;
  padding: 1rem;
  background: #fff;
  border: 1px solid rgba(25, 30, 58, 0.08);
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.75rem;
  align-items: center;
  cursor: grab;
}

.goal-card__badge {
  width: 12px;
  height: 48px;
  border-radius: 8px;
}

.goal-card__body {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.goal-card__title {
  font-weight: 700;
  font-size: 1.05rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.goal-card__meta {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.goal-card__actions {
  display: inline-flex;
  justify-self: flex-end;
}

.goal-card__actions .ghost {
  border: 1px solid rgba(25, 30, 58, 0.12);
  background: rgba(84, 118, 255, 0.08);
  border-radius: 10px;
  padding: 0.2rem 0.6rem;
  font-weight: 700;
  cursor: pointer;
}

.goal-card__actions .ghost:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.goal-card__actions .danger {
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.12);
  border-color: rgba(255, 107, 107, 0.4);
}

@media (max-width: 720px) {
  .goal-card {
    grid-template-columns: 6px 1fr;
  }

  .goal-card__badge {
    height: 100%;
  }

  .goal-card__actions {
    grid-column: 1 / -1;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
