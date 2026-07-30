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
        component: () => import('@/components/admin/management/accounts/AuthorizedAccounts.vue'),
        meta: { breadcrumb: 'User Accounts' },
      },
      {
        path: 'directory',
        meta: { breadcrumb: 'Directory', breadcrumbTo: { name: 'directory' } },
        children: [
          {
            path: '',
            name: 'directory',
            component: () => import('@/components/admin/management/directory/SystemDirectory.vue'),
            meta: { breadcrumb: false },
          },
          {
            path: ':id',
            name: 'directory-details',
            component: () => import('@/components/admin/management/directory/InformationSection.vue'),
            meta: { breadcrumb: 'Details' },
          },
        ],
      },
      {
        path: 'document-templates',
        name: 'document-templates',
        component: () => import('@/components/admin/management/document/DocumentTemplates.vue'),
      },
    ],
  },
]