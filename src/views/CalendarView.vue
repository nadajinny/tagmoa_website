<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import {
  addMonths,
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  startOfDay,
} from 'date-fns'
import AppScaffold from '../components/layout/AppScaffold.vue'
import { useWorkspaceStore } from '../stores/workspace'
import { toDateKey } from '../utils/dates'
import type { SubTask } from '../types/models'

const workspace = useWorkspaceStore()
const { allMainTasks, allSubTasks } = storeToRefs(workspace)

const currentDate = ref(new Date())
const selectedKey = ref(toDateKey(new Date()))

const monthLabel = computed(() => format(currentDate.value, 'yyyy년 MM월'))

type RangePosition = 'single' | 'start' | 'middle' | 'end'

type DaySubTask = {
  id: string
  content: string
  color: string
  bgColor: string
  mainTitle: string
  position: RangePosition
}

const mainTaskLookup = computed<Record<string, (typeof allMainTasks.value)[number]>>(() => {
  const map: Record<string, (typeof allMainTasks.value)[number]> = {}
  allMainTasks.value.forEach((task) => {
    map[task.id] = task
  })
  return map
})

const subTasksByDate = computed(() => {
  const map: Record<string, DaySubTask[]> = {}
  allSubTasks.value.forEach((subTask) => {
    const span = buildSpan(subTask)
    if (!span.length) return
    const parent = mainTaskLookup.value[subTask.mainTaskId]
    const color = parent?.mainColor ?? '#5476ff'
    const translucent = toTranslucent(color)
    span.forEach(({ key, position }) => {
      if (!map[key]) {
        map[key] = []
      }
      map[key].push({
        id: subTask.id,
        content: subTask.content,
        color,
        bgColor: translucent,
        mainTitle: parent?.title || '메인 테스크 없음',
        position,
      })
    })
  })
  Object.values(map).forEach((entries) => {
    entries.sort((a, b) => a.content.localeCompare(b.content, 'ko-KR'))
  })
  return map
})

const calendarDays = computed(() => {
  const start = startOfWeek(startOfMonth(currentDate.value))
  const end = endOfWeek(endOfMonth(currentDate.value))
  const days = []
  let cursor = start
  while (cursor <= end) {
    const key = toDateKey(cursor)
    days.push({
      date: new Date(cursor),
      key,
      isCurrentMonth: isSameMonth(cursor, currentDate.value),
      subtasks: subTasksByDate.value[key] ?? [],
    })
    cursor = addDays(cursor, 1)
  }
  return days
})

const selectedSubTasks = computed(() => subTasksByDate.value[selectedKey.value] ?? [])

function goPrev() {
  currentDate.value = addMonths(currentDate.value, -1)
}

function goNext() {
  currentDate.value = addMonths(currentDate.value, 1)
}

function selectDay(key: string) {
  selectedKey.value = key
}

function buildSpan(subTask: SubTask) {
  const segments: { key: string; position: RangePosition }[] = []
  const startTs = subTask.startDate ?? subTask.dueDate ?? subTask.endDate
  const endTs = subTask.endDate ?? subTask.dueDate ?? subTask.startDate ?? startTs
  if (!startTs && !endTs) return segments
  const startDate = startOfDay(new Date(startTs ?? Date.now()))
  const endDate = startOfDay(new Date(endTs ?? startTs ?? Date.now()))
  const [rangeStart, rangeEnd] =
    startDate.getTime() <= endDate.getTime() ? [startDate, endDate] : [endDate, startDate]
  let cursor = new Date(rangeStart)
  const endTime = rangeEnd.getTime()
  while (cursor.getTime() <= endTime) {
    const cursorTime = cursor.getTime()
    let position: RangePosition = 'middle'
    if (rangeStart.getTime() === rangeEnd.getTime()) {
      position = 'single'
    } else if (cursorTime === rangeStart.getTime()) {
      position = 'start'
    } else if (cursorTime === endTime) {
      position = 'end'
    }
    segments.push({ key: toDateKey(cursor), position })
    cursor = addDays(cursor, 1)
  }
  return segments
}

