<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import AddMenu from '../components/layout/AddMenu.vue'
import BottomNavigation from '../components/layout/BottomNavigation.vue'
import SidePanel from '../components/ui/SidePanel.vue'
import MainTaskForm from '../components/tasks/MainTaskForm.vue'
import SubTaskForm from '../components/tasks/SubTaskForm.vue'
import { useWorkspaceStore } from '../stores/workspace'
import type { MainTaskInput, SubTaskInput } from '../types/models'

const workspace = useWorkspaceStore()
const { visibleTags, allMainTasks } = storeToRefs(workspace)

const addMenuOpen = ref(false)
const showMainForm = ref(false)
const showSubForm = ref(false)
const showTagForm = ref(false)

const editingMainTask = ref(null)
const editingSubTask = ref(null)
const tagName = ref('')

function openMainForm() {
  editingMainTask.value = null
  showMainForm.value = true
  addMenuOpen.value = false
}

function openSubForm() {
  editingSubTask.value = null
  showSubForm.value = true
  addMenuOpen.value = false
}

function openTagForm() {
  showTagForm.value = true
  addMenuOpen.value = false
}

function saveMainTask(payload: MainTaskInput) {
  workspace.saveMainTask(payload)
  showMainForm.value = false
}

function saveSubTask(payload: SubTaskInput) {
  workspace.saveSubTask(payload)
  showSubForm.value = false
}

function handleCreateTag() {
  if (!tagName.value.trim()) return
  try {
    workspace.createTag(tagName.value)
    tagName.value = ''
    showTagForm.value = false
  } catch (error) {
    alert((error as Error).message)
  }
}

const panelOpen = computed(() => showMainForm.value || showSubForm.value || showTagForm.value)

const panelTitle = computed(() => {
  if (showMainForm.value) return '메인 테스크 추가/수정'
  if (showSubForm.value) return '서브 테스크 추가/수정'
  if (showTagForm.value) return '새 태그 추가'
  return ''
})

function closePanel() {
  showMainForm.value = false
  showSubForm.value = false
  showTagForm.value = false
}
</script>

<template>
  <div class="app-layout">
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
          :main-tasks="allMainTasks"
          @save="saveSubTask"
          @cancel="showSubForm = false"
        />

        <form v-else class="tag-form" @submit.prevent="handleCreateTag">
          <label>
            태그 이름
            <input v-model="tagName" type="text" placeholder="예: 디자인" required />
          </label>
          <button class="btn-primary" type="submit">추가</button>
        </form>
      </SidePanel>
    </div>

    <AddMenu
      :open="addMenuOpen"
      @toggle="addMenuOpen = !addMenuOpen"
      @close="addMenuOpen = false"
      @create-main-task="openMainForm"
      @create-sub-task="openSubForm"
      @create-tag="openTagForm"
    />
    <BottomNavigation />
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  padding-bottom: 120px;
}

.app-layout__main {
  display: flex;
  align-items: flex-start;
  gap: 2rem;
}

.app-layout__content {
  flex: 1;
  min-width: 0;
}

.tag-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tag-form label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-weight: 600;
}

.tag-form input {
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 0.8rem 1rem;
}

@media (max-width: 900px) {
  .app-layout__main {
    flex-direction: column;
  }
}
</style>
