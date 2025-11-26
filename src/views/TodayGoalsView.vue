<script setup lang="ts">
import { computed, onMounted, ref, watchEffect } from 'vue'
import { storeToRefs } from 'pinia'
import AppScaffold from '../components/layout/AppScaffold.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import { useWorkspaceStore } from '../stores/workspace'
import { useTodayGoalsStore } from '../stores/todayGoals'
import type { MainTask, SubTask } from '../types/models'
import { formatDate } from '../utils/dates'

const workspace = useWorkspaceStore()
const { allSubTasks, allMainTasks, workspaceReady } = storeToRefs(workspace)

const goalStore = useTodayGoalsStore()
const { goalIds, completedIds, stats: goalStats } = storeToRefs(goalStore)

const search = ref('')
const listSortMode = ref<'priority' | 'deadline'>('priority')
const isDropActive = ref(false)
const isPoolDropActive = ref(false)
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
  if (!workspaceReady.value) {
    return
  }
  const ids = [...goalIds.value, ...completedIds.value]
  ids.forEach((id) => {
    const task = subTaskLookup.value[id]
    if (!task) {
      goalStore.removeGoal(id)
      return
    }
    if (task.isCompleted) {
      goalStore.markGoalCompleted(id)
    }
  })
})

const availableSubTasks = computed(() => {
  const query = search.value.trim().toLowerCase()
  const filtered = allSubTasks.value.filter((task) => {
    if (task.isCompleted) return false
    if (goalIds.value.includes(task.id)) return false
    if (!query) return true
    const parent = mainTaskLookup.value[task.mainTaskId]
    const parentTitle = parent?.title?.toLowerCase() ?? ''
    return (
      task.content.toLowerCase().includes(query) || parentTitle.includes(query)
    )
  })
  const sorted = [...filtered].sort((a, b) => {
    return listSortMode.value === 'deadline' ? compareByDeadline(a, b) : compareByPriority(a, b)
  })
  return sorted
})

type GoalCard = {
  id: string
  task: SubTask
  parentTitle: string
  parentColor: string
  endLabel: string
  dueLabel: string
  isCompleted: boolean
}

const goalCards = computed<GoalCard[]>(() => {
  const active = goalIds.value
    .map((id) => {
      const task = subTaskLookup.value[id]
      if (!task) return null
      const parent = mainTaskLookup.value[task.mainTaskId]
      return {
        id,
        task,
        parentTitle: parent?.title ?? '주요 일정 없음',
        parentColor: parent?.mainColor ?? '#dfe6ff',
        endLabel: formatEndLabel(task.endDate),
        dueLabel: formatDueLabel(task.dueDate),
        isCompleted: false,
      }
    })
    .filter((card): card is GoalCard & { isCompleted: false } => Boolean(card))

  const completed = completedIds.value
    .map((id) => {
      const task = subTaskLookup.value[id]
      if (!task) return null
      const parent = mainTaskLookup.value[task.mainTaskId]
      return {
        id,
        task,
        parentTitle: parent?.title ?? '주요 일정 없음',
        parentColor: parent?.mainColor ?? '#dfe6ff',
        endLabel: formatEndLabel(task.endDate),
        dueLabel: formatDueLabel(task.dueDate),
        isCompleted: true,
      }
    })
    .filter((card): card is GoalCard & { isCompleted: true } => Boolean(card))

  return [...active, ...completed]
})

const goalSummary = computed(() => {
  if (!goalStats.value.total) {
    return '드래그해서 오늘 집중할 일정을 채워보세요.'
  }
  return `완료 ${goalStats.value.completed} / ${goalStats.value.total}`
})

function formatParentLabel(task: SubTask) {
  return mainTaskLookup.value[task.mainTaskId]?.title ?? '주요 일정 없음'
}

function formatEndLabel(ts: number | null) {
  if (!ts) return ''
  return formatDate(ts, 'MM월 dd일 (EEE)')
}

function formatDueLabel(ts: number | null) {
  if (!ts) return ''
  return formatDate(ts, 'MM월 dd일 (EEE)')
}

