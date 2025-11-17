<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import ModalSheet from './ModalSheet.vue'
import { formatDateRange } from '../../utils/dates'
import type { Timestamp } from '../../types/models'

interface CalendarCell {
  date: Date
  key: string
  label: number
  isCurrentMonth: boolean
  isToday: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    start?: Timestamp | null
    end?: Timestamp | null
    title?: string
  }>(),
  {
    start: null,
    end: null,
    title: '기간 선택',
  },
)

const emit = defineEmits<{
  'update:modelValue': [boolean]
  confirm: [{ start: Timestamp | null; end: Timestamp | null }]
}>()

const today = startOfDay(new Date())
const monthCursor = ref(startOfMonth(props.start ? new Date(props.start) : new Date()))
const selectionStart = ref<Timestamp | null>(props.start ?? null)
const selectionEnd = ref<Timestamp | null>(props.end ?? null)

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토']

const monthLabel = computed(() => format(monthCursor.value, 'yyyy년 M월'))
const selectionLabel = computed(
  () => formatDateRange(selectionStart.value, selectionEnd.value) || '기간 미정',
)
const canConfirm = computed(() => Boolean(selectionStart.value))

const calendarDays = computed<CalendarCell[]>(() => {
  const days: CalendarCell[] = []
  const monthStart = startOfMonth(monthCursor.value)
  const monthEnd = endOfMonth(monthCursor.value)
  const start = startOfWeek(monthStart)
  const end = endOfWeek(monthEnd)
  let cursor = start
  while (cursor <= end) {
    const normalized = startOfDay(cursor)
    days.push({
      date: normalized,
      key: format(normalized, 'yyyy-MM-dd'),
      label: normalized.getDate(),
      isCurrentMonth: isSameMonth(normalized, monthCursor.value),
      isToday: isSameDay(normalized, today),
    })
    cursor = addDays(cursor, 1)
  }
  return days
})

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      syncFromProps()
    }
  },
)

watch(
  () => [props.start, props.end],
  () => {
    if (!props.modelValue) {
      syncFromProps()
    }
  },
)

function syncFromProps() {
  selectionStart.value = props.start ?? null
  selectionEnd.value = props.end ?? null
  if (selectionStart.value) {
    monthCursor.value = startOfMonth(new Date(selectionStart.value))
  } else {
    monthCursor.value = startOfMonth(new Date())
  }
}

function changeMonth(offset: number) {
  monthCursor.value = addMonths(monthCursor.value, offset)
}

function isRangeStart(date: Date) {
  if (!selectionStart.value) return false
  return isSameDay(date, new Date(selectionStart.value))
}

function isRangeEnd(date: Date) {
  const target = selectionEnd.value ?? selectionStart.value
  if (!target) return false
  return isSameDay(date, new Date(target))
}

function isInRange(date: Date) {
  if (!selectionStart.value || !selectionEnd.value) return false
  const start = new Date(selectionStart.value)
  const end = new Date(selectionEnd.value)
  if (isSameDay(start, end)) return false
  const [rangeStart, rangeEnd] = start < end ? [start, end] : [end, start]
  return isAfter(date, rangeStart) && isBefore(date, rangeEnd)
}

function isSelected(date: Date) {
  return isRangeStart(date) || isRangeEnd(date)
}

function selectDay(date: Date) {
  const ts = startOfDay(date).getTime()
  if (!selectionStart.value || (selectionStart.value && selectionEnd.value)) {
    selectionStart.value = ts
    selectionEnd.value = null
    return
  }
  if (ts === selectionStart.value) {
    selectionStart.value = null
    selectionEnd.value = null
    return
  }
  if (!selectionEnd.value) {
    if (ts < selectionStart.value) {
      selectionEnd.value = selectionStart.value
      selectionStart.value = ts
    } else {
      selectionEnd.value = ts
    }
    return
  }
  selectionStart.value = ts
  selectionEnd.value = null
}

function resetSelection() {
  selectionStart.value = null
  selectionEnd.value = null
}

function close() {
  emit('update:modelValue', false)
}

function confirm() {
  if (!selectionStart.value) return
  const rangeEnd = selectionEnd.value ?? selectionStart.value
  emit('confirm', {
    start: selectionStart.value,
    end: rangeEnd,
  })
  close()
}
</script>

<template>
  <ModalSheet
    :model-value="modelValue"
    :title="props.title"
    width="min(420px, 94vw)"
    @update:modelValue="emit('update:modelValue', $event)"
  >
    <div class="range-picker">
      <div class="range-picker__summary">
        <div>
          <p class="range-picker__summary-label">선택된 기간</p>
          <p class="range-picker__summary-value">{{ selectionLabel }}</p>
        </div>
        <button type="button" class="range-picker__reset" @click="resetSelection">
          초기화
        </button>
      </div>

      <div class="range-picker__header">
        <button type="button" class="range-picker__nav" @click="changeMonth(-1)">‹</button>
        <strong>{{ monthLabel }}</strong>
        <button type="button" class="range-picker__nav" @click="changeMonth(1)">›</button>
      </div>

      <div class="range-picker__weekdays">
        <span v-for="label in weekdayLabels" :key="label">{{ label }}</span>
      </div>

      <div class="range-picker__grid">
        <button
          v-for="day in calendarDays"
          :key="day.key"
          type="button"
          class="range-picker__day"
          :class="{
            'is-outside': !day.isCurrentMonth,
            'is-today': day.isToday,
            'is-selected': isSelected(day.date),
            'is-range-start': isRangeStart(day.date),
            'is-range-end': isRangeEnd(day.date),
            'is-in-range': isInRange(day.date),
          }"
          @click="selectDay(day.date)"
        >
          {{ day.label }}
        </button>
      </div>

      <footer class="range-picker__footer">
        <span />
        <div class="range-picker__actions">
          <button type="button" class="ghost" @click="close">취소</button>
          <button type="button" class="btn-primary" :disabled="!canConfirm" @click="confirm">
            선택 완료
          </button>
        </div>
      </footer>
    </div>
  </ModalSheet>
</template>

<style scoped>
.range-picker {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.range-picker__summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 20px;
  background-color: var(--surface-muted);
}

.range-picker__summary-label {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-bottom: 0.2rem;
}

.range-picker__summary-value {
  font-weight: 600;
}

.range-picker__reset {
  border: none;
  background: transparent;
  font-weight: 600;
  color: var(--brand-primary);
  cursor: pointer;
}

.range-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.range-picker__nav {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background-color: var(--surface-muted);
  cursor: pointer;
  font-size: 1.15rem;
}

.range-picker__weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.range-picker__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.35rem;
}

.range-picker__day {
  position: relative;
  border: none;
  border-radius: 50%;
  width: 42px;
  height: 42px;
  margin: 0 auto;
  background: transparent;
  cursor: pointer;
  font-weight: 600;
  color: var(--text-primary);
  transition: background-color 0.2s ease, color 0.2s ease;
}

.range-picker__day.is-outside {
  color: var(--text-muted);
}

.range-picker__day.is-today {
  outline: 2px solid rgba(85, 119, 255, 0.2);
}

.range-picker__day.is-selected,
.range-picker__day.is-range-start,
.range-picker__day.is-range-end {
  background-image: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
  color: #fff;
}

.range-picker__day.is-in-range {
  background-color: rgba(85, 119, 255, 0.15);
  border-radius: 12px;
}

.range-picker__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.5rem;
}

.range-picker__actions {
  display: flex;
  gap: 0.5rem;
}

.range-picker__actions .btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ghost {
  border: none;
  background: transparent;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
}
</style>
