import type { RouteRecordRaw } from 'vue-router'
import ApplicantLayout from '@/layouts/ApplicantLayout.vue'
import ApplicantDashboard from '@/components/applicant/ApplicantDashboard.vue'

export const applicantRoutes : RouteRecordRaw[] = [
  {
    path: '/app',
    component: ApplicantLayout,
    meta: { breadcrumb: false, requiresAuth: true, role: 'applicant' },
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: ApplicantDashboard
      }
    ]
  },
]