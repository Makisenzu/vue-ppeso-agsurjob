<script setup lang="ts">
import { computed, ref } from 'vue'
import { Eye, FileText, Loader2, Upload, XIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useAuthStore } from '@/stores/common/auth'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { useNsrpFormContext } from '@/composables/applicant/useNsrpForm'
import { applicantCompletionService } from '@/services/applicant/applicantCompletionService'
import { DEFAULT_UPLOAD_ACCEPT } from '@/helpers/common/uploadHelpers'

const props = defineProps<{
  list: 'vocational_trainings' | 'eligibilities'
  index: number
  label: string
}>()

const authStore = useAuthStore()
const toastAlert = useToastAlert()
const { values, setEntryDocument } = useNsrpFormContext()

const entry = computed(() => values.value[props.list][props.index])
const inputId = computed(() => `${props.list}-${props.index}-document`)
const isUploading = ref(false)

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  const profileId = authStore.user?.id
  if (!file || !profileId) return

  isUploading.value = true
  try {
    setEntryDocument(props.list, props.index, await applicantCompletionService.uploadSupportingDocument(profileId, file))
  } catch (error) {
    toastAlert.error('Upload failed', error instanceof Error ? error.message : 'Please try again.')
  } finally {
    isUploading.value = false
  }
}

function viewDocument() {
  if (!entry.value?.document_path) return
  window.open(applicantCompletionService.getSupportingDocumentUrl(entry.value.document_path), '_blank', 'noopener')
}
</script>

<template>
  <FormField v-slot="{ errorMessage }" :name="`${list}[${index}].document_path`">
    <!-- data-list-error lets focusFirstNsrpError() scroll to a missing upload -->
    <FormItem :data-list-error="errorMessage ? '' : undefined">
      <FormLabel :for="inputId">{{ label }}</FormLabel>
      <div
        v-if="entry?.document_path"
        class="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2"
      >
        <FileText class="size-4 shrink-0 text-primary" />
        <span class="min-w-0 flex-1 truncate text-sm text-foreground">{{ entry.document_name || 'Supporting document' }}</span>
        <Button type="button" variant="ghost" size="icon" class="size-9" aria-label="View document" @click="viewDocument">
          <Eye class="size-4 shrink-0" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          class="-mr-1 size-9 text-muted-foreground hover:text-destructive"
          aria-label="Remove document"
          @click="setEntryDocument(list, index, null)"
        >
          <XIcon class="size-4 shrink-0" />
        </Button>
      </div>
      <label
        v-else
        :for="inputId"
        class="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 focus-within:ring-[3px] focus-within:ring-ring/50"
        :class="isUploading && 'pointer-events-none opacity-60'"
      >
        <Loader2 v-if="isUploading" class="size-4 shrink-0 animate-spin" />
        <Upload v-else class="size-4 shrink-0" />
        {{ isUploading ? 'Uploading…' : 'Choose a file (PDF, DOC, DOCX, JPG, PNG · max 10 MB)' }}
        <input
          :id="inputId"
          type="file"
          class="sr-only"
          :accept="DEFAULT_UPLOAD_ACCEPT"
          :disabled="isUploading"
          @change="onFileChange"
        />
      </label>
      <FormMessage />
    </FormItem>
  </FormField>
</template>
