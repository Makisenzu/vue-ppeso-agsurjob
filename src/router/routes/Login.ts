import { createRouter, createWebHistory } from 'vue-router'
import LoginCard from '@/components/LoginCard.vue'
import SignupCard from '@/components/SignupCard.vue'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'login',
    component: LoginCard
  },    
  {
    path: '/signup',
    name: 'signup',
    component: SignupCard
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router