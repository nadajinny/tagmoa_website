<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { MainTask, MainTaskInput, Tag } from '../../types/models'
import { createDateInputValue, parseDateInputValue } from '../../utils/dates'

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
const startDate = ref<string>('')
const endDate = ref<string>('')
const dueDate = ref<string>('')
const alarmEnabled = ref(true)
const tagIds = ref<string[]>([])
const color = ref('#5577ff')

watch(
  () => props.modelValue,
  (task) => {
    if (!task) {
      title.value = ''
      description.value = ''
      manualSchedule.value = false
      startDate.value = ''
      endDate.value = ''
      dueDate.value = ''
      alarmEnabled.value = true
      tagIds.value = []
      color.value = '#5577ff'
      return
    }
    title.value = task.title
    description.value = task.description
    manualSchedule.value = task.manualSchedule
    startDate.value = createDateInputValue(task.startDate)
    endDate.value = createDateInputValue(task.endDate)
    dueDate.value = createDateInputValue(task.dueDate)
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

function submit() {
  if (!title.value.trim()) return
  emit('save', {
    id: props.modelValue?.id,
    title: title.value,
    description: description.value,
    manualSchedule: manualSchedule.value,
    startDate: manualSchedule.value ? parseDateInputValue(startDate.value) : null,
    endDate: manualSchedule.value ? parseDateInputValue(endDate.value) : null,
    dueDate: parseDateInputValue(dueDate.value),
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

    <label class="task-form__switch">
      <input v-model="manualSchedule" type="checkbox" />
      수동으로 기간 지정
    </label>

    <div class="task-form__dates" v-if="manualSchedule">
      <label>
        시작일
        <input v-model="startDate" type="date" />
      </label>
      <label>
        종료일
        <input v-model="endDate" type="date" />
      </label>
    </div>

    <label>
      마감일
      <input v-model="dueDate" type="date" />
    </label>

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

.task-form__dates {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.8rem;
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
