<script setup lang="ts">
const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  toggle: []
  close: []
  'create-tag': []
  'create-main-task': []
  'create-sub-task': []
}>()
</script>

<template>
  <div class="fab-menu">
    <Transition name="fade">
      <div v-if="props.open" class="fab-menu__overlay" @click="emit('close')" />
    </Transition>

    <Transition name="slide-up">
      <div v-if="props.open" class="fab-menu__panel card-surface">
        <p class="fab-menu__caption">무엇을 추가할까요?</p>
        <button class="fab-menu__item" type="button" @click="emit('create-main-task')">
          <span class="icon icon--main"></span>
          <div>
            <p class="fab-menu__label">주요 일정</p>
            <small>큰 줄기의 목표와 기간을 설정해요.</small>
          </div>
        </button>
        <button class="fab-menu__item" type="button" @click="emit('create-sub-task')">
          <span class="icon icon--sub"></span>
          <div>
            <p class="fab-menu__label">세부 일정</p>
            <small>세부 실행 단계를 쪼개서 관리하세요.</small>
          </div>
        </button>
        <button class="fab-menu__item" type="button" @click="emit('create-tag')">
          <span class="icon icon--tag"></span>
          <div>
            <p class="fab-menu__label">태그</p>
            <small>업무 흐름을 구분할 새로운 태그</small>
          </div>
        </button>
      </div>
    </Transition>

    <button class="fab-menu__button" type="button" @click="emit('toggle')">
      <span :class="['fab-menu__plus', { 'fab-menu__plus--open': props.open }]"></span>
    </button>
  </div>
</template>

<style scoped>
.fab-menu {
  position: fixed;
  bottom: 5.5rem;
  right: min(2.5rem, 6vw);
  z-index: 40;
}

.fab-menu__button {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: none;
  background-image: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
  color: #fff;
  cursor: pointer;
  box-shadow: 0 18px 35px rgba(15, 77, 150, 0.35);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.fab-menu__button:hover {
  transform: translateY(-2px);
}

.fab-menu__plus {
  position: relative;
  width: 20px;
  height: 2px;
  background-color: #fff;
  display: inline-flex;
  transition: transform 0.25s ease;
}

.fab-menu__plus::after {
  content: '';
  position: absolute;
  width: 2px;
  height: 20px;
  background-color: #fff;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.fab-menu__plus--open {
  transform: rotate(45deg);
}

.fab-menu__overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 9, 33, 0.45);
  backdrop-filter: blur(3px);
  z-index: -1;
}

.fab-menu__panel {
  position: absolute;
  bottom: 80px;
  right: 0;
  width: min(320px, calc(100vw - 2rem));
  padding: 1.5rem;
  border-radius: 24px;
  box-shadow: var(--shadow-elevated);
}

.fab-menu__caption {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: 0.8rem;
}

.fab-menu__item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.85rem 0.5rem;
  border: none;
  border-radius: 16px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  color: inherit;
  transition: background-color 0.2s ease;
}

.fab-menu__item small {
  display: block;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.fab-menu__item:hover {
  background-color: rgba(84, 116, 255, 0.08);
}

.fab-menu__label {
  font-weight: 600;
  color: var(--text-primary);
}

.icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 0.75rem;
}

.icon--main {
  background: linear-gradient(135deg, #6a7bff, #6dc8ff);
}

.icon--sub {
  background: linear-gradient(135deg, #ff9966, #ff5e62);
}

.icon--tag {
  background: linear-gradient(135deg, #34c2a9, #5bd7f4);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@media (max-width: 600px) {
  .fab-menu {
    right: 1.25rem;
  }
}
</style>
