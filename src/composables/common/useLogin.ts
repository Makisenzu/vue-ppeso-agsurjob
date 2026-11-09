import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '@/services/common/authService'
import { useAuthStore } from '@/stores/common/auth'
import { getDashboardRouteForRole } from '@/router'
import { useCaptcha } from '@/composables/common/useCaptcha'
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

// Bot protection (Turnstile); a no-op until VITE_TURNSTILE_SITE_KEY is set
const captcha = useCaptcha()

const emailError = ref('')
const passwordError = ref('')

watch(emailOrUsername, () => { emailError.value = '' })
watch(password, () => { passwordError.value = '' })

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

  if (!captcha.isReady.value) {
    loginError.value = 'Complete the security check first.'
    return
  }

  isLoading.value = true
  try {
    await authService.login({
      email: emailOrUsername.value.trim(),
      password: password.value,
      options: captcha.authOptions.value,
    })
    await authStore.init(true)
    await router.push(getDashboardRouteForRole(authStore.userRole))
  } catch (error: any) {
    loginError.value = error?.message || 'Invalid email or password.'
    // Turnstile tokens are single-use: get a fresh one for the next attempt
    captcha.reset()
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
        captchaToken: captcha.token,
        captchaResetKey: captcha.resetKey,
        isCaptchaReady: captcha.isReady,
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