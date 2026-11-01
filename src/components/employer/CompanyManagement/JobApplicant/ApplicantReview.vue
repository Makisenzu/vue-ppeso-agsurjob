<script setup lang="ts">
import { ArrowLeft, Eye, FileText, Loader2, Star } from '@lucide/vue'
import CustomBreadcrumbs from '@/components/CustomBreadcrumbs.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import JobVacancyFitCriteria from '@/components/JobVacancyFitCriteria.vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useApplicantReview } from '@/composables/employer/useApplicantReview'

/** Review page of one applicant: their details and files, and the form that moves them to another hiring step */
const {
  applicantsRoute,
  review,
  isLoading,
  errorMessage,
  reload,
  isShortlisted,
  isShortlistBusy,
  toggleShortlist,
  fit,
  isLoadingFit,
  fitDisclaimer,
  fitMethodNote,
  stage,
  stageOptions,
  remarks,
  remarksError,
  isRemarksRequired,
  hasStageChange,
  isSavingStage,
  saveStage,
} = useApplicantReview()
</script>

<template>
  <div class="mx-auto w-full min-w-0 max-w-6xl flex-1 space-y-6 overflow-x-hidden px-0 sm:px-6 lg:px-8">
    <CustomBreadcrumbs />

    <AppLink
      :to="applicantsRoute"
      class="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft class="size-4" /> Applicants
    </AppLink>

    <Alert v-if="errorMessage" variant="destructive">
      <AlertTitle>The application could not be opened</AlertTitle>
      <AlertDescription class="flex flex-col items-start gap-2">
        {{ errorMessage }}
        <Button type="button" variant="outline" size="sm" @click="reload">Try again</Button>
      </AlertDescription>
    </Alert>

    <!-- Loading -->
    <div v-else-if="!review && isLoading" class="space-y-6" aria-busy="true">
      <div class="flex items-center gap-4">
        <Skeleton class="size-16 rounded-full" />
        <div class="space-y-2">
          <Skeleton class="h-7 w-56" />
          <Skeleton class="h-4 w-40" />
        </div>
      </div>
      <div class="grid gap-6 lg:grid-cols-3">
        <Skeleton class="h-80 w-full rounded-lg lg:col-span-2" />
        <Skeleton class="h-56 w-full rounded-lg" />
      </div>
    </div>

    <template v-else-if="review">
      <!-- Applicant -->
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar class="size-16 shrink-0 border">
          <AvatarImage v-if="review.avatarUrl" :src="review.avatarUrl" :alt="review.name" class="object-cover" />
          <AvatarFallback class="text-lg font-semibold">{{ review.initials }}</AvatarFallback>
        </Avatar>
        <div class="min-w-0 flex-1 space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-2xl font-bold tracking-tight text-pretty sm:text-3xl">{{ review.name }}</h1>
            <Badge variant="outline" :class="review.stageClass">{{ review.stageLabel }}</Badge>
          </div>
          <p class="text-sm text-muted-foreground">
            {{ review.position }} · {{ review.reference }} · Applied {{ review.appliedOn }}
          </p>
        </div>
        <!-- Private to the company: the applicant isn't told -->
        <Button
          type="button"
          variant="outline"
          class="h-10 w-full shrink-0 sm:h-9 sm:w-auto"
          :class="isShortlisted ? 'border-primary bg-primary/5' : ''"
          :aria-pressed="isShortlisted"
          :disabled="isShortlistBusy"
          @click="toggleShortlist"
        >
          <Star class="size-4" :class="isShortlisted ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'" />
          {{ isShortlisted ? 'Shortlisted' : 'Shortlist' }}
        </Button>
      </header>

      <div class="grid items-start gap-6 lg:grid-cols-3">
        <div class="space-y-6 lg:col-span-2">
          <section class="rounded-lg border bg-card p-4 sm:p-6" aria-labelledby="applicant-details-title">
            <h2 id="applicant-details-title" class="text-base font-semibold">Details</h2>
            <dl class="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <div v-for="detail in review.details" :key="detail.label" class="min-w-0">
                <dt class="text-xs text-muted-foreground">{{ detail.label }}</dt>
                <dd class="text-sm font-medium break-words">{{ detail.value }}</dd>
              </div>
            </dl>
          </section>

          <!-- Requirements fit: advisory, the employer still decides from the documents -->
          <section class="rounded-lg border bg-card p-4 sm:p-6" aria-labelledby="applicant-fit-title">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 id="applicant-fit-title" class="text-base font-semibold">Requirements fit</h2>
              <div v-if="fit?.bandLabel" class="flex items-center gap-2">
                <span class="text-sm text-muted-foreground tabular-nums">{{ fit.score }}%</span>
                <Badge variant="outline" :class="fit.bandClass">{{ fit.bandLabel }}</Badge>
              </div>
            </div>
            <div v-if="isLoadingFit && !fit" class="mt-4 space-y-3" aria-busy="true">
              <Skeleton v-for="i in 3" :key="i" class="h-10 w-full" />
            </div>
            <p v-else-if="!fit" class="mt-2 text-sm text-muted-foreground">The fit could not be computed for this application.</p>
            <p v-else-if="!fit.hasCriteria" class="mt-2 text-sm text-muted-foreground">
              This posting has no requirements to compare. Add skills, education or experience to the posting to see a fit.
            </p>
            <template v-else>
              <p v-if="fit.counts" class="mt-1 text-sm text-muted-foreground">{{ fit.counts }}</p>
              <JobVacancyFitCriteria :criteria="fit.criteria" class="mt-2" />
              <p class="mt-3 text-xs text-muted-foreground">{{ fitDisclaimer }}</p>
              <details class="mt-1 text-xs text-muted-foreground">
                <summary class="w-fit cursor-pointer hover:text-foreground">How is this computed?</summary>
                <p class="mt-1 text-pretty">{{ fitMethodNote }}</p>
              </details>
            </template>
          </section>

          <section class="rounded-lg border bg-card p-4 sm:p-6" aria-labelledby="applicant-documents-title">
            <h2 id="applicant-documents-title" class="text-base font-semibold">Documents</h2>
            <ul class="mt-2 flex flex-col">
              <li
                v-for="doc in review.documents"
                :key="doc.name"
                class="flex items-center justify-between gap-3 border-b border-border py-3 text-sm last:border-b-0"
              >
                <div class="flex min-w-0 flex-col">
                  <span class="text-foreground">
                    {{ doc.name }}<span v-if="doc.isOptional" class="text-muted-foreground"> (optional)</span>
                  </span>
                  <span v-if="doc.fileName" class="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                    <FileText class="size-3.5 shrink-0" />
                    <span class="truncate">{{ doc.fileName }}</span>
                  </span>
                  <span v-else class="text-xs text-muted-foreground">Not attached</span>
                </div>
                <Button v-if="doc.url" variant="outline" size="sm" as-child class="shrink-0">
                  <AppLink :href="doc.url" target="_blank" :aria-label="`View ${doc.name}`">
                    <Eye class="size-4" /> View
                  </AppLink>
                </Button>
              </li>
            </ul>
          </section>
        </div>

        <!-- Hiring step -->
        <form
          class="space-y-4 rounded-lg border bg-card p-4 sm:p-6 lg:sticky lg:top-6"
          aria-labelledby="applicant-stage-title"
          @submit.prevent="saveStage"
        >
          <h2 id="applicant-stage-title" class="text-base font-semibold">Hiring step</h2>
          <div class="space-y-2">
            <Label for="applicant-stage">Move to</Label>
            <SearchSelect
              id="applicant-stage"
              v-model="stage"
              :options="stageOptions"
              placeholder="Select step"
              class="w-full"
              :disabled="isSavingStage"
            />
            <p class="text-xs text-muted-foreground">The applicant is notified of every change.</p>
          </div>
          <div v-if="isRemarksRequired" class="space-y-2">
            <Label for="applicant-remarks">Remarks</Label>
            <Textarea
              id="applicant-remarks"
              v-model="remarks"
              rows="3"
              maxlength="1000"
              placeholder="Tell the applicant why"
              :aria-invalid="!!remarksError"
              :disabled="isSavingStage"
            />
            <p v-if="remarksError" class="text-sm text-destructive">{{ remarksError }}</p>
          </div>
          <Button type="submit" class="h-10 w-full sm:h-9" :disabled="isSavingStage || !hasStageChange">
            <Loader2 v-if="isSavingStage" class="size-4 animate-spin" />
            {{ isSavingStage ? 'Saving...' : 'Move applicant' }}
          </Button>
        </form>
      </div>
    </template>
  </div>
</template>
