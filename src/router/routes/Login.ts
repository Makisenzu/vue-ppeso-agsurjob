import type { RouteRecordRaw } from 'vue-router'
import AuthLayout from '@/layouts/auth/AuthLayout.vue'
import LoginView from '@/views/auth/Login.vue'
import SignupView from '@/views/auth/Signup.vue'
import LandingView from '@/views/landing/Landing.vue'

export const loginRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'landing',
    component: LandingView
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