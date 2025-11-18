import { computed, reactive, ref, watch } from 'vue'
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
import { STATE_VERSION } from '../services/storage'
import {
  onValue,
  get,
  set,
  update,
  type DatabaseReference,
} from 'firebase/database'
import { createId } from '../utils/id'
import { isDueToday } from '../utils/dates'
import { useAuthStore } from './auth'
import {
  userMainTasksRef,
  userPreferencesRef,
  userRootRef,
  userSubTasksRef,
  userTagsRef,
  userVersionRef,
} from '../services/userDatabase'

const TAG_COLORS = ['#5577ff', '#ff9d6c', '#52a79c', '#7d4eff', '#3bb2e3', '#f67599']

const DEFAULT_PREFERENCES: PreferenceState = {
  showCompleted: false,
  homeDateTheme: 'dark',
  alarm: {
    majorEnabled: false,
    majorTime: '08:00',
    subEnabled: false,
    subTime: '13:00',
  },
}

interface WorkspaceSnapshotPayload {
  version?: number
  tags?: Record<string, Tag>
  tasks?: Record<string, MainTask>
  mainTasks?: Record<string, MainTask>
  subtasks?: Record<string, SubTask>
  subTasks?: Record<string, SubTask>
  preferences?: PreferenceState | null
}

let workspaceRootRef: DatabaseReference | null = null
let tagsRef: DatabaseReference | null = null
let mainTasksRef: DatabaseReference | null = null
let subtasksRef: DatabaseReference | null = null
let preferencesRef: DatabaseReference | null = null
let versionRef: DatabaseReference | null = null
let workspaceUnsubscribe: (() => void) | null = null
let currentUid: string | null = null

