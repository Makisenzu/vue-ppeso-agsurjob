<script setup lang="ts">
import { Building2, CalendarDays, Loader2, MapPin, Search, ShieldAlert, Users } from '@lucide/vue'
import CustomBreadcrumbs from '@/components/CustomBreadcrumbs.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useApplicantJobFairDetails } from '@/composables/applicant/useApplicantJobFairDetails'

const {
  fair,
  isLoadingDetails,
  detailsError,
  reload,
  registration,
  registrationClass,
  canRegister,
  canCancel,
  showVerifyAlert,
  verifyTitle,
  verifyLink,
  isSubmitting,
  register,
  isCancelOpen,
  openCancel,
  confirmCancel,
  companySearch,
  hasCompanySearch,
  clearCompanySearch,
  companyCards,
} = useApplicantJobFairDetails()
</script>

<template>
  <div class="mx-auto w-full max-w-5xl min-w-0 flex-1 space-y-6 overflow-x-hidden">
    <CustomBreadcrumbs />

    <Alert v-if="detailsError && !fair" variant="destructive">
      <AlertTitle>The job fair could not be loaded</AlertTitle>
      <AlertDescription class="flex flex-col items-start gap-2">
        {{ detailsError }}
        <Button type="button" variant="outline" size="sm" @click="reload">Try again</Button>
      </AlertDescription>
    </Alert>

    <div v-else-if="!fair" class="space-y-4" aria-busy="true">
      <Skeleton class="h-48 w-full rounded-xl" />
      <Skeleton v-for="i in 3" :key="i" class="h-16 w-full rounded-xl" />
    </div>

    <template v-else>
      <!-- Event -->
      <section class="rounded-xl border bg-card p-5 sm:p-6">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0 space-y-3">
            <div class="flex flex-wrap items-center gap-2">
              <Badge variant="outline" :class="fair.statusClass">{{ fair.status }}</Badge>
              <Badge v-if="registration" variant="outline" :class="registrationClass">{{ registration }}</Badge>
            </div>
            <h1 class="text-2xl font-bold tracking-tight text-pretty sm:text-3xl">{{ fair.title }}</h1>
            <dl class="grid gap-2 text-sm sm:grid-cols-2">
              <div class="flex min-w-0 items-center gap-2">
                <dt class="sr-only">Date</dt>
                <CalendarDays class="size-4 shrink-0 text-muted-foreground" />
                <dd>{{ fair.dateRange }}</dd>
              </div>
              <div class="flex min-w-0 items-center gap-2">
                <dt class="sr-only">Venue</dt>
                <MapPin class="size-4 shrink-0 text-muted-foreground" />
                <dd class="min-w-0 break-words">{{ fair.location }}</dd>
              </div>
              <div class="flex items-center gap-2">
                <dt class="sr-only">Companies</dt>
                <Building2 class="size-4 shrink-0 text-muted-foreground" />
                <dd>{{ fair.companies }}</dd>
              </div>
              <div class="flex items-center gap-2">
                <dt class="sr-only">Openings</dt>
                <Users class="size-4 shrink-0 text-muted-foreground" />
                <dd>{{ fair.openings }}</dd>
              </div>
            </dl>
            <p v-if="fair.description" class="text-sm whitespace-pre-line text-muted-foreground">{{ fair.description }}</p>
            <p v-if="fair.status === 'Cancelled' && fair.status_remarks" class="text-sm text-destructive">{{ fair.status_remarks }}</p>
          </div>

          <div class="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
            <Button v-if="canRegister" class="h-10 w-full sm:h-9 sm:w-auto" :disabled="isSubmitting" @click="register">
              <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
              {{ isSubmitting ? 'Registering...' : 'Register' }}
            </Button>
            <Button
              v-else-if="canCancel"
              variant="outline"
              class="h-10 w-full sm:h-9 sm:w-auto"
              :disabled="isSubmitting"
              @click="openCancel"
            >
              Cancel registration
            </Button>
          </div>
        </div>
      </section>

      <Alert v-if="showVerifyAlert">
        <ShieldAlert />
        <AlertTitle>{{ verifyTitle }}</AlertTitle>
        <AlertDescription class="flex flex-col items-start gap-2">
          You can register once PESO verifies your account.
          <Button as-child variant="outline" size="sm">
            <AppLink :to="verifyLink">Go to my documents</AppLink>
          </Button>
        </AlertDescription>
      </Alert>

      <!-- Companies and their vacancies -->
      <section class="space-y-4">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 class="text-lg font-semibold">Participating companies</h2>
          <div class="relative w-full sm:max-w-xs">
            <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              v-model="companySearch"
              type="search"
              placeholder="Search company or position"
              class="pl-9"
              aria-label="Search companies or positions"
            />
          </div>
        </div>

        <Empty v-if="!companyCards.length" class="rounded-md border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Building2 /></EmptyMedia>
            <EmptyTitle>{{ hasCompanySearch ? 'No matching companies' : 'No confirmed companies yet' }}</EmptyTitle>
            <EmptyDescription>{{ hasCompanySearch ? 'Try another search.' : 'Companies appear here once PESO confirms them.' }}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent v-if="hasCompanySearch">
            <Button variant="outline" @click="clearCompanySearch">Clear search</Button>
          </EmptyContent>
        </Empty>

        <Accordion v-else type="multiple" class="space-y-3" :class="isLoadingDetails ? 'opacity-60' : ''">
          <AccordionItem
            v-for="company in companyCards"
            :key="company.id"
            :value="company.id"
            class="rounded-xl border bg-card px-4 last:border-b sm:px-5"
          >
            <AccordionTrigger class="gap-3 py-4 hover:no-underline">
              <div class="flex min-w-0 flex-1 flex-col gap-1 text-left">
                <span class="truncate font-semibold text-foreground">{{ company.name }}</span>
                <span class="truncate text-xs font-normal text-muted-foreground">{{ company.subtitle }}</span>
              </div>
              <Badge variant="secondary" class="hidden shrink-0 sm:inline-flex">{{ company.summary }}</Badge>
            </AccordionTrigger>
            <AccordionContent class="pb-4">
              <p class="mb-3 text-xs text-muted-foreground sm:hidden">{{ company.summary }}</p>
              <p v-if="!company.vacancies.length" class="text-sm text-muted-foreground">No open vacancies listed yet.</p>
              <ul v-else class="grid gap-3 md:grid-cols-2">
                <li v-for="vacancy in company.vacancies" :key="vacancy.id" class="space-y-3 rounded-lg border p-4">
                  <div class="flex flex-wrap items-center gap-2">
                    <h3 class="font-semibold text-pretty">{{ vacancy.title }}</h3>
                    <Badge v-if="vacancy.natureOfWork" variant="secondary">{{ vacancy.natureOfWork }}</Badge>
                    <Badge v-if="vacancy.acceptsPwd" variant="outline">PWD-friendly</Badge>
                  </div>
                  <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div class="min-w-0">
                      <dt class="text-xs text-muted-foreground">Salary</dt>
                      <dd class="truncate" :title="vacancy.salary">{{ vacancy.salary }}</dd>
                    </div>
                    <div class="min-w-0">
                      <dt class="text-xs text-muted-foreground">Openings</dt>
                      <dd>{{ vacancy.openings }}</dd>
                    </div>
                    <div class="min-w-0">
                      <dt class="text-xs text-muted-foreground">Place of work</dt>
                      <dd class="truncate" :title="vacancy.location">{{ vacancy.location }}</dd>
                    </div>
                    <div class="min-w-0">
                      <dt class="text-xs text-muted-foreground">Education</dt>
                      <dd class="truncate" :title="vacancy.education">{{ vacancy.education }}</dd>
                    </div>
                    <div class="col-span-2 min-w-0">
                      <dt class="text-xs text-muted-foreground">Experience</dt>
                      <dd>{{ vacancy.experience }}</dd>
                    </div>
                  </dl>
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </template>

    <AlertDialog v-model:open="isCancelOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel registration?</AlertDialogTitle>
          <AlertDialogDescription>You can register again while the job fair is open.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="isSubmitting">Keep it</AlertDialogCancel>
          <Button variant="destructive" :disabled="isSubmitting" @click="confirmCancel">
            <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
            {{ isSubmitting ? 'Cancelling...' : 'Cancel registration' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
