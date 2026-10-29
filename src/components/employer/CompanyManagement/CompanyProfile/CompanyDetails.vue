<script setup lang="ts">
import { Pencil } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import CompanyMap from './CompanyMap.vue'
import CompanyTeam from './CompanyTeam.vue'
import type { CompanyProfileSection } from '@/types/employer/companyProfile'

/** Main column of the company profile, in the card style of the Account page; each section edits on its own. */
const props = defineProps<{
  details: { label: string; value: string }[]
  contactDetails: { label: string; value: string }[]
  description: string
  hasDescription: boolean
  isLoading: boolean
  latitude: number | null
  longitude: number | null
  companyName: string
}>()

const emit = defineEmits<{ edit: [section: CompanyProfileSection] }>()

const rowSections = [
  { key: 'details', title: 'Company Details', description: 'The employer half of your NSRP Form 2.' },
  { key: 'contact', title: 'Contact & Address', description: 'How PESO and applicants reach your company.' },
] as const
</script>

<template>
  <div class="space-y-6">
    <Card v-for="section in rowSections" :key="section.key">
      <CardHeader>
        <CardTitle>{{ section.title }}</CardTitle>
        <CardDescription>{{ section.description }}</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" :disabled="props.isLoading" @click="emit('edit', section.key)">
            <Pencil class="size-3.5" />
            Edit
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <dl class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <template v-if="props.isLoading">
            <div v-for="n in 6" :key="n" class="space-y-1.5">
              <Skeleton class="h-3 w-24" />
              <Skeleton class="h-4 w-40" />
            </div>
          </template>
          <div
            v-for="row in section.key === 'details' ? props.details : props.contactDetails"
            v-else
            :key="row.label"
            class="min-w-0"
          >
            <dt class="text-xs text-muted-foreground">{{ row.label }}</dt>
            <dd class="truncate text-sm font-medium text-foreground" :title="row.value">{{ row.value || '—' }}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>About the Company</CardTitle>
        <CardAction>
          <Button variant="outline" size="sm" :disabled="props.isLoading" @click="emit('edit', 'about')">
            <Pencil class="size-3.5" />
            Edit
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div v-if="props.isLoading" class="space-y-2">
          <Skeleton class="h-4 w-full" />
          <Skeleton class="h-4 w-full" />
          <Skeleton class="h-4 w-3/4" />
        </div>
        <p v-else-if="props.hasDescription" class="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {{ props.description }}
        </p>
        <p v-else class="text-sm italic text-muted-foreground">No description provided.</p>
      </CardContent>
    </Card>

    <CompanyTeam />

    <Card>
      <CardHeader>
        <CardTitle>Company Location</CardTitle>
        <CardDescription>Where applicants find your office.</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" :disabled="props.isLoading" @click="emit('edit', 'location')">
            <Pencil class="size-3.5" />
            Edit
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Skeleton v-if="props.isLoading" class="h-48 w-full rounded-xl sm:h-56" />
        <CompanyMap v-else :latitude="props.latitude" :longitude="props.longitude" :company-name="props.companyName" />
      </CardContent>
    </Card>
  </div>
</template>