export const useWorkspaceStore = defineStore('workspace', () => {
  const state = reactive(createBlankWorkspaceState()) as PersistedAppState
  const workspaceReady = ref(false)
  const workspaceError = ref<string | null>(null)
  const auth = useAuthStore()

  watch(
    () => auth.session?.id ?? null,
    (uid) => {
      if (uid === currentUid) return
      currentUid = uid
      stopWorkspaceSync()
      if (uid) {
        void startWorkspaceSync(uid)
      }
    },
    { immediate: true },
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
    const fresh = createBlankWorkspaceState()
    state.version = fresh.version
    overwriteRecord(state.tags, fresh.tags)
    overwriteRecord(state.tasks, fresh.tasks)
    overwriteRecord(state.subtasks, fresh.subtasks)
    applyPreferences(fresh.preferences)
    queueSet(tagsRef, fresh.tags, 'reset tags')
    queueSet(mainTasksRef, fresh.tasks, 'reset main tasks')
    queueSet(subtasksRef, buildNestedSubTasks(fresh.subtasks), 'reset subtasks')
    queueSet(preferencesRef, fresh.preferences, 'reset preferences')
    queueSet(versionRef, fresh.version, 'reset workspace version')
  }

  function createTag(name: string): Tag {
    const trimmed = name.trim()
    if (!trimmed) {
      throw new Error('태그 이름을 입력해주세요.')
    }
    const duplicate = Object.values(state.tags).find(
      (tag) => tag.name.localeCompare(trimmed, 'ko-KR', { sensitivity: 'base' }) === 0,
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
    syncTags()
    return tag
  }

  function updateTag(id: string, updates: Partial<Omit<Tag, 'id'>>) {
    const tag = state.tags[id]
    if (!tag) return
    Object.assign(tag, updates, { updatedAt: Date.now() })
    syncTags()
  }

  function toggleTagVisibility(id: string) {
    const tag = state.tags[id]
    if (!tag) return
    tag.hidden = !tag.hidden
    tag.updatedAt = Date.now()
    syncTags()
  }

  function persistTagOrder(ids: string[]) {
    ids.forEach((id, index) => {
      const tag = state.tags[id]
      if (tag) {
        tag.order = index
        tag.updatedAt = Date.now()
      }
    })
    syncTags()
  }

  function deleteTag(id: string) {
    if (!state.tags[id]) return
    delete state.tags[id]
    let tasksChanged = false
    Object.values(state.tasks).forEach((task) => {
      const nextTagIds = task.tagIds.filter((tagId) => tagId !== id)
      if (nextTagIds.length !== task.tagIds.length) {
        task.tagIds = nextTagIds
        tasksChanged = true
      }
    })
    syncTags()
    if (tasksChanged) {
      syncTasks()
    }
  }

  function saveMainTask(payload: MainTaskInput): MainTask {
    const now = Date.now()
    const id = payload.id ?? createId()
    const existing = state.tasks[id]
    const hasManualSchedule =
      Boolean(payload.manualSchedule) && Boolean(payload.startDate ?? payload.endDate)
    const normalizedStart = hasManualSchedule ? payload.startDate ?? payload.endDate ?? null : null
    const normalizedEnd = hasManualSchedule ? payload.endDate ?? payload.startDate ?? null : null
    const normalizedTagIds = sanitizeTagIds(payload.tagIds)
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
      tagIds: normalizedTagIds,
      alarmEnabled: payload.alarmEnabled,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    state.tasks[id] = next
    syncTasks()
    return next
  }

  function deleteMainTask(id: string) {
    if (!state.tasks[id]) return
    delete state.tasks[id]
    let subTasksChanged = false
    Object.keys(state.subtasks).forEach((subId) => {
      const subTask = state.subtasks[subId]
      if (subTask && subTask.mainTaskId === id) {
        delete state.subtasks[subId]
        subTasksChanged = true
      }
    })
    syncTasks()
    if (subTasksChanged) {
      syncSubTasks()
    }
  }

  function toggleMainCompletion(id: string, isCompleted: boolean) {
    const task = state.tasks[id]
    if (!task) return
    const timestamp = isCompleted ? Date.now() : null
    task.isCompleted = isCompleted
    task.completedAt = timestamp
    task.dueDate = timestamp
    syncTasks()
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
      completedAt: payload.isCompleted
        ? existing?.completedAt ?? now
        : existing?.completedAt ?? null,
      alarmEnabled: payload.alarmEnabled,
      alarmLeadMinutes: payload.alarmLeadMinutes,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    state.subtasks[id] = subTask
    syncSubTasks()
    return subTask
  }

  function deleteSubTask(id: string) {
    if (!state.subtasks[id]) return
    delete state.subtasks[id]
    syncSubTasks()
  }

  function toggleSubCompletion(id: string, isCompleted: boolean) {
    const sub = state.subtasks[id]
    if (!sub) return
    const timestamp = isCompleted ? Date.now() : null
    sub.isCompleted = isCompleted
    sub.completedAt = timestamp
    sub.dueDate = timestamp
    syncSubTasks()
  }

  function getSubTasksForTask(taskId: string): SubTask[] {
    return allSubTasks.value.filter((sub) => sub.mainTaskId === taskId)
  }

  function getMainTask(taskId: string): MainTask | undefined {
    return state.tasks[taskId]
  }

  function setShowCompleted(value: boolean) {
    state.preferences.showCompleted = value
    syncPreferences()
  }

  function setHomeDateTheme(theme: HomeDateTheme) {
    state.preferences.homeDateTheme = theme
    syncPreferences()
  }

  function updateAlarmSettings(updates: Partial<AlarmSettings>) {
    applyAlarmUpdates(updates)
    syncPreferences()
  }

  function updatePreferences(updates: Partial<PreferenceState>) {
    if (typeof updates.showCompleted === 'boolean') {
      state.preferences.showCompleted = updates.showCompleted
    }
    if (updates.homeDateTheme) {
      state.preferences.homeDateTheme = updates.homeDateTheme
    }
    if (updates.alarm) {
      applyAlarmUpdates(updates.alarm)
    }
    syncPreferences()
  }

  return {
    state,
    workspaceReady,
    workspaceError,
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

  async function startWorkspaceSync(uid: string) {
    workspaceRootRef = userRootRef(uid)
    tagsRef = userTagsRef(uid)
    mainTasksRef = userMainTasksRef(uid)
    subtasksRef = userSubTasksRef(uid)
    preferencesRef = userPreferencesRef(uid)
    versionRef = userVersionRef(uid)
    workspaceReady.value = false
    workspaceError.value = null

    try {
      await ensureWorkspaceSeed(workspaceRootRef)
    } catch (error) {
      console.error('Failed to ensure workspace data', error)
      workspaceError.value = '데이터를 불러오지 못했습니다.'
    }

    if (currentUid !== uid || !workspaceRootRef) {
      return
    }

    workspaceUnsubscribe = onValue(
      workspaceRootRef,
      (snapshot) => {
        const payload = snapshot.val() as WorkspaceSnapshotPayload | null
        applyWorkspaceSnapshot(payload)
        workspaceReady.value = true
        workspaceError.value = null
      },
      (error) => {
        console.error('Workspace realtime sync error', error)
        workspaceError.value = error.message
      },
    )
  }

  function stopWorkspaceSync() {
    workspaceUnsubscribe?.()
    workspaceUnsubscribe = null
    workspaceRootRef = null
    tagsRef = null
    mainTasksRef = null
    subtasksRef = null
    preferencesRef = null
    versionRef = null
    workspaceReady.value = false
    workspaceError.value = null
    applyWorkspaceSnapshot(null)
  }

  async function ensureWorkspaceSeed(reference: DatabaseReference | null) {
    if (!reference) return
    const snapshot = await get(reference)
    let needsVersion = true
    let needsTags = true
    let needsMainTasks = true
    let needsSubTasks = true
    let needsPreferences = true

    if (snapshot.exists()) {
      needsVersion = !snapshot.child('version').exists()
      needsTags = !snapshot.child('tags').exists()
      needsMainTasks = !snapshot.child('mainTasks').exists()
      needsSubTasks = !snapshot.child('subTasks').exists()
      needsPreferences = !snapshot.child('preferences').exists()
    }

    if (!needsVersion && !needsTags && !needsMainTasks && !needsSubTasks && !needsPreferences) {
      return
    }

    const defaults = createBlankWorkspaceState()
    const updates: Record<string, unknown> = {}
    if (needsVersion) updates.version = defaults.version
    if (needsTags) updates.tags = defaults.tags
    if (needsMainTasks) updates.mainTasks = defaults.tasks
    if (needsSubTasks) updates.subTasks = buildNestedSubTasks(defaults.subtasks)
    if (needsPreferences) updates.preferences = defaults.preferences

    await update(reference, updates)
  }

  function applyWorkspaceSnapshot(payload: WorkspaceSnapshotPayload | null) {
    if (!payload) {
      const blank = createBlankWorkspaceState()
      state.version = blank.version
      overwriteRecord(state.tags, blank.tags)
      overwriteRecord(state.tasks, blank.tasks)
      overwriteRecord(state.subtasks, blank.subtasks)
      applyPreferences(blank.preferences)
      return
    }

    state.version = payload.version ?? STATE_VERSION
    const remoteTags = (payload.tags ?? {}) as Record<string, Tag>
    const remoteTasks = (payload.mainTasks ?? payload.tasks ?? {}) as Record<string, MainTask>
    const normalizedTasks = normalizeMainTasks(remoteTasks)
    const remoteSubTasks = flattenSubTasksPayload(payload.subTasks ?? payload.subtasks ?? null)
    overwriteRecord(state.tags, remoteTags)
    overwriteRecord(state.tasks, normalizedTasks)
    overwriteRecord(state.subtasks, remoteSubTasks)
    applyPreferences(payload.preferences ?? undefined)
  }

  function syncTags() {
    queueSet(tagsRef, state.tags, 'sync tags')
  }

  function syncTasks() {
    queueSet(mainTasksRef, state.tasks, 'sync main tasks')
  }

  function syncSubTasks() {
    queueSet(subtasksRef, buildNestedSubTasks(state.subtasks), 'sync subtasks')
  }

  function syncPreferences() {
    queueSet(preferencesRef, state.preferences, 'sync preferences')
  }

  function applyPreferences(preferences?: PreferenceState) {
    const source = preferences ?? DEFAULT_PREFERENCES
    state.preferences.showCompleted = source.showCompleted
    state.preferences.homeDateTheme = source.homeDateTheme
    state.preferences.alarm.majorEnabled = source.alarm.majorEnabled
    state.preferences.alarm.majorTime = source.alarm.majorTime
    state.preferences.alarm.subEnabled = source.alarm.subEnabled
    state.preferences.alarm.subTime = source.alarm.subTime
  }

  function applyAlarmUpdates(updates: Partial<AlarmSettings>) {
    Object.assign(state.preferences.alarm, updates)
  }

function queueSet(reference: DatabaseReference | null, payload: unknown, context: string) {
  if (!reference) return
  set(reference, cloneValue(payload)).catch((error) => {
    console.error(`[Workspace] Failed to ${context}`, error)
    workspaceError.value = error?.message ?? '데이터 동기화에 실패했습니다.'
  })
}
})

function normalizeMainTasks(tasks: Record<string, MainTask>) {
  const normalized: Record<string, MainTask> = {}
  Object.entries(tasks).forEach(([id, task]) => {
    if (!task) return
    normalized[id] = {
      ...task,
      tagIds: sanitizeTagIds(task.tagIds),
    }
  })
  return normalized
}

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

function createBlankWorkspaceState(): PersistedAppState {
  return {
    version: STATE_VERSION,
    tags: {},
    tasks: {},
    subtasks: {},
    preferences: cloneValue(DEFAULT_PREFERENCES),
  }
}

function cloneValue<T>(value: T): T {
  if (value === undefined) {
    return value
  }
  return JSON.parse(JSON.stringify(value)) as T
}

function sanitizeTagIds(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.filter((id): id is string => typeof id === 'string' && id.length > 0)
  }
  if (isPlainRecord(input)) {
    return Object.values(input).filter((id): id is string => typeof id === 'string' && id.length > 0)
  }
  return []
}

type RemoteSubTasksPayload = Record<string, unknown> | null | undefined

function flattenSubTasksPayload(payload: RemoteSubTasksPayload): Record<string, SubTask> {
  if (!payload) {
    return {}
  }
  const flattened: Record<string, SubTask> = {}

  Object.entries(payload).forEach(([maybeMainId, candidate]) => {
    if (!isPlainRecord(candidate)) {
      return
    }

    if (isSubTaskShape(candidate)) {
      const normalized = normalizeRemoteSubTask(candidate, maybeMainId)
      flattened[normalized.id] = normalized
      return
    }

    Object.entries(candidate).forEach(([subId, nested]) => {
      if (!isPlainRecord(nested) || !isSubTaskShape(nested)) {
        return
      }
      const normalized = normalizeRemoteSubTask(nested, subId, maybeMainId)
      flattened[normalized.id] = normalized
    })
  })

  return flattened
}

function buildNestedSubTasks(subtasks: Record<string, SubTask>) {
  const nested: Record<string, Record<string, SubTask>> = {}
  Object.values(subtasks).forEach((subTask) => {
    if (!subTask.id || !subTask.mainTaskId) return
    const bucket = nested[subTask.mainTaskId] ?? (nested[subTask.mainTaskId] = {})
    bucket[subTask.id] = subTask
  })
  return nested
}

function isSubTaskShape(value: Record<string, unknown>): value is Partial<SubTask> {
  return (
    'content' in value ||
    'priority' in value ||
    'mainTaskId' in value ||
    'alarmLeadMinutes' in value ||
    'alarmEnabled' in value
  )
}

function normalizeRemoteSubTask(
  value: Partial<SubTask>,
  fallbackId: string,
  fallbackMainId?: string,
): SubTask {
  const normalized = { ...(value as SubTask) }
  normalized.id = normalized.id && normalized.id.length ? normalized.id : fallbackId
  normalized.mainTaskId =
    normalized.mainTaskId && normalized.mainTaskId.length
      ? normalized.mainTaskId
      : fallbackMainId ?? normalized.mainTaskId ?? ''
  return normalized
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
