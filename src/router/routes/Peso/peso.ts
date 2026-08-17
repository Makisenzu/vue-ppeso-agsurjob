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
        component: PPESODashboard
      }
      ,
      {
        path: 'gip',
        name: 'provincial-peso-gip',
        component: GipDashboard,
        meta: { requiresAuth: true, role: 'provincial_peso' }
      },
      {
        path: 'gip/details',
        name: 'provincial-peso-gip-details',
        component: () => import('@/components/peso/ProvincialPeso/ESMDD/GIP/GipDetails.vue'),
        meta: { requiresAuth: true, role: 'provincial_peso', breadcrumb: 'GIP Details' }
      },
      {
        path: 'spes',
        name: 'provincial-peso-spes',
        component: SPESDashboard,
        meta: { requiresAuth: true, role: 'provincial_peso' }
      },
      {
        path: 'tupad',
        name: 'provincial-peso-tupad',
        component: TupadDashboard,
        meta: { requiresAuth: true, role: 'provincial_peso' }
      },
      {
        path: 'fnplp',
        name: 'provincial-peso-fnplp',
        component: FnplpDashboard,
        meta: { requiresAuth: true, role: 'provincial_peso' }
      },
      {
        path: 'lra',
        name: 'provincial-peso-lra',
        component: LRADashboard,
        meta: { requiresAuth: true, role: 'provincial_peso' }
      },
      {
        path: 'sra',
        name: 'provincial-peso-sra',
        component: SRADashboard,
        meta: { requiresAuth: true, role: 'provincial_peso' }
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
