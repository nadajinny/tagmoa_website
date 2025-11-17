<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const { session } = storeToRefs(authStore)

const isLoading = computed(() => authStore.isAuthenticating)
const error = computed(() => authStore.authError)

watch(
  session,
  (value) => {
    if (value) {
      router.push({ name: 'home' })
    }
  },
  { immediate: true },
)

async function signInWithGoogle() {
  try {
    await authStore.signInWithGoogle()
  } catch {
    // error message handled via store state
  }
}
</script>

<template>
  <section class="login">
    <div class="login__panel card-surface">
      <div class="login__intro">
        <p class="brand-pill">Tagmoa Web</p>
        <h1>태그 중심의 프로젝트 흐름, 웹에서도</h1>
        <p>
          구글 계정으로 Tagmoa에 로그인하고 주요/세부 일정을 실시간 데이터베이스와 함께 관리하세요.
        </p>
        <ul>
          <li>태그 → 주요 일정 → 세부 일정의 3단 구조</li>
          <li>오늘 마감 작업과 진행률을 한눈에</li>
          <li>알림 시간/온보딩/QnA 등 모바일 경험 그대로</li>
        </ul>
      </div>

      <div class="login__form">
        <button class="btn-primary" type="button" :disabled="isLoading" @click="signInWithGoogle">
          <span v-if="isLoading">Google 로그인 중...</span>
          <span v-else>Google 계정으로 로그인</span>
        </button>
        <p class="login__note">Tagmoa Web은 Google Authentication을 통해서만 로그인할 수 있습니다.</p>
        <p v-if="error" class="login__error">{{ error }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.login__panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  padding: 2.5rem;
  border-radius: 32px;
}

.login__intro h1 {
  margin: 1rem 0;
  font-size: clamp(2rem, 4vw, 3rem);
}

.login__intro ul {
  margin-top: 1rem;
  padding-left: 1.2rem;
  color: var(--text-secondary);
}

.login__intro li + li {
  margin-top: 0.45rem;
}

.login__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.login__note {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.login__error {
  color: #ff5e62;
  font-weight: 600;
}

@media (max-width: 720px) {
  .login {
    padding: 1.5rem;
  }

  .login__panel {
    padding: 1.8rem;
  }
}
</style>
