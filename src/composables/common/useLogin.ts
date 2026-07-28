import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/auth'
import agsurlogo from '@/assets/images/agsur.png'
import pesologo from '@/assets/images/pesologo.png'

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'


const emailOrUsername = ref('')
const password = ref('')
const isLoading = ref(false)
const loginError = ref('')

const emailError = ref('')
const passwordError = ref('')

watch(emailOrUsername, () => { emailError.value = '' })
watch(password, () => { passwordError.value = '' })

function getDashboardRoute(role: string | null) {
  switch (role) {
    case 'admin': return { name: 'admin-dashboard' }
    case 'employer': return { name: 'employer-dashboard' }
    case 'peso_staff': return { name: 'peso-dashboard' }
    default: return { name: 'dashboard' }
  }
}

export function useLogin() {
  const router = useRouter()
  const handleCreate = () => {
  router.push('/signup')
  }
  const authStore = useAuthStore()
  const handleLogin = async () => {
  loginError.value = ''

  if (!emailOrUsername.value.trim()) {
    emailError.value = 'Email is required.'
    return
  }
  if (!password.value) {
    passwordError.value = 'Password is required.'
    return
  }

  isLoading.value = true
  try {
    await authService.login({
      email: emailOrUsername.value.trim(),
      password: password.value,
    })
    await authStore.init(true)
    router.push(getDashboardRoute(authStore.userRole))
  } catch (error: any) {
    loginError.value = error?.message || 'Invalid email or password.'
  } finally {
    isLoading.value = false
  }
  }
    return {
        agsurlogo,
        pesologo,
        emailOrUsername,
        password,
        isLoading,
        loginError,
        emailError,
        passwordError,
        handleLogin,
        handleCreate,
        Card,
        CardAction,
        CardContent,
        CardDescription,
        CardFooter,
        CardHeader,
        CardTitle,
        Avatar,
        AvatarFallback,
        AvatarImage,
        Label,
        Input,
        Button
    }
}