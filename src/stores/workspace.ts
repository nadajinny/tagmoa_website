import { computed, reactive, watch } from 'vue'
import { defineStore } from 'pinia'
import type {
  AlarmSettings,
  MainTask,
  MainTaskInput,
  PreferenceState,
  PersistedAppState,
  SubTask,
  SubTaskInput,
  Tag,
  HomeDateTheme,
} from '../types/models'
import { loadAppState, persistAppState, createDefaultState } from '../services/storage'
import { createId } from '../utils/id'
import { isDueToday } from '../utils/dates'

const TAG_COLORS = ['#5577ff', '#ff9d6c', '#52a79c', '#7d4eff', '#3bb2e3', '#f67599']

export const useWorkspaceStore = defineStore('workspace', () => {
  const state = reactive(loadAppState()) as PersistedAppState

  watch(
    state,
    (value) => {
      const snapshot = JSON.parse(JSON.stringify(value)) as PersistedAppState
      persistAppState(snapshot)
    },
    { deep: true },
  )

  const allTags = computed<Tag[]>(() =>
    Object.values(state.tags).sort((a, b) => {
      if (a.hidden !== b.hidden) return Number(a.hidden) - Number(b.hidden)
      if (a.order === b.order) {
        return a.name.localeCompare(b.name, 'ko-KR')
      }
      return a.order - b.order
    }),
  )

  const visibleTags = computed(() => allTags.value.filter((tag) => !tag.hidden))

  const allMainTasks = computed<MainTask[]>(() =>
    Object.values(state.tasks).sort((a, b) => {
      const endA = a.endDate ?? a.startDate ?? Number.MAX_SAFE_INTEGER
      const endB = b.endDate ?? b.startDate ?? Number.MAX_SAFE_INTEGER
      if (endA === endB) {
        return (a.startDate ?? Number.MAX_SAFE_INTEGER) - (b.startDate ?? Number.MAX_SAFE_INTEGER)
      }
      return endA - endB
    }),
  )

  const allSubTasks = computed<SubTask[]>(() =>
    Object.values(state.subtasks).sort((a, b) => {
      if (a.priority === b.priority) {
        const endA = a.endDate ?? a.startDate ?? Number.MAX_SAFE_INTEGER
        const endB = b.endDate ?? b.startDate ?? Number.MAX_SAFE_INTEGER
        return endA - endB
      }
      return a.priority - b.priority
    }),
  )

  const dueTodayMain = computed(() =>
    allMainTasks.value.filter((task) => !task.isCompleted && isDueToday(task.endDate)),
  )

  const dueTodaySub = computed(() =>
    allSubTasks.value.filter((task) => !task.isCompleted && isDueToday(task.endDate)),
  )

  function resetWorkspace() {
    const fresh = createDefaultState()
    state.version = fresh.version
    overwriteRecord(state.tags, fresh.tags)
    overwriteRecord(state.tasks, fresh.tasks)
    overwriteRecord(state.subtasks, fresh.subtasks)
    Object.assign(state.preferences, fresh.preferences)
  }

  function createTag(name: string): Tag {
    const trimmed = name.trim()
    if (!trimmed) {
      throw new Error('태그 이름을 입력해주세요.')
    }
    const duplicate = Object.values(state.tags).find((tag) =>
      tag.name.localeCompare(trimmed, 'ko-KR', { sensitivity: 'base' }) === 0,
    )
    if (duplicate) {
      throw new Error('이미 존재하는 태그입니다.')
    }
    const id = createId()
    const now = Date.now()
    const tag: Tag = {
      id,
      name: trimmed,
      hidden: false,
      order: now,
      color: pickTagColor(trimmed),
      createdAt: now,
      updatedAt: now,
    }
    state.tags[id] = tag
    return tag
  }

  function updateTag(id: string, updates: Partial<Omit<Tag, 'id'>>) {
    const tag = state.tags[id]
    if (!tag) return
    Object.assign(tag, updates, { updatedAt: Date.now() })
  }

  function toggleTagVisibility(id: string) {
    const tag = state.tags[id]
    if (!tag) return
    tag.hidden = !tag.hidden
    tag.updatedAt = Date.now()
  }

  function persistTagOrder(ids: string[]) {
    ids.forEach((id, index) => {
      const tag = state.tags[id]
      if (tag) {
        tag.order = index
        tag.updatedAt = Date.now()
      }
    })
  }

  function deleteTag(id: string) {
    if (!state.tags[id]) return
    delete state.tags[id]
    Object.values(state.tasks).forEach((task) => {
      task.tagIds = task.tagIds.filter((tagId) => tagId !== id)
    })
  }

  function saveMainTask(payload: MainTaskInput): MainTask {
    const now = Date.now()
    const id = payload.id ?? createId()
    const existing = state.tasks[id]
    const hasManualSchedule =
      Boolean(payload.manualSchedule) && Boolean(payload.startDate ?? payload.endDate)
    const normalizedStart = hasManualSchedule ? payload.startDate ?? payload.endDate ?? null : null
    const normalizedEnd = hasManualSchedule ? payload.endDate ?? payload.startDate ?? null : null
    const next: MainTask = {
      id,
      title: payload.title.trim(),
      description: payload.description.trim(),
      startDate: normalizedStart,
      endDate: normalizedEnd,
      dueDate: existing?.dueDate ?? null,
      manualSchedule: hasManualSchedule,
      isCompleted: payload.isCompleted ?? existing?.isCompleted ?? false,
      completedAt: payload.isCompleted ? existing?.completedAt ?? now : existing?.completedAt ?? null,
      mainColor: payload.mainColor,
      tagIds: [...payload.tagIds],
      alarmEnabled: payload.alarmEnabled,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    state.tasks[id] = next
    return next
  }

  function deleteMainTask(id: string) {
    if (!state.tasks[id]) return
    delete state.tasks[id]
    Object.keys(state.subtasks).forEach((subId) => {
      const subTask = state.subtasks[subId]
      if (subTask && subTask.mainTaskId === id) {
        delete state.subtasks[subId]
      }
    })
  }

  function toggleMainCompletion(id: string, isCompleted: boolean) {
    const task = state.tasks[id]
    if (!task) return
    const timestamp = isCompleted ? Date.now() : null
    task.isCompleted = isCompleted
    task.completedAt = timestamp
    task.dueDate = timestamp
  }

  function saveSubTask(payload: SubTaskInput): SubTask {
    const now = Date.now()
    const id = payload.id ?? createId()
    const existing = state.subtasks[id]
    const subTask: SubTask = {
      id,
      mainTaskId: payload.mainTaskId,
      content: payload.content.trim(),
      priority: payload.priority,
      startDate: payload.startDate ?? null,
      endDate: payload.endDate ?? payload.startDate ?? null,
      dueDate: existing?.dueDate ?? null,
      isCompleted: payload.isCompleted ?? existing?.isCompleted ?? false,
      completedAt: payload.isCompleted ? existing?.completedAt ?? now : existing?.completedAt ?? null,
      alarmEnabled: payload.alarmEnabled,
      alarmLeadMinutes: payload.alarmLeadMinutes,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    state.subtasks[id] = subTask
    return subTask
  }

  function deleteSubTask(id: string) {
    if (!state.subtasks[id]) return
    delete state.subtasks[id]
  }

  function toggleSubCompletion(id: string, isCompleted: boolean) {
    const sub = state.subtasks[id]
    if (!sub) return
    const timestamp = isCompleted ? Date.now() : null
    sub.isCompleted = isCompleted
    sub.completedAt = timestamp
    sub.dueDate = timestamp
  }

  function getSubTasksForTask(taskId: string): SubTask[] {
    return allSubTasks.value.filter((sub) => sub.mainTaskId === taskId)
  }

  function getMainTask(taskId: string): MainTask | undefined {
    return state.tasks[taskId]
  }

  function setShowCompleted(value: boolean) {
    state.preferences.showCompleted = value
  }

  function setHomeDateTheme(theme: HomeDateTheme) {
    state.preferences.homeDateTheme = theme
  }

  function updateAlarmSettings(updates: Partial<AlarmSettings>) {
    state.preferences.alarm = {
      ...state.preferences.alarm,
      ...updates,
    }
  }

  function updatePreferences(updates: Partial<PreferenceState>) {
    Object.assign(state.preferences, updates)
  }

  return {
    state,
    allTags,
    visibleTags,
    allMainTasks,
    allSubTasks,
    dueTodayMain,
    dueTodaySub,
    resetWorkspace,
    createTag,
    updateTag,
    toggleTagVisibility,
    persistTagOrder,
    deleteTag,
    saveMainTask,
    deleteMainTask,
    toggleMainCompletion,
    saveSubTask,
    deleteSubTask,
    toggleSubCompletion,
    getSubTasksForTask,
    getMainTask,
    setShowCompleted,
    setHomeDateTheme,
    updateAlarmSettings,
    updatePreferences,
  }
})

function overwriteRecord<T extends { id: string }>(target: Record<string, T>, source: Record<string, T>) {
  Object.keys(target).forEach((key) => delete target[key])
  Object.entries(source).forEach(([key, value]) => {
    target[key] = value
  })
}

function pickTagColor(seed: string): string {
  const checksum = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const index = TAG_COLORS.length ? checksum % TAG_COLORS.length : 0
  return TAG_COLORS[index] ?? '#5577ff'
}
