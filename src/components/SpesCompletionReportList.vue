<script setup lang="ts">
import { reactive } from 'vue'
import { ExternalLink, Loader2 } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatFileSize } from '@/helpers/common/uploadHelpers'
import {
  SPES_COMPLETION_REPORTS,
  SPES_COMPLETION_REPORT_MAX_BYTES,
  SPES_COMPLETION_REPORT_MIME_TYPE,
  type SpesCompletionReportMap,
  type SpesCompletionReportType,
} from '@/types/common/spesForm'

/**
 * DTR and Accomplishment Report of a SPES appointment, with PDF upload / replace / remove.
 * Shared by the Provincial PESO dashboard and the beneficiary's SPES page; the parent saves the files.
 */
const props = withDefaults(
  defineProps<{
    reports: SpesCompletionReportMap
    /** Report currently uploading or being removed. */
    busyType?: SpesCompletionReportType | null
    isLoading?: boolean
    /** Hides upload / remove (e.g. the appointment is no longer Active). */
    readonly?: boolean
  }>(),
  { busyType: null, isLoading: false, readonly: false }
)

const emit = defineEmits<{
  (e: 'upload', type: SpesCompletionReportType, file: File): void
  (e: 'remove', type: SpesCompletionReportType): void
}>()

const errors = reactive<Partial<Record<SpesCompletionReportType, string>>>({})

const onPicked = (type: SpesCompletionReportType, event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // Lets the same file be picked again
  input.value = ''
  delete errors[type]
  if (!file) return
  if (file.type !== SPES_COMPLETION_REPORT_MIME_TYPE) {
    errors[type] = 'Upload a PDF file.'
    return
  }
  if (file.size > SPES_COMPLETION_REPORT_MAX_BYTES) {
    errors[type] = `The file must be ${SPES_COMPLETION_REPORT_MAX_BYTES / 1024 / 1024} MB or smaller.`
    return
  }
  emit('upload', type, file)
}

const isBusy = (type: SpesCompletionReportType) => props.busyType === type
</script>

<template>
  <ul class="divide-y rounded-lg border">
    <li v-for="doc in SPES_COMPLETION_REPORTS" :key="doc.key" class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0 space-y-1">
        <div class="flex flex-wrap items-center gap-2">
          <p class="text-sm font-medium">{{ doc.label }}</p>
          <Skeleton v-if="isLoading && !reports[doc.key]" class="h-5 w-20" />
          <Badge
            v-else
            variant="outline"
            :class="
              reports[doc.key]
                ? 'bg-success/10 text-success border-success/30'
                : 'bg-warning/10 text-warning border-warning/30'
            "
          >
            {{ reports[doc.key] ? 'Submitted' : 'Missing' }}
          </Badge>
        </div>
        <p v-if="reports[doc.key]" class="truncate text-xs text-muted-foreground">
          {{ reports[doc.key]!.filename }}
          <template v-if="reports[doc.key]!.size"> · {{ formatFileSize(reports[doc.key]!.size!) }}</template>
        </p>
        <p v-else class="text-xs text-muted-foreground">{{ doc.hint }}. PDF only.</p>
        <p v-if="errors[doc.key]" class="text-xs text-destructive">{{ errors[doc.key] }}</p>
      </div>

      <div class="flex shrink-0 flex-wrap gap-2">
        <Button v-if="reports[doc.key]?.url" variant="outline" size="sm" as-child>
          <AppLink :href="reports[doc.key]!.url!" target="_blank">
            View
            <ExternalLink class="size-3.5 shrink-0" />
          </AppLink>
        </Button>
        <template v-if="!readonly">
          <Button
            v-if="reports[doc.key]"
            variant="ghost"
            size="sm"
            class="text-destructive hover:bg-destructive/10 hover:text-destructive"
            :disabled="!!busyType"
            @click="emit('remove', doc.key)"
          >
            Remove
          </Button>
          <Button size="sm" :variant="reports[doc.key] ? 'outline' : 'default'" :disabled="!!busyType" as-child>
            <label class="cursor-pointer">
              <Loader2 v-if="isBusy(doc.key)" class="size-4 shrink-0 animate-spin" />
              {{ isBusy(doc.key) ? 'Saving...' : reports[doc.key] ? 'Replace' : 'Upload PDF' }}
              <input
                type="file"
                class="sr-only"
                :accept="SPES_COMPLETION_REPORT_MIME_TYPE"
                :disabled="!!busyType"
                @change="onPicked(doc.key, $event)"
              />
            </label>
          </Button>
        </template>
      </div>
    </li>
  </ul>
</template>
