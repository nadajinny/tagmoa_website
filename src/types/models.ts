export type Timestamp = number | null

export enum AuthProvider {
  GOOGLE = 'GOOGLE',
  KAKAO = 'KAKAO',
  NAVER = 'NAVER',
  GUEST = 'GUEST',
}

export interface UserProfile {
  id: string
  name: string
  email?: string
  provider: AuthProvider
  onboardedAt?: number
  avatarColor?: string
}

export interface Tag {
  id: string
  name: string
  hidden: boolean
  order: number
  color: string
  createdAt: number
  updatedAt: number
}

export interface MainTask {
  id: string
  title: string
  description: string
  startDate: Timestamp
  endDate: Timestamp
  dueDate: Timestamp
  manualSchedule: boolean
  isCompleted: boolean
  completedAt: Timestamp
  mainColor: string
  tagIds: string[]
  alarmEnabled: boolean
  createdAt: number
  updatedAt: number
}

export interface SubTask {
  id: string
  mainTaskId: string
  content: string
  priority: number
  startDate: Timestamp
  endDate: Timestamp
  dueDate: Timestamp
  isCompleted: boolean
  completedAt: Timestamp
  alarmEnabled: boolean
  alarmLeadMinutes: number
  createdAt: number
  updatedAt: number
}

export interface AlarmSettings {
  majorEnabled: boolean
  majorTime: string
  subEnabled: boolean
  subTime: string
}

export type HomeDateTheme = 'light' | 'dark'

export interface PreferenceState {
  showCompleted: boolean
  homeDateTheme: HomeDateTheme
  alarm: AlarmSettings
}

export interface PersistedAppState {
  version: number
  tags: Record<string, Tag>
  tasks: Record<string, MainTask>
  subtasks: Record<string, SubTask>
  preferences: PreferenceState
}

export interface MainTaskInput {
  id?: string
  title: string
  description: string
  startDate?: Timestamp
  endDate?: Timestamp
  manualSchedule: boolean
  mainColor: string
  tagIds: string[]
  alarmEnabled: boolean
  isCompleted?: boolean
}

export interface SubTaskInput {
  id?: string
  mainTaskId: string
  content: string
  priority: number
  startDate?: Timestamp
  endDate?: Timestamp
  alarmEnabled: boolean
  alarmLeadMinutes: number
  isCompleted?: boolean
}
