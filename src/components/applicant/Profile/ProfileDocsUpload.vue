<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { CircleCheckIcon, Eye, FileText, Loader2, MousePointer2, Trash2, XIcon } from '@lucide/vue'
import { useMediaQuery } from '@vueuse/core'
import { useFileUpload } from '@/composables/common/useFileUpload'
import { useAuthStore } from '@/stores/common/auth'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { applicantRequirementUploadService } from '@/services/applicant/applicantRequirementUploadService'
import {
  getRequirementAttachmentState,
  getRequirementMediaMeta,
  normalizeRequirementLabel,
} from '@/helpers/applicant/applicantRequirementDocuments'
import { REQUIRED_UPLOAD_ORDER } from '@/composables/applicant/useApplicantProfile'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Progress } from '@/components/ui/progress'
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment'
import type { UploadDocumentDefinition, UploadState } from '@/types/common/fileUpload'

const isDesktop = useMediaQuery('(min-width: 640px)')
const Modal = computed(() => ({
  Root: isDesktop.value ? Dialog : Drawer,
  Trigger: isDesktop.value ? DialogTrigger : DrawerTrigger,
  Content: isDesktop.value ? DialogContent : DrawerContent,
  Header: isDesktop.value ? DialogHeader : DrawerHeader,
  Title: isDesktop.value ? DialogTitle : DrawerTitle,
  Description: isDesktop.value ? DialogDescription : DrawerDescription,
  Footer: isDesktop.value ? DialogFooter : DrawerFooter,
  Close: isDesktop.value ? DialogClose : DrawerClose,
}))
const toastAlert = useToastAlert()
const open = ref(false)
const authStore = useAuthStore()
const profileId = computed(() => authStore.profile?.id ?? authStore.user?.id ?? null)
const isSubmitting = ref(false)
const isDeleting = ref(false)
const submitError = ref('')

const deleteDialogOpen = ref(false)
const deleteTarget = ref<UploadDocumentDefinition | null>(null)
const deleteTargetLabel = computed(() => deleteTarget.value?.label ?? '')

import { supabase } from '@/lib/supabaseClient'
import { LEGACY_APPLICANT_REQUIREMENT_TYPES, isNsrpRequirementName } from '@/helpers/applicant/applicantRequirementTypes'

const DEFAULT_ACCEPT = '.pdf,.doc,.docx,.jpg,.png'

const documents = ref<UploadDocumentDefinition[]>(
  [
    {
      id: 'supporting-document',
      label: 'Supporting Document',
      accept: DEFAULT_ACCEPT,
    },
  ]
)

function getExistingRequirementMedia(documentLabel: string) {
  return getRequirementMediaMeta(
    documentLabel,
    authStore.applicantRequirementMedia ?? [],
    authStore.applicantRequirements ?? []
  )
}

/** Position of a requirement in the mandatory upload order; templates outside it sort last and are never blocked. */
function getUploadOrder(documentLabel: string) {
  const label = normalizeRequirementLabel(documentLabel)
  const index = REQUIRED_UPLOAD_ORDER.findIndex((name) => normalizeRequirementLabel(name) === label)
  return index === -1 ? REQUIRED_UPLOAD_ORDER.length : index
}

function getExistingRequirementAttachmentState(documentLabel: string) {
  const existingRequirement = getExistingRequirementMedia(documentLabel)
  return getRequirementAttachmentState(existingRequirement?.status, existingRequirement ? 'done' : 'idle')
}

function viewFile(publicUrl?: string | null) {
  if (!publicUrl) return
  window.open(publicUrl, '_blank', 'noopener')
}

function promptDelete(doc: UploadDocumentDefinition) {
  deleteTarget.value = doc
  deleteDialogOpen.value = true
}

