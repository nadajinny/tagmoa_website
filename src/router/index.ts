import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const AppLayout = () => import('../layouts/AppLayout.vue')
const LandingView = () => import('../views/LandingView.vue')
const HomeView = () => import('../views/HomeView.vue')
const TasksView = () => import('../views/TasksView.vue')
const TaskDetailView = () => import('../views/TaskDetailView.vue')
const TagManagementView = () => import('../views/TagManagementView.vue')
const CalendarView = () => import('../views/CalendarView.vue')
const TodayGoalsView = () => import('../views/TodayGoalsView.vue')
const ProfileView = () => import('../views/ProfileView.vue')
const LoginView = () => import('../views/LoginView.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: LandingView,
      meta: { public: true },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { public: true },
    },
    {
      path: '/app',
      component: AppLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: HomeView,
        },
        { path: 'tasks', name: 'tasks', component: TasksView },
        { path: 'today', name: 'today-goals', component: TodayGoalsView },
        {
          path: 'tasks/:id',
          name: 'task-detail',
          component: TaskDetailView,
          props: true,
        },
        { path: 'tags', name: 'tags', component: TagManagementView },
        { path: 'calendar', name: 'calendar', component: CalendarView },
        { path: 'profile', name: 'profile', component: ProfileView },
      ],
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.ensureAuthReady()
  if (!to.meta.public && !auth.session) {
    return { name: 'landing' }
  }
  if ((to.name === 'login' || to.name === 'landing') && auth.session) {
    return { name: 'home' }
  }
  return true
})

export default router
