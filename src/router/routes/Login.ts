import type { RouteRecordRaw } from 'vue-router'
import AuthLayout from '@/layouts/auth/AuthLayout.vue'
import LoginView from '@/views/auth/Login.vue'
import SignupView from '@/views/auth/Signup.vue'
import LandingView from '@/views/landing/Landing.vue'
import WhatIsPesoView from '@/views/landing/WhatIsPeso.vue'
import { useAuthStore } from '@/stores/common/auth'

export const loginRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'landing',
    component: LandingView
  },
  {
    path: '/what-is-peso',
    name: 'what-is-peso',
    component: WhatIsPesoView
  },
  {
    path: '/gip',
    name: 'gip',
    component: () => import('@/views/landing/Gip.vue'),
    // Signed-in applicants get the same page inside their layout, where they can apply
    beforeEnter: () => {
      const authStore = useAuthStore()
      if (authStore.isAuthenticated && authStore.userRole === 'applicant') return { name: 'gip-application' }
    }
  },
  {
    path: '/spes',
    name: 'spes',
    component: () => import('@/views/landing/Spes.vue'),
    // Signed-in applicants get the same page inside their layout, where they can apply
    beforeEnter: () => {
      const authStore = useAuthStore()
      if (authStore.isAuthenticated && authStore.userRole === 'applicant') return { name: 'spes-application' }
    }
  },
  {
    path: '/tupad',
    name: 'tupad',
    component: () => import('@/views/landing/Tupad.vue'),
    // Signed-in applicants get the same page inside their layout, where they can apply
    beforeEnter: () => {
      const authStore = useAuthStore()
      if (authStore.isAuthenticated && authStore.userRole === 'applicant') return { name: 'tupad-application' }
    }
  },
  {
    path: '/',
    component: AuthLayout,
    children: [
      {
        path: 'login',
        name: 'login',
        component: LoginView
      },
      {
        path: 'signup',
        name: 'signup',
        component: SignupView
      },
    ]
  },
]