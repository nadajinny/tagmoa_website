import { getDatabase, ref as dbRef, remove, serverTimestamp, update } from 'firebase/database'
import type { UserProfile } from '../types/models'
import { firebaseApp } from './firebase'

const database = getDatabase(firebaseApp)
const USERS_ROOT = 'users'

export function userRootRef(uid: string) {
  return dbRef(database, `${USERS_ROOT}/${uid}`)
}

export function userTagsRef(uid: string) {
  return dbRef(database, `${USERS_ROOT}/${uid}/tags`)
}

export function userMainTasksRef(uid: string) {
  return dbRef(database, `${USERS_ROOT}/${uid}/mainTasks`)
}

export function userSubTasksRef(uid: string) {
  return dbRef(database, `${USERS_ROOT}/${uid}/subTasks`)
}

export function userPreferencesRef(uid: string) {
  return dbRef(database, `${USERS_ROOT}/${uid}/preferences`)
}

export function userVersionRef(uid: string) {
  return dbRef(database, `${USERS_ROOT}/${uid}/version`)
}

export function userTodayGoalsRef(uid: string) {
  return dbRef(database, `${USERS_ROOT}/${uid}/todayGoals`)
}

export function userProfileRef(uid: string) {
  return dbRef(database, `${USERS_ROOT}/${uid}/profile`)
}

export async function upsertUserProfile(profile: UserProfile) {
  const payload = {
    uid: profile.id,
    displayName: profile.name,
    email: profile.email ?? '',
    provider: profile.provider,
    lastLoginAt: serverTimestamp(),
  }
  await update(userProfileRef(profile.id), payload)
}

export function deleteUserData(uid: string) {
  return remove(userRootRef(uid))
}
