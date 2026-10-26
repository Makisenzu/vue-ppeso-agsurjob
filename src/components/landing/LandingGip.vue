<script setup lang="ts">
import { CircleCheck, CircleDashed, ExternalLink, Landmark, Loader2, Upload, X } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useLandingGip } from '@/composables/landing/useLandingGip'

const {
  hero,
  about,
  facts,
  requirements,
  attachmentAccept,
  attachmentMaxMb,
  isSignedIn,
  isApplicant,
  isLoading,
  errorMessage,
  canUpload,
  hasPendingFiles,
  isSubmitting,
  hasApplied,
  status,
  statusDescription,
  statusRemarks,
  appliedOn,
  appointments,
  selectFile,
  clearPendingFile,
  submit,
  reload,
} = useLandingGip()

const onFilePicked = (doc: string, event: Event) => {
  const input = event.target as HTMLInputElement
  selectFile(doc, input.files?.[0])
  // Lets the same file be picked again after clearing it
  input.value = ''
}

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
  <div>
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
        </div>
      </div>
    </section>

    <div class="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[2fr_3fr] lg:gap-16 lg:px-8 lg:py-24">
      <!-- ─── What is GIP? (stays in view beside the requirements on desktop) ─── -->
      <section aria-labelledby="what-is-gip-title" class="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
        <!-- Same Times New Roman treatment as the other landing headings (DESIGN.md exception) -->
        <h2
          id="what-is-gip-title"
          class="font-['Times_New_Roman',Times,serif] text-2xl font-bold tracking-[0.15em] text-foreground uppercase sm:text-3xl lg:tracking-[0.2em]"
        >
          {{ about.title }}
        </h2>
        <p class="text-base text-pretty text-foreground sm:text-lg">{{ about.definition }}</p>
        <p class="text-base text-pretty text-muted-foreground sm:text-lg">{{ about.purpose }}</p>

        <dl class="flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-6">
          <div v-for="fact in facts" :key="fact.label" class="flex flex-col">
            <dt class="text-sm font-semibold text-primary">{{ fact.label }}</dt>
            <dd class="text-sm text-muted-foreground">{{ fact.value }}</dd>
          </div>
        </dl>
      </section>

      <!-- ─── Requirements, where applicants also upload their soft copies ─── -->
      <section id="gip-requirements" aria-labelledby="gip-requirements-title" class="flex scroll-mt-20 flex-col gap-6">
        <div class="flex flex-col gap-2">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="gip-requirements-title"
              class="font-['Times_New_Roman',Times,serif] text-2xl font-bold tracking-[0.15em] text-foreground uppercase sm:text-3xl lg:tracking-[0.2em]"
            >
              Requirements
            </h2>
            <Badge v-if="hasApplied && !isLoading" variant="outline" :class="STATUS_BADGE_CLASS[status]">{{ status }}</Badge>
          </div>
          <p class="text-sm text-pretty text-muted-foreground sm:text-base">
            <template v-if="!isApplicant">
              Your NSRP is filled in when you create your account. To apply, upload a soft copy of each of the other
              requirements.
            </template>
            <template v-else-if="hasApplied">Applied {{ appliedOn }}. {{ statusDescription }}</template>
            <template v-else>
              Your NSRP is already on your profile. Upload a soft copy of each of the other requirements to apply
              (JPG, PNG, WEBP or PDF, up to {{ attachmentMaxMb }} MB each).
            </template>
          </p>
          <!-- Remarks set apart from the status text: they are PESO's own words -->
          <div v-if="statusRemarks" class="border-l-2 border-destructive pl-3">
            <p class="text-xs font-semibold text-destructive uppercase">Remarks</p>
            <p class="text-sm text-pretty text-foreground">{{ statusRemarks }}</p>
          </div>
        </div>

        <Alert v-if="isApplicant && errorMessage" variant="destructive">
          <AlertTitle>Your GIP application could not be loaded</AlertTitle>
          <AlertDescription class="flex flex-col items-start gap-2">
            {{ errorMessage }}
            <Button type="button" variant="outline" size="sm" @click="reload">Try again</Button>
          </AlertDescription>
        </Alert>

        <div v-else-if="isApplicant && isLoading" class="flex flex-col gap-3" aria-busy="true">
          <Skeleton v-for="i in 5" :key="i" class="h-12 w-full" />
        </div>

        <!-- Numbered rows, like the PESO services on What is PESO? -->
        <ol v-else class="flex flex-col" aria-label="GIP requirements">
          <li
            v-for="(doc, index) in requirements"
            :key="doc.name"
            class="grid grid-cols-[2.5rem_1fr] gap-x-4 border-t border-border py-5 last:border-b sm:grid-cols-[3rem_1fr]"
          >
            <span class="pt-0.5 text-sm font-semibold text-muted-foreground tabular-nums" aria-hidden="true">
              {{ String(index + 1).padStart(2, '0') }}
            </span>
            <div class="flex min-w-0 flex-col gap-2">
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex min-w-0 flex-col">
                  <span class="text-base font-semibold text-foreground sm:text-lg">
                    {{ doc.name }}
                    <span v-if="doc.isOptional" class="text-sm font-normal text-muted-foreground">(optional)</span>
                  </span>
                  <span v-if="doc.isNsrp" class="text-sm text-muted-foreground">Filled in on your profile after signing up</span>
                </div>

                <!-- Applicant's file for this document -->
                <template v-if="isApplicant && !doc.isNsrp">
                  <div v-if="doc.pendingFileName" class="flex min-w-0 items-center gap-2 text-sm">
                    <span class="truncate text-foreground" :title="doc.pendingFileName">{{ doc.pendingFileName }}</span>
                    <span class="shrink-0 text-muted-foreground">· uploads on submit</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      class="shrink-0 hover:text-destructive"
                      :aria-label="`Remove ${doc.name}`"
                      :disabled="isSubmitting"
                      @click="clearPendingFile(doc.name)"
                    >
                      <X class="size-4" />
                    </Button>
                  </div>
                  <div v-else class="flex min-w-0 flex-wrap items-center gap-2">
                    <a
                      v-if="doc.savedFileName && doc.savedFileUrl"
                      :href="doc.savedFileUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex min-w-0 items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <span class="truncate" :title="doc.savedFileName">{{ doc.savedFileName }}</span>
                      <ExternalLink class="size-3.5 shrink-0" />
                    </a>
                    <span v-else-if="doc.isReceived" class="inline-flex items-center gap-1 text-sm text-success">
                      <CircleCheck class="size-4" /> Received by PESO
                    </span>
                    <Button v-if="canUpload" type="button" variant="outline" size="sm" as-child :disabled="isSubmitting">
                      <label class="cursor-pointer" :class="{ 'pointer-events-none opacity-50': isSubmitting }">
                        <Upload class="size-4" />
                        {{ doc.savedFileName ? 'Replace' : 'Upload' }}
                        <input
                          type="file"
                          class="sr-only"
                          :accept="attachmentAccept"
                          :disabled="isSubmitting"
                          @change="onFilePicked(doc.name, $event)"
                        />
                      </label>
                    </Button>
                    <span v-else-if="!doc.isReceived" class="inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <CircleDashed class="size-4" /> Not submitted
                    </span>
                  </div>
                </template>
                <span v-else-if="isApplicant" class="inline-flex shrink-0 items-center gap-1 text-sm text-success">
                  <CircleCheck class="size-4" /> On your profile
                </span>
              </div>
              <p v-if="doc.error" class="text-sm text-destructive">{{ doc.error }}</p>
            </div>
          </li>
        </ol>

        <!-- ─── Apply ─── -->
        <div v-if="!isSignedIn" class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-muted-foreground">Log in to upload your requirements. New here? Sign up for free.</p>
          <div class="flex flex-wrap gap-3">
            <Button as-child size="lg">
              <RouterLink :to="{ name: 'login' }">Log in to apply</RouterLink>
            </Button>
            <Button as-child size="lg" variant="outline">
              <RouterLink :to="{ name: 'signup' }">Sign up</RouterLink>
            </Button>
          </div>
        </div>
        <div v-else-if="canUpload && (!hasApplied || hasPendingFiles)" class="flex justify-end">
          <Button type="button" size="lg" class="w-full cursor-pointer sm:w-auto" :disabled="isSubmitting" @click="submit">
            <Loader2 v-if="isSubmitting" class="size-4 shrink-0 animate-spin" />
            <template v-if="isSubmitting">Submitting...</template>
            <template v-else>{{ hasApplied ? 'Save documents' : 'Apply now' }}</template>
          </Button>
        </div>

        <!-- ─── Internship terms, once PESO appoints the applicant ─── -->
        <div v-if="appointments.length" class="flex flex-col gap-3 pt-6">
          <h3 class="text-lg font-semibold text-foreground">Appointments</h3>
          <ul class="flex flex-col">
            <li
              v-for="appointment in appointments"
              :key="appointment.id"
              class="flex flex-col gap-2 border-t border-border py-4 last:border-b sm:flex-row sm:items-start sm:justify-between"
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
        </div>
      </section>
    </div>
  </div>
</template>
