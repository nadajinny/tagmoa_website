<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import AppScaffold from '../components/layout/AppScaffold.vue'
import MainTaskCard from '../components/tasks/MainTaskCard.vue'
import SubTaskItem from '../components/tasks/SubTaskItem.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import { useWorkspaceStore } from '../stores/workspace'
import type { MainTask, SubTask } from '../types/models'

const workspace = useWorkspaceStore()
const { dueTodayMain, dueTodaySub, visibleTags } = storeToRefs(workspace)
const router = useRouter()

function openTask(task: MainTask) {
  router.push({ name: 'task-detail', params: { id: task.id } })
}

function toggleMain(task: MainTask) {
  workspace.toggleMainCompletion(task.id, !task.isCompleted)
}

function toggleSub(updated: SubTask) {
  workspace.toggleSubCompletion(updated.id, updated.isCompleted)
}
</script>

<template>
  <AppScaffold title="오늘의 흐름" description="마감이 임박한 작업부터 진행률까지 한눈에 정리했어요.">
    <section class="home-section card-surface">
      <header>
        <div>
          <p class="pill-muted">Due Today</p>
          <h2>오늘 마감 주요 일정</h2>
        </div>
        <button class="btn-link" type="button" @click="router.push({ name: 'tasks' })">
          전체 보기 →
        </button>
      </header>
      <div class="home-section__list">
        <MainTaskCard
          v-for="task in dueTodayMain"
          :key="task.id"
          :task="task"
          :tags="visibleTags.filter((tag) => (task.tagIds ?? []).includes(tag.id))"
          :subtasks="workspace.getSubTasksForTask(task.id)"
          @open="openTask"
          @toggle-complete="toggleMain"
        />
        <EmptyState
          v-if="!dueTodayMain.length"
          title="오늘 마감인 주요 일정이 없어요"
          message="일정을 추가하거나 다른 날짜의 작업을 확인해주세요."
        />
      </div>
    </section>

    <section class="home-section card-surface">
      <header>
        <div>
          <p class="pill-muted">Sub Tasks</p>
          <h2>오늘 체크할 세부 일정</h2>
        </div>
      </header>
      <div v-if="dueTodaySub.length" class="sub-list">
        <SubTaskItem v-for="item in dueTodaySub" :key="item.id" :item="item" @toggle="toggleSub" />
      </div>
      <EmptyState
        v-else
        title="오늘 완료할 세부 일정이 없어요"
        message="세부 일정을 세분화하면 진행률을 빠르게 높일 수 있어요."
      />
    </section>
  </AppScaffold>
</template>

<style scoped>
.home-section {
  padding: 1.75rem;
  border-radius: 32px;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.home-section header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.home-section__list {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.sub-list {
  display: flex;
  flex-direction: column;
}

@media (max-width: 720px) {
  .home-section {
    padding: 1.25rem;
  }
}
</style>
