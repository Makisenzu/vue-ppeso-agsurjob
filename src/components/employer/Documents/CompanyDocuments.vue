<script setup lang="ts">
import { CircleAlert, FileText, FolderUp } from '@lucide/vue'
import { Card, CardContent } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import SwipeRow from '@/components/SwipeRow.vue'
import { useCompanyDocuments } from '@/composables/employer/useCompanyDocuments'
import CompanyDocumentStepper from './CompanyDocumentStepper.vue'
import CompanyDocsUpload from './CompanyDocsUpload.vue'

/** Company Profile documents, laid out like the applicant's ProfileDocuments: stepper, then the uploaded files */
const { steps, isLoading, uploadedFiles, hasUploads, companyRemarks, getSwipeActions } = useCompanyDocuments()
</script>

<template>
  <div class="space-y-4">
    <div
      v-if="companyRemarks"
      class="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
    >
      <CircleAlert class="mt-0.5 size-4 shrink-0" />
      <div>
        <p class="font-medium">Provincial PESO did not approve your company</p>
        <p class="whitespace-pre-wrap">{{ companyRemarks }}</p>
      </div>
    </div>

    <CompanyDocumentStepper :steps="steps" :is-loading="isLoading" />

    <Card v-if="hasUploads" class="shadow-sm ring-0!">
      <CardContent class="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="text-sm font-semibold text-foreground">Uploaded Requirements</h3>
            <p class="mt-0.5 text-xs text-muted-foreground">
              These are the requirements currently uploaded to your company profile. Swipe a file to the left to view or
              download it.
            </p>
          </div>
          <div class="shrink-0 max-sm:[&_button]:w-full">
            <CompanyDocsUpload />
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <SwipeRow
            v-for="row in uploadedFiles"
            :key="row.file.id"
            :label="row.file.filename"
            :actions="getSwipeActions(row.file)"
            :full-swipe="false"
            :radius="10"
            row-color="var(--muted)"
            text-color="var(--foreground)"
            action-color="var(--primary)"
            action-text-color="var(--primary-foreground)"
            drawer-color="var(--secondary)"
            drawer-text-color="var(--secondary-foreground)"
          >
            <div class="flex size-9 shrink-0 items-center justify-center rounded-md bg-background">
              <FileText class="size-4 text-muted-foreground" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{{ row.file.filename }}</p>
              <p class="truncate text-xs text-muted-foreground">
                {{ row.meta }}
                <span v-if="row.status" :class="row.status.textClass">· {{ row.status.label }}</span>
              </p>
              <p v-if="row.remarks" class="truncate text-xs text-destructive" :title="row.remarks">{{ row.remarks }}</p>
            </div>
          </SwipeRow>
        </div>
      </CardContent>
    </Card>

    <Empty v-else-if="!isLoading" class="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderUp />
        </EmptyMedia>
      </EmptyHeader>
      <EmptyTitle>No requirements uploaded yet</EmptyTitle>
      <EmptyDescription>Get started by uploading your required documents.</EmptyDescription>
      <EmptyContent>
        <CompanyDocsUpload />
      </EmptyContent>
    </Empty>
  </div>
</template>
