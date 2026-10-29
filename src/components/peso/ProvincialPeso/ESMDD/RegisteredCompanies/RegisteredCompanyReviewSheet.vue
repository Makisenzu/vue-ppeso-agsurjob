<script setup lang="ts">
import { Check, CircleAlert, FileText, Loader2, RotateCcw, X } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import SearchSelect from '@/components/SearchSelect.vue'
import { useRegisteredCompanyReview } from '@/composables/peso/provincialPeso/useRegisteredCompanyReview'

/** Review sheet of a registered company: its status and each submitted document (opened from the list) */
const {
  isReviewOpen,
  companyName,
  items,
  companyTin,
  form2StatusClass,
  form2Status,
  companyStatusDraft,
  statusOptions,
  isSavingCompany,
  isLoading,
  setCompanyStatusDraft,
  companyRemarksDraft,
  companyRemarksError,
  isCompanyStatusChanged,
  saveCompanyStatus,
  summary,
  formatSubmittedDate,
  getReviewStatusBadgeClass,
  getReviewStatusLabel,
  openDocument,
  formatFileSize,
  rejectingRequirementId,
  rejectRemarks,
  reviewingRequirementId,
  rejectRemarksError,
  cancelReject,
  confirmReject,
  setDocumentStatus,
  startReject,
} = useRegisteredCompanyReview()
</script>

