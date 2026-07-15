<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { CircleCheckIcon, Eye, Loader2Icon, Trash2, Upload, XIcon } from '@lucide/vue'
import { useMediaQuery } from '@vueuse/core'
import { useFileUpload } from '@/composables/useFileUpload'
import { useAuthStore } from '@/stores/auth'
import { formatFileSize as formatBytes, DOCUMENT_UPLOAD_BUCKET } from '@/helpers/uploadHelpers'
import { mediaService } from '@/services/mediaService'
import { applicantRequirementUploadService } from '@/services/applicantRequirementUploadService'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment'
import type { UploadDocumentDefinition, UploadState } from '@/types/fileUpload'

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
import { toast } from 'sonner'

const documents = ref<UploadDocumentDefinition[]>([])

function normalizeLabel(value: string) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function getExistingRequirementMedia(documentLabel: string) {
  const normalizedDocumentLabel = normalizeLabel(documentLabel)
  if (!normalizedDocumentLabel) return null

  const mediaList = authStore.applicantRequirementMedia ?? []
  const requirementRows = authStore.applicantRequirements ?? []

  const matchedRequirement = requirementRows.find((requirement: any) => {
    const requirementLabel = String(requirement?.remarks ?? requirement?.name ?? requirement?.title ?? requirement?.id ?? '')
    const requirementTemplate = String(requirement?.requirement_id ?? '')
    const normalizedRequirementLabel = normalizeLabel(requirementLabel)
    const normalizedRequirementTemplate = normalizeLabel(requirementTemplate)

    return (
      normalizedRequirementLabel === normalizedDocumentLabel ||
      normalizedRequirementLabel.includes(normalizedDocumentLabel) ||
      normalizedDocumentLabel.includes(normalizedRequirementLabel) ||
      normalizedRequirementTemplate === normalizedDocumentLabel
    )
  })

  const matchedMedia = mediaList.find((media: any) => {
    const filename = String(media?.filename ?? '')
    const altText = String(media?.alt_text ?? '')
    const description = String(media?.description ?? '')
    const normalizedFilename = normalizeLabel(filename)
    const normalizedAltText = normalizeLabel(altText)
    const normalizedDescription = normalizeLabel(description)

    return (
      normalizedFilename === normalizedDocumentLabel ||
      normalizedAltText === normalizedDocumentLabel ||
      normalizedDescription === normalizedDocumentLabel ||
      normalizedFilename.includes(normalizedDocumentLabel) ||
      normalizedDocumentLabel.includes(normalizedFilename)
    )
  })

  const chosenMedia = matchedMedia ?? (matchedRequirement ? mediaList.find((media: any) => media?.applicant_requirement_id === matchedRequirement.id) : null)

  if (!chosenMedia) return null

  const filename = String(chosenMedia.filename ?? documentLabel)
  const size = chosenMedia.size ?? null
  const path = chosenMedia.path ?? null
  const publicUrl = path ? mediaService.getPublicUrl(path, DOCUMENT_UPLOAD_BUCKET) : null

  return {
    filename,
    sizeLabel: size ? formatBytes(Number(size)) : null,
    publicUrl,
    path,
  }
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
    await applicantRequirementUploadService.deleteApplicantRequirementDocument({
      profileId: profileId.value,
      document: deleteTarget.value,
    })

    await authStore.hydrateUserData(profileId.value, true)
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
      .eq('requirement_type', 'verification')

    if (error) throw error

    if (data && data.length > 0) {
      documents.value = data.map((t: any) => ({
        id: `template-${t.id}`,
        label: t.name ?? `Requirement ${t.id}`,
        requirementTemplateId: t.id,
      }))
    }
  } catch (err) {
    toast.error('Failed to load verification templates. Please try again later.')
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

const { uploadedFiles, inputResetKeys, handleFileChange, clearUpload, submitUploads, formatFileSize } =
  useFileUpload('applicant-profile-documents')

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
    // Refresh the cached user bundle so new requirement media shows immediately
    try {
      await authStore.hydrateUserData(currentProfileId, true)
    } catch (refreshErr) {
      // Non-fatal: log and continue
      // eslint-disable-next-line no-console
      console.warn('Failed to refresh user bundle after upload', refreshErr)
    }
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

    <component :is="Modal.Content" class="sm:max-w-md">
      <component :is="Modal.Header">
        <component :is="Modal.Title">
          Upload Document
        </component>
        <component :is="Modal.Description">
          Select a document to upload to your profile. Only PDF, DOC, and DOCX files are accepted.
        </component>
      </component>

      <p v-if="submitError" class="text-sm text-destructive">
        {{ submitError }}
      </p>

      <div class="space-y-4">
        <div v-for="doc in documents" :key="doc.id" class="grid w-full gap-1.5">
          <Label :for="doc.id" class="text-sm font-medium leading-none">
            {{ doc.label }}
          </Label>

          <div v-if="getExistingRequirementMedia(doc.label)" class="pt-1">
            <Attachment state="done" class="w-full">
              <AttachmentMedia>
                <CircleCheckIcon class="size-4 text-emerald-600" />
              </AttachmentMedia>

              <AttachmentContent>
                <AttachmentTitle>
                  {{ getExistingRequirementMedia(doc.label)?.filename }}
                </AttachmentTitle>
                <AttachmentDescription>
                  <span>
                    Uploaded • {{ getExistingRequirementMedia(doc.label)?.sizeLabel ?? 'Unknown size' }}
                  </span>
                </AttachmentDescription>
              </AttachmentContent>

              <AttachmentActions>
                <AttachmentAction @click="viewFile(getExistingRequirementMedia(doc.label)?.publicUrl)">
                  <Eye class="size-4" />
                </AttachmentAction>
                <AttachmentAction :disabled="isDeleting" @click="promptDelete(doc)">
                  <Trash2 class="size-4" />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          </div>

          <Input
            v-else
            :key="`${doc.id}-${inputResetKeys[doc.id] ?? 0}`"
            :id="doc.id"
            type="file"
            :accept="doc.accept ?? '.pdf,.doc,.docx,.jpg,.png'"
            class="w-full"
            @change="handleFileChange(doc, $event)"
          />

          <div v-if="uploadedFiles[doc.id]" class="pt-1">
            <Attachment :state="mapAttachmentState(uploadedFiles[doc.id].state)" class="w-full">
              <AttachmentMedia>
                <Loader2Icon
                  v-if="uploadedFiles[doc.id].state === 'uploading'"
                  data-slot="spinner"
                  class="size-4 animate-spin"
                />
                <CircleCheckIcon v-else-if="uploadedFiles[doc.id].state === 'done'" class="size-4 text-emerald-600" />
                <XIcon v-else class="size-4 text-muted-foreground" />
              </AttachmentMedia>

              <AttachmentContent>
                <AttachmentTitle>
                  {{ uploadedFiles[doc.id].file.name }}
                </AttachmentTitle>
                <AttachmentDescription>
                  <span v-if="uploadedFiles[doc.id].state === 'pending'">
                    Ready to upload
                  </span>
                  <span v-else-if="uploadedFiles[doc.id].state === 'uploading'">
                    Uploading... {{ uploadedFiles[doc.id].progress }}%
                  </span>
                  <span v-else-if="uploadedFiles[doc.id].state === 'done'">
                    Uploaded • {{ formatFileSize(uploadedFiles[doc.id].file.size) }}
                  </span>
                  <span v-else>
                    Upload failed
                  </span>
                </AttachmentDescription>
              </AttachmentContent>

              <AttachmentActions>
                <AttachmentAction @click="clearUpload(doc.id)">
                  <Upload v-if="uploadedFiles[doc.id].state !== 'done'" class="size-4" />
                  <XIcon v-else class="size-4" />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          </div>
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

      <component
        :is="Modal.Footer"
        class="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:space-x-0"
      >
          <Button type="button" class="w-full bg-(--buttonTwo)" :disabled="isSubmitting" @click="submitDocuments">
            {{ isSubmitting ? 'Uploading...' : 'Submit' }}
          </Button>
        <component :is="Modal.Close" as-child>
          <Button type="button" variant="outline" class="w-full">
            Cancel
          </Button>
        </component>
      </component>
    </component>
  </component>
</template>