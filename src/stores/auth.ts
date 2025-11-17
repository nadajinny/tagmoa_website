import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { User } from 'firebase/auth'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
  deleteUser,
  reauthenticateWithPopup,
} from 'firebase/auth'
import type { UserProfile } from '../types/models'
import { AuthProvider } from '../types/models'
import { firebaseAuth } from '../services/firebase'
import { deleteUserData, upsertUserProfile } from '../services/userDatabase'

const readyResolvers: Array<() => void> = []

export const useAuthStore = defineStore('auth', () => {
  const session = ref<UserProfile | null>(null)
  const isReady = ref(false)
  const isAuthenticating = ref(false)
  const authError = ref<string | null>(null)

  onAuthStateChanged(
    firebaseAuth,
    (user) => {
      session.value = mapFirebaseUser(user)
      authError.value = null
      if (session.value) {
        void upsertUserProfile(session.value).catch((error) => {
          console.error('Failed to sync user profile to database', error)
        })
      }
      markReady(isReady)
    },
    (error) => {
      authError.value = error.message
      markReady(isReady)
    },
  )

  const isSignedIn = computed(() => Boolean(session.value))

  async function signInWithGoogle() {
    isAuthenticating.value = true
    authError.value = null
    const provider = createGoogleProvider()
    try {
      await signInWithPopup(firebaseAuth, provider)
    } catch (error) {
      if (getFirebaseErrorCode(error) === 'auth/popup-blocked') {
        await signInWithRedirect(firebaseAuth, provider)
        return
      }
      authError.value = extractAuthError(error)
      throw error
    } finally {
      isAuthenticating.value = false
    }
  }

  async function signOut() {
    await firebaseSignOut(firebaseAuth)
  }

  async function updateProfile(partial: Partial<UserProfile>) {
    const user = firebaseAuth.currentUser
    if (!user || !partial.name) return
    try {
      await firebaseUpdateProfile(user, { displayName: partial.name })
      session.value = mapFirebaseUser(user)
      if (session.value) {
        void upsertUserProfile(session.value).catch((error) => {
          console.error('Failed to update user profile in database', error)
        })
      }
    } catch (error) {
      authError.value = extractAuthError(error)
      throw error
    }
  }

  async function disconnectAccount() {
    const user = firebaseAuth.currentUser
    if (!user) return
    try {
      await reauthenticateWithGoogle(user)
      await deleteUserData(user.uid)
      await deleteUser(user as User)
      session.value = null
    } catch (error) {
      authError.value = extractAuthError(error)
      throw error
    }
  }

  function ensureAuthReady() {
    if (isReady.value) return Promise.resolve()
    return new Promise<void>((resolve) => {
      readyResolvers.push(resolve)
    })
  }

  return {
    session,
    isReady,
    isSignedIn,
    isAuthenticating,
    authError,
    signInWithGoogle,
    signOut,
    updateProfile,
    disconnectAccount,
    ensureAuthReady,
  }
})

function markReady(flag: { value: boolean }) {
  if (flag.value) return
  flag.value = true
  readyResolvers.splice(0).forEach((resolve) => resolve())
}

function mapFirebaseUser(user: User | null): UserProfile | null {
  if (!user) return null
  const createdAt = user.metadata?.creationTime ? Date.parse(user.metadata.creationTime) : Date.now()
  const safeCreatedAt = Number.isFinite(createdAt) ? createdAt : Date.now()
  return {
    id: user.uid,
    name: user.displayName ?? user.email ?? 'Tagmoa User',
    email: user.email ?? undefined,
    provider: AuthProvider.GOOGLE,
    onboardedAt: safeCreatedAt,
    avatarColor: pickAvatarColor(user.displayName ?? user.email ?? user.uid),
  }
}

function extractAuthError(error: unknown): string {
  const code = getFirebaseErrorCode(error)
  if (code) {
    const friendly = firebaseErrorMessages[code]
    if (friendly) return friendly
  }
  if (!error) return '알 수 없는 오류가 발생했습니다.'
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message || '알 수 없는 오류가 발생했습니다.'
  return '알 수 없는 오류가 발생했습니다.'
}

function pickAvatarColor(seed: string): string {
  const palette = ['#5577ff', '#ff7e5f', '#52a79c', '#f76d82', '#3bb2e3']
  const charCode = seed.charCodeAt(0) || 0
  const index = palette.length ? charCode % palette.length : 0
  return palette[index] ?? '#5577ff'
}

async function reauthenticateWithGoogle(user: User) {
  const provider = createGoogleProvider()
  await reauthenticateWithPopup(user, provider)
}

function createGoogleProvider() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return provider
}

function getFirebaseErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null
  if (!('code' in error)) return null
  const code = (error as { code?: unknown }).code
  return typeof code === 'string' ? code : null
}

const firebaseErrorMessages: Record<string, string> = {
  'auth/popup-blocked': '브라우저가 팝업을 차단했어요. 팝업을 허용하거나 다른 브라우저에서 다시 시도해주세요.',
  'auth/popup-closed-by-user': '로그인 팝업이 닫혀 연동 해제를 완료하지 못했어요. 다시 시도해주세요.',
  'auth/requires-recent-login': '보안을 위해 다시 로그인한 뒤 연동 해제를 시도해주세요.',
}
