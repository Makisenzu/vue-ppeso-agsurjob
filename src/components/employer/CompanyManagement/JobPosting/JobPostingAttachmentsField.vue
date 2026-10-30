<script setup lang="ts">
import { ref } from 'vue'
import { ExternalLink, FileText, Paperclip, X } from '@lucide/vue'
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment'
import type { AttachmentItem } from '@/composables/employer/useJobPostingAttachments'

/** Optional files on a job posting; staged until the posting is saved (useJobPostingAttachments) */
defineProps<{
  items: AttachmentItem[]
  remainingSlots: number
  maxFiles: number
  maxSizeMb: number
  accept: string
  error: string | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  add: [files: FileList | null]
  remove: [item: AttachmentItem]
}>()

const isDraggingFiles = ref(false)

function onInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  emit('add', input.files)
  // Clear the input so picking the same file again still fires `change`
  input.value = ''
}

function onDrop(event: DragEvent) {
  isDraggingFiles.value = false
  emit('add', event.dataTransfer?.files ?? null)
}
</script>

<template>
  <section class="grid gap-3">
    <div class="flex items-baseline justify-between gap-2">
      <h3 class="text-sm font-semibold">
        Attachments <span class="font-normal text-muted-foreground">(optional)</span>
      </h3>
      <span class="text-xs text-muted-foreground">{{ items.length }} / {{ maxFiles }}</span>
    </div>

    <div v-if="items.length" class="grid gap-2 sm:grid-cols-2">
      <Attachment
        v-for="item in items"
        :key="item.key"
        :state="item.isNew ? 'idle' : 'done'"
        class="w-full min-w-0"
      >
        <AttachmentMedia :variant="item.isImage && item.url ? 'image' : 'icon'">
          <img v-if="item.isImage && item.url" :src="item.url" :alt="item.filename">
          <FileText v-else />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle class="block truncate">{{ item.filename }}</AttachmentTitle>
          <AttachmentDescription>
            {{ [item.sizeLabel, item.isNew ? 'Uploads on save' : null].filter(Boolean).join(' · ') }}
          </AttachmentDescription>
        </AttachmentContent>
        <AttachmentActions>
          <AttachmentAction v-if="!item.isNew && item.url" as-child :aria-label="`Open ${item.filename}`">
            <a :href="item.url" target="_blank" rel="noopener noreferrer">
              <ExternalLink />
            </a>
          </AttachmentAction>
          <AttachmentAction
            type="button"
            class="hover:text-destructive"
            :aria-label="`Remove ${item.filename}`"
            :disabled="disabled"
            @click="emit('remove', item)"
          >
            <X />
          </AttachmentAction>
        </AttachmentActions>
      </Attachment>
    </div>

    <label
      v-if="remainingSlots > 0"
      class="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-5 text-center transition-colors hover:bg-muted/50 has-disabled:cursor-not-allowed has-disabled:opacity-50"
      :class="{ 'border-primary bg-primary/5': isDraggingFiles }"
      @dragover.prevent="isDraggingFiles = !disabled"
      @dragleave.prevent="isDraggingFiles = false"
      @drop.prevent="!disabled && onDrop($event)"
    >
      <Paperclip class="size-5 text-muted-foreground" />
      <span class="text-sm font-medium">Add attachments</span>
      <span class="text-xs text-muted-foreground">
        Job poster, full description or forms · PDF, Word or image · up to {{ maxSizeMb }}MB each
      </span>
      <input type="file" class="sr-only" multiple :accept="accept" :disabled="disabled" @change="onInputChange">
    </label>

    <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
  </section>
</template>
