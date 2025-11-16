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
} from 'date-fns'
import AppScaffold from '../components/layout/AppScaffold.vue'
import { useWorkspaceStore } from '../stores/workspace'
import { toDateKey } from '../utils/dates'

const workspace = useWorkspaceStore()
const { allMainTasks } = storeToRefs(workspace)

const currentDate = ref(new Date())
const selectedKey = ref(toDateKey(new Date()))

const monthLabel = computed(() => format(currentDate.value, 'yyyy년 MM월'))

const tasksByDate = computed(() => {
  const map: Record<string, typeof allMainTasks.value> = {}
  allMainTasks.value.forEach((task) => {
    const key = task.dueDate
      ? toDateKey(task.dueDate)
      : task.startDate
        ? toDateKey(task.startDate)
        : toDateKey(new Date())
    if (!map[key]) {
      map[key] = []
    }
    map[key].push(task)
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
      tasks: tasksByDate.value[key] ?? [],
    })
    cursor = addDays(cursor, 1)
  }
  return days
})

const selectedTasks = computed(() => tasksByDate.value[selectedKey.value] ?? [])

function goPrev() {
  currentDate.value = addMonths(currentDate.value, -1)
}

function goNext() {
  currentDate.value = addMonths(currentDate.value, 1)
}

function selectDay(key: string) {
  selectedKey.value = key
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
          <span>{{ format(day.date, 'd') }}</span>
          <div class="calendar__dots">
            <span
              v-for="task in day.tasks.slice(0, 3)"
              :key="task.id"
              class="dot"
              :style="{ backgroundColor: task.mainColor }"
            />
          </div>
        </button>
      </div>
    </section>

    <section class="calendar card-surface">
      <header>
        <h2>{{ selectedTasks.length ? '선택한 날짜의 테스크' : '선택된 날짜에 작업이 없어요' }}</h2>
      </header>
      <ul v-if="selectedTasks.length" class="calendar__tasks">
        <li v-for="task in selectedTasks" :key="task.id">
          <span class="dot" :style="{ backgroundColor: task.mainColor }"></span>
          <div>
            <p class="title">{{ task.title || '제목 없음' }}</p>
            <small>{{ format(task.dueDate ? new Date(task.dueDate) : new Date(), 'MM월 dd일') }}</small>
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
  min-height: 70px;
  background-color: var(--surface-muted);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.calendar__day--muted {
  opacity: 0.4;
}

.calendar__day--selected {
  outline: 2px solid var(--brand-primary);
}

.calendar__dots {
  display: flex;
  gap: 0.2rem;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-flex;
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

.calendar__empty {
  color: var(--text-muted);
}
</style>