async function confirmDelete() {
  if (!profileId.value || !deleteTarget.value) {
    submitError.value = 'Profile not found. Please refresh and try again.'
    deleteDialogOpen.value = false
    deleteTarget.value = null
    return
  }

  isDeleting.value = true
  submitError.value = ''
  try {
    const result = await applicantRequirementUploadService.deleteApplicantRequirementDocument({
      profileId: profileId.value,
      document: deleteTarget.value,
    })
    toastAlert.success('Document deleted successfully')

    if (result?.deleted && result.applicantRequirementId) {
      try {
        authStore.applicantRequirements = (authStore.applicantRequirements ?? []).filter(
          (r: any) => r.id !== result.applicantRequirementId
        )

        authStore.applicantRequirementMedia = (authStore.applicantRequirementMedia ?? []).filter(
          (m: any) => m?.applicant_requirement_id !== result.applicantRequirementId
        )
      } catch (e) {
        // ignore local update errors
      }
    }

    // Refresh the full bundle to ensure consistency
    try {
      await authStore.hydrateUserData(profileId.value, true)
    } catch (refreshErr) {
    }

    deleteDialogOpen.value = false
    deleteTarget.value = null
  } catch (err) {
    submitError.value = err instanceof Error ? err.message : 'Failed to delete document.'
  } finally {
    isDeleting.value = false
  }
}

function cancelDelete() {
  deleteDialogOpen.value = false
  deleteTarget.value = null
}

async function loadVerificationTemplates() {
  try {
    const { data, error } = await supabase
      .from('requirement_templates')
      .select('id, name')
      .in('requirement_type', LEGACY_APPLICANT_REQUIREMENT_TYPES)

    if (error) throw error

    // The NSRP form comes from the applicant's record (download/print it from NSRP details), not an upload
    documents.value = (data ?? [])
      .filter((t: any) => !isNsrpRequirementName(t.name))
      .map((t: any) => ({
        id: `template-${t.id}`,
        label: t.name ?? `Requirement ${t.id}`,
        requirementTemplateId: t.id,
        accept: DEFAULT_ACCEPT,
      }))
      .sort((a, b) => getUploadOrder(a.label) - getUploadOrder(b.label))
  } catch (err) {
    documents.value = []
    toastAlert.error('Failed to load requirement templates. Please try again later.')
  }
}

onMounted(() => {
  loadVerificationTemplates()
})

const mapAttachmentState = (state: UploadState): 'done' | 'idle' | 'uploading' | 'processing' | 'error' => {
  if (state === 'pending') {
    return 'idle'
  }

  return state
}

const { uploadedFiles, stageFile, clearUpload, clearScope, submitUploads, formatFileSize } =
  useFileUpload('applicant-profile-documents')

// ─── Dropzone ───
/** Requirements still without a file on the profile — the ones the dropzone can fill. */
const pendingDocuments = computed(() => documents.value.filter((doc) => !getExistingRequirementMedia(doc.label)))
const uploadedDocuments = computed(() => documents.value.filter((doc) => getExistingRequirementMedia(doc.label)))
const stagedDocuments = computed(() => documents.value.filter((doc) => uploadedFiles.value[doc.id]))
const hasQueuedFiles = computed(() =>
  stagedDocuments.value.some((doc) => uploadedFiles.value[doc.id]?.state !== 'done')
)

/** A requirement counts toward the order once it is on the profile or queued in this dialog. */
function isDocumentFilled(doc: UploadDocumentDefinition) {
  return Boolean(getExistingRequirementMedia(doc.label) || uploadedFiles.value[doc.id])
}

/** The earliest requirement in the upload order still missing a file before `doc`, if any. */
function getBlockingDocument(doc: UploadDocumentDefinition) {
  const order = getUploadOrder(doc.label)
  if (order >= REQUIRED_UPLOAD_ORDER.length) return null
  return documents.value.find((other) => getUploadOrder(other.label) < order && !isDocumentFilled(other)) ?? null
}

/** Queued files whose earlier requirement was removed from the queue — they can't be submitted out of order. */
const hasOutOfOrderFiles = computed(() => stagedDocuments.value.some((doc) => getBlockingDocument(doc)))

const selectedDocId = ref('')
const selectedDocument = computed(() => pendingDocuments.value.find((doc) => doc.id === selectedDocId.value) ?? null)
const selectedAccept = computed(() => selectedDocument.value?.accept ?? DEFAULT_ACCEPT)
const acceptLabel = computed(() =>
  selectedAccept.value
    .split(',')
    .map((ext) => ext.trim().replace('.', '').toUpperCase())
    .join(', ')
)

