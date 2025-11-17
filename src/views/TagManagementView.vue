<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import AppScaffold from '../components/layout/AppScaffold.vue'
import TagChip from '../components/tags/TagChip.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import { useWorkspaceStore } from '../stores/workspace'

const workspace = useWorkspaceStore()
const { allTags } = storeToRefs(workspace)
const tagName = ref('')

function toggleHidden(tagId: string) {
  workspace.toggleTagVisibility(tagId)
}

function deleteTag(tagId: string) {
  if (!confirm('태그를 삭제할까요? 해당 태그가 연결된 테스크에서도 제거됩니다.')) return
  workspace.deleteTag(tagId)
}

function move(tagId: string, offset: number) {
  const ids = allTags.value.map((tag) => tag.id)
  const index = ids.indexOf(tagId)
  const next = index + offset
  if (next < 0 || next >= ids.length) return
  ids.splice(index, 1)
  ids.splice(next, 0, tagId)
  workspace.persistTagOrder(ids)
}

function handleCreateTag() {
  try {
    workspace.createTag(tagName.value)
    tagName.value = ''
  } catch (error) {
    alert((error as Error).message)
  }
}
</script>

<template>
  <AppScaffold title="태그 관리" description="프로젝트 흐름에 맞게 태그를 정렬하고 숨길 수 있어요.">
    <section class="tag-panel card-surface">
      <form class="tag-form" @submit.prevent="handleCreateTag">
        <label>
          새 태그 이름
          <input v-model="tagName" type="text" placeholder="예: 디자인" required />
        </label>
        <button class="btn-primary" type="submit">태그 추가</button>
      </form>

      <div v-if="allTags.length" class="tag-panel__list">
        <article v-for="tag in allTags" :key="tag.id" class="tag-row">
          <TagChip :label="tag.name" :color="tag.color" />
          <div class="tag-row__actions">
            <button type="button" @click="move(tag.id, -1)">▲</button>
            <button type="button" @click="move(tag.id, 1)">▼</button>
            <button type="button" @click="toggleHidden(tag.id)">
              {{ tag.hidden ? '표시' : '숨김' }}
            </button>
            <button type="button" class="danger" @click="deleteTag(tag.id)">삭제</button>
          </div>
        </article>
      </div>
      <EmptyState
        v-else
        title="아직 태그가 없어요"
        message="상단 입력창에서 바로 태그를 추가할 수 있어요."
      />
    </section>
  </AppScaffold>
</template>

<style scoped>
.tag-panel {
  padding: 1.5rem;
  border-radius: 28px;
}

.tag-form {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  margin-bottom: 1.5rem;
}

.tag-form label {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-weight: 600;
}

.tag-form input {
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 0.85rem 1rem;
}

.tag-panel__list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tag-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.tag-row__actions {
  display: inline-flex;
  gap: 0.5rem;
}

.tag-row__actions button {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 0.35rem 0.75rem;
  background: transparent;
  font-weight: 600;
  cursor: pointer;
}

.danger {
  border-color: transparent;
  color: #ff5e62;
}
</style>
