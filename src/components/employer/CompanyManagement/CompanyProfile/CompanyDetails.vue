<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import type { BadgeVariants } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import CompanyMap from './CompanyMap.vue'

const props = defineProps<{
  description: string
  hasDescription: boolean
  businessType: string
  industry: string
  registrationNumber: string
  employeeCount: string
  verificationStatus: string
  verificationBadgeVariant: BadgeVariants['variant']
  isLoading: boolean
  latitude: number | null
  longitude: number | null
  companyName: string
}>()
</script>

<template>
  <div class="space-y-6">
    <!-- About Company -->
    <Card>
      <CardHeader>
        <CardTitle class="text-lg font-bold text-foreground">About the Company</CardTitle>
      </CardHeader>
      <CardContent>
        <template v-if="isLoading">
          <div class="space-y-2">
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-3/4" />
          </div>
        </template>
        <template v-else>
          <Label v-if="hasDescription" class="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{{ description }}</Label>
          <Label v-else class="text-sm italic text-muted-foreground">No description provided.</Label>
        </template>
      </CardContent>
    </Card>

    <!-- Business Information -->
    <Card>
      <CardHeader>
        <CardTitle class="text-lg font-bold text-foreground">Business Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <template v-if="isLoading">
            <div v-for="n in 4" :key="n" class="space-y-2">
              <Skeleton class="h-4 w-24" />
              <Skeleton class="h-5 w-40" />
            </div>
          </template>
          <template v-else>
            <!-- Business Type -->
            <div>
              <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Business Type</Label>
              <Label class="text-sm font-medium text-foreground">{{ businessType }}</Label>
            </div>

            <!-- Industry -->
            <div>
              <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Industry</Label>
              <Label class="text-sm font-medium text-foreground">{{ industry }}</Label>
            </div>

            <!-- Registration Number -->
            <div>
              <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Registration Number</Label>
              <Label class="text-sm font-mono font-medium text-foreground">{{ registrationNumber }}</Label>
            </div>

            <!-- Employee Size -->
            <div>
              <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Employee Size</Label>
              <Label class="text-sm font-medium text-foreground">{{ employeeCount }}</Label>
            </div>

            <!-- Verification Status -->
            <div class="md:col-span-2">
              <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Verification Status</Label>
              <Badge :variant="verificationBadgeVariant" class="mt-0.5">{{ verificationStatus }}</Badge>
            </div>
          </template>
        </div>
      </CardContent>
    </Card>

    <!-- Company Location -->
    <Card>
      <CardHeader>
        <CardTitle class="text-lg font-bold text-foreground">Company Location</CardTitle>
      </CardHeader>
      <CardContent>
        <template v-if="isLoading">
          <Skeleton class="h-80 w-full rounded-xl" />
        </template>
        <template v-else>
          <CompanyMap
            :latitude="latitude"
            :longitude="longitude"
            :company-name="companyName"
          />
        </template>
      </CardContent>
    </Card>
  </div>
</template>

