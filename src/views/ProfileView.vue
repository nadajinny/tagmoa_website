<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import AppScaffold from '../components/layout/AppScaffold.vue'
import { useAuthStore } from '../stores/auth'
import { useWorkspaceStore } from '../stores/workspace'
import type { AlarmSettings } from '../types/models'

const auth = useAuthStore()
const workspace = useWorkspaceStore()
const { session } = storeToRefs(auth)

const name = ref(session.value?.name ?? '')
const email = ref(session.value?.email ?? '')

watch(
  session,
  (value) => {
    name.value = value?.name ?? ''
    email.value = value?.email ?? ''
  },
  { immediate: true },
)

const alarm = computed(() => workspace.state.preferences.alarm)

const onboardingSteps = [
  { title: '태그 생성', desc: '업무 흐름별 태그를 만들어 전체 그림을 잡아요.' },
  { title: '주요 일정 작성', desc: '큰 줄기의 목표를 주요 일정으로 정리합니다.' },
  { title: '세부 일정 분해', desc: '실행 단위의 세부 일정으로 세부 계획을 만듭니다.' },
]

function saveProfile() {
  auth.updateProfile({
    name: name.value,
    email: email.value,
  })
}

function signOut() {
  auth.signOut()
  window.location.href = '/login'
}

function updateAlarm(partial: Partial<AlarmSettings>) {
  workspace.updateAlarmSettings(partial)
}

function contactSupport() {
  window.location.href = 'mailto:nadajinny@gmail.com?subject=Tagmoa%20Web%20문의'
}
</script>

<template>
  <AppScaffold title="프로필" description="계정 정보와 알림, 온보딩 가이드를 확인하세요.">
    <section class="profile card-surface">
      <header>
        <div class="avatar">{{ name.slice(0, 1) || 'T' }}</div>
        <div>
          <h2>{{ name || '이름 정보 없음' }}</h2>
          <p>{{ email || '이메일 정보 없음' }}</p>
        </div>
      </header>
      <div class="profile__form">
        <label>
          이름
          <input v-model="name" type="text" placeholder="이름" />
        </label>
        <label>
          이메일
          <input v-model="email" type="email" placeholder="이메일" />
        </label>
      </div>
      <button class="btn-primary" type="button" @click="saveProfile">정보 저장</button>
    </section>

    <section class="settings card-surface">
      <h3>알림 설정</h3>
      <div class="settings__row">
        <label>
          <input type="checkbox" :checked="alarm.majorEnabled" @change="updateAlarm({ majorEnabled: !alarm.majorEnabled })" />
          주요 일정 알림
        </label>
        <input
          type="time"
          :disabled="!alarm.majorEnabled"
          :value="alarm.majorTime"
          @change="updateAlarm({ majorTime: ($event.target as HTMLInputElement).value })"
        />
      </div>
      <div class="settings__row">
        <label>
          <input type="checkbox" :checked="alarm.subEnabled" @change="updateAlarm({ subEnabled: !alarm.subEnabled })" />
          세부 일정 알림
        </label>
        <input
          type="time"
          :disabled="!alarm.subEnabled"
          :value="alarm.subTime"
          @change="updateAlarm({ subTime: ($event.target as HTMLInputElement).value })"
        />
      </div>
      <p class="settings__hint">웹에서는 알람 권한을 요청하지 않고 시간 설정만 저장합니다.</p>
    </section>

    <section class="guide card-surface">
      <h3>온보딩 다시 보기</h3>
      <ul>
        <li v-for="step in onboardingSteps" :key="step.title">
          <strong>{{ step.title }}</strong>
          <p>{{ step.desc }}</p>
        </li>
      </ul>
    </section>

    <section class="support card-surface">
      <h3>지원 & 계정</h3>
      <div class="support__actions">
        <button type="button" @click="contactSupport">문의 메일 보내기</button>
        <button type="button" @click="signOut">로그아웃</button>
      </div>
    </section>
  </AppScaffold>
</template>

<style scoped>
.profile {
  padding: 1.5rem;
  border-radius: 28px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.profile header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-image: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
  color: #fff;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile__form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.profile__form label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-weight: 600;
}

.profile__form input {
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 0.75rem 0.9rem;
}

.settings,
.guide,
.support {
  padding: 1.5rem;
  border-radius: 28px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.settings__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.settings__row input[type='time'] {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 0.35rem 0.75rem;
}

.settings__hint {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.guide ul {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.support__actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.support__actions button {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 0.65rem 1rem;
  background: transparent;
  font-weight: 600;
  cursor: pointer;
}
</style>
