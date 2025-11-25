<script setup lang="ts">
import { computed, onMounted, watchEffect } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import AppScaffold from '../components/layout/AppScaffold.vue'
import MainTaskCard from '../components/tasks/MainTaskCard.vue'
import SubTaskItem from '../components/tasks/SubTaskItem.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import { useWorkspaceStore } from '../stores/workspace'
import { useTodayGoalsStore } from '../stores/todayGoals'
import type { MainTask, SubTask } from '../types/models'
import { formatDate } from '../utils/dates'

const workspace = useWorkspaceStore()
const { dueTodayMain, dueTodaySub, visibleTags, allSubTasks, allMainTasks } = storeToRefs(workspace)
const router = useRouter()
const goalStore = useTodayGoalsStore()
const { goalIds, stats: goalStats, completedIds } = storeToRefs(goalStore)

const priorityIcons = ['💡', '🔥', '🚀', '⭐️'] as const

const mainTaskLookup = computed<Record<string, MainTask>>(() => {
  const map: Record<string, MainTask> = {}
  allMainTasks.value.forEach((task) => {
    map[task.id] = task
  })
  return map
})

const subTaskLookup = computed<Record<string, SubTask>>(() => {
  const map: Record<string, SubTask> = {}
  allSubTasks.value.forEach((task) => {
    map[task.id] = task
  })
  return map
})

onMounted(() => {
  goalStore.refreshToday()
})

watchEffect(() => {
  const ids = [...goalIds.value, ...completedIds.value]
  ids.forEach((id) => {
    if (!subTaskLookup.value[id]) {
      goalStore.removeGoal(id)
    }
  })
})

type TodayGoalView = {
  id: string
  content: string
  priority: number
  parentTitle: string
  parentColor: string
  endLabel: string
  dueLabel: string
}

const todayGoals = computed<TodayGoalView[]>(() =>
  goalIds.value
    .map((id) => {
      const task = subTaskLookup.value[id]
      if (!task) return null
      const parent = mainTaskLookup.value[task.mainTaskId]
      return {
        id,
        content: task.content || '내용 없음',
        priority: task.priority,
        parentTitle: parent?.title ?? '주요 일정 없음',
        parentColor: parent?.mainColor ?? '#dfe6ff',
        endLabel: formatDateLabel(task.endDate),
        dueLabel: formatDateLabel(task.dueDate),
      }
    })
    .filter((goal): goal is TodayGoalView => Boolean(goal)),
)

function openTask(task: MainTask) {
  router.push({ name: 'task-detail', params: { id: task.id } })
}

function toggleMain(task: MainTask) {
  workspace.toggleMainCompletion(task.id, !task.isCompleted)
}

function toggleSub(updated: SubTask) {
  workspace.toggleSubCompletion(updated.id, updated.isCompleted)
}

function completeGoal(goal: TodayGoalView) {
  const task = subTaskLookup.value[goal.id]
  if (!task) {
    goalStore.removeGoal(goal.id)
    return
  }
  if (!task.isCompleted) {
    workspace.toggleSubCompletion(task.id, true)
  }
  goalStore.markGoalCompleted(goal.id)
}

function formatDateLabel(ts: number | null) {
  if (!ts) return ''
  return formatDate(ts, 'MM월 dd일 (EEE)')
}
</script>

<template>
  <AppScaffold title="오늘의 흐름" description="마감이 임박한 작업부터 진행률까지 한눈에 정리했어요.">
    <section class="home-section home-section--goals card-surface">
      <header>
        <div>
          <p class="pill-muted">Focus</p>
          <h2>오늘의 목표</h2>
        </div>
        <div class="home-goal-actions">
          <p v-if="goalStats.total" class="goal-highlight__summary">
            완료 {{ goalStats.completed }} / {{ goalStats.total }}
          </p>
          <button class="btn-link" type="button" @click="router.push({ name: 'today-goals' })">
            목표 편집 →
          </button>
        </div>
      </header>
      <div v-if="todayGoals.length" class="goal-highlight">
        <article v-for="goal in todayGoals" :key="goal.id" class="goal-highlight__item">
          <label class="goal-highlight__checkbox">
            <input type="checkbox" @change="completeGoal(goal)" />
            <span />
          </label>
          <span class="goal-highlight__badge" :style="{ backgroundColor: goal.parentColor }" />
          <div class="goal-highlight__body">
            <p class="goal-highlight__title">
              <span class="goal-highlight__priority">
                {{ priorityIcons[goal.priority] ?? '•' }}
              </span>
              {{ goal.content }}
            </p>
            <small class="goal-highlight__meta">
              {{ goal.parentTitle }}
              <template v-if="goal.endLabel"> · 마감일 {{ goal.endLabel }}</template>
              <template v-if="goal.dueLabel && goal.dueLabel !== goal.endLabel">
                · 기한 {{ goal.dueLabel }}
              </template>
            </small>
          </div>
        </article>
      </div>
      <EmptyState
        v-else
        title="오늘의 목표가 아직 없어요"
        message="세부 일정 리스트에서 드래그해 오늘 집중할 항목을 지정해보세요."
      />
    </section>

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

.home-goal-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.8rem;
}

.goal-highlight__summary {
  font-weight: 700;
  color: var(--text-muted);
}

.goal-highlight {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.goal-highlight__item {
  display: flex;
  gap: 0.9rem;
  align-items: flex-start;
  border-radius: 20px;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(84, 118, 255, 0.2);
  box-shadow: 0 10px 20px rgba(62, 79, 158, 0.12);
}

.goal-highlight__badge {
  width: 10px;
  height: 50px;
  border-radius: 12px;
  flex-shrink: 0;
}

.goal-highlight__checkbox {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid rgba(84, 118, 255, 0.4);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-top: 0.2rem;
}

.goal-highlight__checkbox input {
  display: none;
}

.goal-highlight__checkbox span {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-image: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
  opacity: 0;
  transition: opacity 0.2s ease;
}

.goal-highlight__checkbox input:checked + span {
  opacity: 1;
}

.goal-highlight__body {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.goal-highlight__title {
  font-weight: 700;
  font-size: 1.05rem;
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
}

.goal-highlight__priority {
  font-size: 1.1rem;
}

.goal-highlight__meta {
  color: var(--text-muted);
  font-size: 0.9rem;
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
