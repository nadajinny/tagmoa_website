<script setup lang="ts">
import { ref, watch } from 'vue'
import type { MainTask, SubTask, SubTaskInput } from '../../types/models'
import { createDateInputValue, parseDateInputValue } from '../../utils/dates'

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
const startDate = ref('')
const endDate = ref('')
const dueDate = ref('')
const alarmEnabled = ref(false)
const alarmLeadMinutes = ref(0)

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
      startDate.value = ''
      endDate.value = ''
      dueDate.value = ''
      alarmEnabled.value = false
      alarmLeadMinutes.value = 0
      return
    }
    mainTaskId.value = subTask.mainTaskId
    content.value = subTask.content
    priority.value = subTask.priority
    startDate.value = createDateInputValue(subTask.startDate)
    endDate.value = createDateInputValue(subTask.endDate)
    dueDate.value = createDateInputValue(subTask.dueDate)
    alarmEnabled.value = subTask.alarmEnabled
    alarmLeadMinutes.value = subTask.alarmLeadMinutes
  },
  { immediate: true },
)

function submit() {
  if (!mainTaskId.value) return
  emit('save', {
    id: props.modelValue?.id,
    mainTaskId: mainTaskId.value,
    content: content.value,
    priority: priority.value,
    startDate: parseDateInputValue(startDate.value),
    endDate: parseDateInputValue(endDate.value),
    dueDate: parseDateInputValue(dueDate.value),
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

    <div class="sub-form__dates">
      <label>
        시작
        <input v-model="startDate" type="date" />
      </label>
      <label>
        종료
        <input v-model="endDate" type="date" />
      </label>
      <label>
        마감
        <input v-model="dueDate" type="date" />
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

.sub-form__dates {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
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
