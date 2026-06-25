import type { RouteRecordRaw } from 'vue-router'
import LoginView from '@/views/auth/Login.vue'
import SignupView from '@/views/auth/Signup.vue'
import ApplicantLayout from '@/layouts/ApplicantLayout.vue'
import ApplicantDashboard from '@/components/ApplicantDashboard.vue'

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
  {
    path: '/app',
    component: ApplicantLayout,
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: ApplicantDashboard
      }
    ]
  },
]