<script setup lang="ts">
import { CalendarDays } from '@lucide/vue'
import CustomBreadcrumbs from '@/components/CustomBreadcrumbs.vue'
import JobFairEventCard from '@/components/JobFairEventCard.vue'
import JobFairListToolbar from '@/components/JobFairListToolbar.vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useEmployerJobFairs } from '@/composables/employer/useEmployerJobFairs'

const { scopeModel, searchInput, hasSearch, clearSearch, cards, isLoading, errorMessage, reload } = useEmployerJobFairs()
</script>

<template>
  <div class="mx-auto w-full min-w-0 max-w-6xl flex-1 space-y-6 overflow-x-hidden px-0 sm:px-6 lg:px-8">
    <CustomBreadcrumbs />

    <div>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Job Fairs</h1>
      <p class="text-sm text-muted-foreground">Join a PESO job fair and offer your openings there.</p>
    </div>

    <JobFairListToolbar v-model:scope="scopeModel" v-model:search="searchInput" />

    <Alert v-if="errorMessage && !cards.length" variant="destructive">
      <AlertTitle>Job fairs could not be loaded</AlertTitle>
      <AlertDescription class="flex flex-col items-start gap-2">
        {{ errorMessage }}
        <Button type="button" variant="outline" size="sm" @click="reload">Try again</Button>
      </AlertDescription>
    </Alert>

    <div v-else-if="isLoading && !cards.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      <Skeleton v-for="i in 6" :key="i" class="h-52 w-full rounded-xl" />
    </div>

    <Empty v-else-if="!cards.length" class="rounded-md border">
      <EmptyHeader>
        <EmptyMedia variant="icon"><CalendarDays /></EmptyMedia>
        <EmptyTitle>{{ hasSearch ? 'No matching job fairs' : scopeModel === 'past' ? 'No past job fairs' : 'No job fairs scheduled' }}</EmptyTitle>
        <EmptyDescription>{{ hasSearch ? 'Try another search.' : 'Check back soon.' }}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent v-if="hasSearch">
        <Button variant="outline" @click="clearSearch">Clear search</Button>
      </EmptyContent>
    </Empty>

    <ul v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" :class="isLoading ? 'opacity-60' : ''">
      <li v-for="card in cards" :key="card.id">
        <JobFairEventCard :card="card" :to="card.to" :action-label="card.badge ? 'Manage' : 'View details'" />
      </li>
    </ul>
  </div>
</template>
