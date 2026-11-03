<script setup lang="ts">
import { Building2, CalendarDays, ChevronDown, FileText, Loader2, MapPin, Search, ShieldAlert, Users } from '@lucide/vue'
import CustomBreadcrumbs from '@/components/CustomBreadcrumbs.vue'
import JobFairHero from '@/components/JobFairHero.vue'
import JobFairPhotoStrip from '@/components/JobFairPhotoStrip.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
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
  <!-- Full width like the GIP / SPES / TUPAD pages: breadcrumbs, then the hero edge to edge -->
  <div class="w-full min-w-0 overflow-x-hidden">
    <div class="mx-auto max-w-5xl space-y-6 px-4 pt-4 sm:px-6 lg:px-8" :class="fair ? 'pb-4' : 'pb-12'">
      <CustomBreadcrumbs />

      <Alert v-if="detailsError && !fair" variant="destructive">
        <AlertTitle>The job fair could not be loaded</AlertTitle>
        <AlertDescription class="flex flex-col items-start gap-2">
          {{ detailsError }}
          <Button type="button" variant="outline" size="sm" @click="reload">Try again</Button>
        </AlertDescription>
      </Alert>

      <div v-else-if="!fair" class="space-y-4" aria-busy="true">
        <Skeleton class="h-64 w-full rounded-2xl" />
        <Skeleton v-for="i in 3" :key="i" class="h-16 w-full rounded-xl" />
      </div>
    </div>

    <template v-if="fair">
      <!-- Event: hero like the GIP / SPES / TUPAD pages, over the first picture PESO attached -->
      <JobFairHero eyebrow="PESO Job Fair" :title="fair.title" :background-image="fair.cover">
        <div class="flex flex-wrap items-center gap-2">
          <Badge variant="outline" :class="fair.statusClass">{{ fair.status }}</Badge>
          <Badge v-if="registration" variant="outline" :class="registrationClass">{{ registration }}</Badge>
          <span class="text-xs text-muted-foreground">Posted {{ fair.postedOn }}</span>
        </div>
        <dl class="grid gap-2 text-sm text-foreground sm:grid-cols-2">
          <div class="flex min-w-0 items-center gap-2">
            <dt class="sr-only">Date</dt>
            <CalendarDays class="size-4 shrink-0 text-primary" />
            <dd>{{ fair.dateRange }}</dd>
          </div>
          <div class="flex min-w-0 items-start gap-2">
            <dt class="sr-only">Venue</dt>
            <MapPin class="mt-0.5 size-4 shrink-0 text-primary" />
            <dd class="min-w-0 break-words">{{ fair.location }}</dd>
          </div>
          <div class="flex items-center gap-2">
            <dt class="sr-only">Companies</dt>
            <Building2 class="size-4 shrink-0 text-primary" />
            <dd>{{ fair.companies }}</dd>
          </div>
          <div class="flex items-center gap-2">
            <dt class="sr-only">Openings</dt>
            <Users class="size-4 shrink-0 text-primary" />
            <dd>{{ fair.openings }}</dd>
          </div>
        </dl>
        <div v-if="canRegister || canCancel" class="pt-1">
          <Button v-if="canRegister" size="lg" class="w-full sm:w-auto" :disabled="isSubmitting" @click="register">
            <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
            {{ isSubmitting ? 'Registering...' : 'Register' }}
          </Button>
          <Button v-else size="lg" variant="outline" class="w-full sm:w-auto" :disabled="isSubmitting" @click="openCancel">
            Cancel registration
          </Button>
        </div>
      </JobFairHero>

      <div class="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <p v-if="fair.status === 'Cancelled' && fair.status_remarks" class="text-sm text-destructive">{{ fair.status_remarks }}</p>

        <!-- About and pictures -->
        <section v-if="fair.description || fair.photos.length" class="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
          <h2 class="text-lg font-semibold">About this job fair</h2>
          <p v-if="fair.description" class="text-sm whitespace-pre-line text-muted-foreground">{{ fair.description }}</p>
          <JobFairPhotoStrip :photos="fair.photos" :title="fair.title" />
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
                <ul v-else class="grid items-start gap-3 md:grid-cols-2">
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
                      <div class="col-span-2 min-w-0">
                        <dt class="text-xs text-muted-foreground">Place of work</dt>
                        <dd class="truncate" :title="vacancy.location">{{ vacancy.location }}</dd>
                      </div>
                    </dl>

                    <!-- Qualifications and documents to bring -->
                    <Collapsible v-slot="{ open }" class="border-t pt-3">
                      <CollapsibleTrigger
                        class="flex w-full items-center justify-between gap-2 rounded-md text-sm font-medium text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        {{ open ? 'Hide qualifications' : 'Qualifications & requirements' }}
                        <ChevronDown class="size-4 shrink-0 transition-transform" :class="open ? 'rotate-180' : ''" />
                      </CollapsibleTrigger>
                      <CollapsibleContent class="space-y-4 pt-3">
                        <p v-if="vacancy.description" class="text-sm whitespace-pre-line text-muted-foreground">
                          {{ vacancy.description }}
                        </p>

                        <div class="space-y-2">
                          <h4 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Qualifications</h4>
                          <dl class="grid gap-2 text-sm">
                            <div v-for="item in vacancy.qualifications" :key="item.label" class="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
                              <dt class="text-muted-foreground">{{ item.label }}</dt>
                              <dd class="min-w-0 break-words">{{ item.value }}</dd>
                            </div>
                          </dl>
                        </div>

                        <div v-if="vacancy.skills.length" class="space-y-2">
                          <h4 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Skills</h4>
                          <ul class="flex flex-wrap gap-1.5">
                            <li v-for="skill in vacancy.skills" :key="skill.name">
                              <Badge :variant="skill.isRequired ? 'default' : 'outline'">
                                {{ skill.name }}<span v-if="!skill.isRequired" class="sr-only"> (nice to have)</span>
                              </Badge>
                            </li>
                          </ul>
                          <p class="text-xs text-muted-foreground">Filled badges are must-haves.</p>
                        </div>

                        <div class="space-y-2">
                          <h4 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Documents to bring</h4>
                          <p v-if="!vacancy.requirements.length" class="text-sm text-muted-foreground">None listed.</p>
                          <ul v-else class="space-y-1.5 text-sm">
                            <li v-for="requirement in vacancy.requirements" :key="requirement.name" class="flex items-start gap-2">
                              <FileText class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                              <span class="min-w-0">
                                {{ requirement.name }}
                                <span v-if="requirement.isOptional" class="text-muted-foreground">(optional)</span>
                              </span>
                            </li>
                          </ul>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </div>
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
