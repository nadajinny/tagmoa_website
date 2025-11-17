<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { CalendarDays, Home, ListTodo, UserRound } from 'lucide-vue-next'

interface NavItem {
  name: string
  label: string
  to: string
  icon: any
}

const props = withDefaults(
  defineProps<{
    collapsed?: boolean
  }>(),
  {
    collapsed: false,
  },
)

const emit = defineEmits<{
  toggle: []
}>()

const items: NavItem[] = [
  { name: 'home', label: '홈', to: '/', icon: Home },
  { name: 'tasks', label: '태스크', to: '/tasks', icon: ListTodo },
  { name: 'calendar', label: '캘린더', to: '/calendar', icon: CalendarDays },
  { name: 'profile', label: '프로필', to: '/profile', icon: UserRound },
]

const route = useRoute()

const activeName = computed(() => (route.name as string) ?? 'home')

</script>

<template>
  <nav
    class="side-nav card-surface"
    :class="{ 'side-nav--collapsed': props.collapsed }"
  >
    <div class="side-nav__header" v-if="!props.collapsed">
      <p class="side-nav__title">탐모아</p>
      <button class="side-nav__toggle" type="button" @click="emit('toggle')">
        <span class="bar"></span>
        <span class="bar"></span>
        <span class="bar"></span>
      </button>
    </div>
    <button
      v-else
      class="side-nav__toggle"
      type="button"
      @click="emit('toggle')"
      aria-label="사이드바 확장"
    >
      <span class="bar"></span>
      <span class="bar"></span>
      <span class="bar"></span>
    </button>
    <RouterLink
      v-for="item in items"
      :key="item.name"
      :to="item.to"
      class="side-nav__item"
      :class="{ 'side-nav__item--active': activeName === item.name }"
    >
      <component
        :is="item.icon"
        class="side-nav__icon"
        :class="{ 'side-nav__icon--active': activeName === item.name }"
        size="22"
        stroke-width="1.7"
      />
      <span v-if="!props.collapsed" class="side-nav__label">{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.side-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.5rem 1.25rem;
  border-radius: 28px;
  box-shadow: var(--shadow-soft);
  background-color: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(12px);
  transition: width 0.2s ease, padding 0.2s ease;
}

.side-nav--collapsed {
  align-items: center;
  padding: 1rem 0.75rem;
}

.side-nav__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
}

.side-nav--collapsed .side-nav__header {
  flex-direction: column;
  justify-content: center;
}

.side-nav__title {
  font-weight: 700;
  font-size: 1.15rem;
  color: var(--text-primary);
}

.side-nav__item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.6rem;
  border-radius: 16px;
  color: var(--text-muted);
  font-weight: 600;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.side-nav--collapsed .side-nav__item {
  justify-content: center;
  padding: 0.45rem 0.5rem;
}

.side-nav__toggle {
  border: none;
  background: #fff;
  border-radius: 14px;
  padding: 0.45rem;
  display: inline-flex;
  flex-direction: column;
  gap: 0.25rem;
  cursor: pointer;
}

.side-nav__toggle .bar {
  width: 16px;
  height: 2px;
  border-radius: 999px;
  background-color: var(--text-primary);
  display: block;
}

.side-nav__icon {
  color: var(--text-primary);
}

.side-nav__icon--active {
  color: var(--brand-primary);
}

@media (max-width: 900px) {
  .side-nav {
    flex-direction: row;
    align-items: center;
    border-radius: 20px;
    padding: 0.75rem 1rem;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .side-nav__title {
    width: 100%;
    margin-bottom: 0.25rem;
  }

  .side-nav__item {
    flex: 1 1 calc(50% - 0.5rem);
    justify-content: center;
    gap: 0.4rem;
  }
}
</style>
