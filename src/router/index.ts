import { createRouter, createWebHistory } from 'vue-router'
import { loginRoutes } from './routes/Login'
import { applicantRoutes } from './routes/Applicant/applicant'

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

export default router