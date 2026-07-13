<script setup lang="ts">
import { useLogin } from '@/composables/useLogin';

const { agsurlogo, 
        pesologo,
        emailOrUsername, 
        password, 
        isLoading, 
        loginError, 
        emailError, 
        passwordError, 
        handleLogin, 
        handleCreate ,
        Card,
        CardAction,
        CardContent,
        CardDescription,
        CardFooter,
        CardHeader,
        CardTitle,
        Avatar,
        AvatarImage,
        AvatarFallback,
        Button,
        Input,
        Label
      } = useLogin();
</script>

<template>
  <Card class="w-full max-w-sm">
    <CardHeader>
      <div class="flex items-center gap-2 mb-4">
      <Avatar class="h-14 w-14">
        <AvatarImage :src="agsurlogo" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>

      <Avatar class="h-14 w-14">
        <AvatarImage :src="pesologo" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
    </div>
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
              placeholder="example@example.com"
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