<script setup lang="ts">
import { CircleCheck, CircleDashed, GraduationCap, Landmark } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useGipApplication } from '@/composables/applicant/useGipApplication'

const {
  hero,
  eligibility,
  requirements,
  steps,
  myApplication,
  isLoading,
  errorMessage,
  hasRegistryRecord,
  status,
  statusDescription,
  statusRemarks,
  documents,
  submittedCount,
  appointments,
  appliedOn,
  reload,
} = useGipApplication()

const STATUS_BADGE_CLASS: Record<string, string> = {
  Pending: 'bg-warning/10 text-warning border-warning/30',
  Approved: 'bg-success/10 text-success border-success/30',
  Hired: 'bg-primary/10 text-primary border-primary/30',
  Rejected: 'bg-destructive/10 text-destructive border-destructive/30',
}

const APPOINTMENT_BADGE_CLASS: Record<string, string> = {
  Active: 'bg-success/10 text-success border-success/30',
  'Expiring Soon': 'bg-warning/10 text-warning border-warning/30',
  Terminated: 'bg-destructive/10 text-destructive border-destructive/30',
}
</script>

<template>
  <!-- Single root: App.vue's out-in <transition> needs one -->
  <div class="pb-16">
    <!-- ─── Hero: full-bleed band like the public page heroes (LandingPageHero.vue) ─── -->
    <section aria-labelledby="gip-hero-title" class="relative isolate w-full overflow-hidden bg-muted">
      <template v-if="hero.backgroundImage">
        <img :src="hero.backgroundImage" alt="" fetchpriority="high" class="absolute inset-0 -z-10 size-full object-cover" />
        <div class="absolute inset-0 -z-10 bg-background/80 md:bg-transparent md:bg-linear-to-r md:from-background md:via-background/80 md:to-background/10" />
      </template>

      <div class="mx-auto flex min-h-[18rem] max-w-7xl items-center px-4 py-14 sm:min-h-[22rem] sm:px-6 sm:py-16 lg:min-h-[24rem] lg:px-8">
        <div class="flex max-w-2xl flex-col gap-4">
          <p class="text-sm font-semibold tracking-wide text-primary uppercase">{{ hero.eyebrow }}</p>
          <h1 id="gip-hero-title" class="text-4xl leading-tight font-extrabold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
            {{ hero.title }}
          </h1>
          <p class="text-base text-pretty text-muted-foreground sm:text-lg">{{ hero.description }}</p>
          <div class="flex flex-wrap gap-3 pt-2">
            <Button as-child size="lg">
              <a href="#my-gip-application">My GIP Application</a>
            </Button>
            <Button as-child size="lg" variant="outline">
              <a href="#gip-requirements">View requirements</a>
            </Button>
          </div>
        </div>
      </div>
    </section>

    <div class="mx-auto flex max-w-7xl flex-col gap-12 px-4 pt-10 sm:px-6 lg:px-8">
      <!-- ─── My application ─── -->
      <section id="my-gip-application" aria-labelledby="my-gip-title" class="flex scroll-mt-20 flex-col gap-4">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="my-gip-title" class="text-xl font-bold tracking-tight text-foreground sm:text-2xl">My GIP Application</h2>
          <Badge
            v-if="myApplication && !isLoading"
            variant="outline"
            class="self-start sm:self-auto"
            :class="STATUS_BADGE_CLASS[status]"
          >
            {{ status }}
          </Badge>
        </div>

        <div v-if="isLoading" class="grid gap-4 lg:grid-cols-[2fr_3fr]">
          <Skeleton class="h-40 w-full" />
          <Skeleton class="h-40 w-full" />
        </div>

        <Alert v-else-if="errorMessage" variant="destructive">
          <AlertTitle>Your GIP application could not be loaded</AlertTitle>
          <AlertDescription class="flex flex-col items-start gap-2">
            {{ errorMessage }}
            <Button type="button" variant="outline" size="sm" @click="reload">Try again</Button>
          </AlertDescription>
        </Alert>

        <!-- ─── Not referred ─── -->
        <Empty v-else-if="!hasRegistryRecord || !myApplication" class="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GraduationCap />
            </EmptyMedia>
            <EmptyTitle>You have not been referred to GIP</EmptyTitle>
            <EmptyDescription>
              Visit your PESO office with the requirements below. Once PESO refers you to GIP, your application and its
              status will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>

        <div v-else class="grid gap-4 lg:grid-cols-[2fr_3fr]">
          <Card>
            <CardHeader>
              <CardTitle class="text-base">Status</CardTitle>
              <CardDescription>Applied {{ appliedOn }}</CardDescription>
            </CardHeader>
            <CardContent class="flex flex-col gap-3">
              <p class="text-sm text-foreground">{{ statusDescription }}</p>
              <div v-if="statusRemarks" class="rounded-md border border-destructive/20 bg-destructive/5 p-3">
                <p class="text-xs font-semibold text-destructive uppercase">Remarks</p>
                <p class="text-sm text-pretty text-foreground">{{ statusRemarks }}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle class="text-base">Documents</CardTitle>
              <CardDescription>{{ submittedCount }} of {{ documents.length }} received by PESO</CardDescription>
            </CardHeader>
            <CardContent>
              <ul class="grid gap-2 sm:grid-cols-2">
                <li v-for="doc in documents" :key="doc.name" class="flex items-center gap-2 text-sm">
                  <CircleCheck v-if="doc.submitted" class="size-4 shrink-0 text-success" />
                  <CircleDashed v-else class="size-4 shrink-0 text-muted-foreground" />
                  <span :class="doc.submitted ? 'text-foreground' : 'text-muted-foreground'">{{ doc.name }}</span>
                  <span class="sr-only">{{ doc.submitted ? '(received)' : '(not yet received)' }}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <!-- Internship terms, once PESO appoints the applicant -->
          <Card v-if="appointments.length" class="lg:col-span-2">
            <CardHeader>
              <CardTitle class="text-base">Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <ul class="flex flex-col divide-y divide-border">
                <li
                  v-for="appointment in appointments"
                  :key="appointment.id"
                  class="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div class="flex items-start gap-3">
                    <Landmark class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div class="flex flex-col gap-0.5">
                      <p class="text-sm font-semibold text-foreground">{{ appointment.assigned_office }}</p>
                      <p class="text-xs text-muted-foreground">
                        Term {{ appointment.term_number }} · {{ appointment.program }} · {{ appointment.appointment_code }}
                      </p>
                      <p class="text-xs text-muted-foreground">
                        {{ appointment.period }} · ₱{{ appointment.daily_stipend }}/day
                        <template v-if="appointment.supervisor"> · Supervisor: {{ appointment.supervisor }}</template>
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" class="self-start" :class="APPOINTMENT_BADGE_CLASS[appointment.status]">
                    {{ appointment.status }}
                  </Badge>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <!-- ─── Eligibility & requirements ─── -->
      <section id="gip-requirements" aria-labelledby="gip-requirements-title" class="flex scroll-mt-20 flex-col gap-4">
        <h2 id="gip-requirements-title" class="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Eligibility and requirements
        </h2>
        <div class="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle class="text-base">Who can apply</CardTitle>
            </CardHeader>
            <CardContent>
              <ul class="flex flex-col gap-2">
                <li v-for="item in eligibility" :key="item" class="flex items-start gap-2 text-sm text-foreground">
                  <CircleCheck class="mt-0.5 size-4 shrink-0 text-primary" />
                  {{ item }}
                </li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle class="text-base">Requirements</CardTitle>
              <CardDescription>Bring these to your PESO office.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul class="flex flex-col gap-2">
                <li v-for="doc in requirements" :key="doc" class="flex items-start gap-2 text-sm text-foreground">
                  <CircleCheck class="mt-0.5 size-4 shrink-0 text-primary" />
                  {{ doc }}
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <!-- ─── How it works: numbered, the order is the path an applicant takes ─── -->
      <section aria-labelledby="gip-steps-title" class="flex flex-col gap-4">
        <h2 id="gip-steps-title" class="text-xl font-bold tracking-tight text-foreground sm:text-2xl">How GIP works</h2>
        <ol class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <li v-for="(step, index) in steps" :key="step.title" class="flex flex-col gap-2 border-t border-border pt-4">
            <span class="text-sm font-semibold text-muted-foreground tabular-nums" aria-hidden="true">
              {{ String(index + 1).padStart(2, '0') }}
            </span>
            <h3 class="text-base font-semibold text-foreground">{{ step.title }}</h3>
            <p class="text-sm text-pretty text-muted-foreground">{{ step.description }}</p>
          </li>
        </ol>
      </section>
    </div>
  </div>
</template>
