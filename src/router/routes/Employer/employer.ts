import type { RouteRecordRaw } from 'vue-router'
import EmployerLayout from '@/layouts/EmployerLayout.vue'
import EmployerDashboard from '@/components/employer/EmployerDashboard.vue'

export const employerRoutes: RouteRecordRaw[] = [
  {
    path: '/employer',
    component: EmployerLayout,
    meta: { breadcrumb: false, requiresAuth: true, role: 'employer' },
    children: [
      {
        path: 'dashboard',
        name: 'employer-dashboard',
        component: EmployerDashboard
      }
    ]
  },
]
