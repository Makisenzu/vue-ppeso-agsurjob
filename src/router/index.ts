import { createRouter, createWebHistory } from 'vue-router'
import { loginRoutes } from './routes/Login'
import { applicantRoutes } from './routes/Applicant/applicant'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    ...loginRoutes,
    ...applicantRoutes
  ],
  scrollBehavior(to) {
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    }
    return { top: 0 }
  },
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  await authStore.init()

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

  if (requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login' })
  } else if (authStore.isAuthenticated && (to.name === 'login' || to.name === 'signup' || to.path === '/')) {
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router