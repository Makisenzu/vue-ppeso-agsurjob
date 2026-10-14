<script setup lang="ts">
import { computed } from 'vue'
import { ExternalLink, FileText } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
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

const checkedCount = computed(() => requirements.value.filter((doc) => doc.checked).length)
const attachedCount = computed(() => requirements.value.filter((doc) => doc.checked && doc.attachment).length)
</script>

<template>
  <div class="space-y-2">
    <Skeleton v-if="isLoading" class="h-3 w-48" />
    <p v-else class="text-xs text-muted-foreground">
      {{ attachedCount }} of {{ checkedCount }} checked requirement(s) have a file attached — open each to verify it.
    </p>

    <ul class="divide-y overflow-hidden rounded-lg border">
      <li
        v-for="doc in requirements"
        :key="doc.key"
        class="flex items-center gap-3 p-3"
      >
        <!-- Thumbnail opens the full file in a new tab -->
        <Skeleton v-if="doc.checked && isLoading" class="size-10 shrink-0 rounded-md" />
        <a
          v-else-if="doc.attachment?.url"
          :href="doc.attachment.url"
          target="_blank"
          rel="noopener noreferrer"
          class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted"
          :aria-label="`Open ${doc.label}`"
        >
          <img v-if="doc.isImage" :src="doc.attachment.url" :alt="doc.label" class="size-full object-cover" />
          <FileText v-else class="size-5 text-muted-foreground" />
        </a>
        <div v-else class="size-10 shrink-0 rounded-md border border-dashed" />

        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium" :class="doc.checked ? 'text-foreground' : 'text-muted-foreground'">
            {{ doc.label }}
          </p>
          <Skeleton v-if="doc.checked && isLoading" class="mt-1 h-3 w-32" />
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
          <p v-else class="text-xs text-muted-foreground">
            {{ doc.checked ? 'No file attached' : 'Not submitted' }}
          </p>
        </div>

        <!-- Flags the requirements PESO still needs a file for -->
        <Badge
          v-if="doc.checked && !doc.attachment && !isLoading"
          variant="outline"
          class="shrink-0 border-warning/30 bg-warning/10 text-warning"
        >
          Missing file
        </Badge>
      </li>
    </ul>
  </div>
</template>
