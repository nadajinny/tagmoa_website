import {
  addDays,
  endOfDay,
  format,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfDay,
} from 'date-fns'
import type { Timestamp } from '../types/models'

const KOREAN_SHORT = 'yyyy.MM.dd (EEE)'
const KOREAN_LONG = 'yyyy년 MM월 dd일'

export function toDate(ts: Timestamp): Date | null {
  if (!ts) return null
  return new Date(ts)
}

export function formatDate(ts: Timestamp, pattern = KOREAN_LONG): string {
  const target = toDate(ts)
  if (!target) return ''
  return format(target, pattern)
}

export function formatDateRange(start: Timestamp, end: Timestamp): string {
  if (!start && !end) return ''
  if (start && end) {
    if (isSameDay(new Date(start), new Date(end))) {
      return format(new Date(start), KOREAN_SHORT)
    }
    return `${format(new Date(start), KOREAN_SHORT)} - ${format(new Date(end), KOREAN_SHORT)}`
  }
  const single = start || end
  return single ? format(new Date(single), KOREAN_SHORT) : ''
}

export function createDateInputValue(ts: Timestamp): string {
  const target = toDate(ts)
  if (!target) return ''
  return format(target, 'yyyy-MM-dd')
}

export function parseDateInputValue(value: string | null | undefined): Timestamp {
  if (!value) return null
  const parsed = parseISO(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime()
}

export function toTodayRange(): { start: number; end: number } {
  const now = new Date()
  return {
    start: startOfDay(now).getTime(),
    end: endOfDay(now).getTime(),
  }
}

export function isDueToday(ts: Timestamp): boolean {
  if (!ts) return false
  const { start, end } = toTodayRange()
  return isWithinInterval(new Date(ts), { start: new Date(start), end: new Date(end) })
}

export function isUpcoming(ts: Timestamp): boolean {
  if (!ts) return false
  const { end } = toTodayRange()
  return ts > end
}

export function isOverdue(ts: Timestamp): boolean {
  if (!ts) return false
  const { start } = toTodayRange()
  return ts < start
}

export function clampIntoDay(ts: Timestamp, base: Timestamp): Timestamp {
  if (!ts || !base) return ts
  const reference = startOfDay(new Date(base))
  const candidate = new Date(ts)
  reference.setHours(candidate.getHours(), candidate.getMinutes(), 0, 0)
  return reference.getTime()
}

export function daysBetween(start: Timestamp, end: Timestamp): number {
  if (!start || !end) return 0
  const startDate = startOfDay(new Date(start))
  const endDate = startOfDay(new Date(end))
  return Math.abs(
    Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
  )
}

export function getWeekDates(anchor: Date = new Date()): Date[] {
  const start = startOfDay(anchor)
  const weekday = start.getDay()
  start.setDate(start.getDate() - weekday)
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

export function formatTime(ts: Timestamp): string {
  const target = toDate(ts)
  if (!target) return ''
  return format(target, 'a hh:mm')
}

export function toDateKey(input: Date | number): string {
  const source = typeof input === 'number' ? new Date(input) : input
  return format(source, 'yyyy-MM-dd')
}
