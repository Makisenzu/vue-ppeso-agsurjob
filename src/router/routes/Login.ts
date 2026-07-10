import type { RouteRecordRaw } from 'vue-router'
import AuthLayout from '@/layouts/auth/AuthLayout.vue'
import LoginView from '@/views/auth/Login.vue'
import SignupView from '@/views/auth/Signup.vue'

export const loginRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    component: AuthLayout,
    children: [
      {
        path: '',
        redirect: '/login'
      },
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