import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { AuthProvider, UserProfile } from '../types/models'
import { createId } from '../utils/id'

const AUTH_STORAGE_KEY = 'tagmoa-web-auth'

function loadSession(): UserProfile | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as UserProfile
  } catch {
    return null
  }
}

function persistSession(session: UserProfile | null) {
  if (typeof window === 'undefined') return
  if (!session) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    return
  }
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
}

export const useAuthStore = defineStore('auth', () => {
  const session = ref<UserProfile | null>(loadSession())

  watch(
    session,
    (value) => {
      persistSession(value)
    },
    { deep: true },
  )

  const isSignedIn = computed(() => Boolean(session.value))

  function signIn(payload: { name: string; email?: string; provider: AuthProvider }) {
    session.value = {
      id: createId(),
      name: payload.name,
      email: payload.email,
      provider: payload.provider,
      onboardedAt: Date.now(),
      avatarColor: pickAvatarColor(payload.name),
    }
  }

  function signOut() {
    session.value = null
  }

  function updateProfile(partial: Partial<UserProfile>) {
    if (!session.value) return
    session.value = { ...session.value, ...partial }
  }

  return {
    session,
    isSignedIn,
    signIn,
    signOut,
    updateProfile,
  }
})

function pickAvatarColor(seed: string): string {
  const palette = ['#5577ff', '#ff7e5f', '#52a79c', '#f76d82', '#3bb2e3']
  const charCode = seed.charCodeAt(0) || 0
  const index = palette.length ? charCode % palette.length : 0
  return palette[index] ?? '#5577ff'
}
