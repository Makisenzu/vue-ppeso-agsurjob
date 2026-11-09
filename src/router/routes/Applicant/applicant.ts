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
        path: 'privacy',
        name: 'privacy-center',
        component: () => import('@/components/PrivacyCenter.vue'),
        meta: { breadcrumb: 'Privacy & My Data' }
      },
      {
        path: 'vacancies',
        name: 'vacancies',
        component: () => import('@/components/applicant/ApplicantVacancies.vue')
      },
      {
        path: 'vacancies/:vacancyId/apply',
        name: 'vacancy-application-form',
        component: () => import('@/components/applicant/Vacancy/ApplicantJobApplicationForm.vue'),
        meta: { requiresAuth: true, role: 'applicant', breadcrumb: 'Job Application' }
      },
      {
        path: 'job-fairs',
        name: 'applicant-job-fairs',
        component: () => import('@/components/applicant/JobFair/ApplicantJobFairs.vue'),
        meta: { breadcrumb: 'Job Fairs', fullWidth: true }
      },
      {
        path: 'job-fairs/:jobFairId',
        name: 'applicant-job-fair-details',
        component: () => import('@/components/applicant/JobFair/ApplicantJobFairDetails.vue'),
        meta: { breadcrumb: 'Job Fair', fullWidth: true }
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
      // GIP page and the Apply wizard stay in the applicant layout; once they have an application,
      // "View my application" opens it in the GIP portal (gip-my-application, below)
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
  // ─── Program portals: one per PESO program, each with its own sidebar (DESIGN.md §7.1) ───
  // meta.program picks the sidebar items in programPortalHelper.ts. Applicants enter a portal only
  // from their existing application ("View my application", Application Tracker); the program page
  // and the Apply wizard stay in the applicant layout above
  {
    path: '/app/programs/gip',
    component: () => import('@/layouts/ProgramPortalLayout.vue'),
    meta: { requiresAuth: true, role: 'applicant', program: 'gip', breadcrumb: 'GIP', breadcrumbTo: { name: 'gip-application' } },
    children: [
      { path: '', redirect: { name: 'gip-my-application' } },
      {
        path: 'application',
        name: 'gip-my-application',
        component: () => import('@/components/applicant/Gip/ApplicantGipApplicationForm.vue'),
        meta: { requiresAuth: true, role: 'applicant', breadcrumb: 'My Application' }
      },
    ]
  },
]