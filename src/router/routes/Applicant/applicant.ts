import type { RouteRecordRaw } from 'vue-router'
import ApplicantLayout from '@/layouts/ApplicantLayout.vue'
import ApplicantDashboard from '@/components/applicant/ApplicantDashboard.vue'
import Home from '@/components/applicant/ApplicantHome.vue'
import Notification from '@/components/applicant/ApplicantNotification.vue'
import FindJob from '@/components/applicant/ApplicantFindJob.vue'
import SavedJob from '@/components/applicant/ApplicantSavedJob.vue'
import Company from '@/components/applicant/ApplicantCompany.vue'
import Application from '@/components/applicant/ApplicantApplication.vue' 
import Interview from '@/components/applicant/ApplicantInterviews.vue'
import Chat from '@/components/applicant/ApplicantChat.vue'
import Offer from '@/components/applicant/ApplicantOffers.vue'
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
      },
      {
        path: 'home',
        name: 'home',
        component: Home
      },
      {
        path: 'notification',
        name: 'notification',
        component: Notification
      },
      {
        path: 'find-job',
        name: 'find-job',
        component: FindJob
      },
      {
        path: 'saved-job',
        name: 'saved-job',
        component: SavedJob
      },
      {
        path: 'company',
        name: 'company',
        component: Company
      },
      {
        path: 'application',
        name: 'application',
        component: Application
      },
      {
        path: 'interview',
        name: 'interview',
        component: Interview
      },
      {
        path: 'chat',
        name: 'chat',
        component: Chat
      },
      {
        path: 'offer',
        name: 'offer',
        component: Offer
      }
    ]
  },
]