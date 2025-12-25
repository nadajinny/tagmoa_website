<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function continueOnWeb() {
  router.replace({ name: 'home' })
}
</script>

<template>
  <section class="auth-finish">
    <div class="auth-finish__panel card-surface">
      <p class="brand-pill">Tagmoa</p>
      <h1>로그인 완료</h1>
      <p class="auth-finish__desc">
        앱으로 이동 중입니다. 앱이 열리지 않으면 버튼을 눌러 계속 진행하세요.
      </p>
      <div class="auth-finish__actions">
        <button class="btn-primary" type="button" @click="continueOnWeb">웹에서 계속하기</button>
        <a class="btn-link" href="/auth/finish">앱 다시 열기</a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.auth-finish {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.auth-finish__panel {
  width: min(640px, 100%);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 2.5rem;
  border-radius: 28px;
}

.auth-finish__desc {
  color: var(--text-secondary);
}

.auth-finish__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

@media (max-width: 720px) {
  .auth-finish {
    padding: 1.5rem;
  }

  .auth-finish__panel {
    padding: 2rem;
  }
}
</style>
