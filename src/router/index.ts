import { createRouter, createWebHistory } from 'vue-router'
import { loginRoutes } from './routes/Login'
import { applicantRoutes } from './routes/Applicant/applicant'
import { employerRoutes } from './routes/Employer/employer'
import { pesoRoutes } from './routes/Peso/peso'
import { adminRoutes } from './routes/Admin/admin'
import { useAuthStore } from '@/stores/common/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    ...loginRoutes,
    ...applicantRoutes,
    ...employerRoutes,
    ...pesoRoutes,
    ...adminRoutes
  ],
  scrollBehavior(to) {
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    }
    return { top: 0 }
  },
})

function getDashboardRouteForRole(role: string | null) {
  switch (role) {
    case 'admin':
      return { name: 'admin-dashboard' }
    case 'company_owner':
    case 'employer':
      return { name: 'employer-dashboard' }
    case 'peso_staff':
      return { name: 'peso-dashboard' }
    case 'applicant':
    default:
      return { name: 'dashboard' }
  }
}

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()
  await authStore.init()

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

  if (requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login' })
  } else if (authStore.isAuthenticated) {
    const userRole = authStore.userRole

    // If trying to access login/signup while already authenticated, redirect to their home panel
    if (to.name === 'login' || to.name === 'signup' || to.path === '/') {
      next(getDashboardRouteForRole(userRole))
    } else {
      // Check if user is accessing a page defined for another role
      const routeRole = to.matched.find(record => record.meta.role)?.meta.role
      
      // Prevent infinite redirect: if they are already heading to the fallback dashboard, let them through
      const fallbackRoute = getDashboardRouteForRole(userRole).name
      
      if (routeRole && routeRole !== userRole && to.name !== fallbackRoute) {
        next(getDashboardRouteForRole(userRole))
      } else {
        next()
      }
    }
  } else {
    next()
  }
})

export default router