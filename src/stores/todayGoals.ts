import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'tagmoa-today-goals'

type GoalState = Record<string, string[]>

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function loadStoredGoals(): GoalState {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return parsed as GoalState
    }
    return {}
  } catch (error) {
    console.warn('[TodayGoalsStore] Failed to parse stored data', error)
    return {}
  }
}

function persistGoals(state: GoalState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export const useTodayGoalsStore = defineStore('todayGoals', () => {
  const goalsByDate = reactive<GoalState>(loadStoredGoals())
  const selectedDate = ref(getTodayKey())

  ensureBucket(selectedDate.value)

  const goalIds = computed(() => goalsByDate[selectedDate.value] ?? [])

  function ensureBucket(dateKey: string) {
    if (!goalsByDate[dateKey]) {
      goalsByDate[dateKey] = []
    }
    return goalsByDate[dateKey]
  }

  function assignGoal(id: string, index?: number) {
    const bucket = ensureBucket(selectedDate.value)
    if (bucket.includes(id)) {
      if (typeof index === 'number') {
        reorderGoals(bucket.indexOf(id), index)
      }
      return
    }
    const targetIndex =
      typeof index === 'number'
        ? Math.max(0, Math.min(index, bucket.length))
        : bucket.length
    const next = [...bucket]
    next.splice(targetIndex, 0, id)
    goalsByDate[selectedDate.value] = next
    persistGoals(goalsByDate)
  }

  function removeGoal(id: string) {
    const bucket = ensureBucket(selectedDate.value)
    const next = bucket.filter((goal) => goal !== id)
    if (next.length !== bucket.length) {
      goalsByDate[selectedDate.value] = next
      persistGoals(goalsByDate)
    }
  }

  function reorderGoals(fromIndex: number, toIndex: number) {
    const bucket = ensureBucket(selectedDate.value)
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      fromIndex >= bucket.length ||
      toIndex < 0 ||
      toIndex > bucket.length
    ) {
      return
    }
    const updated = [...bucket]
    const [moved] = updated.splice(fromIndex, 1)
    if (!moved) return
    updated.splice(toIndex, 0, moved)
    goalsByDate[selectedDate.value] = updated
    persistGoals(goalsByDate)
  }

  function clearGoals() {
    if (!goalIds.value.length) return
    goalsByDate[selectedDate.value] = []
    persistGoals(goalsByDate)
  }

  function refreshToday() {
    selectedDate.value = getTodayKey()
  }

  function setDateKey(dateKey: string) {
    if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return
    }
    selectedDate.value = dateKey
  }

  function isGoal(id: string) {
    return goalIds.value.includes(id)
  }

  watch(selectedDate, (next) => {
    ensureBucket(next)
  })

  return {
    goalIds,
    selectedDate,
    assignGoal,
    removeGoal,
    reorderGoals,
    clearGoals,
    refreshToday,
    setDateKey,
    isGoal,
  }
})
