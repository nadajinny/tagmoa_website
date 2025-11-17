<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
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
import EmptyState from '../components/ui/EmptyState.vue'
import { useWorkspaceStore } from '../stores/workspace'
import { toDateKey } from '../utils/dates'
import type { SubTask } from '../types/models'
import { layoutActionsKey } from '../layouts/layoutActions'
import { useRouter } from 'vue-router'

const workspace = useWorkspaceStore()
const { allMainTasks, allSubTasks } = storeToRefs(workspace)
const layoutActions = inject(layoutActionsKey, null)
const router = useRouter()

const currentDate = ref(new Date())
const selectedKey = ref(toDateKey(new Date()))
const viewMode = ref<'calendar' | 'timeline'>('calendar')
const timelineListRef = ref<HTMLElement | null>(null)
const timelineEntryRefs = ref<Record<string, HTMLElement>>({})

const monthLabel = computed(() => format(currentDate.value, 'yyyy년 MM월'))

type RangePosition = 'single' | 'start' | 'middle' | 'end'

type DaySubTask = {
  id: string
  content: string
  color: string
  bgColor: string
  mainTitle: string
  mainTaskId: string
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
  mainTaskId: string
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
        mainTaskId: subTask.mainTaskId,
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

const timelineDates = computed(() =>
  calendarDays.value
    .filter((day) => day.isCurrentMonth)
    .map((day) => ({
      key: day.key,
      date: day.date,
      label: format(day.date, 'M월 d일 (EEE)'),
      tasks: subTasksByDate.value[day.key] ?? [],
    })),
)

function goPrev() {
  currentDate.value = addMonths(currentDate.value, -1)
}

function goNext() {
  currentDate.value = addMonths(currentDate.value, 1)
}
function setTimelineEntryRef(key: string, el: Element | ComponentPublicInstance | null) {
  const map = timelineEntryRefs.value
  let element: HTMLElement | null = null
  if (el instanceof HTMLElement) {
    element = el
  } else if (el && '$el' in el) {
    element = (el.$el as HTMLElement) ?? null
  }
  if (element) {
    map[key] = element
  } else {
    delete map[key]
  }
}

function scrollTimelineToKey(key: string, smooth = true) {
  if (!key) return
  const el = timelineEntryRefs.value[key]
  const container = timelineListRef.value
  if (el && container) {
    el.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'start',
    })
  }
}

function selectDay(key: string) {
  if (!key) return
  selectedKey.value = key
  if (viewMode.value === 'timeline') {
    nextTick(() => scrollTimelineToKey(key))
  }
}

function setViewMode(mode: 'calendar' | 'timeline') {
  viewMode.value = mode
}

function createMainTask() {
  layoutActions?.openMainForm()
}

function createSubTask() {
  layoutActions?.openSubForm()
}

function goToTask(taskId?: string) {
  if (!taskId) return
  router.push({ name: 'task-detail', params: { id: taskId } })
}

function handleTimelineScroll() {
  if (viewMode.value !== 'timeline') return
  const container = timelineListRef.value
  if (!container) return
  const containerTop = container.getBoundingClientRect().top
  let activeKey = timelineDates.value[0]?.key ?? ''
  for (const entry of timelineDates.value) {
    const el = timelineEntryRefs.value[entry.key]
    if (!el) continue
    const distance = el.getBoundingClientRect().top - containerTop
    if (distance <= 12) {
      activeKey = entry.key
    } else {
      break
    }
  }
  if (activeKey && activeKey !== selectedKey.value) {
    selectedKey.value = activeKey
  }
}

watch(
  () => timelineListRef.value,
  (el, prev) => {
    prev?.removeEventListener('scroll', handleTimelineScroll)
    el?.addEventListener('scroll', handleTimelineScroll, { passive: true })
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  timelineListRef.value?.removeEventListener('scroll', handleTimelineScroll)
})

watch(
  timelineDates,
  (entries) => {
    if (!entries.length) return
    const firstEntry = entries[0]
    if (firstEntry && !entries.find((entry) => entry.key === selectedKey.value)) {
      selectedKey.value = firstEntry.key
    }
    if (viewMode.value === 'timeline') {
      nextTick(() => scrollTimelineToKey(selectedKey.value, false))
    }
  },
  { immediate: true },
)

