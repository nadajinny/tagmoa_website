<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

interface NavItem {
  name: string
  label: string
  to: string
  icon: string
}

const items: NavItem[] = [
  { name: 'home', label: '홈', to: '/', icon: 'home' },
  { name: 'tasks', label: '태스크', to: '/tasks', icon: 'tasks' },
  { name: 'calendar', label: '캘린더', to: '/calendar', icon: 'calendar' },
  { name: 'profile', label: '프로필', to: '/profile', icon: 'profile' },
]

const route = useRoute()

const activeName = computed(() => (route.name as string) ?? 'home')

const renderIcon = (name: string) => {
  switch (name) {
    case 'home':
      return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M4 11L12 4l8 7v7a2 2 0 0 1-2 2h-3.5a1.5 1.5 0 0 1-1.5-1.5V15H11v5.5A1.5 1.5 0 0 1 9.5 22H6a2 2 0 0 1-2-2v-9z" />
      </svg>`
    case 'tasks':
      return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8">
        <rect x="4" y="4" width="16" height="16" rx="4" />
        <path d="M8 9h8M8 13h5" stroke-linecap="round" />
      </svg>`
    case 'calendar':
      return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8">
        <rect x="3.5" y="5" width="17" height="15" rx="3" />
        <path d="M7 3.5V6M17 3.5V6M4 9.5h16" stroke-linecap="round" />
      </svg>`
    default:
      return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8">
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 20c1.5-3.5 4.5-5.5 7.5-5.5S17.5 16.5 19 20" stroke-linecap="round" />
      </svg>`
  }
}
</script>

<template>
  <nav class="bottom-nav card-surface">
    <RouterLink
      v-for="item in items"
      :key="item.name"
      :to="item.to"
      class="bottom-nav__item"
      :class="{ 'bottom-nav__item--active': activeName === item.name }"
    >
      <span class="bottom-nav__icon" v-html="renderIcon(item.icon)" />
      <span class="bottom-nav__label">{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: sticky;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 0.75rem 1rem;
  border-radius: 20px;
  max-width: min(720px, calc(100% - 2rem));
  gap: 0.5rem;
  box-shadow: var(--shadow-soft);
  background-color: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(12px);
}

.bottom-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.25rem;
  color: var(--text-muted);
  border-radius: 14px;
  gap: 0.15rem;
  font-size: 0.78rem;
  font-weight: 600;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.bottom-nav__item--active {
  color: var(--brand-primary);
  background-color: rgba(63, 124, 255, 0.14);
}

.bottom-nav__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}
</style>
