<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import { storeToRefs } from 'pinia'
import BottomNavigation from '../components/layout/BottomNavigation.vue'
import SidePanel from '../components/ui/SidePanel.vue'
import MainTaskForm from '../components/tasks/MainTaskForm.vue'
import SubTaskForm from '../components/tasks/SubTaskForm.vue'
import { useWorkspaceStore } from '../stores/workspace'
import type { MainTaskInput, SubTaskInput } from '../types/models'
import { layoutActionsKey } from './layoutActions'

const workspace = useWorkspaceStore()
const { visibleTags, allMainTasks } = storeToRefs(workspace)

const activeMainTasks = computed(() => allMainTasks.value.filter((task) => !task.isCompleted))

const showMainForm = ref(false)
const showSubForm = ref(false)
const navCollapsed = ref(false)

const editingMainTask = ref(null)
const editingSubTask = ref(null)

function openMainForm() {
  editingMainTask.value = null
  showMainForm.value = true
}

function openSubForm() {
  editingSubTask.value = null
  showSubForm.value = true
}

function saveMainTask(payload: MainTaskInput) {
  workspace.saveMainTask(payload)
  showMainForm.value = false
}

function saveSubTask(payload: SubTaskInput) {
  workspace.saveSubTask(payload)
  showSubForm.value = false
}

const panelOpen = computed(() => showMainForm.value || showSubForm.value)

const panelTitle = computed(() => {
  if (showMainForm.value) return '주요 일정 추가/수정'
  if (showSubForm.value) return '세부 일정 추가/수정'
  return ''
})

function closePanel() {
  showMainForm.value = false
  showSubForm.value = false
}

provide(layoutActionsKey, {
  openMainForm,
  openSubForm,
})

function toggleNav() {
  navCollapsed.value = !navCollapsed.value
}
</script>

<template>
  <div class="app-layout">
    <div
      class="app-layout__sidebar"
      :class="{ 'app-layout__sidebar--collapsed': navCollapsed }"
    >
      <BottomNavigation :collapsed="navCollapsed" @toggle="toggleNav" />
    </div>

    <div class="app-layout__main">
      <div class="app-layout__content">
        <RouterView />
      </div>

      <SidePanel
        v-if="panelOpen"
        :open="panelOpen"
        :title="panelTitle"
        @close="closePanel"
      >
        <MainTaskForm
          v-if="showMainForm"
          :model-value="editingMainTask"
          :tags="visibleTags"
          @save="saveMainTask"
          @cancel="showMainForm = false"
        />

        <SubTaskForm
          v-else-if="showSubForm"
          :model-value="editingSubTask"
          :main-tasks="activeMainTasks"
          @save="saveSubTask"
          @cancel="showSubForm = false"
        />

        <div v-else class="side-panel__placeholder">
          <p>패널을 닫고 다시 시도해주세요.</p>
        </div>
      </SidePanel>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  padding: 1.5rem 1.5rem 100px;
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.app-layout__sidebar {
  width: 220px;
  flex-shrink: 0;
  position: sticky;
  top: 1.5rem;
  transition: width 0.25s ease;
}

.app-layout__sidebar--collapsed {
  width: 82px;
}

.sidebar-toggle {
  border: none;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 999px;
  width: 44px;
  height: 44px;
  position: absolute;
  top: -8px;
  right: -8px;
  box-shadow: none;
  cursor: pointer;
  font-size: 1.2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.app-layout__main {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 2rem;
}

.app-layout__content {
  flex: 1 1 1120px;
  min-width: 0;
  max-width: 1120px;
  width: 100%;
}

.side-panel__placeholder {
  color: var(--text-muted);
  font-size: var(--text-size-support);
}

@media (max-width: 900px) {
  .app-layout {
    flex-direction: column;
    padding: 1rem 1.25rem 120px;
    align-items: center;
  }

  .app-layout__sidebar {
    width: 100%;
    position: static;
    display: flex;
    justify-content: center;
  }

  .app-layout__sidebar :deep(.side-nav) {
    width: min(100%, 520px);
  }

  .app-layout__main {
    flex-direction: column;
    width: 100%;
  }
}
</style>
