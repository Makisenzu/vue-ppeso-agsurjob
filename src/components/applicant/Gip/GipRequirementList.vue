<script setup lang="ts">
import { ChevronDown, CircleDashed, Eye, FileText, FolderOpen, Loader2, RefreshCw, Trash2, Upload } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { GipRequirementRow } from '@/composables/applicant/useGipApplicationForm'
import type { ReusableProfileDocument } from '@/helpers/applicant/applicantRequirementDocuments'

withDefaults(
  defineProps<{
    requirements: GipRequirementRow[]
    /** Upload / remove / generate controls; otherwise read-only */
    canUpload: boolean
    isSubmitting: boolean
    isGeneratingNsrp: boolean
    attachmentAccept: string
    /** PDFs already on the applicant's profile, offered for any requirement */
    profileDocuments?: ReusableProfileDocument[]
    /** SPES also takes images, so it says "Upload file" */
    uploadLabel?: string
  }>(),
  { profileDocuments: () => [], uploadLabel: 'Upload PDF' }
)

const emit = defineEmits<{
  pick: [doc: string, file: File | undefined]
  useProfile: [doc: string, profileDocumentId: string]
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
            <span v-else-if="doc.hint" class="text-xs text-muted-foreground">{{ doc.hint }}</span>
          </div>

          <!-- NSRP being generated -->
          <span v-if="doc.isNsrp && isGeneratingNsrp" class="inline-flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
            <Loader2 class="size-4 animate-spin" /> Generating NSRP form...
          </span>

          <!-- Attached file (picked / generated, or saved): view and remove -->
          <div v-else-if="doc.pendingFileName || doc.savedFileName" class="flex min-w-0 items-center gap-1">
            <!-- File name (icon kept right before it), with its status or upload date underneath -->
            <div class="flex min-w-0 flex-col sm:items-end">
              <span class="flex max-w-full min-w-0 items-center gap-1">
                <FileText class="size-4 shrink-0 text-muted-foreground" />
                <span class="truncate text-sm text-foreground" :title="doc.pendingFileName ?? doc.savedFileName ?? ''">
                  {{ doc.pendingFileName ?? doc.savedFileName }}
                </span>
              </span>
              <span v-if="doc.isFromProfile" class="text-xs text-muted-foreground">From your documents</span>
              <span v-else-if="doc.pendingFileName" class="text-xs text-muted-foreground">Uploads on submit</span>
              <span v-else-if="doc.uploadedAt" class="text-xs text-muted-foreground">{{ doc.uploadedAt }}</span>
            </div>
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
                  <Upload class="size-4" /> {{ uploadLabel }}
                  <input
                    type="file"
                    class="sr-only"
                    :accept="attachmentAccept"
                    :disabled="isSubmitting"
                    @change="onFilePicked(doc.name, $event)"
                  />
                </label>
              </Button>
              <!-- Reuse a PDF already uploaded on the profile -->
              <DropdownMenu v-if="!doc.isNsrp && profileDocuments.length">
                <DropdownMenuTrigger as-child>
                  <Button type="button" variant="outline" size="sm" class="cursor-pointer" :disabled="isSubmitting">
                    <FolderOpen class="size-4" /> My documents
                    <ChevronDown class="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" class="w-64">
                  <DropdownMenuLabel class="text-xs text-muted-foreground">Use a document from your profile</DropdownMenuLabel>
                  <DropdownMenuItem
                    v-for="item in profileDocuments"
                    :key="item.id"
                    class="cursor-pointer"
                    @select="emit('useProfile', doc.name, item.id)"
                  >
                    <div class="flex min-w-0 flex-col">
                      <span class="text-sm font-medium">{{ item.label }}</span>
                      <span class="truncate text-xs text-muted-foreground">{{ item.fileName }}</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
