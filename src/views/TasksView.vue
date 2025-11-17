<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import AppScaffold from '../components/layout/AppScaffold.vue'
import TagChip from '../components/tags/TagChip.vue'
import MainTaskCard from '../components/tasks/MainTaskCard.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import { useWorkspaceStore } from '../stores/workspace'
import type { MainTask } from '../types/models'
import { layoutActionsKey } from '../layouts/layoutActions'

const workspace = useWorkspaceStore()
const { allMainTasks, visibleTags } = storeToRefs(workspace)
const router = useRouter()
const layoutActions = inject(layoutActionsKey, null)

const search = ref('')
const selectedTags = ref<string[]>([])

const showCompleted = computed({
  get: () => workspace.state.preferences.showCompleted,
  set: (value: boolean) => workspace.setShowCompleted(value),
})

const filteredTasks = computed(() => {
  const query = search.value.trim().toLowerCase()
  return allMainTasks.value.filter((task) => {
    const matchesCompleted = showCompleted.value ? true : !task.isCompleted
    const matchesQuery =
      !query ||
      task.title.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query)
    const matchesTags =
      !selectedTags.value.length ||
      selectedTags.value.every((tagId) => task.tagIds.includes(tagId))
    return matchesCompleted && matchesQuery && matchesTags
  })
})

function toggleTag(tagId: string) {
  if (selectedTags.value.includes(tagId)) {
    selectedTags.value = selectedTags.value.filter((id) => id !== tagId)
  } else {
    selectedTags.value = [...selectedTags.value, tagId]
  }
}

function openTask(task: MainTask) {
  router.push({ name: 'task-detail', params: { id: task.id } })
}

function toggleComplete(task: MainTask) {
  workspace.toggleMainCompletion(task.id, !task.isCompleted)
}

function createMainTask() {
  layoutActions?.openMainForm()
}

function createSubTask() {
  layoutActions?.openSubForm()
}
</script>

<template>
  <AppScaffold
    title="메인 테스크"
    description="태그와 검색으로 원하는 프로젝트 흐름을 빠르게 찾아보세요."
  >
    <template #actions>
      <div class="task-actions">
        <button class="btn-primary" type="button" @click="createMainTask">메인 테스크 추가</button>
        <button class="btn-link" type="button" @click="createSubTask">서브 테스크 추가</button>
      </div>
    </template>

    <div class="task-filters card-surface">
      <input v-model="search" type="search" placeholder="제목, 설명으로 검색" />
      <label class="toggle">
        <input v-model="showCompleted" type="checkbox" />
        완료된 테스크 표시
      </label>
      <div class="tags">
        <TagChip
          v-for="tag in visibleTags"
          :key="tag.id"
          :label="tag.name"
          :color="tag.color"
          :selected="selectedTags.includes(tag.id)"
          :clickable="true"
          @click="toggleTag(tag.id)"
        />
        <button class="btn-link" type="button" @click="router.push({ name: 'tags' })">
          태그 관리 →
        </button>
      </div>
    </div>

    <div class="task-list">
      <MainTaskCard
        v-for="task in filteredTasks"
        :key="task.id"
        :task="task"
        :tags="visibleTags.filter((tag) => task.tagIds.includes(tag.id))"
        :subtasks="workspace.getSubTasksForTask(task.id)"
        @open="openTask"
        @toggle-complete="toggleComplete"
      />
      <EmptyState
        v-if="!filteredTasks.length"
        title="조건에 맞는 테스크가 없어요"
        message="검색어나 태그 필터를 조정해보거나 새 테스크를 추가해보세요."
      />
    </div>
  </AppScaffold>
</template>

<style scoped>
.task-filters {
  padding: 1.5rem;
  border-radius: 28px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.task-filters input[type='search'] {
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 0.9rem 1rem;
  font-size: 1rem;
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.task-actions {
  display: inline-flex;
  gap: 0.8rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}
</style>
