<script setup lang="ts">
import { computed, inject, ref } from 'vue'
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
import { layoutActionsKey } from '../layouts/layoutActions'

const workspace = useWorkspaceStore()
const { allMainTasks, allSubTasks } = storeToRefs(workspace)
const layoutActions = inject(layoutActionsKey, null)

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

type CalendarDay = {
  date: Date
  key: string
  isCurrentMonth: boolean
  subtasks: DaySubTask[]
}

type WeekBar = {
  id: string
  start: number
  end: number
  span: number
  row: number
  content: string
  color: string
  bgColor: string
  mainTitle: string
  truncatedStart: boolean
  truncatedEnd: boolean
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
    span.forEach((segment) => {
      const bucket = map[segment.key] ?? (map[segment.key] = [])
      bucket.push({
        id: subTask.id,
        content: subTask.content,
        color,
        bgColor: translucent,
        mainTitle: parent?.title || '메인 테스크 없음',
        position: segment.position,
      })
    })
  })
  Object.values(map).forEach((entries) => {
    entries.sort((a, b) => a.content.localeCompare(b.content, 'ko-KR'))
  })
  return map
})

const calendarDays = computed<CalendarDay[]>(() => {
  const days: CalendarDay[] = []
  const monthStart = startOfMonth(currentDate.value)
  const monthEnd = endOfMonth(currentDate.value)
  const start = startOfWeek(monthStart)
  const end = endOfWeek(monthEnd)
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

const calendarWeeks = computed(() => {
  const weeks = []
  for (let i = 0; i < calendarDays.value.length; i += 7) {
    const chunk = calendarDays.value.slice(i, i + 7)
    const { bars, rowCount } = buildWeekBars(chunk)
    weeks.push({
      id: chunk[0]?.key ?? `week-${i}`,
      days: chunk,
      bars,
      rowCount,
    })
  }
  return weeks
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

function createMainTask() {
  layoutActions?.openMainForm()
}

function createSubTask() {
  layoutActions?.openSubForm()
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

function buildWeekBars(weekDays: CalendarDay[]) {
  const entries = new Map<string, WeekBar>()
  weekDays.forEach((day, index) => {
    day.subtasks.forEach((segment) => {
      const existing = entries.get(segment.id)
      if (!existing) {
        entries.set(segment.id, {
          id: segment.id,
          start: index,
          end: index,
          span: 1,
          row: 0,
          content: segment.content,
          color: segment.color,
          bgColor: segment.bgColor,
          mainTitle: segment.mainTitle,
          truncatedStart: !(segment.position === 'start' || segment.position === 'single'),
          truncatedEnd: !(segment.position === 'end' || segment.position === 'single'),
        })
      } else {
        existing.end = index
        if (segment.position === 'start' || segment.position === 'single') {
          existing.truncatedStart = false
        }
        if (segment.position === 'end' || segment.position === 'single') {
          existing.truncatedEnd = false
        }
      }
    })
  })
  const bars = Array.from(entries.values()).map((bar) => ({
    ...bar,
    span: bar.end - bar.start + 1,
  }))
  bars.sort((a, b) => {
    if (a.start === b.start) return b.span - a.span
    return a.start - b.start
  })
  const rowEnds: number[] = []
  bars.forEach((bar) => {
    let rowIndex = rowEnds.findIndex((end) => end < bar.start)
    if (rowIndex === -1) {
      rowIndex = rowEnds.length
      rowEnds.push(bar.end)
    } else {
      rowEnds[rowIndex] = bar.end
    }
    bar.row = rowIndex
  })
  return { bars, rowCount: rowEnds.length }
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
    <template #actions>
      <div class="calendar-actions">
        <button class="btn-primary" type="button" @click="createMainTask">메인 테스크 추가</button>
        <button class="link" type="button" @click="createSubTask">서브 테스크 추가</button>
      </div>
    </template>
    <section class="calendar card-surface">
      <header class="calendar__header">
        <button type="button" @click="goPrev">‹</button>
        <h2>{{ monthLabel }}</h2>
        <button type="button" @click="goNext">›</button>
      </header>
      <div class="calendar__weekday-row">
        <div class="calendar__weekday" v-for="weekday in ['일','월','화','수','목','금','토']" :key="weekday">
          {{ weekday }}
        </div>
      </div>
      <div class="calendar__weeks">
        <div v-for="week in calendarWeeks" :key="week.id" class="calendar__week">
          <div class="calendar__week-grid" :style="{ '--bar-rows': week.rowCount }">
            <button
              v-for="day in week.days"
              :key="week.id + day.key"
              type="button"
              class="calendar__day"
              :class="{
                'calendar__day--muted': !day.isCurrentMonth,
                'calendar__day--selected': selectedKey === day.key,
              }"
              @click="selectDay(day.key)"
            >
              <div class="calendar__day-content">
                <div class="calendar__day-header">
                  <span>{{ format(day.date, 'd') }}</span>
                </div>
              </div>
            </button>

            <div
              v-for="bar in week.bars"
              :key="bar.id + week.id + bar.row"
              class="calendar__week-bar"
              :data-truncated-start="bar.truncatedStart"
              :data-truncated-end="bar.truncatedEnd"
              :style="{
                gridColumn: `${bar.start + 1} / span ${bar.span}`,
                gridRow: `${bar.row + 2}`,
              }"
            >
              <span class="calendar__subtask-indicator"></span>
              <p>
                {{ bar.content }}
                <small>{{ bar.mainTitle }}</small>
              </p>
            </div>
          </div>
        </div>
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

.calendar__weekday-row {
  --calendar-gap: 0.35rem;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--calendar-gap);
  margin-bottom: 0.5rem;
}

.calendar__weekday {
  text-align: center;
  font-weight: 600;
  color: var(--text-muted);
}

.calendar__weeks {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.calendar__week {
  padding: 0.25rem 0;
}

.calendar__week-grid {
  --calendar-gap: 0.35rem;
  --bar-rows: 0;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  grid-template-rows: auto repeat(var(--bar-rows), auto);
  column-gap: var(--calendar-gap);
  row-gap: 0.25rem;
}

.calendar__day {
  grid-row: 1;
  border: none;
  padding: 0.35rem;
  text-align: left;
  min-height: auto;
  background: transparent;
  cursor: pointer;
  position: relative;
  overflow: visible;
}

.calendar__day-content {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.35rem;
  padding: 0.25rem 0.35rem 0.15rem;
  min-height: inherit;
  height: 100%;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.calendar__day--muted {
  opacity: 0.4;
}

.calendar__day--selected {
  background: transparent;
}

.calendar__day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.calendar__day-header span {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.calendar__day--selected .calendar__day-header span {
  background-color: rgba(84, 118, 255, 0.2);
  color: var(--brand-primary);
  font-weight: 700;
}

.calendar__week-bar {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.95rem 1.1rem;
  border-radius: 18px;
  background-color: #fff;
  border: 1px solid rgba(25, 30, 58, 0.08);
  color: #1b1e31;
  font-size: 0.95rem;
  min-height: 0;
}

.calendar__week-bar[data-truncated-start='true'] {
  border-top-left-radius: 6px;
  border-bottom-left-radius: 6px;
}

.calendar__week-bar[data-truncated-end='true'] {
  border-top-right-radius: 6px;
  border-bottom-right-radius: 6px;
}

.calendar__subtask-indicator {
  width: 6px;
  border-radius: 999px;
  flex-shrink: 0;
  align-self: stretch;
  background-color: #000;
}

.calendar__week-bar p {
  font-size: 1.4rem;
  line-height: 1.45;
  display: flex;
  flex-direction: column;
  word-break: break-word;
}

.calendar__week-bar p small {
  font-size: 0.9rem;
  color: #6f7287;
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

.calendar-actions {
  display: inline-flex;
  gap: 0.8rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}
</style>
