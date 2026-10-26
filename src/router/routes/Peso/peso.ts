import type { RouteRecordRaw } from 'vue-router'
import ProvincialPesoLayout from '@/layouts/ProvincialPesoLayout.vue'
import MunicipalPesoLayout from '@/layouts/MunicipalPesoLayout.vue'
import PPESODashboard from '@/components/peso/ProvincialPeso/PpesoHome.vue'
import GipDashboard from '@/components/peso/ProvincialPeso/ESMDD/GIP/GipDashboard.vue'
import SPESDashboard from '@/components/peso/ProvincialPeso/ESMDD/SPES/SPESDashboard.vue'
import TupadDashboard from '@/components/peso/ProvincialPeso/ESMDD/TUPAD/TupadDashboard.vue'
import FnplpDashboard from '@/components/peso/ProvincialPeso/ESMDD/FNPLP/FnplpDashboard.vue'
import RecruitmentActivity from '@/components/peso/ProvincialPeso/ESMDD/RecruitmentActivity/RecruitmentActivity.vue'

export const pesoRoutes: RouteRecordRaw[] = [
  {
    path: '/provincial-peso',
    component: ProvincialPesoLayout,
    meta: { breadcrumb: false, requiresAuth: true, role: 'provincial_peso' },
    children: [
      {
        path: 'notifications',
        name: 'provincial-peso-notifications',
        component: () => import('@/components/NotificationCenter.vue'),
        meta: { breadcrumb: 'Notifications' },
      },
      {
        path: 'dashboard',
        name: 'provincial-peso-dashboard',
        component: PPESODashboard,
        meta: { breadcrumb: 'Dashboard' },
      },
      {
        path: 'skills-repository',
        meta: { breadcrumb: 'Skill Tagging', breadcrumbTo: { name: 'provincial-peso-skills-repository' } },
        children: [
          {
            path: '',
            name: 'provincial-peso-skills-repository',
            component: () => import('@/components/peso/ProvincialPeso/Common/SkillRepository/SkillRepository.vue'),
            meta: { breadcrumb: false, requiresAuth: true, role: 'provincial_peso' },
          },
          {
            path: ':id',
            name: 'provincial-peso-skills-repository-details',
            component: () => import('@/components/peso/ProvincialPeso/Common/SkillRepository/MunicipalitySkillData.vue'),
            meta: { breadcrumb: 'Municipality Skills', requiresAuth: true, role: 'provincial_peso' },
          },
        ],
      },
      // ─── GIP (breadcrumb hierarchy: GIP > Details > Deploy Intern / GIP > Applicants > Applicant Details / Priority Ranking) ───
      {
        path: 'gip',
        meta: { breadcrumb: 'GIP', breadcrumbTo: { name: 'provincial-peso-gip' } },
        children: [
          {
            path: '',
            name: 'provincial-peso-gip',
            component: GipDashboard,
            meta: { breadcrumb: false, requiresAuth: true, role: 'provincial_peso' },
          },
          {
            path: 'details',
            meta: { breadcrumb: 'Details', breadcrumbTo: { name: 'provincial-peso-gip-details' } },
            children: [
              {
                path: '',
                name: 'provincial-peso-gip-details',
                component: () => import('@/components/peso/ProvincialPeso/ESMDD/GIP/GipDetails.vue'),
                meta: { breadcrumb: false, requiresAuth: true, role: 'provincial_peso' },
              },
              {
                path: 'deploy',
                name: 'provincial-peso-gip-add',
                component: () => import('@/components/peso/ProvincialPeso/ESMDD/GIP/GipAddIntern.vue'),
                meta: { requiresAuth: true, role: 'provincial_peso', breadcrumb: 'Deploy Intern' },
              },
            ],
          },
          {
            path: 'applicants',
            meta: { breadcrumb: 'Applicants', breadcrumbTo: { name: 'provincial-peso-gip-applicants' } },
            children: [
              {
                path: '',
                name: 'provincial-peso-gip-applicants',
                component: () => import('@/components/peso/ProvincialPeso/ESMDD/GIP/GipApplicants.vue'),
                meta: { breadcrumb: false, requiresAuth: true, role: 'provincial_peso' },
              },
              {
                path: 'priority',
                name: 'provincial-peso-gip-priority',
                component: () => import('@/components/peso/ProvincialPeso/ESMDD/GIP/GipPriorityApplicants.vue'),
                meta: { requiresAuth: true, role: 'provincial_peso', breadcrumb: 'Priority Ranking' },
              },
              {
                path: ':id',
                name: 'provincial-peso-gip-applicant-details',
                component: () => import('@/components/peso/ProvincialPeso/ESMDD/GIP/GipApplicants.vue'),
                meta: { requiresAuth: true, role: 'provincial_peso', breadcrumb: 'Applicant Details' },
              },
            ],
          },
        ],
      },
      // ─── SPES (breadcrumb hierarchy: SPES > Applicants > New Applicant / Details) ───
      {
        path: 'spes',
        meta: { breadcrumb: 'SPES', breadcrumbTo: { name: 'provincial-peso-spes' } },
        children: [
          {
            path: '',
            name: 'provincial-peso-spes',
            component: SPESDashboard,
            meta: { breadcrumb: false, requiresAuth: true, role: 'provincial_peso' },
          },
          {
            path: 'applicants',
            meta: { breadcrumb: 'Applicants', breadcrumbTo: { name: 'provincial-peso-spes-applicants' } },
            children: [
              {
                path: '',
                name: 'provincial-peso-spes-applicants',
                component: () => import('@/components/peso/ProvincialPeso/ESMDD/SPES/SpesApplicants.vue'),
                meta: { breadcrumb: false, requiresAuth: true, role: 'provincial_peso' },
              },
              {
                path: 'new',
                name: 'provincial-peso-spes-applicants-new',
                component: () => import('@/components/peso/ProvincialPeso/ESMDD/SPES/SpesEntryForm.vue'),
                meta: { requiresAuth: true, role: 'provincial_peso', breadcrumb: 'New Applicant' },
              },
              {
                path: ':id',
                name: 'provincial-peso-spes-applicants-details',
                component: () => import('@/components/peso/ProvincialPeso/ESMDD/SPES/SpesEntryForm.vue'),
                meta: { requiresAuth: true, role: 'provincial_peso', breadcrumb: 'Details' },
              },
            ],
          },
        ],
      },
      // ─── Job Fair (breadcrumb hierarchy: Job Fair > Participants > Vacancies) ───
      {
        path: 'job-fair',
        meta: { breadcrumb: 'Job Fair', breadcrumbTo: { name: 'provincial-peso-job-fair' } },
        children: [
          {
            path: '',
            name: 'provincial-peso-job-fair',
            component: () => import('@/components/peso/ProvincialPeso/ESMDD/JobFair/JobFair.vue'),
            meta: { breadcrumb: false, requiresAuth: true, role: 'provincial_peso' },
          },
          {
            path: ':jobFairId',
            meta: { breadcrumb: 'Employers', breadcrumbTo: { name: 'provincial-peso-job-fair-participants' } },
            children: [
              {
                path: '',
                name: 'provincial-peso-job-fair-participants',
                component: () => import('@/components/peso/ProvincialPeso/ESMDD/JobFair/JobFairParticipants.vue'),
                meta: { breadcrumb: false, requiresAuth: true, role: 'provincial_peso' },
              },
              {
                path: 'participants/:participantId',
                name: 'provincial-peso-job-fair-participant-vacancies',
                component: () => import('@/components/peso/ProvincialPeso/ESMDD/JobFair/JobFairParticipantVacancies.vue'),
                meta: { requiresAuth: true, role: 'provincial_peso', breadcrumb: 'Vacancies' },
              },
            ],
          },
        ],
      },
      // ─── TUPAD (breadcrumb hierarchy: TUPAD > Applicants | Batch) ───
      {
        path: 'tupad',
        meta: { breadcrumb: 'TUPAD', breadcrumbTo: { name: 'provincial-peso-tupad' } },
        children: [
          {
            path: '',
            name: 'provincial-peso-tupad',
            component: TupadDashboard,
            meta: { breadcrumb: false, requiresAuth: true, role: 'provincial_peso' },
          },
          {
            path: 'applicants',
            name: 'provincial-peso-tupad-applicants',
            component: () => import('@/components/peso/ProvincialPeso/ESMDD/TUPAD/TupadApplicants.vue'),
            meta: { requiresAuth: true, role: 'provincial_peso', breadcrumb: 'Applicants' },
          },
          {
            path: 'batches/:id',
            name: 'provincial-peso-tupad-batch-details',
            component: () => import('@/components/peso/ProvincialPeso/ESMDD/TUPAD/TupadBatchDetails.vue'),
            meta: { requiresAuth: true, role: 'provincial_peso', breadcrumb: 'Batch' },
          },
        ],
      },
      {
        path: 'fnplp',
        name: 'provincial-peso-fnplp',
        component: FnplpDashboard,
        meta: { requiresAuth: true, role: 'provincial_peso', breadcrumb: 'FNPLP / OFW' }
      },
      // ─── Site Contents: landing page carousel (system.site_contents, migration 046) ───
      {
        path: 'site-contents',
        name: 'provincial-peso-site-contents',
        component: () => import('@/components/peso/ProvincialPeso/Administrative/SiteContents/SiteContents.vue'),
        meta: { requiresAuth: true, role: 'provincial_peso', breadcrumb: 'Site Contents' },
      },
      // ─── Recruitment Activity: LRA / SRA (breadcrumb hierarchy: Recruitment Activity > Details) ───
      {
        path: 'recruitment-activity',
        meta: { breadcrumb: 'Recruitment Activity', breadcrumbTo: { name: 'provincial-peso-recruitment-activity' } },
        children: [
          {
            path: '',
            name: 'provincial-peso-recruitment-activity',
            component: RecruitmentActivity,
            meta: { breadcrumb: false, requiresAuth: true, role: 'provincial_peso' },
          },
          {
            path: ':activityId',
            name: 'provincial-peso-recruitment-activity-details',
            component: () => import('@/components/peso/ProvincialPeso/ESMDD/RecruitmentActivity/RecruitmentActivityDetails.vue'),
            meta: { requiresAuth: true, role: 'provincial_peso', breadcrumb: 'Details' },
          },
        ],
      },
      // ─── Applicant Entry (nested group for breadcrumb hierarchy: Entry of Applicants > Details / New) ───
      {
        path: 'entry',
        meta: { breadcrumb: 'Entry of Applicants', breadcrumbTo: { name: 'provincial-peso-entry' } },
        children: [
          {
            path: '',
            name: 'provincial-peso-entry',
            component: () => import('@/components/peso/ProvincialPeso/Common/ApplicantEntry.vue'),
            meta: { breadcrumb: false, requiresAuth: true, role: 'provincial_peso' },
          },
          {
            path: 'new',
            name: 'provincial-peso-entry-new',
            component: () => import('@/components/peso/ProvincialPeso/Common/ApplicantNewEntry.vue'),
            meta: { requiresAuth: true, role: 'provincial_peso', breadcrumb: 'New Entry' },
          },
          {
            path: ':id',
            name: 'provincial-peso-entry-details',
            component: () => import('@/components/peso/ProvincialPeso/Common/ApplicantNsrpDetails.vue'),
            meta: { requiresAuth: true, role: 'provincial_peso', breadcrumb: 'Details' },
          },
        ],
      },
    ]
  },
  {
    path: '/municipal-peso',
    component: MunicipalPesoLayout,
    meta: { breadcrumb: false, requiresAuth: true, role: 'municipal_peso' },
    children: [
      {
        path: 'dashboard',
        name: 'municipal-peso-dashboard',
        component: PPESODashboard
      },
      {
        path: 'notifications',
        name: 'municipal-peso-notifications',
        component: () => import('@/components/NotificationCenter.vue'),
        meta: { breadcrumb: 'Notifications' },
      }
    ]
  },
]
