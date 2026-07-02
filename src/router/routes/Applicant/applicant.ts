import type { RouteRecordRaw } from 'vue-router'
import ApplicantLayout from '@/layouts/ApplicantLayout.vue'
export const applicantRoutes : RouteRecordRaw[] = [
  {
    path: '/app',
    component: ApplicantLayout,
    meta: { breadcrumb: false, requiresAuth: true, role: 'applicant' },
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/components/applicant/ApplicantDashboard.vue')
      },
      {
        path: 'home',
        name: 'home',
        component: () => import('@/components/applicant/ApplicantHome.vue')
      },
      {
        path: 'notification',
        name: 'notification',
        component: () => import('@/components/applicant/ApplicantNotification.vue')
      },
      {
        path: 'find-job',
        name: 'find-job',
        component: () => import('@/components/applicant/ApplicantFindJob.vue')
      },
      {
        path: 'saved-job',
        name: 'saved-job',
        component: () => import('@/components/applicant/ApplicantSavedJob.vue')
      },
      {
        path: 'company',
        name: 'company',
        component: () => import('@/components/applicant/ApplicantCompany.vue')
      },
      {
        path: 'application',
        name: 'application',
        component: () => import('@/components/applicant/ApplicantApplication.vue')
      },
      {
        path: 'interview',
        name: 'interview',
        component: () => import('@/components/applicant/ApplicantInterviews.vue')
      },
      {
        path: 'chat',
        name: 'chat',
        component: () => import('@/components/applicant/ApplicantChat.vue')
      },
      {
        path: 'offer',
        name: 'offer',
        component: () => import('@/components/applicant/ApplicantOffers.vue')
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/components/applicant/Profile/ApplicantProfile.vue')
      }
    ]
  },
]