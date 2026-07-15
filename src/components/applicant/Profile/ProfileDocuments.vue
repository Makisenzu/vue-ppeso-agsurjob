<script setup lang="ts">
import { Check, X, FolderUp, Download, Eye, FileText } from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'
import { formatFileSize, DOCUMENT_UPLOAD_BUCKET } from '@/helpers/uploadHelpers'
import { mediaService } from '@/services/mediaService'
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
  StepperSeparator,
  StepperTrigger,
  StepperTitle,
  StepperDescription,
} from '@/components/ui/stepper'
import type { DocumentFile } from '@/components/applicant/Profile/ProfileFiles.vue'
import ProfileDocsUpload from './ProfileDocsUpload.vue'

const props = defineProps<{
  files: DocumentFile[]
  requirements: string[]
  hasRequirements: boolean
}>()

const authStore = useAuthStore()

function getFileMeta(requirement: string) {
  const mediaList = authStore.applicantRequirementMedia ?? []

  const match = mediaList.find((m: any) => {
    const fn = String(m?.filename ?? '')
    if (!fn) return false
    if (fn === requirement) return true
    if (requirement.includes(fn)) return true
    if (fn.includes(requirement)) return true
    return false
  })

  if (!match) return null

  const filename = String(match.filename ?? requirement)
  const size = match.size ?? null

  let typeLabel = ''
  if (match.mime_type) {
    const parts = String(match.mime_type).split('/')
    if (parts.length > 1) typeLabel = parts[1].toUpperCase()
  }

  if (!typeLabel) {
    const lastDot = filename.lastIndexOf('.')
    if (lastDot !== -1) typeLabel = filename.slice(lastDot + 1).toUpperCase()
  }

  const sizeLabel = size ? formatFileSize(Number(size)) : null

  const path = match.path ?? null
  const publicUrl = path ? mediaService.getPublicUrl(path, DOCUMENT_UPLOAD_BUCKET) : null

  return { typeLabel, sizeLabel, filename, path, publicUrl }
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

    <Stepper class="flex w-full items-start gap-2 overflow-x-auto pb-2">
      <StepperItem
        v-for="(file, index) in files"
        :key="file.name"
        :step="index + 1"
        class="relative flex min-w-32 flex-1 flex-col items-center group"
      >
        <StepperSeparator
          v-if="index !== files.length - 1"
          class="absolute left-[calc(50%+18px)] right-[calc(-50%+18px)] top-4 hidden sm:block h-0.5 shrink-0 rounded-full transition-colors duration-300"
          :class="file.uploaded ? 'bg-emerald-500' : 'bg-muted'"
        />

        <div class="flex flex-col items-center text-center">
          <StepperTrigger as-child>
            <div
              class="z-10 size-9 shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-300"
              :class="[
                file.uploaded
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-500/30'
                  : 'border-red-500 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 dark:border-red-500/30'
              ]"
            >
              <Check v-if="file.uploaded" class="size-4 stroke-3" />
              <X v-else class="size-4 stroke-3" />
            </div>
          </StepperTrigger>

          <div class="mt-2">
            <StepperTitle class="text-xs font-semibold text-foreground truncate max-w-28">
              {{ file.name }}
            </StepperTitle>
            <StepperDescription
              class="text-[10px] mt-0.5 font-medium"
              :class="file.uploaded ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'"
            >
              {{ file.uploaded ? 'Uploaded' : 'Pending' }}
            </StepperDescription>
          </div>
        </div>
      </StepperItem>
    </Stepper>

    <div v-if="hasRequirements" class="w-full md:max-w-[50%] space-y-6">
      <Card class="ring-0! shadow-sm">
        <CardContent class="space-y-4 px-6 py-5">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3 class="text-sm font-semibold text-foreground">Uploaded Requirements</h3>
              <p class="text-xs text-muted-foreground mt-0.5">
                These are the requirements currently uploaded to your profile.
              </p>
            </div>
            <ProfileDocsUpload />
          </div>
          <Attachment v-for="requirement in requirements" :key="requirement" class="w-full">
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