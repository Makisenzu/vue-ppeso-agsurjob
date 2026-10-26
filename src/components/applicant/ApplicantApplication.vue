<script setup lang="ts">
import { ArrowRight, Check, ClipboardList, X } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useApplicationStatus } from '@/composables/applicant/useApplicationStatus'

const { filter, filters, items, isLoading, errorMessage, emptyMessage, reload } = useApplicationStatus()

const STAGE_BADGE_CLASS: Record<string, string> = {
  review: 'bg-warning/10 text-warning border-warning/30',
  submitted: 'bg-warning/10 text-warning border-warning/30',
  approved: 'bg-success/10 text-success border-success/30',
  deployed: 'bg-primary/10 text-primary border-primary/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-16">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Application Status</h1>
      <p class="text-sm text-muted-foreground">Every application you sent, to PESO programs and job vacancies.</p>
    </div>

    <!-- ─── Filter ─── -->
    <div class="flex flex-wrap gap-2" role="tablist" aria-label="Filter applications">
      <Button
        v-for="item in filters"
        :key="item.value"
        type="button"
        size="sm"
        role="tab"
        :aria-selected="filter === item.value"
        :variant="filter === item.value ? 'default' : 'outline'"
        class="cursor-pointer"
        @click="filter = item.value"
      >
        {{ item.label }}
        <span class="tabular-nums opacity-70">{{ item.count }}</span>
      </Button>
    </div>

    <div v-if="isLoading" class="flex flex-col gap-3" aria-busy="true">
      <Skeleton v-for="i in 3" :key="i" class="h-32 w-full" />
    </div>

    <Alert v-else-if="errorMessage" variant="destructive">
      <AlertTitle>Your applications could not be loaded</AlertTitle>
      <AlertDescription class="flex flex-col items-start gap-2">
        {{ errorMessage }}
        <Button type="button" variant="outline" size="sm" @click="reload">Try again</Button>
      </AlertDescription>
    </Alert>

    <Empty v-else-if="!items.length" class="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ClipboardList />
        </EmptyMedia>
        <EmptyTitle>No applications yet</EmptyTitle>
        <EmptyDescription>{{ emptyMessage }}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent v-if="filter !== 'vacancy'">
        <Button as-child variant="outline">
          <RouterLink :to="{ name: 'gip-application' }">Browse PESO programs</RouterLink>
        </Button>
      </EmptyContent>
    </Empty>

    <!-- ─── Applications ─── -->
    <ul v-else class="flex flex-col">
      <li v-for="item in items" :key="item.key" class="flex flex-col gap-4 border-t border-border py-5 last:border-b">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="flex min-w-0 flex-col gap-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-semibold tracking-wide text-primary uppercase">{{ item.source }}</span>
              <span class="text-xs text-muted-foreground">· {{ item.kind === 'program' ? 'PESO Program' : 'Vacancy' }}</span>
            </div>
            <h2 class="text-base font-semibold text-pretty text-foreground sm:text-lg">{{ item.title }}</h2>
            <p class="text-xs text-muted-foreground">
              {{ item.reference }} · Applied {{ item.appliedOn }} · Updated {{ item.updatedOn }}
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-3">
            <Badge variant="outline" :class="STAGE_BADGE_CLASS[item.stage]">{{ item.status }}</Badge>
            <Button as-child variant="ghost" size="sm">
              <RouterLink :to="item.to">
                View <ArrowRight class="size-4" />
              </RouterLink>
            </Button>
          </div>
        </div>

        <!-- Progress: Submitted → Under review → Approved / Not approved → Deployed -->
        <ol class="flex w-full max-w-xl items-start" :aria-label="`${item.source} application progress`">
          <li
            v-for="(step, index) in item.progress"
            :key="step.title"
            class="relative flex flex-1 flex-col items-center gap-1"
            :aria-current="step.state === 'active' ? 'step' : undefined"
          >
            <span
              v-if="index !== item.progress.length - 1"
              class="absolute top-2.5 right-[calc(-50%+12px)] left-[calc(50%+12px)] h-0.5 rounded-full"
              :class="step.state === 'completed' ? 'bg-primary' : 'bg-border'"
              aria-hidden="true"
            />
            <span
              class="z-10 flex size-5 items-center justify-center rounded-full border text-[10px] font-semibold"
              :class="{
                'border-primary bg-primary text-primary-foreground': step.state === 'completed',
                'border-primary bg-background text-foreground ring-4 ring-primary/15': step.state === 'active',
                'border-border bg-background text-muted-foreground': step.state === 'upcoming',
                'border-destructive bg-destructive text-primary-foreground': step.state === 'rejected',
              }"
            >
              <Check v-if="step.state === 'completed'" class="size-3" />
              <X v-else-if="step.state === 'rejected'" class="size-3" />
              <span v-else>{{ index + 1 }}</span>
            </span>
            <span
              class="text-center text-[11px] font-medium"
              :class="{
                'text-foreground': step.state === 'active' || step.state === 'completed',
                'text-destructive': step.state === 'rejected',
                'text-muted-foreground': step.state === 'upcoming',
              }"
            >
              {{ step.title }}
            </span>
          </li>
        </ol>

        <!-- Remarks set apart: they are PESO's own words -->
        <div v-if="item.remarks" class="border-l-2 border-destructive pl-3">
          <p class="text-xs font-semibold text-destructive uppercase">Remarks</p>
          <p class="text-sm text-pretty text-foreground">{{ item.remarks }}</p>
        </div>
      </li>
    </ul>
  </div>
</template>
