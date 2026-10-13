<script setup lang="ts">
import { computed } from 'vue'
import { Check, ExternalLink, FileText, X } from '@lucide/vue'
import { Skeleton } from '@/components/ui/skeleton'
import { SPES_DOCUMENT_REQUIREMENTS, type SpesDocumentAttachmentMap, type SpesFormRow } from '@/types/common/spesForm'

/** Documentary requirements of a SPES form with the image / PDF attached to each, for PESO review. */
const props = defineProps<{
  form: SpesFormRow
  attachments: SpesDocumentAttachmentMap
  isLoading?: boolean
}>()

const requirements = computed(() =>
  SPES_DOCUMENT_REQUIREMENTS.map((doc) => {
    const attachment = props.attachments[doc.key]
    return {
      key: doc.key,
      label: doc.label,
      checked: props.form[doc.key],
      attachment,
      isImage: !!attachment?.mimeType?.startsWith('image/'),
    }
  })
)
</script>

<template>
  <ul class="divide-y rounded-lg border">
    <li v-for="doc in requirements" :key="doc.key" class="flex items-center gap-3 p-3">
      <Check v-if="doc.checked" class="size-4 shrink-0 text-success" aria-label="Checked" />
      <X v-else class="size-4 shrink-0 text-muted-foreground" aria-label="Not checked" />

      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium" :class="doc.checked ? 'text-foreground' : 'text-muted-foreground'">
          {{ doc.label }}
        </p>
        <Skeleton v-if="doc.checked && isLoading" class="mt-1 h-3 w-32" />
        <p v-else-if="doc.checked && !doc.attachment" class="text-xs text-muted-foreground">No file attached</p>
        <a
          v-else-if="doc.attachment?.url"
          :href="doc.attachment.url"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex max-w-full items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <span class="truncate">{{ doc.attachment.filename }}</span>
          <ExternalLink class="size-3 shrink-0" />
        </a>
        <p v-else-if="doc.attachment" class="truncate text-xs text-muted-foreground">
          {{ doc.attachment.filename }} (preview unavailable)
        </p>
      </div>

      <!-- Thumbnail opens the full file in a new tab -->
    </li>
  </ul>
</template>
