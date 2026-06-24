import { createRouter, createWebHistory } from 'vue-router'
import ApplicantLayout from '@/layouts/ApplicantLayout.vue'
const routes = [
 {
    path: '/sidebar',
    name: 'sidebar',
    component: ApplicantLayout
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router