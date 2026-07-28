import type { RouteRecordRaw } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'

export const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/admin',
    component: AdminLayout,
    meta: { breadcrumb: false, requiresAuth: true, role: 'admin' },
    children: [
      {
        path: 'dashboard',
        name: 'admin-dashboard',
        component: () => import('@/components/admin/AdminDashboard.vue'),
      },
      {
        path: 'accounts',
        name: 'accounts',
        component: () => import('@/components/admin/management/accounts/UserAccounts.vue'),
        meta: { breadcrumb: 'User Accounts' },
      },
    ],
  },
]