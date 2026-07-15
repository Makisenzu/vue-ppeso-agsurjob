<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { CircleCheckIcon, Loader2Icon, XIcon } from '@lucide/vue'
import { useMediaQuery } from '@vueuse/core'
import { useFileUpload } from '@/composables/useFileUpload'
import { useAuthStore } from '@/stores/auth'
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
const submitError = ref('')

import { supabase } from '@/lib/supabaseClient'

const defaultDocuments: UploadDocumentDefinition[] = [
  { id: 'nsrp-form', label: 'NSRP Form', requirementTemplateId: 2 },
  { id: 'application-form', label: 'Application Form', requirementTemplateId: 3 },
  { id: 'resume', label: 'Resume', requirementTemplateId: 1 },
  { id: 'birth-certificate', label: 'Birth Certificate', requirementTemplateId: 4 },
]

const documents = ref<UploadDocumentDefinition[]>([])

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
    } else {
      documents.value = defaultDocuments
    }
  } catch (err) {
    // fallback to defaults on error
    documents.value = defaultDocuments
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
          Select a document to upload to your profile. Each upload is saved to your requirements.
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
          <Input
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
                  <XIcon class="size-4" />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          </div>
        </div>
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