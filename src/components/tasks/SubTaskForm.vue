<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { MainTask, SubTask, SubTaskInput } from '../../types/models'
import { formatDateRange, createTimeInputValue, mergeDateWithTime } from '../../utils/dates'
import DateRangePicker from '../ui/DateRangePicker.vue'

const props = withDefaults(
  defineProps<{
    modelValue?: SubTask | null
    mainTasks: MainTask[]
  }>(),
  {
    modelValue: null,
  },
)

const emit = defineEmits<{
  save: [SubTaskInput]
  cancel: []
}>()

const mainTaskId = ref('')
const content = ref('')
const priority = ref(0)
const startDate = ref<number | null>(null)
const endDate = ref<number | null>(null)
const startTime = ref('')
const endTime = ref('')
const alarmEnabled = ref(false)
const alarmLeadMinutes = ref(0)
const showRangePicker = ref(false)
const rangeButtonRef = ref<HTMLButtonElement | null>(null)

const priorityOptions = [
  { value: 0, label: '기본', description: '보통 우선순위', emoji: '💡' },
  { value: 1, label: '중요', description: '놓치지 말아야 해요', emoji: '🔥' },
  { value: 2, label: '긴급', description: '빠르게 처리 필요', emoji: '🚀' },
  { value: 3, label: '가장 중요', description: '최우선으로 진행', emoji: '⭐️' },
]

watch(
  () => props.mainTasks,
  (tasks: MainTask[]) => {
    if (!mainTaskId.value && tasks.length) {
      mainTaskId.value = tasks[0]?.id ?? ''
      return
    }
    if (mainTaskId.value && !tasks.find((task) => task.id === mainTaskId.value)) {
      mainTaskId.value = tasks[0]?.id ?? ''
    }
  },
  { immediate: true },
)

watch(
  () => props.modelValue,
  (subTask) => {
    if (!subTask) {
      content.value = ''
      priority.value = 0
      startDate.value = null
      endDate.value = null
      startTime.value = ''
      endTime.value = ''
      alarmEnabled.value = false
      alarmLeadMinutes.value = 0
      return
    }
    mainTaskId.value = subTask.mainTaskId
    content.value = subTask.content
    priority.value = subTask.priority
    const inferredStart = subTask.startDate ?? subTask.endDate ?? subTask.dueDate ?? null
    const inferredEnd = subTask.endDate ?? subTask.startDate ?? subTask.dueDate ?? null
    startDate.value = inferredStart
    endDate.value = inferredEnd
    startTime.value = createTimeInputValue(subTask.startDate)
    endTime.value = createTimeInputValue(subTask.endDate)
    alarmEnabled.value = subTask.alarmEnabled
    alarmLeadMinutes.value = subTask.alarmLeadMinutes
  },
  { immediate: true },
)

const hasRange = computed(() => Boolean(startDate.value || endDate.value))
const rangeLabel = computed(() => formatDateRange(startDate.value, endDate.value) || '기간 미정')
const selectedMainTask = computed(() =>
  props.mainTasks.find((task) => task.id === mainTaskId.value),
)

function applyRange(range: { start: number | null; end: number | null }) {
  startDate.value = range.start ?? null
  endDate.value = range.end ?? range.start ?? null
  if (startDate.value && !startTime.value) {
    startTime.value = '09:00'
  }
  if ((endDate.value ?? startDate.value) && !endTime.value) {
    endTime.value = '18:00'
  }
  showRangePicker.value = false
}

function clearRange() {
  startDate.value = null
  endDate.value = null
  startTime.value = ''
  endTime.value = ''
}

function guardTimeInput(event: FocusEvent) {
  if (hasRange.value) return
  event.preventDefault()
  const target = event.target as HTMLInputElement | null
  target?.blur()
  if (typeof window !== 'undefined') {
    window.alert('먼저 기간을 선택해주세요.')
  }
  rangeButtonRef.value?.focus()
  showRangePicker.value = true
}

