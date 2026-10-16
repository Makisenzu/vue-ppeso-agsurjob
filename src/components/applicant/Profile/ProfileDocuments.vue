<script setup lang="ts">
import { Check, X, FolderUp, Download, Eye, FileText } from '@lucide/vue'
import { useAuthStore } from '@/stores/common/auth'
import { getRequirementAttachmentState, getRequirementMediaMeta } from '@/helpers/applicant/applicantRequirementDocuments'
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment'

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Card, CardContent } from '@/components/ui/card'
import {
  Stepper,
  StepperItem,
  StepperTitle,
  StepperDescription,
} from '@/components/ui/stepper'
import type { DocumentFile } from '@/types/applicant/applicantProfile'
import ProfileDocsUpload from './ProfileDocsUpload.vue'
import { NSRP_FORM } from '@/composables/applicant/useApplicantProfile'

const props = defineProps<{
  files: DocumentFile[]
  requirements: string[]
  hasRequirements: boolean
}>()

const authStore = useAuthStore()

function getFileMeta(requirement: string) {
  return getRequirementMediaMeta(
    requirement,
    authStore.applicantRequirementMedia ?? [],
    authStore.applicantRequirements ?? []
  )
}

function getRequirementAttachmentStateFor(requirement: string) {
  const meta = getFileMeta(requirement)
  return getRequirementAttachmentState(meta?.status, meta ? 'done' : 'idle')
}

/** The NSRP Form step is met by a complete NSRP record (applicants.applicants), not by an upload. */
function getStepState(file: DocumentFile) {
  if (file.name === NSRP_FORM) return file.uploaded ? 'done' : 'idle'
  return getRequirementAttachmentStateFor(file.name)
}

function getDocumentState(file: DocumentFile) {
  const state = getStepState(file)

  switch (state) {
    case 'done':
      return {
        label: file.name === NSRP_FORM ? 'Completed' : 'Approved',
        circleClass: 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-500/30',
        separatorClass: 'bg-emerald-500',
        textClass: 'text-emerald-600 dark:text-emerald-400',
      }
    case 'processing':
      return {
        label: 'Pending',
        circleClass: 'border-amber-500 bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-500/30',
        separatorClass: 'bg-amber-500',
        textClass: 'text-amber-600 dark:text-amber-400',
      }
    case 'error':
      return {
        label: 'Rejected',
        circleClass: 'border-red-500 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 dark:border-red-500/30',
        separatorClass: 'bg-red-500',
        textClass: 'text-red-600 dark:text-red-400',
      }
    default:
      return {
        label: file.name === NSRP_FORM ? 'Incomplete' : 'Pending',
        circleClass: 'border-red-500 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 dark:border-red-500/30',
        separatorClass: 'bg-muted',
        textClass: 'text-red-600 dark:text-red-400',
      }
  }
}

function viewFile(requirement: string) {
  const meta = getFileMeta(requirement)
  if (meta?.publicUrl) {
    window.open(meta.publicUrl, '_blank', 'noopener')
  }
}

