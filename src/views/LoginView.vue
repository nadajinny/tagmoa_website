<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { AuthProvider } from '../types/models'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const name = ref('태그모아 사용자')
const email = ref('user@example.com')
const provider = ref<AuthProvider>(AuthProvider.GOOGLE)
const error = ref('')

function submit() {
  if (!name.value.trim()) {
    error.value = '이름을 입력해주세요.'
    return
  }
  authStore.signIn({
    name: name.value,
    email: email.value,
    provider: provider.value,
  })
  router.push('/')
}

function useDemoAccount() {
  name.value = 'Tagmoa Demo'
  email.value = 'demo@tagmoa.app'
  provider.value = AuthProvider.GUEST
  submit()
}
</script>

<template>
  <section class="login">
    <div class="login__panel card-surface">
      <div class="login__intro">
        <p class="brand-pill">Tagmoa Web</p>
        <h1>태그 중심의 프로젝트 흐름, 웹에서도</h1>
        <p>
          구글, 카카오, 네이버 계정을 통해 Tagmoa를 이용했던 것처럼 웹에서도 동일한 흐름으로
          메인/서브 테스크를 관리해보세요.
        </p>
        <ul>
          <li>태그 → 메인 테스크 → 서브 테스크의 3단 구조</li>
          <li>오늘 마감 작업과 진행률을 한눈에</li>
          <li>알림 시간/온보딩/QnA 등 모바일 경험 그대로</li>
        </ul>
      </div>

      <form class="login__form" @submit.prevent="submit">
        <div class="provider-buttons">
          <button
            type="button"
            :class="{ active: provider === AuthProvider.GOOGLE }"
            @click="provider = AuthProvider.GOOGLE"
          >
            Google
          </button>
          <button
            type="button"
            :class="{ active: provider === AuthProvider.KAKAO }"
            @click="provider = AuthProvider.KAKAO"
          >
            Kakao
          </button>
          <button
            type="button"
            :class="{ active: provider === AuthProvider.NAVER }"
            @click="provider = AuthProvider.NAVER"
          >
            Naver
          </button>
        </div>
        <label>
          이름
          <input v-model="name" type="text" placeholder="이름을 입력하세요" />
        </label>
        <label>
          이메일
          <input v-model="email" type="email" placeholder="이메일 주소" />
        </label>

        <p v-if="error" class="login__error">{{ error }}</p>

        <button class="btn-primary" type="submit">Tagmoa 시작하기</button>
        <button class="login__ghost" type="button" @click="useDemoAccount">
          체험 모드로 살펴보기
        </button>
      </form>
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

.login__form label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.login__form input {
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 0.85rem 1rem;
  font-size: 1rem;
}

.provider-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.provider-buttons button {
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  background-color: #fff;
}

.provider-buttons .active {
  border-color: transparent;
  background-image: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
  color: #fff;
}

.login__ghost {
  border: none;
  background: transparent;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
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
