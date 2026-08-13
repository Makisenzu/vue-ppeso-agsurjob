import type { RouteRecordRaw } from 'vue-router'
import ProvincialPesoLayout from '@/layouts/ProvincialPesoLayout.vue'
import MunicipalPesoLayout from '@/layouts/MunicipalPesoLayout.vue'
import PPESODashboard from '@/components/peso/ProvincialPeso/PpesoHome.vue'

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
