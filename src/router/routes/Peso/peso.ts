import type { RouteRecordRaw } from 'vue-router'
import PesoLayout from '@/layouts/PesoLayout.vue'
import PesoDashboard from '@/components/peso/PesoDashboard.vue'

export const pesoRoutes: RouteRecordRaw[] = [
  {
    path: '/peso',
    component: PesoLayout,
    meta: { breadcrumb: false, requiresAuth: true, role: 'peso_staff' },
    children: [
      {
        path: 'dashboard',
        name: 'peso-dashboard',
        component: PesoDashboard
      }
    ]
  },
]
