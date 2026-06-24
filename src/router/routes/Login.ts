import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '@/views/auth/Login.vue'
import SignupView from '@/views/auth/Signup.vue'
import ApplicantLayout from '@/layouts/ApplicantLayout.vue'

const routes = [
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
    path: '/sidebar',
    name: 'sidebar',
    component: ApplicantLayout
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router