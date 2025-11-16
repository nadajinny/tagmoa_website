<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import AppScaffold from '../components/layout/AppScaffold.vue'
import MainTaskCard from '../components/tasks/MainTaskCard.vue'
import SubTaskItem from '../components/tasks/SubTaskItem.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import { useWorkspaceStore } from '../stores/workspace'
import type { MainTask, SubTask } from '../types/models'

const workspace = useWorkspaceStore()
const { dueTodayMain, dueTodaySub, allMainTasks, visibleTags } = storeToRefs(workspace)
const router = useRouter()

const overviewStats = computed(() => {
  const total = allMainTasks.value.length
  const completed = allMainTasks.value.filter((task) => task.isCompleted).length
  const tags = visibleTags.value.length
  return [
    { label: '전체 테스크', value: total },
    { label: '완료됨', value: completed },
    { label: '태그', value: tags },
  ]
})

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
    <div class="overview">
      <div v-for="stat in overviewStats" :key="stat.label" class="overview__card card-surface">
        <p>{{ stat.label }}</p>
        <strong>{{ stat.value }}</strong>
      </div>
    </div>

    <section class="home-section card-surface">
      <header>
        <div>
          <p class="pill-muted">Due Today</p>
          <h2>오늘 마감 메인 테스크</h2>
        </div>
        <button class="link" type="button" @click="router.push({ name: 'tasks' })">
          전체 보기 →
        </button>
      </header>
      <div class="home-section__list">
        <MainTaskCard
          v-for="task in dueTodayMain"
          :key="task.id"
          :task="task"
          :tags="visibleTags.filter((tag) => task.tagIds.includes(tag.id))"
          :subtasks="workspace.getSubTasksForTask(task.id)"
          @open="openTask"
          @toggle-complete="toggleMain"
        />
        <EmptyState
          v-if="!dueTodayMain.length"
          title="오늘 마감인 메인 테스크가 없어요"
          message="테스크를 추가하거나 다른 날짜의 작업을 확인해주세요."
        />
      </div>
    </section>

    <section class="home-section card-surface">
      <header>
        <div>
          <p class="pill-muted">Sub Tasks</p>
          <h2>오늘 체크할 서브 테스크</h2>
        </div>
      </header>
      <div v-if="dueTodaySub.length" class="sub-list">
        <SubTaskItem v-for="item in dueTodaySub" :key="item.id" :item="item" @toggle="toggleSub" />
      </div>
      <EmptyState
        v-else
        title="오늘 완료할 서브 테스크가 없어요"
        message="서브 테스크를 세분화하면 진행률을 빠르게 높일 수 있어요."
      />
    </section>
  </AppScaffold>
</template>

<style scoped>
.overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
}

.overview__card {
  padding: 1.2rem 1.4rem;
  border-radius: 20px;
}

.overview__card p {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.overview__card strong {
  font-size: 1.9rem;
  font-weight: 700;
  display: block;
  margin-top: 0.45rem;
}

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

.link {
  border: none;
  background: transparent;
  font-weight: 600;
  color: var(--brand-primary);
  cursor: pointer;
}

@media (max-width: 720px) {
  .home-section {
    padding: 1.25rem;
  }
}
</style>