/** Point the dropzone at the next unblocked requirement that has neither an upload nor a queued file. */
function selectNextDocument() {
  const next = pendingDocuments.value.find((doc) => !uploadedFiles.value[doc.id] && !getBlockingDocument(doc))
  selectedDocId.value = next?.id ?? ''
}

/** Re-target when the selection gets a file, or becomes blocked because an earlier queued file was removed. */
watch(
  () =>
    pendingDocuments.value.some(
      (doc) => doc.id === selectedDocId.value && !uploadedFiles.value[doc.id] && !getBlockingDocument(doc)
    ),
  (isSelectable) => {
    if (!isSelectable) selectNextDocument()
  },
  { immediate: true }
)

function isAcceptedFile(file: File, accept: string) {
  const name = file.name.toLowerCase()
  return accept.split(',').some((ext) => name.endsWith(ext.trim().toLowerCase()))
}

function addFile(file: File | null | undefined) {
  if (!file || !selectedDocument.value) return
  const blocking = getBlockingDocument(selectedDocument.value)
  if (blocking) {
    toastAlert.error('Upload in order', `Add your ${blocking.label} before the ${selectedDocument.value.label}.`)
    return
  }
  if (!isAcceptedFile(file, selectedAccept.value)) {
    toastAlert.error('File type not supported', `Use a ${acceptLabel.value} file for ${selectedDocument.value.label}.`)
    return
  }
  submitError.value = ''
  stageFile(selectedDocument.value.id, file)
  selectNextDocument()
}

/** Counts enter/leave pairs so passing over child elements doesn't flicker the drag state. */
const dragDepth = ref(0)
const isDragging = computed(() => dragDepth.value > 0)

const carriesFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes('Files')

function onDragEnter(event: DragEvent) {
  if (!carriesFiles(event)) return
  dragDepth.value += 1
}

function onDragOver(event: DragEvent) {
  if (!carriesFiles(event)) return
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
}

function onDragLeave() {
  dragDepth.value = Math.max(0, dragDepth.value - 1)
}

function onDrop(event: DragEvent) {
  dragDepth.value = 0
  addFile(event.dataTransfer?.files?.[0])
}

function onInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  addFile(input.files?.[0])
  input.value = ''
}

const closeModal = () => {
  open.value = false
}

