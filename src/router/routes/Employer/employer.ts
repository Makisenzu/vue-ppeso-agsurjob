import type { RouteRecordRaw } from 'vue-router'
import EmployerLayout from '@/layouts/EmployerLayout.vue'

export const employerRoutes: RouteRecordRaw[] = [
  {
    path: '/employer',
    component: EmployerLayout,
    meta: { breadcrumb: false, requiresAuth: true, role: 'employer' },
    children: [
      {
        path: 'dashboard',
        name: 'employer-dashboard',
        component: () => import('@/components/employer/EmployerDashboard.vue')
      },
      {
        path: 'company-profile',
        name: 'company-profile',
        component: () => import('@/components/employer/CompanyManagement/CompanyProfile.vue')
      }
    ]
  },
]
