<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import AppScaffold from '../components/layout/AppScaffold.vue'
import TagChip from '../components/tags/TagChip.vue'
import MainTaskCard from '../components/tasks/MainTaskCard.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import { useWorkspaceStore } from '../stores/workspace'
import type { MainTask, SubTask } from '../types/models'
import { layoutActionsKey } from '../layouts/layoutActions'
import { formatDateRange, formatTime } from '../utils/dates'

const workspace = useWorkspaceStore()
const { allMainTasks, visibleTags, allSubTasks } = storeToRefs(workspace)
const router = useRouter()
const layoutActions = inject(layoutActionsKey, null)

const search = ref('')
const subSearch = ref('')
const selectedTags = ref<string[]>([])
const viewMode = ref<'main' | 'sub'>('main')
const subSortMode = ref<'priority' | 'deadline'>('priority')
const priorityIcons = ['💡', '🔥', '🚀', '⭐️'] as const

const showCompleted = computed({
  get: () => workspace.state.preferences.showCompleted,
  set: (value: boolean) => workspace.setShowCompleted(value),
})

const filteredTasks = computed(() => {
  const query = search.value.trim().toLowerCase()
  return allMainTasks.value.filter((task) => {
    const matchesCompleted = showCompleted.value ? true : !task.isCompleted
    const matchesQuery =
      !query ||
      task.title.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query)
    const taskTagIds = task.tagIds ?? []
    const matchesTags =
      !selectedTags.value.length ||
      selectedTags.value.every((tagId) => taskTagIds.includes(tagId))
    return matchesCompleted && matchesQuery && matchesTags
  })
})

const pageTitle = computed(() => (viewMode.value === 'main' ? '주요 일정' : '세부 일정'))

const pageDescription = computed(() =>
  viewMode.value === 'main'
    ? '태그와 검색으로 원하는 프로젝트 흐름을 빠르게 찾아보세요.'
    : '우선순위에 따라 모든 세부 일정을 한눈에 확인하세요.',
)

const mainTaskLookup = computed<Record<string, MainTask>>(() => {
  const map: Record<string, MainTask> = {}
  allMainTasks.value.forEach((task) => {
    map[task.id] = task
  })
  return map
})

type SubTaskRow = {
  task: SubTask
  mainTitle: string
  mainColor: string
  scheduleLabel: string
  timeLabel: string
}

const filteredSubTasks = computed<SubTaskRow[]>(() => {
  const query = subSearch.value.trim().toLowerCase()
  const map = mainTaskLookup.value
  const base = allSubTasks.value.filter((task) => (showCompleted.value ? true : !task.isCompleted))
  const matching = query
    ? base.filter((task) => {
        const parentTitle = map[task.mainTaskId]?.title?.toLowerCase() ?? ''
        return (
          task.content.toLowerCase().includes(query) || parentTitle.includes(query)
        )
      })
    : base

  const sorted = [...matching].sort((a, b) => compareSubTasks(a, b))

  return sorted.map((task) => {
    const parent = map[task.mainTaskId]
    return {
      task,
      mainTitle: parent?.title || '주요 일정 없음',
      mainColor: parent?.mainColor || '#dfe6ff',
      scheduleLabel: formatDateRange(task.startDate, task.endDate) || '기간 미정',
      timeLabel: buildTimeLabel(task),
    }
  })
})

function compareSubTasks(a: SubTask, b: SubTask) {
  if (showCompleted.value && a.isCompleted !== b.isCompleted) {
    return a.isCompleted ? 1 : -1
  }
  return subSortMode.value === 'deadline'
    ? compareByDeadline(a, b)
    : compareByPriority(a, b)
}

function compareByPriority(a: SubTask, b: SubTask) {
  if (a.priority !== b.priority) return b.priority - a.priority
  const dateA = getSubTaskScheduleAnchor(a)
  const dateB = getSubTaskScheduleAnchor(b)
  if (dateA !== dateB) return dateA - dateB
  return a.content.localeCompare(b.content, 'ko-KR')
}

function compareByDeadline(a: SubTask, b: SubTask) {
  const deadlineA = getSubTaskDeadlineAnchor(a)
  const deadlineB = getSubTaskDeadlineAnchor(b)
  if (deadlineA !== deadlineB) return deadlineA - deadlineB
  if (a.priority !== b.priority) return b.priority - a.priority
  return a.content.localeCompare(b.content, 'ko-KR')
}

function getSubTaskScheduleAnchor(task: SubTask) {
  return task.endDate ?? task.startDate ?? task.dueDate ?? Number.MAX_SAFE_INTEGER
}

function getSubTaskDeadlineAnchor(task: SubTask) {
  return task.dueDate ?? task.endDate ?? task.startDate ?? Number.MAX_SAFE_INTEGER
}

function toggleTag(tagId: string) {
  if (selectedTags.value.includes(tagId)) {
    selectedTags.value = selectedTags.value.filter((id) => id !== tagId)
  } else {
    selectedTags.value = [...selectedTags.value, tagId]
  }
}

