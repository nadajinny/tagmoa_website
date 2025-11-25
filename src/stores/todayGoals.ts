import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { onValue, set, type DatabaseReference } from 'firebase/database'
import { useAuthStore } from './auth'
import { userTodayGoalsRef } from '../services/userDatabase'

const LOCAL_STORAGE_KEY = 'tagmoa-today-goals'

export interface TodayGoalState {
  order: string[]
  completed: string[]
  dateKey: string
  updatedAt: number
}

interface TodayGoalSnapshot extends Partial<TodayGoalState> {}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function createBlankState(): TodayGoalState {
  return {
    order: [],
    completed: [],
    dateKey: getTodayKey(),
    updatedAt: Date.now(),
  }
}

function cloneState(state: TodayGoalState): TodayGoalState {
  return {
    order: [...state.order],
    completed: [...state.completed],
    dateKey: state.dateKey,
    updatedAt: state.updatedAt,
  }
}

function loadLocalState(): TodayGoalState {
  if (typeof window === 'undefined') return createBlankState()
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return createBlankState()
    const parsed = JSON.parse(raw) as TodayGoalSnapshot
    return normalizeState(parsed)
  } catch (error) {
    console.warn('[TodayGoalsStore] Failed to parse local data', error)
    return createBlankState()
  }
}

function persistLocalState(state: TodayGoalState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state))
}

function normalizeState(payload?: TodayGoalSnapshot | null): TodayGoalState {
  if (!payload) return createBlankState()
  const order = Array.isArray(payload.order) ? payload.order.filter(isString) : []
  const completed = Array.isArray(payload.completed) ? payload.completed.filter(isString) : []
  const dateKey = typeof payload.dateKey === 'string' ? payload.dateKey : getTodayKey()
  const updatedAt =
    typeof payload.updatedAt === 'number' && Number.isFinite(payload.updatedAt)
      ? payload.updatedAt
      : Date.now()
  return {
    order,
    completed,
    dateKey,
    updatedAt,
  }
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function replaceArray(target: string[], next: string[]) {
  target.splice(0, target.length, ...next)
}

export const useTodayGoalsStore = defineStore('todayGoals', () => {
  const auth = useAuthStore()
  const state = reactive<TodayGoalState>(createBlankState())
  const ready = ref(false)
  let remoteRef: DatabaseReference | null = null
  let unsubscribe: (() => void) | null = null
  let suppressPersist = false

  watch(
    () => auth.session?.id ?? null,
    (uid) => {
      detachRemote()
      if (uid) {
        connectRemote(uid)
      } else {
        applyState(loadLocalState())
        ready.value = true
      }
    },
    { immediate: true },
  )

  const goalIds = computed(() => [...state.order])
  const completedIds = computed(() => [...state.completed])
  const stats = computed(() => {
    const total = state.order.length + state.completed.length
    const completed = state.completed.length
    return {
      total,
      completed,
      remaining: state.order.length,
      hasGoals: total > 0,
    }
  })

  function ensureTodayRollup(persist = false) {
    const todayKey = getTodayKey()
    if (state.dateKey === todayKey) return
    state.dateKey = todayKey
    state.completed.splice(0)
    state.updatedAt = Date.now()
    if (persist) {
      persistState()
    }
  }

  function assignGoal(id: string, index?: number) {
    if (!isString(id)) return
    ensureTodayRollup()
    removeGoal(id, false)
    const insertionIndex =
      typeof index === 'number' ? Math.min(Math.max(index, 0), state.order.length) : state.order.length
    state.order.splice(insertionIndex, 0, id)
    state.updatedAt = Date.now()
    persistState()
  }

  function removeGoal(id: string, persist = true) {
    const beforeOrder = state.order.length
    const beforeCompleted = state.completed.length
    const nextOrder = state.order.filter((goalId) => goalId !== id)
    const nextCompleted = state.completed.filter((goalId) => goalId !== id)
    if (nextOrder.length === beforeOrder && nextCompleted.length === beforeCompleted) {
      return
    }
    replaceArray(state.order, nextOrder)
    replaceArray(state.completed, nextCompleted)
    state.updatedAt = Date.now()
    if (persist) {
      persistState()
    }
  }

  function reorderGoals(fromIndex: number, toIndex: number) {
    ensureTodayRollup()
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      fromIndex >= state.order.length ||
      toIndex < 0 ||
      toIndex > state.order.length
    ) {
      return
    }
    const updated = [...state.order]
    const [moved] = updated.splice(fromIndex, 1)
    if (!moved) return
    updated.splice(toIndex, 0, moved)
    replaceArray(state.order, updated)
    state.updatedAt = Date.now()
    persistState()
  }

  function clearGoals() {
    if (!state.order.length && !state.completed.length) return
    state.order.splice(0)
    state.completed.splice(0)
    state.updatedAt = Date.now()
    persistState()
  }

  function markGoalCompleted(id: string) {
    ensureTodayRollup()
    const index = state.order.indexOf(id)
    if (index === -1) {
      if (!state.completed.includes(id)) {
        state.completed.push(id)
      }
      return
    }
    state.order.splice(index, 1)
    if (!state.completed.includes(id)) {
      state.completed.push(id)
    }
    state.updatedAt = Date.now()
    persistState()
  }

  function refreshToday() {
    ensureTodayRollup(true)
  }

  function isGoal(id: string) {
    return state.order.includes(id)
  }

  function persistState() {
    if (suppressPersist) return
    const payload = cloneState(state)
    if (remoteRef) {
      set(remoteRef, payload).catch((error) => {
        console.error('[TodayGoalsStore] Failed to sync goals', error)
      })
    } else {
      persistLocalState(payload)
    }
  }

  function applyState(payload: TodayGoalState) {
    const normalized = normalizeState(payload)
    replaceArray(state.order, normalized.order)
    replaceArray(state.completed, normalized.completed)
    state.dateKey = normalized.dateKey
    state.updatedAt = normalized.updatedAt
    ensureTodayRollup(true)
  }

  function connectRemote(uid: string) {
    remoteRef = userTodayGoalsRef(uid)
    unsubscribe = onValue(
      remoteRef,
      (snapshot) => {
        suppressPersist = true
        const payload = snapshot.exists()
          ? normalizeState(snapshot.val() as TodayGoalSnapshot)
          : createBlankState()
        applyState(payload)
        suppressPersist = false
        ready.value = true
      },
      (error) => {
        console.error('[TodayGoalsStore] Failed to subscribe goals', error)
        suppressPersist = true
        applyState(loadLocalState())
        suppressPersist = false
        ready.value = true
      },
    )
  }

  function detachRemote() {
    unsubscribe?.()
    unsubscribe = null
    remoteRef = null
    suppressPersist = false
  }

  return {
    ready,
    goalIds,
    completedIds,
    stats,
    assignGoal,
    removeGoal,
    reorderGoals,
    clearGoals,
    markGoalCompleted,
    refreshToday,
    isGoal,
  }
})
