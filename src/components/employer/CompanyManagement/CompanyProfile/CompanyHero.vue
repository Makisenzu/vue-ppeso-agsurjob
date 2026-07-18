<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { BadgeVariants } from '@/components/ui/badge'
import { MapPinIcon, PencilIcon, ExternalLinkIcon } from '@lucide/vue'

const props = defineProps<{
  companyName: string
  companyInitials: string
  industry: string
  address: string
  verificationStatus: string
  verificationBadgeVariant: BadgeVariants['variant']
  website: string
  hasWebsite: boolean
  createdDate: string
  isLoading: boolean
}>()

const emit = defineEmits<{
  'edit-profile': []
  'visit-website': [url: string]
}>()
</script>

<template>
  <Card class="overflow-hidden">
    <CardContent class="p-6 sm:p-8">
      <!-- Skeleton state -->
      <div v-if="isLoading" class="flex flex-col sm:flex-row items-start gap-6">
        <Skeleton class="h-20 w-20 rounded-full shrink-0" />
        <div class="flex-1 space-y-3 w-full">
          <Skeleton class="h-7 w-64" />
          <Skeleton class="h-4 w-40" />
          <Skeleton class="h-4 w-56" />
          <div class="flex gap-3 pt-2">
            <Skeleton class="h-9 w-28" />
            <Skeleton class="h-9 w-32" />
          </div>
        </div>
      </div>

      <!-- Loaded state -->
      <div v-else class="flex flex-col sm:flex-row items-start gap-6">
        <!-- Company Avatar -->
        <Avatar class="h-20 w-20 shrink-0 text-lg border border-border">
          <AvatarFallback class="text-xl font-semibold bg-muted text-muted-foreground">
            {{ companyInitials }}
          </AvatarFallback>
        </Avatar>

        <!-- Company Info -->
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-3 mb-1">
            <h1 class="text-2xl font-bold text-foreground tracking-tight">
              {{ companyName }}
            </h1>
            <Badge :variant="verificationBadgeVariant" class="shrink-0">
              {{ verificationStatus }}
            </Badge>
          </div>

          <p
            v-if="industry !== 'Not specified'"
            class="text-sm font-medium text-muted-foreground mb-1"
          >
            {{ industry }}
          </p>

          <div
            v-if="address !== 'Not specified'"
            class="flex items-center gap-1.5 text-sm text-muted-foreground mb-1"
          >
            <MapPinIcon class="h-3.5 w-3.5 shrink-0" />
            <span class="truncate">{{ address }}</span>
          </div>

          <p
            v-if="createdDate"
            class="text-xs text-muted-foreground/70 mb-4"
          >
            Registered {{ createdDate }}
          </p>

          <!-- Actions -->
          <div class="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" @click="emit('edit-profile')">
              <PencilIcon class="h-3.5 w-3.5 mr-1.5" />
              Edit Profile
            </Button>
            <Button
              v-if="hasWebsite"
              variant="outline"
              size="sm"
              as="a"
              :href="website.startsWith('http') ? website : `https://${website}`"
              target="_blank"
              rel="noopener noreferrer"
              @click="emit('visit-website', website)"
            >
              <ExternalLinkIcon class="h-3.5 w-3.5 mr-1.5" />
              Visit Website
            </Button>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>