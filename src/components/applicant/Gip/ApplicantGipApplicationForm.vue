<script setup lang="ts">
import { ArrowLeft, CircleDashed, Eye, FileText, Landmark, Loader2, RefreshCw, Trash2, Upload } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useGipApplicationForm } from '@/composables/applicant/useGipApplicationForm'

const {
  requirements,
  attachmentAccept,
  attachmentMaxMb,
  isLoading,
  errorMessage,
  isLocked,
  canUpload,
  hasPendingFiles,
  isSubmitting,
  hasApplied,
  status,
  statusDescription,
  statusRemarks,
  appliedOn,
  appointments,
  isGeneratingNsrp,
  selectFile,
  removeFile,
  generateNsrp,
  submit,
  reload,
} = useGipApplicationForm()

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
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-8 pb-16">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-4">
      <RouterLink
        :to="{ name: 'gip-application' }"
        class="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft class="size-4" /> Government Internship Program
      </RouterLink>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex flex-col gap-1">
          <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">GIP Application</h1>
          <p class="text-sm text-pretty text-muted-foreground">
            <template v-if="hasApplied">Applied {{ appliedOn }}. {{ statusDescription }}</template>
            <template v-else>
              Your NSRP Form 1 is generated from your profile and attached for you. Upload a PDF copy of each of the
              other requirements (up to {{ attachmentMaxMb }} MB each), then submit.
            </template>
          </p>
        </div>
        <Badge v-if="hasApplied && !isLoading" variant="outline" class="self-start" :class="STATUS_BADGE_CLASS[status]">
          {{ status }}
        </Badge>
      </div>
      <!-- Remarks set apart from the status text: they are PESO's own words -->
      <div v-if="statusRemarks" class="border-l-2 border-destructive pl-3">
        <p class="text-xs font-semibold text-destructive uppercase">Remarks</p>
        <p class="text-sm text-pretty text-foreground">{{ statusRemarks }}</p>
      </div>
    </div>

    <div v-if="isLoading" class="flex flex-col gap-3" aria-busy="true">
      <Skeleton v-for="i in 5" :key="i" class="h-14 w-full" />
    </div>

    <Alert v-else-if="errorMessage" variant="destructive">
      <AlertTitle>Your GIP application could not be loaded</AlertTitle>
      <AlertDescription class="flex flex-col items-start gap-2">
        {{ errorMessage }}
        <Button type="button" variant="outline" size="sm" @click="reload">Try again</Button>
      </AlertDescription>
    </Alert>

    <form v-else class="flex flex-col gap-6" @submit.prevent="submit">
      <!-- ─── Requirements ─── -->
      <section aria-labelledby="gip-form-requirements-title" class="flex flex-col gap-3">
        <h2 id="gip-form-requirements-title" class="text-lg font-semibold text-foreground">Requirements</h2>
        <ol class="flex flex-col">
          <li
            v-for="(doc, index) in requirements"
            :key="doc.name"
            class="grid grid-cols-[2rem_1fr] gap-x-3 border-t border-border py-4 last:border-b"
          >
            <span class="pt-0.5 text-sm font-semibold text-muted-foreground tabular-nums" aria-hidden="true">
              {{ String(index + 1).padStart(2, '0') }}
            </span>
            <div class="flex min-w-0 flex-col gap-2">
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex min-w-0 flex-col">
                  <span class="text-sm font-semibold text-foreground sm:text-base">
                    {{ doc.name }}
                    <span v-if="doc.isOptional" class="text-sm font-normal text-muted-foreground">(optional)</span>
                  </span>
                  <span v-if="doc.isNsrp" class="text-xs text-muted-foreground">Generated from your NSRP profile</span>
                </div>

                <!-- NSRP being generated -->
                <span v-if="doc.isNsrp && isGeneratingNsrp" class="inline-flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 class="size-4 animate-spin" /> Generating NSRP form...
                </span>

                <!-- Attached file (picked / generated, or saved): view and remove -->
                <div v-else-if="doc.pendingFileName || doc.savedFileName" class="flex min-w-0 items-center gap-1">
                  <FileText class="size-4 shrink-0 text-muted-foreground" />
                  <span class="truncate text-sm text-foreground" :title="doc.pendingFileName ?? doc.savedFileName ?? ''">
                    {{ doc.pendingFileName ?? doc.savedFileName }}
                  </span>
                  <span v-if="doc.pendingFileName" class="shrink-0 text-xs text-muted-foreground">· uploads on submit</span>
                  <Button
                    v-if="doc.pendingFileUrl || doc.savedFileUrl"
                    variant="ghost"
                    size="icon-sm"
                    as-child
                    class="shrink-0"
                    :aria-label="`View ${doc.name}`"
                  >
                    <a :href="(doc.pendingFileUrl ?? doc.savedFileUrl)!" target="_blank" rel="noopener noreferrer" title="View">
                      <Eye class="size-4" />
                    </a>
                  </Button>
                  <Button
                    v-if="canUpload"
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    class="shrink-0 hover:text-destructive"
                    title="Remove"
                    :aria-label="`Remove ${doc.name}`"
                    :disabled="isSubmitting || doc.isDeleting"
                    @click="removeFile(doc.name)"
                  >
                    <Loader2 v-if="doc.isDeleting" class="size-4 animate-spin" />
                    <Trash2 v-else class="size-4" />
                  </Button>
                </div>

                <!-- Nothing attached yet -->
                <div v-else class="flex shrink-0 flex-wrap items-center gap-2">
                  <template v-if="canUpload">
                    <Button
                      v-if="doc.isNsrp"
                      type="button"
                      variant="outline"
                      size="sm"
                      class="cursor-pointer"
                      :disabled="isSubmitting"
                      @click="generateNsrp"
                    >
                      <RefreshCw class="size-4" /> Generate NSRP form
                    </Button>
                    <Button v-else type="button" variant="outline" size="sm" as-child :disabled="isSubmitting">
                      <label class="cursor-pointer" :class="{ 'pointer-events-none opacity-50': isSubmitting }">
                        <Upload class="size-4" /> Upload PDF
                        <input
                          type="file"
                          class="sr-only"
                          :accept="attachmentAccept"
                          :disabled="isSubmitting"
                          @change="onFilePicked(doc.name, $event)"
                        />
                      </label>
                    </Button>
                  </template>
                  <span v-else-if="doc.isReceived" class="text-sm text-success">Received by PESO</span>
                  <span v-else class="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <CircleDashed class="size-4" /> Not submitted
                  </span>
                </div>
              </div>
              <p v-if="doc.error" class="text-sm text-destructive">{{ doc.error }}</p>
            </div>
          </li>
        </ol>
        <p v-if="isLocked" class="text-sm text-muted-foreground">
          PESO has reviewed your application, so the files can no longer be changed.
        </p>
      </section>

      <div v-if="canUpload && (!hasApplied || hasPendingFiles)" class="flex justify-end">
        <Button type="submit" size="lg" class="w-full cursor-pointer sm:w-auto" :disabled="isSubmitting">
          <Loader2 v-if="isSubmitting" class="size-4 shrink-0 animate-spin" />
          <template v-if="isSubmitting">Submitting...</template>
          <template v-else>{{ hasApplied ? 'Save documents' : 'Submit application' }}</template>
        </Button>
      </div>

      <!-- ─── Internship terms, once PESO appoints the applicant ─── -->
      <section v-if="appointments.length" aria-labelledby="gip-form-appointments-title" class="flex flex-col gap-3">
        <h2 id="gip-form-appointments-title" class="text-lg font-semibold text-foreground">Appointments</h2>
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
      </section>
    </form>
  </div>
</template>
