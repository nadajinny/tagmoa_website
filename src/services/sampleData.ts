import type {
  MainTask,
  PreferenceState,
  SubTask,
  Tag,
} from '../types/models'
import { createId } from '../utils/id'

const palette = ['#5577ff', '#52a79c', '#ff9d6c', '#7d4eff', '#3bb2e3']

const dayMs = 24 * 60 * 60 * 1000

function baseMorning(offset = 0, hour = 9): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.getTime() + offset * dayMs + hour * 60 * 60 * 1000
}

export interface SampleStatePayload {
  tags: Record<string, Tag>
  tasks: Record<string, MainTask>
  subtasks: Record<string, SubTask>
  preferences: PreferenceState
}

export function buildSamplePayload(): SampleStatePayload {
  const initialTags: Tag[] = [
    createTag('디자인'),
    createTag('개발'),
    createTag('회의'),
    createTag('개인'),
  ]
  if (initialTags.length < 4) {
    throw new Error('Seed tags missing')
  }
  const [designTag, devTag, meetingTag, personalTag] = initialTags as [Tag, Tag, Tag, Tag]

  const mainTasks: MainTask[] = [
    createMainTask({
      title: '앱 온보딩 전면 개편',
      description: '신규 유저 유입을 위한 여정 재정의 및 디자인 산출물 도출',
      startDate: baseMorning(0),
      endDate: baseMorning(3, 18),
      dueDate: baseMorning(3, 18),
      manualSchedule: true,
      mainColor: palette[0] ?? '#5577ff',
      tagIds: [designTag.id, devTag.id],
      alarmEnabled: true,
    }),
    createMainTask({
      title: '10월 팀 리더십 미팅 준비',
      description: '어젠다 정리와 지표 공유 자료 업데이트',
      startDate: baseMorning(1),
      endDate: baseMorning(5, 10),
      dueDate: baseMorning(5, 10),
      manualSchedule: true,
      mainColor: palette[2] ?? '#ff9d6c',
      tagIds: [meetingTag.id],
      alarmEnabled: true,
    }),
    createMainTask({
      title: '주간 개인 스터디',
      description: '클린 아키텍처 서적 정독 및 실습 코드 작성',
      startDate: null,
      endDate: null,
      dueDate: baseMorning(7, 21),
      manualSchedule: false,
      mainColor: palette[3] ?? '#7d4eff',
      tagIds: [personalTag.id],
      alarmEnabled: false,
    }),
  ]

  if (mainTasks.length < 3) {
    throw new Error('Seed tasks missing')
  }
  const [onboardingTask, meetingPrepTask, studyTask] = mainTasks as [MainTask, MainTask, MainTask]

  const subtasks: SubTask[] = [
    createSubTask(onboardingTask, '경쟁사 온보딩 스크린샷 수집', 1, baseMorning(0, 11)),
    createSubTask(onboardingTask, '퍼널 단계 정의 및 사양 정리', 2, baseMorning(1, 15)),
    createSubTask(onboardingTask, '프로토타입 작성 & 리뷰', 3, baseMorning(3, 15)),
    createSubTask(meetingPrepTask, '어젠다 사전 설문 돌리기', 0, baseMorning(1, 14)),
    createSubTask(meetingPrepTask, '성과 지표 모음 업데이트', 1, baseMorning(2, 20)),
    createSubTask(studyTask, 'Chapter 04 정리', 0, baseMorning(4, 22)),
    createSubTask(studyTask, '사이드 프로젝트에 적용', 1, baseMorning(6, 10)),
  ]

  const preferenceState: PreferenceState = {
    showCompleted: false,
    homeDateTheme: 'dark',
    alarm: {
      majorEnabled: false,
      majorTime: '08:00',
      subEnabled: false,
      subTime: '13:00',
    },
  }

  return {
    tags: toRecord(initialTags),
    tasks: toRecord(mainTasks),
    subtasks: toRecord(subtasks),
    preferences: preferenceState,
  }
}

function createTag(name: string): Tag {
  const id = createId()
  return {
    id,
    name,
    hidden: false,
    order: Date.now() + Math.random(),
    color: palette[Math.floor(Math.random() * palette.length)] ?? '#5577ff',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

interface MainTaskPayload extends Partial<MainTask> {
  title: string
  description: string
  mainColor: string
  tagIds: string[]
}

function createMainTask(payload: MainTaskPayload): MainTask {
  const id = createId()
  const now = Date.now()
  return {
    id,
    title: payload.title,
    description: payload.description,
    startDate: payload.startDate ?? null,
    endDate: payload.endDate ?? null,
    dueDate: payload.dueDate ?? payload.endDate ?? payload.startDate ?? null,
    manualSchedule: payload.manualSchedule ?? false,
    isCompleted: false,
    completedAt: null,
    mainColor: payload.mainColor,
    tagIds: payload.tagIds,
    alarmEnabled: payload.alarmEnabled ?? true,
    createdAt: now,
    updatedAt: now,
  }
}

function createSubTask(task: MainTask, content: string, priority: number, date: number): SubTask {
  const id = createId()
  return {
    id,
    mainTaskId: task.id,
    content,
    priority,
    startDate: date,
    endDate: date,
    dueDate: date,
    isCompleted: false,
    completedAt: null,
    alarmEnabled: false,
    alarmLeadMinutes: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

function toRecord<T extends { id: string }>(items: T[]): Record<string, T> {
  return items.reduce<Record<string, T>>((acc, item) => {
    acc[item.id] = item
    return acc
  }, {})
}