function toTranslucent(hex: string, alpha = 0.18) {
  if (!hex || !hex.startsWith('#')) return hex
  const raw = hex.replace('#', '')
  const normalized =
    raw.length === 3 ? raw.split('').map((char) => char + char) : raw.match(/.{2}/g) ?? []
  if (normalized.length !== 3) return hex
  const [r, g, b] = normalized.map((chunk) => parseInt(chunk, 16))
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
</script>

<template>
  <AppScaffold
    title="캘린더"
    description="월간 흐름에서 테스크 마감일과 진행 중인 작업을 한 번에 확인하세요."
  >
    <section class="calendar card-surface">
      <header class="calendar__header">
        <button type="button" @click="goPrev">‹</button>
        <h2>{{ monthLabel }}</h2>
        <button type="button" @click="goNext">›</button>
      </header>
      <div class="calendar__grid">
        <div class="calendar__weekday" v-for="weekday in ['일','월','화','수','목','금','토']" :key="weekday">
          {{ weekday }}
        </div>
        <button
          v-for="day in calendarDays"
          :key="day.key"
          type="button"
          class="calendar__day"
          :class="{
            'calendar__day--muted': !day.isCurrentMonth,
            'calendar__day--selected': selectedKey === day.key,
          }"
          @click="selectDay(day.key)"
        >
          <div class="calendar__day-header">
            <span>{{ format(day.date, 'd') }}</span>
            <small v-if="day.subtasks.length">{{ day.subtasks.length }}</small>
          </div>
          <ul class="calendar__subtasks" v-if="day.subtasks.length">
            <li
              v-for="subtask in day.subtasks"
              :key="subtask.id + day.key"
              class="calendar__subtask"
              :class="`calendar__subtask--${subtask.position}`"
              :style="{
                '--subtask-color': subtask.color,
                borderColor: subtask.color,
                backgroundColor: subtask.bgColor,
              }"
            >
              <span class="calendar__subtask-indicator" :style="{ backgroundColor: subtask.color }"></span>
              <p>
                {{ subtask.content }}
                <small>{{ subtask.mainTitle }}</small>
              </p>
            </li>
          </ul>
          <p v-else class="calendar__empty-label">-</p>
        </button>
      </div>
    </section>

    <section class="calendar card-surface">
      <header>
        <h2>{{ selectedSubTasks.length ? '선택한 날짜의 서브 테스크' : '선택된 날짜에 작업이 없어요' }}</h2>
      </header>
      <ul v-if="selectedSubTasks.length" class="calendar__tasks">
        <li v-for="task in selectedSubTasks" :key="task.id + '-detail'">
          <span class="dot" :style="{ backgroundColor: task.color }"></span>
          <div>
            <p class="title">{{ task.content || '내용 없음' }}</p>
            <small>{{ task.mainTitle }}</small>
          </div>
        </li>
      </ul>
      <p v-else class="calendar__empty">다른 날을 선택하거나 새 테스크를 추가해보세요.</p>
    </section>
  </AppScaffold>
</template>

<style scoped>
.calendar {
  padding: 1.5rem;
  border-radius: 28px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.calendar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.calendar__header button {
  border: none;
  background: var(--surface-muted);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 1.35rem;
  cursor: pointer;
}

.calendar__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.35rem;
}

.calendar__weekday {
  text-align: center;
  font-weight: 600;
  color: var(--text-muted);
}

.calendar__day {
  border: none;
  border-radius: 16px;
  padding: 0.75rem 0.5rem;
  text-align: left;
  min-height: 110px;
  background-color: var(--surface-muted);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.3rem;
  position: relative;
  overflow: visible;
}

.calendar__day--muted {
  opacity: 0.4;
}

.calendar__day--selected {
  outline: 2px solid var(--brand-primary);
}

.calendar__day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.calendar__day-header small {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.calendar__subtasks {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.calendar__subtask {
  border: none;
  border-radius: 12px;
  padding: 0.35rem 0.45rem;
  display: flex;
  gap: 0.4rem;
  align-items: center;
  position: relative;
  color: var(--text-primary);
  backdrop-filter: brightness(1.05);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02), 0 3px 8px rgba(0, 0, 0, 0.08);
}

.calendar__subtask-indicator {
  width: 4px;
  border-radius: 999px;
  flex-shrink: 0;
  align-self: stretch;
}

.calendar__subtask p {
  font-size: 0.78rem;
  line-height: 1.3;
  display: flex;
  flex-direction: column;
}

.calendar__subtask p small {
  font-size: 0.68rem;
  color: var(--text-muted);
}

.calendar__subtask::before,
.calendar__subtask::after {
  content: '';
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 70%;
  background-color: var(--subtask-color, var(--brand-primary));
  opacity: 0.25;
  z-index: -1;
}

.calendar__subtask--start::after,
.calendar__subtask--middle::after {
  right: -0.4rem;
  width: 0.4rem;
}

.calendar__subtask--end::before,
.calendar__subtask--middle::before {
  left: -0.4rem;
  width: 0.4rem;
}

.calendar__subtask--single::before,
.calendar__subtask--single::after,
.calendar__subtask--start::before,
.calendar__subtask--end::after {
  display: none;
}

.calendar__empty-label {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.75rem;
}

.calendar__tasks {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.calendar__tasks li {
  display: flex;
  gap: 0.8rem;
  align-items: center;
}

.calendar__tasks .title {
  font-weight: 600;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-flex;
}

.calendar__empty {
  color: var(--text-muted);
}
</style>
