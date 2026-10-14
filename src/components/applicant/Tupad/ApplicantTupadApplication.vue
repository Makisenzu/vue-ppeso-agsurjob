<script setup lang="ts">
import { ExternalLink, FileText, Hammer, Loader2, RefreshCw, Upload, X } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment'
import { useTupadApplication } from '@/composables/applicant/useTupadApplication'

const {
  myApplication,
  documents,
  engagements,
  isLoading,
  isSubmitting,
  errorMessage,
  isLocked,
  hasRegistryRecord,
  documentOptions,
  lockedDocument,
  attachmentAccept,
  pendingFiles,
  fileErrors,
  missingForBatch,
  selectFile,
  clearPendingFile,
  toggleDocument,
  reload,
  submitApplication,
} = useTupadApplication()

const STATUS_BADGE_CLASS: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  approved: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
}

const onFilePicked = (doc: string, event: Event) => {
  const input = event.target as HTMLInputElement
  selectFile(doc, input.files?.[0])
  // Lets the same file be picked again after clearing it
  input.value = ''
}

const formatDate = (value?: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
</script>

<template>
  <div class="flex flex-col gap-6 pb-16">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">TUPAD Application</h1>
        <p class="text-sm text-muted-foreground">
          Tulong Panghanapbuhay sa Ating Disadvantaged/Displaced Workers — submit your income and required documents so
          PESO can include you in a TUPAD batch.
        </p>
      </div>
      <Badge
        v-if="myApplication"
        variant="outline"
        class="self-start sm:self-auto"
        :class="STATUS_BADGE_CLASS[myApplication.status.toLowerCase()]"
      >
        {{ myApplication.status }}
      </Badge>
    </div>

    <!-- ─── Loading ─── -->
    <div v-if="isLoading" class="space-y-4">
      <Skeleton class="h-24 w-full" />
      <Skeleton class="h-72 w-full" />
    </div>

    <Alert v-else-if="errorMessage" variant="destructive">
      <AlertTitle>Your TUPAD application could not be loaded</AlertTitle>
      <AlertDescription class="flex flex-col items-start gap-2">
        {{ errorMessage }}
        <Button type="button" variant="outline" size="sm" @click="reload">Try again</Button>
      </AlertDescription>
    </Alert>

    <!-- ─── Not referred ─── -->
    <Empty v-else-if="!hasRegistryRecord || !myApplication" class="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Hammer />
        </EmptyMedia>
        <EmptyTitle>You have not been referred to TUPAD</EmptyTitle>
        <EmptyDescription>
          Visit your PESO office. Once PESO refers you to TUPAD, your application will appear here for you to complete.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>

    <template v-else>
      <!-- ─── Status ─── -->
      <Alert v-if="engagements.length">
        <AlertTitle>You are a TUPAD beneficiary</AlertTitle>
        <AlertDescription>
          <ul class="mt-1 space-y-1">
            <li v-for="engagement in engagements" :key="engagement.id">
              <strong>EDL {{ engagement.batch?.edl_number }}</strong> ·
              {{ formatDate(engagement.batch?.start_date) }} – {{ formatDate(engagement.batch?.end_date) }} ·
              {{ engagement.days_duration }} days · {{ engagement.status }}
            </li>
          </ul>
        </AlertDescription>
      </Alert>
      <Alert v-else-if="isLocked">
        <AlertTitle>Your application has been reviewed</AlertTitle>
        <AlertDescription>
          PESO marked your application as <strong>{{ myApplication.status }}</strong>, so it can no longer be edited.
        </AlertDescription>
      </Alert>
      <Alert v-else-if="missingForBatch.length">
        <AlertTitle>Complete your application</AlertTitle>
        <AlertDescription>Still needed before PESO can add you to a batch: {{ missingForBatch.join(', ') }}.</AlertDescription>
      </Alert>
      <Alert v-else>
        <AlertTitle>Your application is complete</AlertTitle>
        <AlertDescription>PESO will review your documents. You can still update them until then.</AlertDescription>
      </Alert>

      <form class="space-y-6" @submit="submitApplication">
        <!-- ─── Details ─── -->
        <Card>
          <CardHeader>
            <CardTitle class="text-base">Household Details</CardTitle>
          </CardHeader>
          <CardContent class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField v-slot="{ componentField }" name="monthly_income">
              <FormItem>
                <FormLabel>Monthly Income (₱)</FormLabel>
                <FormControl>
                  <Input
                    v-bind="componentField"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    :disabled="isSubmitting || isLocked"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
            <FormField v-slot="{ componentField }" name="dependent_name">
              <FormItem class="sm:col-span-2">
                <FormLabel>Dependent Name <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
                <FormControl>
                  <Textarea
                    v-bind="componentField"
                    rows="2"
                    placeholder="Name of dependent(s)"
                    :disabled="isSubmitting || isLocked"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          </CardContent>
        </Card>

        <!-- ─── Required documents ─── -->
        <Card>
          <CardHeader>
            <CardTitle class="text-base">Required Documents</CardTitle>
            <CardDescription>
              Tick each document you have and attach a clear photo or PDF of it (JPG, PNG, WEBP or PDF, up to 10 MB).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField v-slot="{ value, handleChange }" name="doc_submitted">
              <FormItem>
                <div class="space-y-3">
                  <div v-for="doc in documentOptions" :key="doc" class="space-y-2 rounded-lg border p-3">
                    <label
                      class="flex items-center gap-2 text-sm font-medium"
                      :class="doc === lockedDocument || isLocked ? 'cursor-not-allowed' : 'cursor-pointer'"
                    >
                      <Checkbox
                        :model-value="doc === lockedDocument || (value ?? []).includes(doc)"
                        :disabled="isSubmitting || isLocked || doc === lockedDocument"
                        @update:model-value="(checked) => handleChange(toggleDocument(value, doc, checked))"
                      />
                      {{ doc }}
                      <span v-if="doc === lockedDocument" class="text-xs font-normal text-muted-foreground">(required)</span>
                    </label>

                    <!-- Attachment for a ticked document -->
                    <div v-if="doc === lockedDocument || (value ?? []).includes(doc)" class="space-y-1.5 pl-6">
                      <Attachment
                        v-if="pendingFiles[doc] || documents[doc]"
                        :state="pendingFiles[doc] ? 'idle' : 'done'"
                        class="w-full min-w-0"
                      >
                        <AttachmentMedia variant="icon">
                          <FileText />
                        </AttachmentMedia>
                        <AttachmentContent class="min-w-0 flex-1">
                          <AttachmentTitle class="block truncate">
                            {{ pendingFiles[doc]?.name ?? documents[doc]?.file_name }}
                          </AttachmentTitle>
                          <AttachmentDescription>
                            {{ pendingFiles[doc] ? 'Uploads when you save' : 'Submitted' }}
                          </AttachmentDescription>
                        </AttachmentContent>
                        <AttachmentActions>
                          <AttachmentAction
                            v-if="!pendingFiles[doc] && documents[doc]?.url"
                            as-child
                            :aria-label="`Open ${doc}`"
                          >
                            <a :href="documents[doc]!.url!" target="_blank" rel="noopener noreferrer">
                              <ExternalLink />
                            </a>
                          </AttachmentAction>
                          <template v-if="!isLocked">
                            <AttachmentAction as-child :aria-label="`Replace ${doc}`">
                              <label class="cursor-pointer">
                                <RefreshCw />
                                <input
                                  type="file"
                                  class="sr-only"
                                  :accept="attachmentAccept"
                                  :disabled="isSubmitting"
                                  @change="onFilePicked(doc, $event)"
                                />
                              </label>
                            </AttachmentAction>
                            <AttachmentAction
                              v-if="pendingFiles[doc]"
                              type="button"
                              class="hover:text-destructive"
                              :aria-label="`Remove ${doc}`"
                              :disabled="isSubmitting"
                              @click="clearPendingFile(doc)"
                            >
                              <X />
                            </AttachmentAction>
                          </template>
                        </AttachmentActions>
                      </Attachment>

                      <label
                        v-else-if="!isLocked"
                        class="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-5 text-center transition-colors hover:bg-muted/50"
                        :class="{ 'border-destructive': fileErrors[doc] }"
                      >
                        <Upload class="size-5 text-muted-foreground" />
                        <span class="text-sm font-medium">Click to attach your {{ doc }}</span>
                        <span class="text-xs text-muted-foreground">JPG, PNG, WEBP or PDF · up to 10 MB</span>
                        <input
                          type="file"
                          class="sr-only"
                          :accept="attachmentAccept"
                          :disabled="isSubmitting"
                          @change="onFilePicked(doc, $event)"
                        />
                      </label>
                      <p v-else class="text-xs text-muted-foreground">No file attached.</p>

                      <p v-if="fileErrors[doc]" class="text-sm text-destructive">{{ fileErrors[doc] }}</p>
                    </div>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            </FormField>
          </CardContent>
        </Card>

        <div v-if="!isLocked" class="flex justify-end">
          <Button type="submit" :disabled="isSubmitting" class="w-full sm:w-auto">
            <Loader2 v-if="isSubmitting" class="size-4 shrink-0 animate-spin" />
            {{ isSubmitting ? 'Saving...' : 'Save Application' }}
          </Button>
        </div>
      </form>
    </template>
  </div>
</template>
