import type { RouteRecordRaw } from 'vue-router'
import EmployerLayout from '@/layouts/EmployerLayout.vue'

export const employerRoutes: RouteRecordRaw[] = [
  {
    path: '/employer',
    component: EmployerLayout,
    // Owners and the members they invite (migration 081); owner-only pages set their own role below
    meta: { breadcrumb: false, requiresAuth: true, role: ['company_owner', 'company_member'] },
    children: [
      {
        path: 'complete-profile',
        name: 'employer-complete-profile',
        component: () => import('@/components/employer/CompleteProfile/EmployerCompleteProfile.vue'),
        meta: { breadcrumb: 'Complete Profile', role: 'company_owner' },
      },
      {
        path: 'notifications',
        name: 'employer-notifications',
        component: () => import('@/components/NotificationCenter.vue'),
        meta: { breadcrumb: 'Notifications' },
      },
      {
        path: 'privacy',
        name: 'employer-privacy-center',
        component: () => import('@/components/PrivacyCenter.vue'),
        meta: { breadcrumb: 'Privacy & My Data' },
      },
      {
        path: 'dashboard',
        name: 'employer-dashboard',
        component: () => import('@/components/employer/EmployerHome.vue')
      },
      {
        path: 'account',
        name: 'employer-account',
        component: () => import('@/components/employer/Account/EmployerAccount.vue'),
        meta: { breadcrumb: 'Account' },
      },
      {
        path: 'company-profile',
        name: 'company-profile',
        component: () => import('@/components/employer/CompanyManagement/CompanyProfile.vue'),
        meta: { breadcrumb: 'Company Profile', role: 'company_owner' },
      },
      {
        path: 'team',
        name: 'employer-team',
        component: () => import('@/components/employer/Team/CompanyTeamAccess.vue'),
        meta: { breadcrumb: 'Team', role: 'company_owner' },
      },
      {
        // A member whose membership was removed by the owner
        path: 'no-company',
        name: 'employer-no-company',
        component: () => import('@/components/employer/Team/EmployerNoCompany.vue'),
        meta: { breadcrumb: false, role: 'company_member' },
      },
      {
        path: 'job-postings',
        name: 'job-postings',
        component: () => import('@/components/employer/CompanyManagement/JobPosting/JobPosting.vue'),
        // RLS (migration 039) lets only the owner write their establishment's vacancies
        meta: { breadcrumb: 'Job Posting', role: 'company_owner' },
      },
      {
        path: 'job-applicants',
        name: 'job-applicants',
        component: () => import('@/components/employer/CompanyManagement/JobApplicant/JobApplicant.vue')
      },
    ]
  },
]
