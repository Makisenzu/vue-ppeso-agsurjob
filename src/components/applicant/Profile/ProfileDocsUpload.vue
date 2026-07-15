<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { CircleCheckIcon, Loader2Icon, XIcon } from '@lucide/vue'
import { useMediaQuery } from '@vueuse/core'
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

type UploadState = 'uploading' | 'done'

interface UploadedDocument {
  file: File
  state: UploadState
  progress: number
  intervalId?: ReturnType<typeof setInterval>
  timeoutId?: ReturnType<typeof setTimeout>
}

const uploadedFiles = ref<Record<string, UploadedDocument>>({})
const inputResetKeys = ref<Record<string, number>>({})

const documents = [
  { id: 'nsrp-form', label: 'NSRP Form' },
  { id: 'application-form', label: 'Application Form' },
  { id: 'resume', label: 'Resume' },
  { id: 'birth-certificate', label: 'Birth Certificate' },
]

const clearUpload = (docId: string, resetInput = true) => {
  const currentUpload = uploadedFiles.value[docId]

  if (currentUpload?.intervalId) {
    clearInterval(currentUpload.intervalId)
  }

  if (currentUpload?.timeoutId) {
    clearTimeout(currentUpload.timeoutId)
  }

  delete uploadedFiles.value[docId]

  if (resetInput) {
    inputResetKeys.value[docId] = (inputResetKeys.value[docId] ?? 0) + 1
  }
}

const handleFileChange = (docId: string, event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) {
    return
  }

  clearUpload(docId, false)

  uploadedFiles.value[docId] = {
    file,
    state: 'uploading',
    progress: 0,
  }

  const intervalId = setInterval(() => {
    const currentUpload = uploadedFiles.value[docId]
    if (!currentUpload || currentUpload.state !== 'uploading') {
      return
    }

    currentUpload.progress = Math.min(currentUpload.progress + 10, 90)
  }, 180)

  const timeoutId = setTimeout(() => {
    const currentUpload = uploadedFiles.value[docId]
    if (!currentUpload) {
      return
    }

    currentUpload.state = 'done'
    currentUpload.progress = 100

    if (currentUpload.intervalId) {
      clearInterval(currentUpload.intervalId)
      currentUpload.intervalId = undefined
    }
  }, 1800)

  uploadedFiles.value[docId].intervalId = intervalId
  uploadedFiles.value[docId].timeoutId = timeoutId
}

const formatFileSize = (sizeInBytes: number) => {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`
  }

  if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(2)} KB`
  }

  return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`
}

onBeforeUnmount(() => {
  Object.keys(uploadedFiles.value).forEach((docId) => {
    clearUpload(docId, false)
  })
})
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
          Select a document to upload to your profile.
        </component>
      </component>

      <div class="space-y-4">
        <div v-for="doc in documents" :key="doc.id" class="grid w-full gap-1.5">
          <Label :for="doc.id" class="text-sm font-medium leading-none">
            {{ doc.label }}
          </Label>
          <Input
            :key="`${doc.id}-${inputResetKeys[doc.id] ?? 0}`"
            :id="doc.id"
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.png"
            class="w-full"
            @change="handleFileChange(doc.id, $event)"
          />

          <div v-if="uploadedFiles[doc.id]" class="pt-1">
            <Attachment :state="uploadedFiles[doc.id].state" class="w-full">
              <AttachmentMedia>
                <Loader2Icon
                  v-if="uploadedFiles[doc.id].state === 'uploading'"
                  data-slot="spinner"
                  class="size-4 animate-spin"
                />
                <CircleCheckIcon v-else class="size-4 text-emerald-600" />
              </AttachmentMedia>

              <AttachmentContent>
                <AttachmentTitle>
                  {{ uploadedFiles[doc.id].file.name }}
                </AttachmentTitle>
                <AttachmentDescription>
                  <span v-if="uploadedFiles[doc.id].state === 'uploading'">
                    Uploading... {{ uploadedFiles[doc.id].progress }}%
                  </span>
                  <span v-else>
                    Uploaded • {{ formatFileSize(uploadedFiles[doc.id].file.size) }}
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
          <Button type="button" class="w-full bg-(--buttonTwo)">
            Submit
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