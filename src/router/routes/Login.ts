import type { RouteRecordRaw } from 'vue-router'
import LoginView from '@/views/auth/Login.vue'
import SignupView from '@/views/auth/Signup.vue'

export const loginRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/login'
  },
  
  {
    path: '/login',
    name: 'login',
    component: LoginView
  },    
  {
    path: '/signup',
    name: 'signup',
    component: SignupView
  },
]