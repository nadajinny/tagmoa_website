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

watch(
  () => props.mainTasks,
  (tasks: MainTask[]) => {
    if (!mainTaskId.value && tasks.length) {
      const firstTask = tasks[0]
      if (firstTask) {
        mainTaskId.value = firstTask.id
      }
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
      메인 테스크
      <select v-model="mainTaskId">
        <option v-for="task in mainTasks" :key="task.id" :value="task.id">
          {{ task.title || '제목 없음' }}
        </option>
      </select>
    </label>

    <label>
      내용
      <input v-model="content" type="text" placeholder="할 일을 입력하세요" required />
    </label>

    <label>
      우선순위
      <select v-model.number="priority">
        <option :value="0">기본</option>
        <option :value="1">중요</option>
        <option :value="2">긴급</option>
        <option :value="3">가장 중요</option>
      </select>
    </label>

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

    <label class="sub-form__switch">
      <input v-model="alarmEnabled" type="checkbox" />
      알림 사용
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
  font-size: 1rem;
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
