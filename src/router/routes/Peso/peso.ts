import type { RouteRecordRaw } from 'vue-router'
import ProvincialPesoLayout from '@/layouts/ProvincialPesoLayout.vue'
import MunicipalPesoLayout from '@/layouts/MunicipalPesoLayout.vue'
import PPESODashboard from '@/components/peso/ProvincialPeso/PpesoHome.vue'
import GipDashboard from '@/components/peso/ProvincialPeso/ESMDD/GIP/GipDashboard.vue'
import SPESDashboard from '@/components/peso/ProvincialPeso/ESMDD/SPES/SPESDashboard.vue'
import TupadDashboard from '@/components/peso/ProvincialPeso/ESMDD/TUPAD/TupadDashboard.vue'
import FnplpDashboard from '@/components/peso/ProvincialPeso/ESMDD/FNPLP/FnplpDashboard.vue'
import LRADashboard from '@/components/peso/ProvincialPeso/ESMDD/LRA/LRADashboard.vue'
import SRADashboard from '@/components/peso/ProvincialPeso/ESMDD/SRA/SRADashboard.vue'

export const pesoRoutes: RouteRecordRaw[] = [
  {
    path: '/provincial-peso',
    component: ProvincialPesoLayout,
    meta: { breadcrumb: false, requiresAuth: true, role: 'provincial_peso' },
    children: [
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
      {
        path: 'spes',
        name: 'provincial-peso-spes',
        component: SPESDashboard,
        meta: { requiresAuth: true, role: 'provincial_peso', breadcrumb: 'SPES' }
      },
      {
        path: 'job-fair',
        name: 'provincial-peso-job-fair',
        component: () => import('@/components/peso/ProvincialPeso/ESMDD/JobFair/JobFair.vue'),
        meta: { requiresAuth: true, role: 'provincial_peso', breadcrumb: 'Job Fair' }
      },
      {
        path: 'tupad',
        name: 'provincial-peso-tupad',
        component: TupadDashboard,
        meta: { requiresAuth: true, role: 'provincial_peso', breadcrumb: 'TUPAD' }
      },
      {
        path: 'fnplp',
        name: 'provincial-peso-fnplp',
        component: FnplpDashboard,
        meta: { requiresAuth: true, role: 'provincial_peso', breadcrumb: 'FNPLP / OFW' }
      },
      {
        path: 'lra',
        name: 'provincial-peso-lra',
        component: LRADashboard,
        meta: { requiresAuth: true, role: 'provincial_peso', breadcrumb: 'LRA' }
      },
      {
        path: 'sra',
        name: 'provincial-peso-sra',
        component: SRADashboard,
        meta: { requiresAuth: true, role: 'provincial_peso', breadcrumb: 'SRA' }
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
      }
    ]
  },
]
