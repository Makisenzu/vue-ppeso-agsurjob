<script setup lang="ts">
import { computed, ref } from 'vue'
import { ExternalLink, FileText, Loader2, Paperclip, RefreshCw, Trash2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useJobFairAttachments, type SavedAttachment } from '@/composables/peso/provincialPeso/useJobFairAttachments'

const props = defineProps<{
  jobFairId: string
  disabled?: boolean
}>()

const {
  attachments,
  isLoading,
  isUploading,
  busyIds,
  attachmentError,
  attachmentToDelete,
  remainingSlots,
  attachmentAccept,
  attachmentMaxSizeMB,
  attachmentMaxFiles,
  addAttachments,
  replaceAttachment,
  requestDeleteAttachment,
  cancelDeleteAttachment,
  confirmDeleteAttachment,
} = useJobFairAttachments(() => props.jobFairId)

const isDraggingFiles = ref(false)
const canAdd = computed(() => !props.disabled && !isUploading.value && remainingSlots.value > 0)

const isDeleteDialogOpen = computed({
  get: () => attachmentToDelete.value !== null,
  set: (open) => {
    if (!open) cancelDeleteAttachment()
  },
})
const isDeletingTarget = computed(() => !!attachmentToDelete.value && busyIds.value.has(attachmentToDelete.value.id))

// One hidden input serves every "Replace" button; we remember which row asked.
const replaceInput = ref<HTMLInputElement | null>(null)
const replaceTarget = ref<SavedAttachment | null>(null)

function pickReplacement(attachment: SavedAttachment) {
  replaceTarget.value = attachment
  replaceInput.value?.click()
}

function onReplaceInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (replaceTarget.value) replaceAttachment(replaceTarget.value, input.files?.[0])
  replaceTarget.value = null
  input.value = ''
}

function onAddInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  addAttachments(input.files)
  // Clear the input so picking the same file again still fires `change`
  input.value = ''
}

function onDrop(event: DragEvent) {
  isDraggingFiles.value = false
  if (!canAdd.value) return
  addAttachments(event.dataTransfer?.files ?? null)
}
</script>

<template>
  <div class="grid gap-2">
    <div class="flex items-baseline justify-between gap-2">
      <p class="text-sm font-medium">Attachments</p>
      <span class="text-xs text-muted-foreground">{{ attachments.length }} / {{ attachmentMaxFiles }}</span>
    </div>

    <!-- Saved attachments -->
    <div v-if="isLoading" class="grid gap-2 sm:grid-cols-2">
      <Skeleton v-for="i in 2" :key="i" class="h-14 w-full rounded-xl" />
    </div>

    <div v-else-if="attachments.length" class="grid gap-2 sm:grid-cols-2">
      <Attachment
        v-for="attachment in attachments"
        :key="attachment.id"
        :state="busyIds.has(attachment.id) ? 'processing' : 'done'"
        class="w-full min-w-0"
      >
        <AttachmentMedia :variant="attachment.isImage ? 'image' : 'icon'">
          <img v-if="attachment.isImage" :src="attachment.url" :alt="attachment.filename">
          <FileText v-else />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle class="block truncate">{{ attachment.filename }}</AttachmentTitle>
          <AttachmentDescription>{{ attachment.sizeLabel }}</AttachmentDescription>
        </AttachmentContent>
        <AttachmentActions>
          <AttachmentAction as-child :aria-label="`Open ${attachment.filename}`">
            <AppLink :href="attachment.url" target="_blank">
              <ExternalLink />
            </AppLink>
          </AttachmentAction>
          <AttachmentAction
            type="button"
            :aria-label="`Replace ${attachment.filename}`"
            :disabled="disabled || busyIds.has(attachment.id)"
            @click="pickReplacement(attachment)"
          >
            <Loader2 v-if="busyIds.has(attachment.id)" class="animate-spin" />
            <RefreshCw v-else />
          </AttachmentAction>
          <AttachmentAction
            type="button"
            class="hover:text-destructive"
            :aria-label="`Delete ${attachment.filename}`"
            :disabled="disabled || busyIds.has(attachment.id)"
            @click="requestDeleteAttachment(attachment)"
          >
            <Trash2 />
          </AttachmentAction>
        </AttachmentActions>
      </Attachment>
    </div>

    <p v-else class="text-sm text-muted-foreground">No attachments yet.</p>

    <!-- Add more -->
    <label
      v-if="remainingSlots > 0"
      class="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-5 text-center transition-colors hover:bg-muted/50 has-disabled:cursor-not-allowed has-disabled:opacity-50"
      :class="{ 'border-primary bg-primary/5': isDraggingFiles }"
      @dragover.prevent="isDraggingFiles = true"
      @dragleave.prevent="isDraggingFiles = false"
      @drop.prevent="onDrop"
    >
      <Loader2 v-if="isUploading" class="size-5 animate-spin text-muted-foreground" />
      <Paperclip v-else class="size-5 text-muted-foreground" />
      <span class="text-sm font-medium">{{ isUploading ? 'Uploading...' : 'Add attachments' }}</span>
      <span class="text-xs text-muted-foreground">
        Images or PDF · up to {{ attachmentMaxSizeMB }}MB each · saved immediately
      </span>
      <input
        type="file"
        class="sr-only"
        multiple
        :accept="attachmentAccept"
        :disabled="!canAdd"
        @change="onAddInputChange"
      >
    </label>

    <input
      ref="replaceInput"
      type="file"
      class="hidden"
      :accept="attachmentAccept"
      @change="onReplaceInputChange"
    >

    <p v-if="attachmentError" class="text-sm text-destructive">{{ attachmentError }}</p>

    <!-- Delete Confirmation -->
    <AlertDialog v-model:open="isDeleteDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete attachment?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong class="font-medium text-foreground">{{ attachmentToDelete?.filename }}</strong> will be
            permanently deleted. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel class="cursor-pointer" :disabled="isDeletingTarget">Cancel</AlertDialogCancel>
          <Button variant="destructive" class="cursor-pointer" :disabled="isDeletingTarget" @click="confirmDeleteAttachment">
            <Loader2 v-if="isDeletingTarget" class="size-4 shrink-0 animate-spin" />
            {{ isDeletingTarget ? 'Deleting...' : 'Delete' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
