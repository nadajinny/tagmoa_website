import type { PersistedAppState } from '../types/models'
import { buildSamplePayload } from './sampleData'

const STORAGE_KEY = 'tagmoa-web-data'
export const STATE_VERSION = 1

export function createDefaultState(): PersistedAppState {
  const payload = buildSamplePayload()
  return {
    version: STATE_VERSION,
    ...payload,
  }
}

export function loadAppState(): PersistedAppState {
  if (typeof window === 'undefined') {
    return createDefaultState()
  }
  const cached = window.localStorage.getItem(STORAGE_KEY)
  if (!cached) {
    return createDefaultState()
  }

  try {
    const parsed = JSON.parse(cached) as PersistedAppState
    if (parsed.version !== STATE_VERSION) {
      return createDefaultState()
    }
    return parsed
  } catch (error) {
    console.warn('Failed to parse stored state, restoring defaults.', error)
    return createDefaultState()
  }
}

export function persistAppState(state: PersistedAppState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function clearPersistedState() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}
