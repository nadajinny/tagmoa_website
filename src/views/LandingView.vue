<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goToLogin() {
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="landing">
    <header class="landing__hero">
      <div class="landing__hero-text">
        <p class="brand-pill">Tagmoa Web</p>
        <h1>태그모아로 프로젝트 흐름을 한눈에</h1>
        <p class="landing__lead">
          태그 → 주요 일정 → 세부 일정의 3단 구조와 실시간 동기화로 분산된 업무를 한 번에
          정리하세요. 언제든 브라우저에서 이어서 확인할 수 있습니다.
        </p>
        <div class="landing__cta">
          <button class="btn-primary" type="button" @click="goToLogin">Google 계정으로 시작하기</button>
          <a class="btn-link" href="#features">기능 둘러보기</a>
        </div>
      </div>
      <div class="landing__hero-visual card-surface">
        <img src="/tagmoa-og.png" alt="Tagmoa 대표 이미지" />
      </div>
    </header>

    <section id="features" class="landing__section">
      <h2>왜 Tagmoa Web인가요?</h2>
      <p class="landing__section-desc">
        모바일에서 쓰던 흐름 그대로, 웹에서는 더 넓게 정리해 보세요. 실시간 데이터베이스와
        연동되어 어디서든 동일한 작업 공간을 제공합니다.
      </p>
      <div class="landing__feature-grid">
        <article class="landing__feature card-surface">
          <h3>3단 프로젝트 구조</h3>
          <p>태그-주요 일정-세부 일정으로 업무를 분해해 진행률을 명확히 파악할 수 있어요.</p>
        </article>
        <article class="landing__feature card-surface">
          <h3>오늘의 흐름 보드</h3>
          <p>마감이 임박한 작업과 체크리스트를 홈 화면에서 한 번에 확인할 수 있습니다.</p>
        </article>
        <article class="landing__feature card-surface">
          <h3>캘린더 & 타임라인</h3>
          <p>주요 일정과 세부 일정을 달력/타임라인으로 전환해 계획과 리마인드를 동시에 잡으세요.</p>
        </article>
        <article class="landing__feature card-surface">
          <h3>실시간 동기화</h3>
          <p>Firebase 기반으로 모바일과 웹이 실시간으로 동기화되어 팀과도 안정적으로 공유됩니다.</p>
        </article>
      </div>
    </section>

    <section class="landing__section landing__steps card-surface">
      <h2>지금 바로 시작해 보세요</h2>
      <ol>
        <li>
          <span>01</span>
          <p>Google 계정으로 로그인</p>
        </li>
        <li>
          <span>02</span>
          <p>태그와 주요 일정을 구성</p>
        </li>
        <li>
          <span>03</span>
          <p>세부 일정으로 당일 우선순위를 관리</p>
        </li>
      </ol>
      <button class="btn-primary" type="button" @click="goToLogin">Tagmoa 로그인</button>
    </section>

    <footer class="landing__footer">
      <p>© {{ new Date().getFullYear() }} Tagmoa. All rights reserved.</p>
    </footer>
  </div>
</template>

<style scoped>
.landing {
  min-height: 100vh;
  padding: 3rem clamp(1.25rem, 4vw, 4rem) 4rem;
  background: radial-gradient(circle at top, rgba(255, 255, 255, 0.95), #f4f5fb);
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  gap: 4rem;
}

.landing__hero {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2.5rem;
  align-items: center;
}

.landing__hero-text h1 {
  margin: 1rem 0;
  font-size: clamp(2.3rem, 4vw, 3.5rem);
  line-height: 1.2;
}

.landing__lead {
  color: var(--text-secondary);
  font-size: 1.1rem;
  line-height: 1.7;
}

.landing__cta {
  margin-top: 2rem;
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.landing__hero-visual {
  padding: 1.5rem;
  border-radius: 32px;
}

.landing__hero-visual img {
  width: 100%;
  border-radius: 28px;
}

.landing__section {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.landing__section h2 {
  font-size: clamp(1.8rem, 3vw, 2.6rem);
}

.landing__section-desc {
  color: var(--text-secondary);
  max-width: 720px;
  margin: 0 auto;
}

.landing__feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.25rem;
}

.landing__feature {
  padding: 1.5rem;
  border-radius: 28px;
  text-align: left;
}

.landing__feature h3 {
  margin-bottom: 0.75rem;
  font-size: 1.25rem;
}

.landing__feature p {
  color: var(--text-secondary);
}

.landing__steps {
  padding: 2.5rem;
  border-radius: 36px;
}

.landing__steps ol {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  flex-wrap: wrap;
  counter-reset: step;
}

.landing__steps li {
  list-style: none;
  background: var(--surface-muted);
  border-radius: 24px;
  padding: 1rem 1.5rem;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  align-items: center;
}

.landing__steps span {
  font-weight: 700;
  color: var(--brand-primary);
  font-size: 1.4rem;
}

.landing__footer {
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

@media (max-width: 640px) {
  .landing {
    padding: 2.5rem 1rem 3rem;
  }

  .landing__hero {
    text-align: center;
  }

  .landing__hero-text {
    order: 2;
  }

  .landing__hero-visual {
    order: 1;
  }

  .landing__cta {
    justify-content: center;
  }
}
</style>