watch(viewMode, (mode) => {
  if (mode === 'timeline') {
    nextTick(() => scrollTimelineToKey(selectedKey.value, false))
  }
})

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
          mainTaskId: segment.mainTaskId,
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
        <div class="view-toggle">
          <button
            type="button"
            :class="['view-toggle__button', { 'view-toggle__button--active': viewMode === 'calendar' }]"
            @click="setViewMode('calendar')"
          >
            캘린더
          </button>
          <button
            type="button"
            :class="['view-toggle__button', { 'view-toggle__button--active': viewMode === 'timeline' }]"
            @click="setViewMode('timeline')"
          >
            스크롤
          </button>
        </div>

        <div class="calendar-actions__buttons">
          <button class="btn-primary" type="button" @click="createMainTask">메인 테스크 추가</button>
          <button class="btn-link" type="button" @click="createSubTask">서브 테스크 추가</button>
        </div>
      </div>
    </template>
    <section :class="['calendar card-surface', { 'calendar--timeline': viewMode === 'timeline' }]">
      <div class="calendar__panel">
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
                  'calendar__day--timeline-highlight': viewMode === 'timeline' && selectedKey === day.key,
                }"
                @click="selectDay(day.key)"
              >
                <div class="calendar__day-content">
                  <div class="calendar__day-header">
                    <span>{{ format(day.date, 'd') }}</span>
                  </div>
                </div>
              </button>

              <template v-if="viewMode === 'calendar'">
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
                  role="button"
                  tabindex="0"
                  @click="goToTask(bar.mainTaskId)"
                  @keydown.enter.prevent="goToTask(bar.mainTaskId)"
                >
                  <span class="calendar__subtask-indicator"></span>
                  <p>
                    {{ bar.content }}
                    <small>{{ bar.mainTitle }}</small>
                  </p>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>

      <aside v-if="viewMode === 'timeline'" class="timeline-panel">
        <h3>날짜별 일정</h3>
        <p class="timeline-panel__hint">날짜를 눌러 캘린더에서 강조해보세요.</p>

        <div class="timeline-list" ref="timelineListRef">
          <article
            v-for="entry in timelineDates"
            :key="entry.key"
            :ref="(el) => setTimelineEntryRef(entry.key, el)"
            :class="['timeline-entry', { 'timeline-entry--selected': selectedKey === entry.key }]"
          >
            <button type="button" class="timeline-entry__header" @click="selectDay(entry.key)">
              <span class="timeline-entry__date">{{ entry.label }}</span>
            </button>
            <div v-if="entry.tasks.length" class="timeline-entry__tasks">
              <button
                v-for="task in entry.tasks"
                :key="task.id"
                class="timeline-entry__task"
                type="button"
                @click="goToTask(task.mainTaskId)"
              >
                <span class="timeline-entry__indicator"></span>
                <div>
                  <p class="timeline-entry__task-title">{{ task.content }}</p>
                  <small>{{ task.mainTitle }}</small>
                </div>
              </button>
            </div>
            <p v-else class="timeline-entry__empty">추가된 일정이 없습니다.</p>
          </article>
        </div>
      </aside>
    </section>

    <section class="calendar card-surface">
      <header>
        <h2>{{ selectedSubTasks.length ? '선택한 날짜의 서브 테스크' : '선택된 날짜에 작업이 없어요' }}</h2>
      </header>
      <ul v-if="selectedSubTasks.length" class="calendar__tasks">
        <li
          v-for="task in selectedSubTasks"
          :key="task.id + '-detail'"
          role="button"
          tabindex="0"
          @click="goToTask(task.mainTaskId)"
          @keydown.enter.prevent="goToTask(task.mainTaskId)"
        >
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

.calendar--timeline {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.25fr);
  gap: 1.5rem;
  align-items: flex-start;
}

.calendar__panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.calendar__weekday-row {
  --calendar-gap: 0.35rem;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--calendar-gap);
  margin-bottom: 0.5rem;
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

.calendar__day--timeline-highlight span {
  background-color: rgba(28, 32, 51, 0.14);
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
  font-size: clamp(0.95rem, 0.8vw + 0.55rem, 1.1rem);
  line-height: 1.35;
  display: flex;
  flex-direction: column;
  word-break: break-word;
}

.calendar__week-bar p small {
  font-size: clamp(0.75rem, 0.35vw + 0.5rem, 0.85rem);
  color: #6f7287;
}

.calendar-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
}

.calendar-actions__buttons {
  display: inline-flex;
  gap: 0.75rem;
  align-items: center;
}

.view-toggle {
  display: inline-flex;
  padding: 0.25rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.12);
  gap: 0.25rem;
}

.view-toggle__button {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
}

.view-toggle__button--active {
  background: #fff;
  color: var(--brand-primary);
}

.timeline-panel {
  padding: 1.5rem;
  border-radius: 28px;
  border: 1px solid rgba(25, 30, 58, 0.08);
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 640px;
  overflow: hidden;
  color: #1b1e31;
}

.timeline-panel__hint {
  font-size: 0.85rem;
  color: #6f7287;
}

.timeline-list {
  overflow-y: auto;
  padding-right: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.timeline-entry {
  border-radius: 20px;
  border: 1px solid rgba(25, 30, 58, 0.08);
  padding: 1rem;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.timeline-entry--selected {
  border-color: rgba(63, 124, 255, 0.4);
  box-shadow: 0 8px 22px rgba(25, 30, 58, 0.12);
}

.timeline-entry__header {
  border: 1px solid rgba(25, 30, 58, 0.12);
  background: #f4f5f7;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  color: inherit;
  font-weight: 600;
  cursor: pointer;
  border-radius: 16px;
  padding: 0.65rem 0.9rem;
}

.timeline-entry__header:hover {
  background: #ebedef;
}

.timeline-entry__tasks {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.timeline-entry__task {
  display: flex;
  gap: 0.65rem;
  padding: 0.85rem 1rem;
  border-radius: 16px;
  border: 1px solid rgba(25, 30, 58, 0.08);
  background: #f7f8ff;
  align-items: center;
  width: 100%;
  text-align: left;
  cursor: pointer;
}

.timeline-entry__indicator {
  width: 6px;
  border-radius: 999px;
  align-self: stretch;
  background: #111;
}

.timeline-entry__task-title {
  font-weight: 600;
  margin-bottom: 0.15rem;
  font-size: clamp(1rem, 0.8vw + 0.55rem, 1.3rem);
}

.timeline-entry__tasks small {
  color: #6f7287;
  font-size: clamp(0.85rem, 0.4vw + 0.5rem, 1rem);
}

.timeline-entry__empty {
  font-size: 0.85rem;
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
  cursor: pointer;
}

.calendar__tasks .title {
  font-weight: 600;
  font-size: clamp(1rem, 0.8vw + 0.55rem, 1.3rem);
}

.calendar__tasks small {
  font-size: clamp(0.85rem, 0.4vw + 0.5rem, 1rem);
  color: var(--text-secondary);
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