function compareByPriority(a: SubTask, b: SubTask) {
  if (a.priority !== b.priority) {
    return b.priority - a.priority
  }
  return compareByDeadline(a, b)
}

function compareByDeadline(a: SubTask, b: SubTask) {
  const deadlineA = getDeadlineAnchor(a)
  const deadlineB = getDeadlineAnchor(b)
  if (deadlineA !== deadlineB) {
    return deadlineA - deadlineB
  }
  return a.content.localeCompare(b.content, 'ko-KR')
}

function getDeadlineAnchor(task: SubTask) {
  return task.dueDate ?? task.endDate ?? Number.MAX_SAFE_INTEGER
}

function assignGoal(id: string) {
  goalStore.assignGoal(id)
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
  isPoolDropActive.value = false
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

function onPoolDragEnter(event: DragEvent) {
  if (dragSource.value !== 'goal') return
  event.preventDefault()
  isPoolDropActive.value = true
}

function onPoolDragLeave(event: DragEvent) {
  if (dragSource.value !== 'goal') return
  const related = event.relatedTarget as HTMLElement | null
  const current = event.currentTarget as HTMLElement | null
  if (!current || !related || !current.contains(related)) {
    isPoolDropActive.value = false
  }
}

function onPoolDrop(event: DragEvent) {
  if (dragSource.value !== 'goal') return
  event.preventDefault()
  const id = event.dataTransfer?.getData('text/plain')
  if (id) {
    goalStore.removeGoal(id)
  }
  endDrag()
}

function toggleGoalCompletion(task: SubTask) {
  const nextState = !task.isCompleted
  workspace.toggleSubCompletion(task.id, nextState)
  if (nextState) {
    goalStore.markGoalCompleted(task.id)
  } else if (!goalStore.isGoal(task.id)) {
    goalStore.assignGoal(task.id)
  }
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
        <div class="goal-sort" role="group" aria-label="세부 일정 정렬 방식">
          <span class="goal-sort__label">정렬</span>
          <div class="goal-sort__options">
            <button
              type="button"
              :class="['goal-sort__option', { 'goal-sort__option--active': listSortMode === 'priority' }]"
              @click="listSortMode = 'priority'"
            >
              중요도 순
            </button>
            <button
              type="button"
              :class="['goal-sort__option', { 'goal-sort__option--active': listSortMode === 'deadline' }]"
              @click="listSortMode = 'deadline'"
            >
              마감일 순
            </button>
          </div>
        </div>
        <ul
          v-if="availableSubTasks.length"
          :class="['goal-pool', { 'goal-pool--drop': isPoolDropActive }]"
          @dragenter="onPoolDragEnter"
          @dragover.prevent="onPoolDragEnter"
          @dragleave="onPoolDragLeave"
          @drop="onPoolDrop"
        >
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
              <template v-if="formatEndLabel(task.endDate)">
                · 마감일 {{ formatEndLabel(task.endDate) }}
              </template>
              <template v-if="formatDueLabel(task.dueDate)">
                · 마감 {{ formatDueLabel(task.dueDate) }}
              </template>
            </small>
          </li>
        </ul>
        <div
          v-else
          class="goal-pool__empty"
          :class="{ 'goal-pool--drop': isPoolDropActive }"
          @dragenter="onPoolDragEnter"
          @dragover.prevent="onPoolDragEnter"
          @dragleave="onPoolDragLeave"
          @drop="onPoolDrop"
        >
          <EmptyState
            title="할당 가능한 세부 일정이 없어요"
            message="검색 키워드를 조정하거나 새로운 세부 일정을 추가해보세요."
          />
        </div>
      </section>

      <section class="goal-column card-surface goal-column--target">
        <header class="goal-column__header">
          <div>
            <p class="pill-muted">Focus</p>
            <h2>오늘의 목표</h2>
            <p class="goal-column__sub">{{ goalSummary }}</p>
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
          :class="{
            'goal-dropzone--active': isDropActive,
            'goal-dropzone--filled': goalCards.length,
          }"
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
              draggable="true"
              @dragstart="startGoalDrag($event, goal.id, index)"
              @dragend="endDrag"
              @dragover.prevent
              @drop="onGoalDrop($event, index)"
              :class="{ 'goal-card--done': goal.isCompleted }"
            >
              <span class="goal-card__bullet" :style="{ backgroundColor: goal.parentColor }" />
              <div class="goal-card__body">
                <p class="goal-card__title">
                  <span class="priority">
                    {{ priorityIcons[goal.task.priority] ?? '•' }}
                  </span>
                  {{ goal.task.content || '내용 없음' }}
                </p>
                <small class="goal-card__meta">
                  {{ goal.parentTitle }}
                  <template v-if="goal.endLabel"> · 마감일 {{ goal.endLabel }}</template>
                  <template v-if="goal.dueLabel"> · 마감 {{ goal.dueLabel }}</template>
                </small>
              </div>
              <label class="goal-card__checkbox">
                <input
                  type="checkbox"
                  :checked="goal.isCompleted"
                  @change="toggleGoalCompletion(goal.task)"
                />
                <span />
              </label>
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

.goal-column__sub {
  margin-top: 0.35rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 600;
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

.goal-sort {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.goal-sort__label {
  font-weight: 700;
  color: var(--text-muted);
}

.goal-sort__options {
  display: inline-flex;
  gap: 0.25rem;
  padding: 0.2rem;
  border-radius: 999px;
  background: rgba(25, 30, 58, 0.05);
}

.goal-sort__option {
  border: none;
  background: transparent;
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.goal-sort__option--active {
  background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
  color: #fff;
  box-shadow: 0 6px 16px rgba(25, 30, 58, 0.18);
}

.goal-pool {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.goal-pool.goal-pool--drop {
  border: none;
  background: transparent;
  padding: 0;
}

.goal-pool__empty {
  border: none;
  border-radius: 22px;
  padding: 1rem;
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
}

.goal-pool__empty.goal-pool--drop {
  border: none;
  background: transparent;
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

.goal-column--target {
  position: relative;
  overflow: hidden;
  border: none;
  background: linear-gradient(135deg, rgba(84, 118, 255, 0.22), rgba(255, 255, 255, 0.7));
  box-shadow: 0 18px 40px rgba(69, 94, 200, 0.18);
}

.goal-column--target::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 32px;
  border: 1px solid rgba(84, 118, 255, 0.25);
  pointer-events: none;
}

.goal-column--target > * {
  position: relative;
}

.goal-dropzone {
  border: none;
  border-radius: 22px;
  min-height: 280px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.goal-dropzone__hint {
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.goal-dropzone__empty {
  border-radius: 20px;
  border: 1px dashed rgba(25, 30, 58, 0.2);
  padding: 1.25rem;
  text-align: center;
  color: var(--text-muted);
  background: #fff;
}

.goal-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.goal-grid li {
  border: 1px solid rgba(25, 30, 58, 0.08);
  border-radius: 18px;
  padding: 1rem;
  background: #fff;
  display: flex;
  gap: 0.75rem;
  align-items: center;
  cursor: grab;
}

.goal-card__bullet {
  width: 10px;
  height: 32px;
  border-radius: 8px;
  flex-shrink: 0;
}

.goal-grid li .goal-card__body {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex: 1;
}
 
.goal-card--done .goal-card__title {
  text-decoration: line-through;
  color: var(--text-muted);
}

.goal-card__checkbox {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid rgba(84, 118, 255, 0.4);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-left: auto;
}

.goal-card__checkbox input {
  display: none;
}

.goal-card__checkbox span {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-image: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
  opacity: 0;
  transition: opacity 0.2s ease;
}

.goal-card__checkbox input:checked + span {
  opacity: 1;
}

.goal-grid li .goal-card__title {
  font-weight: 700;
  font-size: 1.05rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.goal-grid li .goal-card__meta {
  color: var(--text-muted);
  font-size: 0.85rem;
}
</style>