function openTask(task: MainTask) {
  router.push({ name: 'task-detail', params: { id: task.id } })
}

function toggleComplete(task: MainTask) {
  workspace.toggleMainCompletion(task.id, !task.isCompleted)
}

function createMainTask() {
  layoutActions?.openMainForm()
}

function createSubTask() {
  layoutActions?.openSubForm()
}

function toggleSubTask(task: SubTask) {
  workspace.toggleSubCompletion(task.id, !task.isCompleted)
}

function goToTaskDetail(taskId?: string) {
  if (!taskId) return
  router.push({ name: 'task-detail', params: { id: taskId } })
}

function buildTimeLabel(task: SubTask) {
  const start = formatTime(task.startDate)
  const end = formatTime(task.endDate)
  if (start && end) {
    if (start === end) return start
    return `${start} ~ ${end}`
  }
  return start || end || ''
}
</script>

<template>
  <AppScaffold :title="pageTitle" :description="pageDescription">
    <template #actions>
      <div class="task-actions">
        <div class="task-actions__toggle">
          <button
            type="button"
            :class="['task-view-button', { 'task-view-button--active': viewMode === 'main' }]"
            @click="viewMode = 'main'"
          >
            주요 일정 정리
          </button>
          <button
            type="button"
            :class="['task-view-button', { 'task-view-button--active': viewMode === 'sub' }]"
            @click="viewMode = 'sub'"
          >
            세부 일정 리스트
          </button>
        </div>
        <div class="task-actions__buttons">
          <button class="btn-primary" type="button" @click="createMainTask">주요 일정 추가</button>
          <button class="btn-link" type="button" @click="createSubTask">세부 일정 추가</button>
        </div>
      </div>
    </template>

    <div v-if="viewMode === 'main'" class="task-main-view">
      <div class="task-filters card-surface">
        <input v-model="search" type="search" placeholder="제목, 설명으로 검색" />
        <label class="toggle">
          <input v-model="showCompleted" type="checkbox" />
          완료된 일정 표시
        </label>
        <div class="tags">
          <TagChip
            v-for="tag in visibleTags"
            :key="tag.id"
            :label="tag.name"
            :color="tag.color"
            :selected="selectedTags.includes(tag.id)"
            :clickable="true"
            @click="toggleTag(tag.id)"
          />
          <button class="btn-link" type="button" @click="router.push({ name: 'tags' })">
            태그 관리 →
          </button>
        </div>
      </div>

      <div class="task-list">
        <MainTaskCard
          v-for="task in filteredTasks"
          :key="task.id"
          :task="task"
          :tags="visibleTags.filter((tag) => (task.tagIds ?? []).includes(tag.id))"
          :subtasks="workspace.getSubTasksForTask(task.id)"
          @open="openTask"
          @toggle-complete="toggleComplete"
        />
        <EmptyState
          v-if="!filteredTasks.length"
          title="조건에 맞는 일정이 없어요"
          message="검색어나 태그 필터를 조정해보거나 새 일정을 추가해보세요."
        />
      </div>
    </div>

    <section v-else class="subtask-panel card-surface">
      <div class="subtask-panel__filters">
        <input v-model="subSearch" type="search" placeholder="세부 일정 내용, 주요 일정으로 검색" />
        <p class="subtask-panel__count">총 {{ filteredSubTasks.length }}건</p>
        <div class="subtask-panel__filter-divider" />
        <label class="toggle subtask-panel__toggle">
          <input v-model="showCompleted" type="checkbox" />
          완료된 일정 표시
        </label>
        <div class="subtask-sort" role="group" aria-label="세부 일정 정렬 방식">
          <span class="subtask-sort__label">정렬</span>
          <div class="subtask-sort__options">
            <button
              type="button"
              :class="['subtask-sort__option', { 'subtask-sort__option--active': subSortMode === 'priority' }]"
              @click="subSortMode = 'priority'"
            >
              중요도 순
            </button>
            <button
              type="button"
              :class="['subtask-sort__option', { 'subtask-sort__option--active': subSortMode === 'deadline' }]"
              @click="subSortMode = 'deadline'"
            >
              마감일 임박 순
            </button>
          </div>
        </div>
      </div>

      <ul v-if="filteredSubTasks.length" class="subtask-panel__list">
        <li
          v-for="row in filteredSubTasks"
          :key="row.task.id"
          class="subtask-row"
          :class="{ 'subtask-row--done': row.task.isCompleted }"
        >
          <label class="subtask-row__checkbox">
            <input
              type="checkbox"
              :checked="row.task.isCompleted"
              @change="toggleSubTask(row.task)"
            />
            <span />
          </label>

          <div class="subtask-row__content">
            <div class="subtask-row__title">
              <p :class="['subtask-row__name', { 'subtask-row__name--done': row.task.isCompleted }]">
                <span class="subtask-row__priority">
                  {{ priorityIcons[row.task.priority] ?? '•' }}
                </span>
                {{ row.task.content || '내용 없음' }}
              </p>
              <button
                type="button"
                class="subtask-row__main"
                @click="goToTaskDetail(row.task.mainTaskId)"
              >
                <span class="subtask-row__main-color" :style="{ backgroundColor: row.mainColor }" />
                {{ row.mainTitle }}
              </button>
            </div>
            <small class="subtask-row__meta">
              {{ row.scheduleLabel }}
              <template v-if="row.timeLabel"> · {{ row.timeLabel }}</template>
            </small>
          </div>
        </li>
      </ul>

      <EmptyState
        v-else
        title="표시할 세부 일정이 없어요"
        message="검색어나 완료 여부를 확인하거나 새로운 세부 일정을 추가해보세요."
      />
    </section>
  </AppScaffold>
