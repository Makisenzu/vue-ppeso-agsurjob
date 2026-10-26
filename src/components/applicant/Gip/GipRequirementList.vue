<script setup lang="ts">
import { CircleDashed, Eye, FileText, Loader2, RefreshCw, Trash2, Upload } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type { GipRequirementRow } from '@/composables/applicant/useGipApplicationForm'

defineProps<{
  requirements: GipRequirementRow[]
  /** Upload / remove / generate controls; otherwise read-only */
  canUpload: boolean
  isSubmitting: boolean
  isGeneratingNsrp: boolean
  attachmentAccept: string
}>()

const emit = defineEmits<{
  pick: [doc: string, file: File | undefined]
  remove: [doc: string]
  generateNsrp: []
}>()

const onFilePicked = (doc: string, event: Event) => {
  const input = event.target as HTMLInputElement
  emit('pick', doc, input.files?.[0])
  // Lets the same file be picked again after clearing it
  input.value = ''
}
</script>

<template>
  <ol class="flex flex-col">
    <li
      v-for="(doc, index) in requirements"
      :key="doc.name"
      class="grid grid-cols-[2rem_1fr] gap-x-3 border-t border-border py-4 last:border-b"
    >
      <span class="pt-0.5 text-sm font-semibold text-muted-foreground tabular-nums" aria-hidden="true">
        {{ String(index + 1).padStart(2, '0') }}
      </span>
      <div class="flex min-w-0 flex-col gap-2">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex min-w-0 flex-col">
            <span class="text-sm font-semibold text-foreground sm:text-base">
              {{ doc.name }}
              <span v-if="doc.isOptional" class="text-sm font-normal text-muted-foreground">(optional)</span>
            </span>
            <span v-if="doc.isNsrp" class="text-xs text-muted-foreground">Generated from your NSRP profile</span>
          </div>

          <!-- NSRP being generated -->
          <span v-if="doc.isNsrp && isGeneratingNsrp" class="inline-flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
            <Loader2 class="size-4 animate-spin" /> Generating NSRP form...
          </span>

          <!-- Attached file (picked / generated, or saved): view and remove -->
          <div v-else-if="doc.pendingFileName || doc.savedFileName" class="flex min-w-0 items-center gap-1">
            <FileText class="size-4 shrink-0 text-muted-foreground" />
            <span class="truncate text-sm text-foreground" :title="doc.pendingFileName ?? doc.savedFileName ?? ''">
              {{ doc.pendingFileName ?? doc.savedFileName }}
            </span>
            <span v-if="doc.pendingFileName" class="shrink-0 text-xs text-muted-foreground">· uploads on submit</span>
            <span v-else-if="doc.uploadedAt" class="hidden shrink-0 text-xs text-muted-foreground sm:inline">
              · {{ doc.uploadedAt }}
            </span>
            <Button
              v-if="doc.pendingFileUrl || doc.savedFileUrl"
              variant="ghost"
              size="icon-sm"
              as-child
              class="shrink-0"
              :aria-label="`View ${doc.name}`"
            >
              <a :href="(doc.pendingFileUrl ?? doc.savedFileUrl)!" target="_blank" rel="noopener noreferrer" title="View">
                <Eye class="size-4" />
              </a>
            </Button>
            <Button
              v-if="canUpload"
              type="button"
              variant="ghost"
              size="icon-sm"
              class="shrink-0 hover:text-destructive"
              title="Remove"
              :aria-label="`Remove ${doc.name}`"
              :disabled="isSubmitting || doc.isDeleting"
              @click="emit('remove', doc.name)"
            >
              <Loader2 v-if="doc.isDeleting" class="size-4 animate-spin" />
              <Trash2 v-else class="size-4" />
            </Button>
          </div>

          <!-- Nothing attached yet -->
          <div v-else class="flex shrink-0 flex-wrap items-center gap-2">
            <template v-if="canUpload">
              <Button
                v-if="doc.isNsrp"
                type="button"
                variant="outline"
                size="sm"
                class="cursor-pointer"
                :disabled="isSubmitting"
                @click="emit('generateNsrp')"
              >
                <RefreshCw class="size-4" /> Generate NSRP form
              </Button>
              <Button v-else type="button" variant="outline" size="sm" as-child :disabled="isSubmitting">
                <label class="cursor-pointer" :class="{ 'pointer-events-none opacity-50': isSubmitting }">
                  <Upload class="size-4" /> Upload PDF
                  <input
                    type="file"
                    class="sr-only"
                    :accept="attachmentAccept"
                    :disabled="isSubmitting"
                    @change="onFilePicked(doc.name, $event)"
                  />
                </label>
              </Button>
            </template>
            <span v-else-if="doc.isReceived" class="text-sm text-success">Received by PESO</span>
            <span v-else class="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <CircleDashed class="size-4" /> {{ doc.isOptional ? 'Not attached' : 'Not submitted' }}
            </span>
          </div>
        </div>
        <p v-if="doc.error" class="text-sm text-destructive">{{ doc.error }}</p>
      </div>
    </li>
  </ol>
</template>
