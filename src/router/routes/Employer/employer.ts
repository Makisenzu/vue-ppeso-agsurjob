import type { RouteRecordRaw } from 'vue-router'
import EmployerLayout from '@/layouts/EmployerLayout.vue'

export const employerRoutes: RouteRecordRaw[] = [
  {
    path: '/employer',
    component: EmployerLayout,
    meta: { breadcrumb: false, requiresAuth: true, role: 'company_owner' },
    children: [
      {
        path: 'dashboard',
        name: 'employer-dashboard',
        component: () => import('@/components/employer/EmployerHome.vue')
      },
      {
        path: 'company-profile',
        name: 'company-profile',
        component: () => import('@/components/employer/CompanyManagement/CompanyProfile.vue')
      },
      {
        path: 'job-postings',
        name: 'job-postings',
        component: () => import('@/components/employer/CompanyManagement/JobPosting/JobPosting.vue')
      },
      {
        path: 'job-applicants',
        name: 'job-applicants',
        component: () => import('@/components/employer/CompanyManagement/JobApplicant/JobApplicant.vue')
      },
    ]
  },
]
