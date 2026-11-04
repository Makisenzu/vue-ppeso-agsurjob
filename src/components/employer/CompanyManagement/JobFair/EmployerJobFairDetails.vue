<script setup lang="ts">
import { BriefcaseBusiness, Building2, ExternalLink, CalendarDays, Loader2, MapPin, Pencil, Plus, ShieldAlert, Trash2, Users } from '@lucide/vue'
import CustomBreadcrumbs from '@/components/CustomBreadcrumbs.vue'
import JobFairHero from '@/components/JobFairHero.vue'
import JobFairMapPreview from '@/components/JobFairMapPreview.vue'
import JobFairPhotoStrip from '@/components/JobFairPhotoStrip.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import JobFairOfferDialog from '@/components/employer/CompanyManagement/JobFair/JobFairOfferDialog.vue'
import JobFairOpeningsDialog from '@/components/employer/CompanyManagement/JobFair/JobFairOpeningsDialog.vue'
import { useEmployerJobFairDetails } from '@/composables/employer/useEmployerJobFairDetails'

const {
  fair,
  isLoadingDetails,
  detailsError,
  reload,
  isSubmitting,
  participation,
  participationClass,
  participationNote,
  hasJoined,
  canJoin,
  showVerifyAlert,
  isJoining,
  join,
  canWithdraw,
  isWithdrawOpen,
  openWithdraw,
  confirmWithdraw,
  canManageOffers,
  offerRows,
  availablePostings,
  newPostingLink,
  busyOfferId,
  openAddOffer,
  openEditOffer,
  offerToRemove,
  isRemoveOpen,
  openRemoveOffer,
  confirmRemoveOffer,
} = useEmployerJobFairDetails()
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
        <Skeleton class="h-40 w-full rounded-xl" />
      </div>
    </div>

    <template v-if="fair">
      <!-- Event and participation: hero like the GIP / SPES / TUPAD pages, over the first picture PESO attached -->
      <JobFairHero eyebrow="PESO Job Fair" :title="fair.title" :background-image="fair.cover">
        <div class="flex flex-wrap items-center gap-2">
          <Badge variant="outline" :class="fair.statusClass">{{ fair.status }}</Badge>
          <Badge v-if="participation" variant="outline" :class="participationClass">{{ participation }}</Badge>
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
            <dd>{{ fair.companies }} confirmed</dd>
          </div>
          <div class="flex items-center gap-2">
            <dt class="sr-only">Openings</dt>
            <Users class="size-4 shrink-0 text-primary" />
            <dd>{{ fair.openings }}</dd>
          </div>
        </dl>
        <p v-if="participationNote" class="text-sm text-foreground">{{ participationNote }}</p>
        <div v-if="canJoin || canWithdraw" class="flex flex-col gap-2 pt-1 sm:flex-row">
          <Button v-if="canJoin" size="lg" class="w-full sm:w-auto" :disabled="isJoining" @click="join">
            <Loader2 v-if="isJoining" class="size-4 animate-spin" />
            {{ isJoining ? 'Joining...' : 'Join job fair' }}
          </Button>
          <Button v-if="canWithdraw" size="lg" variant="outline" class="w-full sm:w-auto" :disabled="isSubmitting" @click="openWithdraw">
            Withdraw
          </Button>
        </div>
        <template v-if="fair.map" #aside>
          <figure class="flex flex-col gap-3">
            <JobFairMapPreview
              class="h-64 shadow-lg sm:h-72 lg:h-80"
              :latitude="fair.map.latitude"
              :longitude="fair.map.longitude"
              :label="fair.location"
            />
            <figcaption class="flex items-center justify-between gap-3 text-sm">
              <span class="min-w-0 truncate text-muted-foreground" :title="fair.location">{{ fair.location }}</span>
              <Button as-child variant="outline" size="sm" class="shrink-0">
                <AppLink :href="fair.map.directionsUrl" target="_blank">
                  Directions
                  <ExternalLink class="size-4" />
                </AppLink>
              </Button>
            </figcaption>
          </figure>
        </template>
      </JobFairHero>

      <div class="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <!-- About and pictures -->
        <section v-if="fair.description || fair.photos.length" class="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
          <h2 class="text-lg font-semibold">About this job fair</h2>
          <p v-if="fair.description" class="text-sm whitespace-pre-line text-muted-foreground">{{ fair.description }}</p>
          <JobFairPhotoStrip :photos="fair.photos" :title="fair.title" />
        </section>

        <Alert v-if="showVerifyAlert">
          <ShieldAlert />
          <AlertTitle>Waiting for PESO verification</AlertTitle>
          <AlertDescription>You can join job fairs once PESO approves your company documents.</AlertDescription>
        </Alert>

        <!-- Vacancies offered at the fair -->
        <section v-if="hasJoined" class="space-y-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 class="text-lg font-semibold">Your vacancies at this job fair</h2>
            <div v-if="canManageOffers" class="flex flex-col gap-2 sm:flex-row">
              <Button as-child variant="outline" class="h-10 w-full sm:h-9 sm:w-auto">
                <AppLink :to="newPostingLink">Post a new job</AppLink>
              </Button>
              <Button class="h-10 w-full sm:h-9 sm:w-auto" :disabled="!availablePostings.length" @click="openAddOffer">
                <Plus class="size-4" />
                Add vacancy
              </Button>
            </div>
          </div>

          <Empty v-if="!offerRows.length" class="rounded-md border">
            <EmptyHeader>
              <EmptyMedia variant="icon"><BriefcaseBusiness /></EmptyMedia>
              <EmptyTitle>No vacancies yet</EmptyTitle>
              <EmptyDescription>
                {{ canManageOffers ? 'Add an open posting or post a new job.' : 'Nothing was offered at this job fair.' }}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent v-if="canManageOffers && availablePostings.length">
              <Button variant="outline" @click="openAddOffer">Add vacancy</Button>
            </EmptyContent>
          </Empty>

          <ul v-else class="divide-y rounded-xl border bg-card" :class="isLoadingDetails ? 'opacity-60' : ''">
            <li
              v-for="row in offerRows"
              :key="row.id"
              class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div class="min-w-0 space-y-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-semibold text-pretty">{{ row.title }}</span>
                  <Badge v-if="row.natureOfWork" variant="secondary">{{ row.natureOfWork }}</Badge>
                  <Badge v-if="!row.isOpen" variant="outline">{{ row.status }}</Badge>
                </div>
                <p class="text-sm text-muted-foreground">{{ row.openings }} · {{ row.salary }}</p>
              </div>
              <div v-if="canManageOffers" class="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  class="h-10 flex-1 sm:h-8 sm:flex-none"
                  :disabled="busyOfferId === row.id"
                  @click="openEditOffer(row.offer)"
                >
                  <Pencil class="size-4" />
                  Openings
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  class="h-10 flex-1 text-destructive hover:text-destructive sm:h-8 sm:flex-none"
                  :disabled="busyOfferId === row.id"
                  @click="openRemoveOffer(row.offer)"
                >
                  <Trash2 class="size-4" />
                  Remove
                </Button>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </template>

    <JobFairOfferDialog />
    <JobFairOpeningsDialog />

    <AlertDialog v-model:open="isRemoveOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove vacancy?</AlertDialogTitle>
          <AlertDialogDescription>
            "{{ offerToRemove?.position_title }}" will no longer be offered at this job fair. The job posting stays.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="!!busyOfferId">Keep it</AlertDialogCancel>
          <Button variant="destructive" :disabled="!!busyOfferId" @click="confirmRemoveOffer">
            <Loader2 v-if="busyOfferId" class="size-4 animate-spin" />
            {{ busyOfferId ? 'Removing...' : 'Remove' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog v-model:open="isWithdrawOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Withdraw from this job fair?</AlertDialogTitle>
          <AlertDialogDescription>Your vacancies here will be removed. Your job postings stay.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="isSubmitting">Stay</AlertDialogCancel>
          <Button variant="destructive" :disabled="isSubmitting" @click="confirmWithdraw">
            <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
            {{ isSubmitting ? 'Withdrawing...' : 'Withdraw' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
