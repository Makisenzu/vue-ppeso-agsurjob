<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  MailIcon,
  PhoneIcon,
  GlobeIcon,
  UsersIcon,
  BriefcaseBusinessIcon,
} from '@lucide/vue'

const props = defineProps<{
  email: string
  contact: string
  website: string
  hasWebsite: boolean
  ownerName: string
  ownerInitials: string
  ownerEmail: string
  employeeCount: string
  businessType: string
  isLoading: boolean
}>()
</script>

<template>
  <Card>
    <!-- Contact Information -->
    <CardHeader class="pb-3">
      <CardTitle class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Contact Information
      </CardTitle>
    </CardHeader>
    <CardContent class="space-y-4 pb-5">
      <template v-if="isLoading">
        <div v-for="n in 3" :key="n" class="flex items-center gap-3">
          <Skeleton class="h-4 w-4 rounded shrink-0" />
          <Skeleton class="h-4 flex-1" />
        </div>
      </template>
      <template v-else>
        <!-- Email -->
        <div class="flex items-center gap-3 text-sm">
          <MailIcon class="h-4 w-4 shrink-0 text-muted-foreground" />
          <span class="truncate text-foreground">{{ email }}</span>
        </div>

        <!-- Phone -->
        <div class="flex items-center gap-3 text-sm">
          <PhoneIcon class="h-4 w-4 shrink-0 text-muted-foreground" />
          <span class="text-foreground">{{ contact }}</span>
        </div>

        <!-- Website -->
        <div v-if="hasWebsite" class="flex items-center gap-3 text-sm">
          <GlobeIcon class="h-4 w-4 shrink-0 text-muted-foreground" />
          <a
            :href="website.startsWith('http') ? website : `https://${website}`"
            target="_blank"
            rel="noopener noreferrer"
            class="truncate text-primary hover:underline"
          >
            {{ website }}
          </a>
        </div>
      </template>
    </CardContent>

    <Separator />

    <!-- Quick Stats -->
    <CardHeader class="pb-3 pt-5">
      <CardTitle class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Quick Stats
      </CardTitle>
    </CardHeader>
    <CardContent class="space-y-4 pb-6">
      <template v-if="isLoading">
        <div v-for="n in 2" :key="n" class="flex items-center gap-3">
          <Skeleton class="h-4 w-4 rounded shrink-0" />
          <Skeleton class="h-4 flex-1" />
        </div>
      </template>
      <template v-else>
        <!-- Employee Count -->
        <div class="flex items-center gap-3 text-sm">
          <UsersIcon class="h-4 w-4 shrink-0 text-muted-foreground" />
          <span class="text-foreground">{{ employeeCount }}</span>
        </div>

        <!-- Business Type -->
        <div class="flex items-center gap-3 text-sm">
          <BriefcaseBusinessIcon class="h-4 w-4 shrink-0 text-muted-foreground" />
          <span class="text-foreground">{{ businessType }}</span>
        </div>
      </template>
    </CardContent>
  </Card>
</template>