const submitDocuments = async () => {
  submitError.value = ''

  const currentProfileId = profileId.value

  if (!currentProfileId) {
    submitError.value = 'Profile not found. Please refresh and try again.'
    return
  }
  if (hasOutOfOrderFiles.value) {
    submitError.value = `Upload your documents in order: ${REQUIRED_UPLOAD_ORDER.join(', then ')}.`
    return
  }
  isSubmitting.value = true

  try {
    const optionsByDocId = Object.fromEntries(
      documents.value.map((document) => [
        document.id,
        {
          executor: async ({ file, signal, onProgress }: { file: File; signal?: AbortSignal; onProgress: (progress: number) => void }) =>
            applicantRequirementUploadService.uploadApplicantRequirementDocument({
              docId: document.id,
              profileId: currentProfileId,
              document,
              file,
              signal,
              onProgress,
            }),
        },
      ])
    )

    await submitUploads(optionsByDocId)

    await authStore.hydrateUserData(currentProfileId, true)

    toastAlert.success('Documents uploaded successfully')
    clearScope(true)
    closeModal()
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : 'Failed to upload documents.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <component :is="Modal.Root" v-model:open="open">
    <component :is="Modal.Trigger" as-child>
      <Button class="bg-(--buttonTwo)">
        Upload Document
      </Button>
    </component>

    <component :is="Modal.Content" class="sm:max-w-lg max-h-[90vh] flex flex-col">
      <component :is="Modal.Header" class="shrink-0">
        <component :is="Modal.Title">
          Upload Document
        </component>
        <component :is="Modal.Description">
          Drop your files one at a time. Each file is filed as the next document in order.
        </component>
      </component>

      <div class="flex-1 overflow-y-auto px-6 py-4 space-y-6 max-sm:px-4">
        <p v-if="submitError" class="text-sm text-destructive">
          {{ submitError }}
        </p>

        <div v-if="documents.length === 0" class="rounded-lg bg-muted/50 p-4 text-center text-sm text-muted-foreground">
          No applicant requirement templates are available yet.
        </div>

        <p v-else-if="pendingDocuments.length === 0" class="rounded-lg bg-muted/50 p-4 text-sm text-foreground">
          All required documents are on your profile. Delete one below to replace it.
        </p>

        <p v-else-if="!selectedDocument" class="rounded-lg bg-muted/50 p-4 text-sm text-foreground">
          Every remaining document has a file. Remove one below to replace it, or click Upload.
        </p>

        <!-- ─── The dropzone files each drop as the next document in order ─── -->
        <div v-else class="space-y-3">
          <div class="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <p>
              Drop your files here. Each file you drop is accepted in this order:
              <span class="font-medium text-foreground">{{ REQUIRED_UPLOAD_ORDER.join(' → ') }}</span>.
            </p>
            <p class="mt-1">
              Next up: <span class="font-medium text-primary">{{ selectedDocument.label }}</span>
            </p>
          </div>

          <label
            for="upload-document-file"
            class="group/drop relative flex cursor-pointer flex-col items-center gap-4 overflow-hidden rounded-xl px-6 pb-6 pt-8 text-center transition-[background-color,box-shadow,transform] duration-200 ease-out
              focus-within:ring-[3px] focus-within:ring-ring/50 active:scale-[0.99] motion-reduce:transition-none"
            :class="[
              isDragging
                ? 'bg-primary/10 ring-2 ring-primary'
                : 'bg-muted/60 hover:bg-muted',
              isSubmitting && 'pointer-events-none opacity-60',
            ]"
            @dragenter.prevent="onDragEnter"
            @dragover.prevent="onDragOver"
            @dragleave.prevent="onDragLeave"
            @drop.prevent="onDrop"
          >
            <!-- Stage: a file carried in by the cursor and released into the slot -->
            <div class="relative grid size-28 place-items-center" aria-hidden="true">
              <div
                class="size-20 rounded-2xl transition-colors duration-200"
                :class="isDragging ? 'bg-primary/20' : 'bg-background animate-slot-receive motion-reduce:animate-none'"
              />
              <div
                class="absolute grid place-items-center transition-transform duration-300 ease-out"
                :class="isDragging ? '-translate-y-1.5 scale-110' : 'animate-file-drag-in motion-reduce:animate-none'"
              >
                <div class="relative grid h-14 w-11 place-items-center rounded-md bg-card shadow-md">
                  <FileText class="size-5 shrink-0 text-primary" />
                  <MousePointer2
                    class="absolute -bottom-3 -right-3 size-5 shrink-0 fill-foreground text-background"
                    :class="isDragging ? '' : 'animate-cursor-release motion-reduce:hidden'"
                  />
                </div>
              </div>
            </div>

            <div class="space-y-1">
              <p class="text-sm font-semibold text-foreground">
                <template v-if="isDragging">Release to add it as {{ selectedDocument?.label }}</template>
                <template v-else-if="isDesktop">Drag your {{ selectedDocument?.label }} here</template>
                <template v-else>Tap to choose your {{ selectedDocument?.label }}</template>
              </p>
              <p class="text-xs text-muted-foreground">
                <span v-if="isDesktop">or <span class="font-medium text-primary underline-offset-4 group-hover/drop:underline">browse your files</span> · </span>{{ acceptLabel }}
              </p>
            </div>

            <input
              id="upload-document-file"
              type="file"
              class="sr-only"
              :accept="selectedAccept"
              :disabled="isSubmitting"
              @change="onInputChange"
            />
          </label>
        </div>

        <!-- ─── Files queued in this dialog ─── -->
        <div v-if="stagedDocuments.length > 0" class="space-y-2">
          <h3 class="text-sm font-semibold text-foreground">Ready to upload</h3>
          <Attachment
            v-for="doc in stagedDocuments"
            :key="doc.id"
            :state="mapAttachmentState(uploadedFiles[doc.id].state)"
            class="w-full animate-in fade-in slide-in-from-top-2 duration-300 motion-reduce:animate-none"
          >
            <AttachmentMedia>
              <Loader2
                v-if="uploadedFiles[doc.id].state === 'uploading'"
                data-slot="spinner"
                class="size-4 animate-spin"
              />
              <CircleCheckIcon v-else-if="uploadedFiles[doc.id].state === 'done'" class="size-4 text-success" />
              <FileText v-else class="size-4 text-muted-foreground" />
            </AttachmentMedia>

            <AttachmentContent class="min-w-0">
              <AttachmentTitle>{{ doc.label }}</AttachmentTitle>
              <AttachmentDescription class="truncate">
                {{ uploadedFiles[doc.id].file.name }} ·
                <span v-if="getBlockingDocument(doc)" class="text-destructive">Add your {{ getBlockingDocument(doc)?.label }} first</span>
                <span v-else-if="uploadedFiles[doc.id].state === 'pending'">{{ formatFileSize(uploadedFiles[doc.id].file.size) }}</span>
                <span v-else-if="uploadedFiles[doc.id].state === 'uploading'">Uploading {{ uploadedFiles[doc.id].progress }}%</span>
                <span v-else-if="uploadedFiles[doc.id].state === 'done'">Uploaded</span>
                <span v-else class="text-destructive">Upload failed</span>
              </AttachmentDescription>
              <Progress
                v-if="uploadedFiles[doc.id].state === 'uploading'"
                :model-value="uploadedFiles[doc.id].progress"
                class="mt-2 h-1"
              />
            </AttachmentContent>

            <AttachmentActions>
              <AttachmentAction
                :disabled="isSubmitting"
                :aria-label="`Remove ${doc.label}`"
                @click="clearUpload(doc.id)"
              >
                <XIcon class="size-4" />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
        </div>

        <!-- ─── Already on the profile ─── -->
        <div v-if="uploadedDocuments.length > 0" class="space-y-2">
          <h3 class="text-sm font-semibold text-foreground">On your profile</h3>
          <Attachment
            v-for="doc in uploadedDocuments"
            :key="doc.id"
            :state="getExistingRequirementAttachmentState(doc.label)"
            class="w-full"
          >
            <AttachmentMedia>
              <CircleCheckIcon class="size-4 text-success" />
            </AttachmentMedia>

            <AttachmentContent class="min-w-0">
              <AttachmentTitle>{{ doc.label }}</AttachmentTitle>
              <AttachmentDescription class="truncate">
                {{ getExistingRequirementMedia(doc.label)?.filename }} ·
                {{ getExistingRequirementMedia(doc.label)?.sizeLabel ?? 'Unknown size' }}
              </AttachmentDescription>
            </AttachmentContent>

            <AttachmentActions>
              <AttachmentAction
                :aria-label="`View ${doc.label}`"
                @click="viewFile(getExistingRequirementMedia(doc.label)?.publicUrl)"
              >
                <Eye class="size-4" />
              </AttachmentAction>
              <AttachmentAction :disabled="isDeleting" :aria-label="`Delete ${doc.label}`" @click="promptDelete(doc)">
                <Trash2 class="size-4" />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
        </div>

        <!-- Delete confirmation dialog -->
        <Dialog v-model:open="deleteDialogOpen">
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete uploaded document</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{{ deleteTargetLabel }}"? This will remove the requirement record and its stored file.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="destructive" :disabled="isDeleting" @click="confirmDelete">
                {{ isDeleting ? 'Deleting...' : 'Delete' }}
              </Button>
              <DialogClose as-child>
                <Button variant="outline" @click="cancelDelete">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <component :is="Modal.Footer" class="grid grid-cols-1 gap-2 sm:grid-cols-2 shrink-0 border-t">
        <component :is="Modal.Close" as-child>
          <Button type="button" variant="outline" class="w-full">
            Cancel
          </Button>
        </component>
        <Button
          type="button"
          class="w-full bg-(--buttonTwo)"
          :disabled="isSubmitting || !hasQueuedFiles || hasOutOfOrderFiles"
          @click="submitDocuments"
        >
          <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
          {{ isSubmitting ? 'Uploading...' : 'Upload' }}
        </Button>
      </component>
    </component>
  </component>
</template>