</template>

<style scoped>
.task-filters {
  padding: 1.5rem;
  border-radius: 28px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.task-filters input[type='search'] {
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 0.9rem 1rem;
  font-size: var(--text-size-base);
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tags :deep(.tag-chip) {
  font-size: var(--text-size-base);
  padding: 0.45rem 1.1rem;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.task-main-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.task-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}

.task-actions__toggle {
  display: inline-flex;
  padding: 0.3rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
  gap: 0.25rem;
}

.task-view-button {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  padding: 0.45rem 1.1rem;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
}

.task-view-button--active {
  background: #fff;
  color: var(--brand-primary);
  box-shadow: 0 8px 24px rgba(25, 30, 58, 0.18);
}

.task-actions__buttons {
  display: inline-flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.subtask-panel {
  padding: 1.8rem;
  border-radius: 28px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.subtask-panel__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  padding: 1rem 1.25rem;
  border-radius: 24px;
  background: transparent;
  border: none;
}

.subtask-panel__filters input[type='search'] {
  flex: 1;
  min-width: 240px;
  border: 1px solid transparent;
  border-radius: 18px;
  padding: 0.95rem 1.1rem;
  font-size: var(--text-size-base);
  background: #fff;
  box-shadow: 0 2px 12px rgba(25, 30, 58, 0.08);
}

.subtask-panel__filter-divider {
  width: 1px;
  align-self: stretch;
  background: rgba(25, 30, 58, 0.12);
  min-height: 32px;
}

.subtask-panel__toggle {
  padding: 0.5rem 1rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(25, 30, 58, 0.1);
}

.subtask-panel__count {
  margin-left: auto;
  font-weight: 600;
  color: var(--text-muted);
}

.subtask-sort {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.4rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(25, 30, 58, 0.1);
}

.subtask-sort__label {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-muted);
  padding-left: 0.4rem;
}

.subtask-sort__options {
  display: inline-flex;
  background: rgba(84, 118, 255, 0.12);
  border-radius: 999px;
  padding: 0.2rem;
  gap: 0.25rem;
}

.subtask-sort__option {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-weight: 600;
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.subtask-sort__option--active {
  background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
  color: #fff;
  box-shadow: 0 6px 16px rgba(25, 30, 58, 0.18);
}

@media (max-width: 720px) {
  .subtask-panel__filters {
    flex-direction: column;
    align-items: stretch;
  }

  .subtask-panel__count,
  .subtask-panel__filter-divider {
    align-self: flex-start;
  }

  .subtask-panel__filter-divider {
    display: none;
  }

  .subtask-panel__count {
    margin-left: 0;
  }

  .subtask-sort {
    width: 100%;
    justify-content: space-between;
  }

  .subtask-sort__options {
    flex: 1;
    justify-content: space-between;
  }
}

.subtask-panel__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.subtask-row {
  display: flex;
  gap: 0.9rem;
  align-items: flex-start;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(25, 30, 58, 0.08);
}

.subtask-row:last-child {
  border-bottom: none;
}

.subtask-row--done {
  opacity: 0.9;
}

.subtask-row__checkbox {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid var(--border-color);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  margin-top: 0.15rem;
}

.subtask-row__checkbox span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-image: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
  opacity: 0;
  transition: opacity 0.2s ease;
}

.subtask-row__checkbox input {
  display: none;
}

.subtask-row__checkbox input:checked + span {
  opacity: 1;
}

.subtask-row__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.subtask-row__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.subtask-row__name {
  font-size: clamp(1rem, 0.8vw + 0.5rem, 1.2rem);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.subtask-row__name--done {
  text-decoration: line-through;
  color: var(--text-muted);
}

.subtask-row__priority {
  font-size: 1rem;
}

.subtask-row__main {
  border: 1px solid rgba(25, 30, 58, 0.12);
  background: rgba(84, 118, 255, 0.08);
  border-radius: 999px;
  padding: 0.35rem 0.9rem;
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
  font-weight: 600;
  color: #3e455d;
}

.subtask-row__main-color {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.subtask-row__meta {
  color: var(--text-muted);
  font-size: clamp(0.85rem, 0.35vw + 0.5rem, 1rem);
}
</style>