function submit() {
  if (!mainTaskId.value) return
  const hasDates = Boolean(startDate.value || endDate.value)
  const baseStart = hasDates ? startDate.value ?? endDate.value : null
  const baseEnd = hasDates ? endDate.value ?? startDate.value ?? null : null
  let computedStart = hasDates ? mergeDateWithTime(baseStart, startTime.value || null) : null
  let computedEnd = hasDates ? mergeDateWithTime(baseEnd, endTime.value || null) : null
  if (computedStart && !computedEnd) {
    computedEnd = computedStart
  }
  if (computedStart && computedEnd && computedEnd < computedStart) {
    computedEnd = computedStart
  }
  emit('save', {
    id: props.modelValue?.id,
    mainTaskId: mainTaskId.value,
    content: content.value,
    priority: priority.value,
    startDate: computedStart,
    endDate: computedEnd,
    alarmEnabled: alarmEnabled.value,
    alarmLeadMinutes: alarmLeadMinutes.value,
  })
}
</script>

<template>
  <form class="sub-form" @submit.prevent="submit">
    <label>
      일정
      <input v-model="content" type="text" placeholder="일정을 입력하세요" required />
    </label>

    <section class="sub-form__main-tasks">
      <header>
        <div>
          <p>주요 일정</p>
          <small>
            {{
              selectedMainTask
                ? selectedMainTask.title || '제목 없음'
                : '주요 일정을 선택해주세요.'
            }}
          </small>
        </div>
        <span v-if="!selectedMainTask" class="sub-form__badge">선택 필요</span>
      </header>
      <div class="sub-form__main-task-grid" v-if="mainTasks.length">
        <button
          v-for="task in mainTasks"
          :key="task.id"
          type="button"
          :class="['main-task-chip', { selected: task.id === mainTaskId }]"
          @click="mainTaskId = task.id"
        >
          <span class="color" :style="{ backgroundColor: task.mainColor }" />
          <div>
            <strong>{{ task.title || '제목 없음' }}</strong>
            <p>{{ task.description || '설명 없음' }}</p>
          </div>
        </button>
      </div>
      <p v-else class="sub-form__helper">먼저 주요 일정을 생성하거나 완료를 해제해주세요.</p>
    </section>

    <section class="sub-form__priority">
      <p>우선순위</p>
      <div class="sub-form__priority-grid">
        <button
          v-for="option in priorityOptions"
          :key="option.value"
          type="button"
          :class="['priority-chip', { selected: priority === option.value }]"
          @click="priority = option.value"
        >
          <span class="emoji">{{ option.emoji }}</span>
          <div>
            <strong>{{ option.label }}</strong>
            <small>{{ option.description }}</small>
          </div>
        </button>
      </div>
    </section>

    <section class="sub-form__range">
      <div>
        <p>기간</p>
        <strong>{{ hasRange ? rangeLabel : '기간 미정' }}</strong>
      </div>
      <div class="sub-form__range-actions">
        <button
          type="button"
          class="sub-form__range-btn"
          ref="rangeButtonRef"
          @click="showRangePicker = true"
        >
          캘린더 열기
        </button>
        <button
          v-if="hasRange"
          type="button"
          class="sub-form__range-btn ghost"
          @click="clearRange"
        >
          초기화
        </button>
      </div>
    </section>

    <div class="sub-form__times">
      <label>
        시작 시간
        <input v-model="startTime" type="time" step="300" @focus="guardTimeInput" />
      </label>
      <label>
        종료 시간
        <input v-model="endTime" type="time" step="300" @focus="guardTimeInput" />
      </label>
    </div>

    <label class="sub-form__check">
      <input v-model="alarmEnabled" type="checkbox" />
      <span>알림 사용</span>
      <span class="check-indicator" aria-hidden="true"></span>
    </label>

    <label v-if="alarmEnabled">
      알림 시간(분 단위)
      <input v-model.number="alarmLeadMinutes" type="number" min="0" step="5" />
    </label>

    <footer>
      <button class="btn-primary" type="submit">저장</button>
      <button type="button" class="ghost" @click="emit('cancel')">취소</button>
    </footer>

    <DateRangePicker
      v-model="showRangePicker"
      :start="startDate"
      :end="endDate"
      title="기간 선택"
      @confirm="applyRange"
    />
  </form>
