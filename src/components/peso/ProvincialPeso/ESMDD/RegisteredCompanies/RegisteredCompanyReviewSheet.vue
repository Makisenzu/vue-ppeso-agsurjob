<script setup lang="ts">
import { Loader2 } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import SearchSelect from '@/components/SearchSelect.vue'
import { useRegisteredCompanyReview } from '@/composables/peso/provincialPeso/useRegisteredCompanyReview'

/** Review sheet of a registered company (DESIGN.md 5.1 form sheet): its status and each document's status */
const {
  isReviewOpen,
  isLoading,
  isSaving,
  companyName,
  companyTin,
  companyStatusBadge,
  items,
  summary,
  openDocument,
  companyDraft,
  documentDrafts,
  hasChanges,
  setCompanyStatus,
  setDocumentStatus,
  saveReview,
  companyStatusOptions,
  documentStatusOptions,
  formatFileSize,
  formatSubmittedDate,
} = useRegisteredCompanyReview()
</script>

<template>
  <Sheet v-model:open="isReviewOpen">
    <SheetContent class="flex h-full flex-col p-0 sm:max-w-lg">
      <SheetHeader class="shrink-0 px-6 pt-6 pb-2">
        <!-- pr-8 keeps the name clear of the sheet's close button -->
        <SheetTitle class="pr-8">{{ companyName }}</SheetTitle>
        <SheetDescription class="flex flex-wrap items-center gap-2">
          <span v-if="companyTin">TIN {{ companyTin }}</span>
          <Badge variant="outline" :class="companyStatusBadge.class">{{ companyStatusBadge.label }}</Badge>
        </SheetDescription>
      </SheetHeader>

      <form class="contents" @submit.prevent="saveReview">
        <div class="grid flex-1 grid-cols-1 content-start gap-6 overflow-y-auto px-6 py-4">
          <!-- Company status -->
          <section class="space-y-2">
            <Label for="company-status">Company status</Label>
            <SearchSelect
              id="company-status"
              :model-value="companyDraft.status"
              :options="companyStatusOptions"
              :disabled="isSaving || isLoading"
              placeholder="Status"
              class="w-full"
              @update:model-value="setCompanyStatus"
            />
            <p class="text-xs text-muted-foreground">Verified once all documents are approved; back to Pending if one is rejected.</p>
            <template v-if="companyDraft.status === 'rejected'">
              <Textarea
                v-model="companyDraft.remarks"
                rows="3"
                placeholder="Reason for rejecting"
                :disabled="isSaving"
                :aria-invalid="!!companyDraft.error"
              />
              <p v-if="companyDraft.error" class="text-xs text-destructive">{{ companyDraft.error }}</p>
            </template>
          </section>

          <Separator />

          <!-- Documents -->
          <section class="space-y-1">
            <div class="flex items-baseline justify-between gap-3">
              <h3 class="text-base font-semibold">Documents</h3>
              <p v-if="!isLoading && summary.total" class="text-xs text-muted-foreground">
                {{ summary.approved }} of {{ summary.total }} approved
              </p>
            </div>

            <div v-if="isLoading" class="space-y-4 pt-3">
              <Skeleton v-for="n in 3" :key="n" class="h-14 w-full" />
            </div>

            <p v-else-if="items.length === 0" class="py-6 text-sm text-muted-foreground">
              The requirement list is not set up yet.
            </p>

            <ul v-else class="divide-y">
              <li v-for="item in items" :key="item.templateId" class="space-y-3 py-4">
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0 space-y-1">
                    <p class="text-sm font-medium text-foreground">{{ item.name }}</p>
                    <template v-if="item.files.length">
                      <button
                        v-for="file in item.files"
                        :key="file.id"
                        type="button"
                        class="block max-w-full truncate text-left text-sm text-primary hover:underline"
                        :title="`Open ${file.filename}`"
                        @click="openDocument(file.path)"
                      >
                        {{ file.filename }}
                        <span class="text-xs text-muted-foreground">· {{ formatFileSize(file.size) }}</span>
                      </button>
                      <p v-if="item.submission?.submitted_at" class="text-xs text-muted-foreground">
                        Submitted {{ formatSubmittedDate(item.submission.submitted_at) }}
                      </p>
                    </template>
                    <p v-else class="text-xs text-muted-foreground">Not submitted yet.</p>
                  </div>

                  <SearchSelect
                    v-if="item.submission && documentDrafts[item.submission.id]"
                    :model-value="documentDrafts[item.submission.id].status"
                    :options="documentStatusOptions"
                    :disabled="isSaving"
                    placeholder="Status"
                    class="w-32 shrink-0"
                    @update:model-value="(value) => item.submission && setDocumentStatus(item.submission.id, value)"
                  />
                </div>

                <template v-if="item.submission && documentDrafts[item.submission.id]?.status === 'rejected'">
                  <Textarea
                    v-model="documentDrafts[item.submission.id].remarks"
                    rows="2"
                    placeholder="Reason for rejecting"
                    :disabled="isSaving"
                    :aria-invalid="!!documentDrafts[item.submission.id].error"
                  />
                  <p v-if="documentDrafts[item.submission.id].error" class="text-xs text-destructive">
                    {{ documentDrafts[item.submission.id].error }}
                  </p>
                </template>
              </li>
            </ul>
          </section>
        </div>

        <!-- Sticky footer -->
        <div class="flex shrink-0 justify-end gap-3 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" :disabled="isSaving" @click="isReviewOpen = false">Cancel</Button>
          <Button type="submit" :disabled="!hasChanges || isSaving">
            <Loader2 v-if="isSaving" class="size-4 animate-spin" />
            {{ isSaving ? 'Saving...' : 'Save Changes' }}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
</template>
