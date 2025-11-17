<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import AppScaffold from '../components/layout/AppScaffold.vue'
import TagChip from '../components/tags/TagChip.vue'
import SubTaskItem from '../components/tasks/SubTaskItem.vue'
import ModalSheet from '../components/ui/ModalSheet.vue'
import MainTaskForm from '../components/tasks/MainTaskForm.vue'
import SubTaskForm from '../components/tasks/SubTaskForm.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import { useWorkspaceStore } from '../stores/workspace'
import type { MainTask, MainTaskInput, SubTask, SubTaskInput } from '../types/models'
import { formatDateRange } from '../utils/dates'

const route = useRoute()
const router = useRouter()
const workspace = useWorkspaceStore()
const { visibleTags, allMainTasks } = storeToRefs(workspace)

const taskId = computed(() => route.params.id as string)
const task = computed(() => workspace.getMainTask(taskId.value))
const subtasks = computed(() => workspace.getSubTasksForTask(taskId.value))
const tagItems = computed(() =>
  visibleTags.value.filter((tag) => task.value?.tagIds.includes(tag.id)),
)

const prioritizedMainTasks = computed<MainTask[]>(() => {
  const tasks = [...allMainTasks.value]
  const index = tasks.findIndex((item) => item.id === taskId.value)
  if (index > 0) {
    const [current] = tasks.splice(index, 1)
    if (current) {
      tasks.unshift(current)
    }
  }
  return tasks
})

const showEditMain = ref(false)
const showSubForm = ref(false)
const editingSub = ref<SubTask | null>(null)

function toggleMain() {
  if (!task.value) return
  workspace.toggleMainCompletion(task.value.id, !task.value.isCompleted)
}

function deleteTask() {
  if (!task.value) return
  if (confirm('해당 메인 테스크와 서브 테스크를 모두 삭제할까요?')) {
    workspace.deleteMainTask(task.value.id)
    router.push({ name: 'tasks' })
  }
}

function openSubForm(subTask?: SubTask | null) {
  editingSub.value = subTask ?? null
  showSubForm.value = true
}

function saveMainTask(input: MainTaskInput) {
  workspace.saveMainTask({ ...input, id: taskId.value })
  showEditMain.value = false
}

function saveSubTask(input: SubTaskInput) {
  workspace.saveSubTask({
    ...input,
    mainTaskId: input.mainTaskId ?? taskId.value,
  })
  showSubForm.value = false
}

function toggleSub(subTask: SubTask) {
  workspace.toggleSubCompletion(subTask.id, subTask.isCompleted)
}

function deleteSub(subTask: SubTask) {
  if (!confirm('서브 테스크를 삭제할까요?')) return
  workspace.deleteSubTask(subTask.id)
}
</script>

<template>
  <AppScaffold
    v-if="task"
    :title="task.title || '제목 없는 테스크'"
    :description="task.description"
  >
    <div class="detail card-surface">
      <div class="detail__meta">
        <span class="pill-muted">{{ task.manualSchedule ? '수동 일정' : '마감 기준' }}</span>
        <strong>{{ formatDateRange(task.startDate, task.endDate) || '기간 미정' }}</strong>
      </div>

      <div class="detail__tags">
        <TagChip v-for="tag in tagItems" :key="tag.id" :label="tag.name" :color="tag.color" />
      </div>

      <div class="detail__actions">
        <button class="btn-primary" type="button" @click="showEditMain = true">정보 수정</button>
        <button type="button" class="ghost" @click="openSubForm()">서브 테스크 추가</button>
        <button type="button" class="ghost" @click="toggleMain">
          {{ task.isCompleted ? '완료 해제' : '완료 처리' }}
        </button>
        <button type="button" class="danger" @click="deleteTask">삭제</button>
      </div>
    </div>

    <section class="subtasks card-surface">
      <header>
        <h2>서브 테스크</h2>
        <button class="btn-link" type="button" @click="openSubForm()">+ 추가</button>
      </header>
      <div v-if="subtasks.length">
        <SubTaskItem
          v-for="item in subtasks"
          :key="item.id"
          :item="item"
          @toggle="toggleSub"
          @edit="openSubForm"
          @delete="deleteSub"
        />
      </div>
      <EmptyState
        v-else
        title="아직 서브 테스크가 없어요"
        message="작업을 더 작은 단위로 나누어 진행률을 관리하세요."
      />
    </section>
  </AppScaffold>
  <EmptyState
    v-else
    title="존재하지 않는 테스크입니다."
    message="목록으로 돌아가 다시 시도해주세요."
  />

  <ModalSheet v-model="showEditMain" title="메인 테스크 수정">
    <MainTaskForm
      :model-value="task"
      :tags="visibleTags"
      @save="saveMainTask"
      @cancel="showEditMain = false"
    />
  </ModalSheet>

  <ModalSheet v-model="showSubForm" title="서브 테스크 추가/수정">
    <SubTaskForm
      :model-value="editingSub"
      :main-tasks="prioritizedMainTasks"
      @save="saveSubTask"
      @cancel="showSubForm = false"
    />
  </ModalSheet>
</template>

<style scoped>
.detail {
  padding: 1.8rem;
  border-radius: 28px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail__meta strong {
  font-size: 1.6rem;
  display: block;
  margin-top: 0.35rem;
}

.detail__tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.detail__actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.detail__actions .ghost,
.detail__actions .danger {
  border: none;
  background: transparent;
  font-weight: 600;
  cursor: pointer;
}

.detail__actions .danger {
  color: #ff5e62;
}

.subtasks {
  padding: 1.5rem;
  border-radius: 28px;
}

.subtasks header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
</style>
