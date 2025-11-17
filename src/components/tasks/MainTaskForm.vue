<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { MainTask, MainTaskInput, Tag } from '../../types/models'
import { formatDateRange } from '../../utils/dates'
import DateRangePicker from '../ui/DateRangePicker.vue'

const props = withDefaults(
  defineProps<{
    modelValue?: MainTask | null
    tags: Tag[]
  }>(),
  {
    modelValue: null,
  },
)

const emit = defineEmits<{
  save: [MainTaskInput]
  cancel: []
}>()

const title = ref('')
const description = ref('')
const manualSchedule = ref(false)
const startDate = ref<number | null>(null)
const endDate = ref<number | null>(null)
const alarmEnabled = ref(true)
const tagIds = ref<string[]>([])
const color = ref('#5577ff')
const showRangePicker = ref(false)

watch(
  () => props.modelValue,
  (task) => {
    if (!task) {
      title.value = ''
      description.value = ''
      manualSchedule.value = false
      startDate.value = null
      endDate.value = null
      alarmEnabled.value = true
      tagIds.value = []
      color.value = '#5577ff'
      return
    }
    title.value = task.title
    description.value = task.description
    manualSchedule.value = task.manualSchedule
    if (task.manualSchedule) {
      startDate.value = task.startDate ?? null
      endDate.value = task.endDate ?? task.startDate ?? null
    } else {
      startDate.value = null
      endDate.value = null
    }
    alarmEnabled.value = task.alarmEnabled
    tagIds.value = [...task.tagIds]
    color.value = task.mainColor
  },
  { immediate: true },
)

const hasSelectedTag = (id: string) => tagIds.value.includes(id)

function toggleTag(id: string) {
  if (hasSelectedTag(id)) {
    tagIds.value = tagIds.value.filter((tagId) => tagId !== id)
  } else {
    tagIds.value = [...tagIds.value, id]
  }
}

function applyRange(range: { start: number | null; end: number | null }) {
  startDate.value = range.start ?? null
  endDate.value = range.end ?? range.start ?? null
  manualSchedule.value = Boolean(range.start)
  showRangePicker.value = false
}

function clearRange() {
  startDate.value = null
  endDate.value = null
  manualSchedule.value = false
}

const rangeLabel = computed(() => formatDateRange(startDate.value, endDate.value) || '기간 미정')

function submit() {
  const trimmedTitle = title.value.trim()
  if (!trimmedTitle) return
  const hasManualSchedule = manualSchedule.value && Boolean(startDate.value)
  const normalizedStart = hasManualSchedule ? startDate.value : null
  const normalizedEnd = hasManualSchedule ? endDate.value ?? startDate.value ?? null : null
  emit('save', {
    id: props.modelValue?.id,
    title: trimmedTitle,
    description: description.value,
    manualSchedule: hasManualSchedule,
    startDate: normalizedStart,
    endDate: normalizedEnd,
    tagIds: tagIds.value,
    mainColor: color.value,
    alarmEnabled: alarmEnabled.value,
  })
}

const colors = ['#5577ff', '#52a79c', '#ffb347', '#f67599', '#3bb2e3', '#7d4eff']

const tagOptions = computed(() => props.tags.filter((tag) => !tag.hidden))
</script>

<template>
  <form class="task-form" @submit.prevent="submit">
    <label>
      제목
      <input v-model="title" type="text" placeholder="메인 테스크 이름" required />
    </label>

    <label>
      설명
      <textarea v-model="description" placeholder="테스크 설명"></textarea>
    </label>

    <section class="task-form__range">
      <div class="task-form__range-text">
        <p>기간</p>
        <strong>{{ manualSchedule ? rangeLabel : '기간 미정' }}</strong>
        <small>캘린더에서 시작일과 종료일을 선택하세요.</small>
      </div>
      <div class="task-form__range-actions">
        <button type="button" class="task-form__range-btn" @click="showRangePicker = true">
          캘린더 열기
        </button>
        <button
          v-if="manualSchedule"
          type="button"
          class="task-form__range-btn ghost"
          @click="clearRange"
        >
          초기화
        </button>
      </div>
    </section>

    <div class="task-form__colors">
      <p>색상</p>
      <button
        v-for="option in colors"
        :key="option"
        type="button"
        :class="{ selected: color === option }"
        :style="{ backgroundColor: option }"
        @click="color = option"
      />
    </div>

    <div class="task-form__tags">
      <p>태그</p>
      <button
        v-for="tag in tagOptions"
        :key="tag.id"
        type="button"
        :class="{ selected: hasSelectedTag(tag.id) }"
        @click="toggleTag(tag.id)"
      >
        {{ tag.name }}
      </button>
      <p v-if="!tagOptions.length" class="task-form__helper">태그를 먼저 생성해주세요.</p>
    </div>

    <label class="task-form__switch">
      <input v-model="alarmEnabled" type="checkbox" />
      알림 받기
    </label>

    <footer>
      <button class="btn-primary" type="submit">
        {{ modelValue ? '수정 완료' : '추가하기' }}
      </button>
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
.task-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.task-form label {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-weight: 600;
}

.task-form input,
.task-form textarea {
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 0.85rem 1rem;
}

.task-form textarea {
  min-height: 120px;
  resize: vertical;
}

.task-form__switch {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.task-form__range {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border: 1px dashed rgba(17, 24, 39, 0.12);
  border-radius: 20px;
  padding: 1rem;
}

.task-form__range-text p {
  font-weight: 600;
}

.task-form__range-text strong {
  display: block;
  font-size: 1.05rem;
  margin-top: 0.35rem;
}

.task-form__range-text small {
  color: var(--text-muted);
  font-size: 0.85rem;
  display: block;
  margin-top: 0.25rem;
}

.task-form__range-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.task-form__range-btn {
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 0.45rem 1.1rem;
  background: #fff;
  font-weight: 600;
  cursor: pointer;
}

.task-form__colors {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.task-form__colors p {
  width: 100%;
  font-weight: 600;
  margin-bottom: 0.2rem;
}

.task-form__colors button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
}

.task-form__colors button.selected {
  border-color: #000;
}

.task-form__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.task-form__tags p {
  font-weight: 600;
  width: 100%;
}

.task-form__tags button {
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 0.35rem 0.85rem;
  cursor: pointer;
}

.task-form__tags button.selected {
  border-color: transparent;
  background-image: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
  color: #fff;
}

.task-form__helper {
  color: var(--text-muted);
  font-size: 0.85rem;
}

footer {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.ghost {
  border: none;
  background: transparent;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
}
</style>