<template>
  <Sheet v-model:open="isReviewOpen">
    <SheetContent class="flex h-full flex-col p-0 sm:max-w-xl">
      <SheetHeader class="shrink-0 px-6 pt-6 pb-2">
        <SheetTitle>{{ companyName }}</SheetTitle>
        <SheetDescription class="flex flex-wrap items-center gap-2">
          <span v-if="companyTin">TIN {{ companyTin }} ·</span>
          NSRP Form 2
          <Badge variant="outline" :class="form2StatusClass">{{ form2Status }}</Badge>
        </SheetDescription>
      </SheetHeader>

      <div class="flex-1 space-y-6 overflow-y-auto px-6 py-4">
        <!-- Company status -->
        <section class="space-y-3">
          <div>
            <h3 class="text-sm font-semibold">Company Status</h3>
            <p class="text-xs text-muted-foreground">The company is notified when this changes.</p>
          </div>
          <div class="grid gap-3 sm:grid-cols-[12rem_1fr] sm:items-start">
            <SearchSelect
              :model-value="companyStatusDraft"
              :options="statusOptions"
              :disabled="isSavingCompany || isLoading"
              placeholder="Status"
              class="w-full"
              @update:model-value="setCompanyStatusDraft"
            />
            <div v-if="companyStatusDraft === 'rejected'" class="space-y-1.5">
              <Textarea
                v-model="companyRemarksDraft"
                rows="3"
                placeholder="Reason for rejecting (sent to the company)"
                :disabled="isSavingCompany"
                :aria-invalid="!!companyRemarksError"
              />
              <p v-if="companyRemarksError" class="text-xs text-destructive">
                {{ companyRemarksError }}
              </p>
            </div>
          </div>
          <div class="flex justify-end">
            <Button
              size="sm"
              :disabled="!isCompanyStatusChanged || isSavingCompany"
              @click="saveCompanyStatus"
            >
              <Loader2 v-if="isSavingCompany" class="size-4 animate-spin" />
              Save status
            </Button>
          </div>
        </section>

        <Separator />

        <!-- Documents -->
        <section class="space-y-3">
          <div>
            <h3 class="text-sm font-semibold">Documents</h3>
            <p v-if="!isLoading && summary.total" class="text-xs text-muted-foreground">
              {{ summary.approved }} of {{ summary.total }} approved ·
              {{ summary.submitted }} submitted
            </p>
          </div>

          <template v-if="isLoading">
            <Skeleton v-for="n in 4" :key="n" class="h-24 w-full rounded-lg" />
          </template>

          <p v-else-if="items.length === 0" class="rounded-lg border py-8 text-center text-sm text-muted-foreground">
            The requirement list is not set up yet (migration 079).
          </p>

          <div
            v-for="item in items"
            v-else
            :key="item.templateId"
            class="space-y-3 rounded-lg border p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-medium">
                  {{ item.name }}
                </p>
                <p v-if="item.submission?.submitted_at" class="text-xs text-muted-foreground">
                  Submitted {{ formatSubmittedDate(item.submission.submitted_at) }}
                </p>
              </div>
              <Badge variant="outline" class="shrink-0" :class="getReviewStatusBadgeClass(item.status)">
                {{ getReviewStatusLabel(item.status) }}
              </Badge>
            </div>

            <p v-if="item.files.length === 0" class="text-xs text-muted-foreground">No file submitted.</p>

            <template v-else>
              <ul class="divide-y rounded-md border">
                <li v-for="file in item.files" :key="file.id" class="flex min-w-0 items-center gap-3 px-3 py-2">
                  <FileText class="size-4 shrink-0 text-muted-foreground" />
                  <button
                    type="button"
                    class="min-w-0 flex-1 truncate text-left text-sm hover:underline"
                    :title="file.filename"
                    @click="openDocument(file.path)"
                  >
                    {{ file.filename }}
                  </button>
                  <span class="shrink-0 text-xs text-muted-foreground">{{ formatFileSize(file.size) }}</span>
                </li>
              </ul>

              <div
                v-if="item.status === 'rejected' && item.submission?.status_remarks"
                class="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive"
              >
                <CircleAlert class="mt-0.5 size-3.5 shrink-0" />
                <span class="whitespace-pre-wrap">{{ item.submission.status_remarks }}</span>
              </div>

              <!-- Reject: reason first -->
              <div v-if="rejectingRequirementId === item.submission?.id" class="space-y-2">
                <Label :for="`reject-${item.templateId}`" class="text-xs">Reason for rejecting</Label>
                <Textarea
                  :id="`reject-${item.templateId}`"
                  v-model="rejectRemarks"
                  rows="2"
                  placeholder="Sent to the company"
                  :disabled="reviewingRequirementId !== null"
                  :aria-invalid="!!rejectRemarksError"
                />
                <p v-if="rejectRemarksError" class="text-xs text-destructive">
                  {{ rejectRemarksError }}
                </p>
                <div class="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    :disabled="reviewingRequirementId !== null"
                    @click="cancelReject"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    :disabled="reviewingRequirementId !== null"
                    @click="confirmReject"
                  >
                    <Loader2 v-if="reviewingRequirementId === item.submission?.id" class="size-4 animate-spin" />
                    Reject
                  </Button>
                </div>
              </div>

              <div v-else class="flex flex-wrap justify-end gap-2">
                <Button
                  v-if="item.status !== 'pending'"
                  variant="ghost"
                  size="sm"
                  :disabled="reviewingRequirementId !== null"
                  @click="setDocumentStatus(item, 'pending')"
                >
                  <RotateCcw class="size-4" />
                  Back to review
                </Button>
                <Button
                  v-if="item.status !== 'rejected'"
                  variant="outline"
                  size="sm"
                  class="text-destructive hover:text-destructive"
                  :disabled="reviewingRequirementId !== null"
                  @click="startReject(item)"
                >
                  <X class="size-4" />
                  Reject
                </Button>
                <Button
                  v-if="item.status !== 'approved'"
                  size="sm"
                  :disabled="reviewingRequirementId !== null"
                  @click="setDocumentStatus(item, 'approved')"
                >
                  <Loader2 v-if="reviewingRequirementId === item.submission?.id" class="size-4 animate-spin" />
                  <Check v-else class="size-4" />
                  Approve
                </Button>
              </div>
            </template>
          </div>
        </section>
      </div>
    </SheetContent>
  </Sheet>
</template>
