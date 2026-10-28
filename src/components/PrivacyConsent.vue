<script setup lang="ts">
import { Loader2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { usePrivacyConsent } from '@/composables/common/usePrivacyConsent'

const { purposes, ticked, canAccept, isUpdate, isAccepting, setTicked, accept, handleSignOut } = usePrivacyConsent()
</script>

<template>
  <Card class="w-full max-w-lg gap-5 sm:gap-6">
    <CardHeader class="px-4 sm:px-6">
      <CardTitle>
        <h1 class="text-xl font-bold tracking-tight sm:text-lg sm:font-semibold">
          {{ isUpdate ? 'Our Privacy Notice changed' : 'Your privacy' }}
        </h1>
      </CardTitle>
      <CardDescription>Read the Privacy Notice, then confirm to continue.</CardDescription>
    </CardHeader>

    <CardContent class="flex flex-col gap-4 px-4 sm:px-6">
      <AppLink :to="{ name: 'privacy-notice' }" target="_blank" class="w-fit text-sm font-medium text-primary hover:underline">
        Read the Privacy Notice
      </AppLink>

      <ul class="flex flex-col gap-3">
        <li v-for="item in purposes" :key="item.purpose">
          <label class="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm leading-snug has-[[data-state=checked]]:border-primary">
            <Checkbox
              :model-value="!!ticked[item.purpose]"
              class="mt-0.5"
              @update:model-value="setTicked(item.purpose, $event)"
            />
            <span>{{ item.statement }}</span>
          </label>
        </li>
      </ul>

      <p class="text-xs text-muted-foreground">You can withdraw consent or ask for your data to be deleted anytime.</p>
    </CardContent>

    <CardFooter class="flex flex-col-reverse gap-3 px-4 pb-5 sm:flex-row sm:justify-between sm:px-6 sm:pb-0">
      <Button variant="outline" class="h-11 w-full sm:h-9 sm:w-auto" :disabled="isAccepting" @click="handleSignOut">Sign out</Button>
      <Button class="h-11 w-full text-base sm:h-9 sm:w-auto sm:text-sm" :disabled="!canAccept || isAccepting" @click="accept">
        <Loader2 v-if="isAccepting" class="size-4 shrink-0 animate-spin" />
        {{ isAccepting ? 'Saving...' : 'Agree and continue' }}
      </Button>
    </CardFooter>
  </Card>
</template>