</template>

<style scoped>
.sub-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sub-form label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-weight: 600;
}

.sub-form input,
.sub-form select {
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 0.75rem 0.9rem;
}

.sub-form__main-tasks,
.sub-form__priority {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.sub-form__main-tasks p,
.sub-form__priority p {
  font-size: var(--text-size-base);
  font-weight: 700;
  margin: 0;
}

.sub-form__main-tasks small {
  font-weight: 600;
}

.sub-form__main-tasks header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sub-form__badge {
  border-radius: 999px;
  padding: 0.2rem 0.8rem;
  font-size: 0.75rem;
  background-color: rgba(255, 94, 98, 0.12);
  color: #ff5e62;
}

.sub-form__main-task-grid {
  --main-task-chip-height: 52px;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  max-height: calc(var(--main-task-chip-height) * 3 + 0.6rem * 2);
  overflow-y: auto;
  padding-right: 0.4rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}

.sub-form__main-task-grid::-webkit-scrollbar {
  width: 6px;
}

.sub-form__main-task-grid::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.25);
  border-radius: 99px;
}

.sub-form__main-task-grid::-webkit-scrollbar-track {
  background: transparent;
}

.main-task-chip {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: #fff;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.4rem;
  padding: 0.45rem 0.65rem;
  cursor: pointer;
  align-items: center;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  min-height: var(--main-task-chip-height);
  width: 100%;
  box-sizing: border-box;
}

.main-task-chip div {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  gap: 0.1rem;
  min-width: 0;
}

.main-task-chip .color {
  width: 4px;
  height: 26px;
  border-radius: 999px;
}

.main-task-chip strong {
  display: block;
  width: 100%;
  font-size: 0.95rem;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.main-task-chip p {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-muted);
  width: 100%;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.main-task-chip.selected {
  border-color: var(--brand-primary);
  box-shadow: 0 10px 18px rgba(17, 24, 39, 0.08);
}

.sub-form__priority-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.6rem;
}

.priority-chip {
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 0.65rem 0.9rem;
  background: #fff;
  display: flex;
  gap: 0.75rem;
  align-items: center;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.priority-chip div {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  gap: 0.1rem;
}

.priority-chip.selected {
  border-color: transparent;
  background-image: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
  color: #fff;
}

.priority-chip small {
  display: block;
  color: inherit;
  opacity: 0.8;
}

.sub-form__helper {
  color: var(--text-muted);
  font-size: var(--text-size-caption);
}

.sub-form__range {
  border: 1px dashed rgba(17, 24, 39, 0.12);
  border-radius: 18px;
  padding: 0.9rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.sub-form__range p {
  margin: 0;
}

.sub-form__range strong {
  font-size: var(--text-size-base);
}

.sub-form__range-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.sub-form__range-btn {
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 0.4rem 0.9rem;
  background: #fff;
  font-weight: 600;
  cursor: pointer;
}

.sub-form__times {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.8rem;
}

.sub-form__switch {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.sub-form__check {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
}

.sub-form__check input {
  display: none;
}

.sub-form__check .check-indicator {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border-color);
  border-radius: 4px;
  position: relative;
}

.sub-form__check input:checked + span + .check-indicator {
  border-color: var(--brand-primary);
}

.sub-form__check input:checked + span + .check-indicator::after {
  content: '';
  position: absolute;
  inset: 4px;
  background-image: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
  border-radius: 2px;
}

footer {
  display: flex;
  gap: 0.75rem;
}

.ghost {
  border: none;
  background: transparent;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
}
</style>
function guardTimeInput(event: FocusEvent) {
  if (hasRange.value) return
  event.preventDefault()
  const target = event.target as HTMLInputElement | null
  target?.blur()
  if (typeof window !== 'undefined') {
    window.alert('먼저 기간을 선택해주세요.')
  }
}
