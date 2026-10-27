import type { RouteRecordRaw } from 'vue-router'
import ApplicantLayout from '@/layouts/ApplicantLayout.vue'
export const applicantRoutes : RouteRecordRaw[] = [
  {
    path: '/app',
    component: ApplicantLayout,
    meta: { breadcrumb: false, requiresAuth: true, role: 'applicant' },
    children: [
      {
        path: 'complete-profile',
        name: 'complete-profile',
        component: () => import('@/components/applicant/Profile/ApplicantCompleteProfile.vue'),
        meta: { requiresAuth: true, role: 'applicant', breadcrumb: 'Complete Profile' }
      },
      {
        path: 'home',
        name: 'home',
        component: () => import('@/components/applicant/ApplicantHome.vue'),
        meta: { fullWidth: true }
      },
      // Public About pages, rendered edge to edge inside the applicant layout (fullWidth)
      {
        path: 'about',
        name: 'applicant-about',
        component: () => import('@/components/applicant/About/ApplicantAboutHistory.vue'),
        meta: { fullWidth: true }
      },
      {
        path: 'what-is-peso',
        name: 'applicant-what-is-peso',
        component: () => import('@/components/applicant/About/ApplicantWhatIsPeso.vue'),
        meta: { fullWidth: true }
      },
      {
        path: 'notification',
        name: 'notification',
        component: () => import('@/components/NotificationCenter.vue'),
        meta: { breadcrumb: 'Notifications' }
      },
      {
        path: 'vacancies',
        name: 'vacancies',
        component: () => import('@/components/applicant/ApplicantVacancies.vue')
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
        path: 'spes-application',
        name: 'spes-application',
        component: () => import('@/components/applicant/Spes/ApplicantSpesApplication.vue'),
        meta: { requiresAuth: true, role: 'applicant', breadcrumb: 'SPES Application', fullWidth: true }
      },
      {
        path: 'spes-application/form',
        name: 'spes-application-form',
        component: () => import('@/components/applicant/Spes/ApplicantSpesApplicationForm.vue'),
        meta: { requiresAuth: true, role: 'applicant', breadcrumb: 'SPES Application Form' }
      },
      {
        path: 'spes-application/details',
        name: 'spes-details',
        component: () => import('@/components/applicant/Spes/ApplicantSpesForm.vue'),
        meta: { requiresAuth: true, role: 'applicant', breadcrumb: 'My SPES Details' }
      },
      {
        path: 'tupad-application',
        name: 'tupad-application',
        component: () => import('@/components/applicant/Tupad/ApplicantTupadApplication.vue'),
        meta: { requiresAuth: true, role: 'applicant', breadcrumb: 'TUPAD Application', fullWidth: true }
      },
      {
        path: 'tupad-application/form',
        name: 'tupad-application-form',
        component: () => import('@/components/applicant/Tupad/ApplicantTupadApplicationForm.vue'),
        meta: { requiresAuth: true, role: 'applicant', breadcrumb: 'TUPAD Application Form' }
      },
      {
        path: 'gip-application',
        name: 'gip-application',
        component: () => import('@/components/applicant/Gip/ApplicantGipApplication.vue'),
        meta: { requiresAuth: true, role: 'applicant', breadcrumb: 'GIP Application', fullWidth: true }
      },
      {
        path: 'gip-application/form',
        name: 'gip-application-form',
        component: () => import('@/components/applicant/Gip/ApplicantGipApplicationForm.vue'),
        meta: { requiresAuth: true, role: 'applicant', breadcrumb: 'GIP Application Form' }
      },
      {
        path: 'fnplp-application',
        name: 'fnplp-application',
        component: () => import('@/components/applicant/Fnplp/ApplicantFnplpApplication.vue'),
        meta: { requiresAuth: true, role: 'applicant', breadcrumb: 'FNPLP Application' }
      },
      {
        path: 'profile/:username',
        name: 'profile',
        component: () => import('@/components/applicant/Profile/ApplicantProfile.vue'),
        props: true
      }
    ]
  },
]