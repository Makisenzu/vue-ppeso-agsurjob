<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/auth'

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import Label from './ui/label/Label.vue'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const router = useRouter()
const authStore = useAuthStore()

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
    await authStore.init()
    router.push(getDashboardRoute(authStore.userRole))
  } catch (error: any) {
    loginError.value = error?.message || 'Invalid email or password.'
  } finally {
    isLoading.value = false
  }
}

const handleCreate = () => {
  router.push('/signup')
}
</script>

<template>
  <Card class="w-full max-w-sm">
    <CardHeader>
      <CardTitle>Login to your AGSURJOBS</CardTitle>
      <CardDescription>
        Enter your email below to login to your account
      </CardDescription>
      <CardAction>
        <Button variant="link" @click="handleCreate">
          Sign Up
        </Button>
      </CardAction>
    </CardHeader>
    <CardContent>
      <form @submit.prevent="handleLogin">
        <div class="grid w-full items-center gap-4">
          <div class="flex flex-col space-y-1.5">
            <Label for="email">Email</Label>
            <Input
              id="email"
              v-model="emailOrUsername"
              type="email"
              placeholder="m@example.com"
              :class="emailError ? 'border-destructive' : ''"
            />
            <p v-if="emailError" class="text-xs text-destructive">{{ emailError }}</p>
          </div>
          <div class="flex flex-col space-y-1.5">
            <div class="flex items-center">
              <Label for="password">Password</Label>
              <a href="#" class="ml-auto inline-block text-sm underline">
                Forgot your password?
              </a>
            </div>
            <Input
              id="password"
              v-model="password"
              type="password"
              :class="passwordError ? 'border-destructive' : ''"
            />
            <p v-if="passwordError" class="text-xs text-destructive">{{ passwordError }}</p>
          </div>
          <p v-if="loginError" class="text-sm text-destructive text-center">{{ loginError }}</p>
        </div>
      </form>
    </CardContent>
    <CardFooter class="flex flex-col gap-2">
      <Button
        @click="handleLogin"
        class="w-full bg-(--button)"
        :disabled="isLoading"
      >
        {{ isLoading ? 'Logging in…' : 'Login' }}
      </Button>
      <Button variant="outline" class="w-full">
        Login with Google
      </Button>
    </CardFooter>
  </Card>
</template>