<script setup lang="ts">
import { ref } from 'vue'
import { FileText, Loader2 } from '@lucide/vue'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { supportingDocumentService } from '@/services/common/supportingDocumentService'

const props = defineProps<{
  /** Path in the 'documents' bucket. */
  path: string
  label: string
}>()

const toastAlert = useToastAlert()
const isOpening = ref(false)

async function openDocument() {
  isOpening.value = true
  try {
    await supportingDocumentService.openInNewTab(props.path)
  } catch (error) {
    toastAlert.error('Could not open document', error instanceof Error ? error.message : 'Please try again.')
  } finally {
    isOpening.value = false
  }
}
</script>

<template>
  <button
    type="button"
    class="inline-flex max-w-full cursor-pointer items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline disabled:opacity-60 print:hidden"
    :disabled="isOpening"
    @click="openDocument"
  >
    <Loader2 v-if="isOpening" class="size-3.5 shrink-0 animate-spin" />
    <FileText v-else class="size-3.5 shrink-0" />
    <span class="truncate">{{ label }}</span>
  </button>
</template>
