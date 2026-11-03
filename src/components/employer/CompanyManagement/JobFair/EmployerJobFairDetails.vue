<script setup lang="ts">
import { BriefcaseBusiness, Building2, CalendarDays, Loader2, MapPin, Pencil, Plus, ShieldAlert, Trash2, Users } from '@lucide/vue'
import CustomBreadcrumbs from '@/components/CustomBreadcrumbs.vue'
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
  <div class="mx-auto w-full min-w-0 max-w-5xl flex-1 space-y-6 overflow-x-hidden px-0 sm:px-6 lg:px-8">
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
      <Skeleton class="h-40 w-full rounded-xl" />
    </div>

    <template v-else>
      <!-- Event and participation -->
      <section class="rounded-xl border bg-card p-5 sm:p-6">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0 space-y-3">
            <div class="flex flex-wrap items-center gap-2">
              <Badge variant="outline" :class="fair.statusClass">{{ fair.status }}</Badge>
              <Badge v-if="participation" variant="outline" :class="participationClass">{{ participation }}</Badge>
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
                <dd>{{ fair.companies }} confirmed</dd>
              </div>
              <div class="flex items-center gap-2">
                <dt class="sr-only">Openings</dt>
                <Users class="size-4 shrink-0 text-muted-foreground" />
                <dd>{{ fair.openings }}</dd>
              </div>
            </dl>
            <p v-if="fair.description" class="text-sm whitespace-pre-line text-muted-foreground">{{ fair.description }}</p>
            <p v-if="participationNote" class="text-sm text-foreground">{{ participationNote }}</p>
          </div>

          <div class="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
            <Button v-if="canJoin" class="h-10 w-full sm:h-9 sm:w-auto" :disabled="isJoining" @click="join">
              <Loader2 v-if="isJoining" class="size-4 animate-spin" />
              {{ isJoining ? 'Joining...' : 'Join job fair' }}
            </Button>
            <Button
              v-if="canWithdraw"
              variant="outline"
              class="h-10 w-full sm:h-9 sm:w-auto"
              :disabled="isSubmitting"
              @click="openWithdraw"
            >
              Withdraw
            </Button>
          </div>
        </div>
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
