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

/** Open to signed-in users who haven't accepted the current Privacy Notice yet */
const PRIVACY_ROUTE_NAMES = new Set(['privacy-consent', 'privacy-notice', 'accept-invite'])

/** The role(s) a route allows: the deepest matched record that sets one (child pages can narrow their layout's) */
function allowsRole(routeRole: unknown, userRole: string | null) {
  if (!routeRole) return true
  return Array.isArray(routeRole) ? routeRole.includes(userRole) : routeRole === userRole
}

export function getDashboardRouteForRole(role: string | null) {
  switch (role) {
    case 'admin':
      return { name: 'admin-dashboard' }
    case 'company_owner':
    case 'company_member':
    case 'employer':
      return { name: 'employer-dashboard' }
    case 'provincial_peso':
      return { name: 'provincial-peso-dashboard' }
    case 'municipal_peso':
      return { name: 'municipal-peso-dashboard' }
    case 'peso_staff':
      return { name: 'provincial-peso-dashboard' }
    case 'applicant':
    default:
      return { name: 'home' }
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
      const routeRole = [...to.matched].reverse().find(record => record.meta.role)?.meta.role
      
      // Prevent infinite redirect: if they are already heading to the fallback dashboard, let them through
      const fallbackRoute = getDashboardRouteForRole(userRole).name
      
      if (!allowsRole(routeRole, userRole) && to.name !== fallbackRoute) {
        next(getDashboardRouteForRole(userRole))
      } else if (!authStore.hasAcceptedPrivacyNotice && !PRIVACY_ROUTE_NAMES.has(String(to.name))) {
        // Every account accepts the current Privacy Notice before using the portal (RA 10173, PRIVACY.md §3)
        next({ name: 'privacy-consent', query: { redirect: to.fullPath } })
      } else if (
        userRole === 'applicant' &&
        to.name !== 'complete-profile' &&
        !authStore.isApplicantProfileComplete
      ) {
        // Applicants must finish their NSRP record (applicants.applicants) before using the portal
        next({ name: 'complete-profile' })
      } else if (
        userRole === 'company_owner' &&
        to.name !== 'employer-complete-profile' &&
        !authStore.isEmployerProfileComplete
      ) {
        // Company owners must register their establishment (NSRP Form 2) before using the portal
        next({ name: 'employer-complete-profile' })
      } else if (
        userRole === 'company_member' &&
        !authStore.employerProfile &&
        to.name !== 'employer-no-company' &&
        to.matched.some(record => record.path === '/employer')
      ) {
        // Members never fill in a form; one the owner removed has no company to work in
        next({ name: 'employer-no-company' })
      } else {
        next()
      }
    }
  } else {
    next()
  }
})

export default router