async function downloadFile(requirement: string) {
  const meta = getFileMeta(requirement)
  if (!meta?.publicUrl) return

  try {
    const res = await fetch(meta.publicUrl)
    if (!res.ok) throw new Error('Failed to fetch file')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = meta.filename ?? ''
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  } catch (err) {
    if (meta.publicUrl) window.open(meta.publicUrl, '_blank', 'noopener')
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-foreground">Document Upload Progress</h3>
        <p class="text-xs text-muted-foreground mt-0.5">
          Please ensure all required documents are uploaded to verify your profile.
        </p>
      </div>
    </div>

    <!-- Mobile: vertical timeline. sm and up: the horizontal stepper -->
    <Stepper :linear="false" class="flex w-full flex-col gap-0 sm:flex-row sm:items-start sm:overflow-x-auto sm:pb-2">
      <StepperItem
        v-for="(file, index) in files"
        :key="file.name"
        :step="index + 1"
        class="relative flex w-full items-start gap-3 group sm:w-auto sm:min-w-32 sm:flex-1 sm:flex-col sm:items-center sm:gap-0"
        :class="index < files.length - 1 && 'max-sm:pb-4'"
      >
        <!-- Mobile only: vertical connector from this circle down to the next -->
        <div
          v-if="index < files.length - 1"
          class="absolute left-4.25 top-9 bottom-0 w-0.5 transition-colors duration-300 sm:hidden"
          :class="getDocumentState(file).separatorClass"
          aria-hidden="true"
        />

        <!-- Each step draws both halves of its connectors, so adjacent steps always meet edge to edge -->
        <div class="flex shrink-0 items-center sm:w-full">
          <div
            class="h-0.5 flex-1 transition-colors duration-300 max-sm:hidden"
            :class="index === 0 ? 'invisible' : getDocumentState(files[index - 1]).separatorClass"
            aria-hidden="true"
          />
          <div
            class="size-9 shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-300"
            :class="[getDocumentState(file).circleClass]"
          >
            <Check v-if="getStepState(file) === 'done'" class="size-4 stroke-3" />
            <X v-else class="size-4 stroke-3" />
          </div>
          <div
            class="h-0.5 flex-1 transition-colors duration-300 max-sm:hidden"
            :class="index === files.length - 1 ? 'invisible' : getDocumentState(file).separatorClass"
            aria-hidden="true"
          />
        </div>

        <div class="flex min-h-9 min-w-0 flex-1 flex-col justify-center sm:min-h-0 sm:items-center sm:px-1 sm:text-center">
          <div class="min-w-0 sm:mt-2">
            <StepperTitle class="text-sm sm:text-xs font-semibold text-foreground truncate sm:max-w-28">
              {{ file.name }}
            </StepperTitle>
            <StepperDescription
              class="text-xs sm:text-[10px] mt-0.5 font-medium"
              :class="getDocumentState(file).textClass"
            >
              {{ getDocumentState(file).label }}
            </StepperDescription>
          </div>
        </div>
      </StepperItem>
    </Stepper>

    <div v-if="hasRequirements" class="w-full space-y-6">
      <Card class="ring-0! shadow-sm">
        <CardContent class="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="text-sm font-semibold text-foreground">Uploaded Requirements</h3>
              <p class="text-xs text-muted-foreground mt-0.5">
                These are the requirements currently uploaded to your profile.
              </p>
            </div>
            <div class="shrink-0 max-sm:[&_button]:w-full">
              <ProfileDocsUpload />
            </div>
          </div>
          <Attachment v-for="requirement in requirements" :key="requirement" class="w-full" :state="getRequirementAttachmentStateFor(requirement)">
            <AttachmentMedia>
              <FileText class="size-4 text-muted-foreground" />
            </AttachmentMedia>

            <AttachmentContent>
              <AttachmentTitle>{{ requirement }}</AttachmentTitle>
              <AttachmentDescription>
                <span v-if="getFileMeta(requirement)">
                  {{ getFileMeta(requirement)?.typeLabel }} · {{ getFileMeta(requirement)?.sizeLabel }}
                </span>
                <span v-else>
                  Uploaded
                </span>
              </AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction @click="viewFile(requirement)">
                <Eye class="size-4 text-muted-foreground" />
              </AttachmentAction>
              <AttachmentAction @click="downloadFile(requirement)">
                <Download class="size-4 text-muted-foreground" />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
        </CardContent>
      </Card>
    </div>

    <Empty v-else class="border border-border/50 shadow-sm rounded-xl overflow-hidden bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderUp />
        </EmptyMedia>
      </EmptyHeader>
      <EmptyTitle>No requirements uploaded yet</EmptyTitle>
      <EmptyDescription>
        Get started by uploading your required documents.
      </EmptyDescription>
      <EmptyContent>
        <ProfileDocsUpload/>
      </EmptyContent>
    </Empty>
  </div>
</template>