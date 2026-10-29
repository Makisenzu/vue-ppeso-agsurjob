<script setup lang="ts">
import { computed } from 'vue'
import { CircleCheckIcon, FileText, Loader2, MousePointer2, Trash2, XIcon } from '@lucide/vue'
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
import { Progress } from '@/components/ui/progress'
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment'
import SwipeRow from '@/components/SwipeRow.vue'
import HoldButton from '@/components/HoldButton.vue'
import { useCompanyDocsUpload } from '@/composables/employer/useCompanyDocsUpload'

/** Upload Document dialog (drawer on mobile) of the Company Profile, same flow as the applicant's ProfileDocsUpload */
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

const {
  open,
  isSubmitting,
  submitError,
  documents,
  uploadOrder,
  pendingDocuments,
  uploadedDocuments,
  stagedDocuments,
  hasQueuedFiles,
  hasOutOfOrderFiles,
  selectedDocument,
  uploadedFiles,
  docId,
  getBlockingDocument,
  clearUpload,
  formatFileSize,
  mapAttachmentState,
  acceptTypes,
  acceptLabel,
  isDragging,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onInputChange,
  submitDocuments,
  getSwipeActions,
  describeOnFile,
  statusTextOf,
  deleteTarget,
  deleteDialogOpen,
  isDeleting,
  confirmDelete,
  remindHoldToDelete,
} = useCompanyDocsUpload()
</script>

<template>
  <component :is="Modal.Root" v-model:open="open">
    <component :is="Modal.Trigger" as-child>
      <Button class="bg-(--buttonTwo)">Upload Document</Button>
    </component>

    <component :is="Modal.Content" class="flex max-h-[90vh] flex-col sm:max-w-lg">
      <component :is="Modal.Header" class="shrink-0">
        <component :is="Modal.Title">Upload Document</component>
        <component :is="Modal.Description">
          Drop your files one at a time. Each file is filed as the next document in order.
        </component>
      </component>

      <div class="flex-1 space-y-6 overflow-y-auto px-6 py-4 max-sm:px-4">
        <p v-if="submitError" class="text-sm text-destructive">{{ submitError }}</p>

        <div v-if="documents.length === 0" class="rounded-lg bg-muted/50 p-4 text-center text-sm text-muted-foreground">
          No company requirement templates are available yet.
        </div>

        <p v-else-if="pendingDocuments.length === 0" class="rounded-lg bg-muted/50 p-4 text-sm text-foreground">
          All required documents are on your profile. Delete one below to replace it.
        </p>

        <p v-else-if="!selectedDocument" class="rounded-lg bg-muted/50 p-4 text-sm text-foreground">
          Every remaining document has a file. Remove one below to replace it, or click Upload.
        </p>

        <!-- ─── The dropzone files each drop as the next document in order ─── -->
        <div v-else class="space-y-3">
          <div class="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <p>
              Drop your files here. Each file you drop is accepted in this order:
              <span class="font-medium text-foreground">{{ uploadOrder.join(' → ') }}</span>.
            </p>
            <p class="mt-1">
              Next up: <span class="font-medium text-primary">{{ selectedDocument.name }}</span>
            </p>
          </div>

          <label
            for="upload-company-document-file"
            class="group/drop relative flex cursor-pointer flex-col items-center gap-4 overflow-hidden rounded-xl px-6 pt-8 pb-6 text-center transition-[background-color,box-shadow,transform] duration-200 ease-out focus-within:ring-[3px] focus-within:ring-ring/50 active:scale-[0.99] motion-reduce:transition-none"
            :class="[isDragging ? 'bg-primary/10 ring-2 ring-primary' : 'bg-muted/60 hover:bg-muted', isSubmitting && 'pointer-events-none opacity-60']"
            @dragenter.prevent="onDragEnter"
            @dragover.prevent="onDragOver"
            @dragleave.prevent="onDragLeave"
            @drop.prevent="onDrop"
          >
            <!-- Stage: a file carried in by the cursor and released into the slot -->
            <div class="relative grid size-28 place-items-center" aria-hidden="true">
              <div
                class="size-20 rounded-2xl transition-colors duration-200"
                :class="isDragging ? 'bg-primary/20' : 'animate-slot-receive bg-background motion-reduce:animate-none'"
              />
              <div
                class="absolute grid place-items-center transition-transform duration-300 ease-out"
                :class="isDragging ? '-translate-y-1.5 scale-110' : 'animate-file-drag-in motion-reduce:animate-none'"
              >
                <div class="relative grid h-14 w-11 place-items-center rounded-md bg-card shadow-md">
                  <FileText class="size-5 shrink-0 text-primary" />
                  <MousePointer2
                    class="absolute -right-3 -bottom-3 size-5 shrink-0 fill-foreground text-background"
                    :class="isDragging ? '' : 'animate-cursor-release motion-reduce:hidden'"
                  />
                </div>
              </div>
            </div>

            <div class="space-y-1">
              <p class="text-sm font-semibold text-foreground">
                <template v-if="isDragging">Release to add it as {{ selectedDocument.name }}</template>
                <template v-else-if="isDesktop">Drag your {{ selectedDocument.name }} here</template>
                <template v-else>Tap to choose your {{ selectedDocument.name }}</template>
              </p>
              <p class="text-xs text-muted-foreground">
                <span v-if="isDesktop">
                  or <span class="font-medium text-primary underline-offset-4 group-hover/drop:underline">browse your files</span> ·
                </span>
                {{ acceptLabel }}
              </p>
            </div>

            <input
              id="upload-company-document-file"
              type="file"
              class="sr-only"
              :accept="acceptTypes"
              :disabled="isSubmitting"
              @change="onInputChange"
            />
          </label>
        </div>

        <!-- ─── Files queued in this dialog ─── -->
        <div v-if="stagedDocuments.length > 0" class="space-y-2">
          <h3 class="text-sm font-semibold text-foreground">Ready to upload</h3>
          <Attachment
            v-for="doc in stagedDocuments"
            :key="docId(doc)"
            :state="mapAttachmentState(uploadedFiles[docId(doc)].state)"
            class="w-full animate-in duration-300 fade-in slide-in-from-top-2 motion-reduce:animate-none"
          >
            <AttachmentMedia>
              <Loader2
                v-if="uploadedFiles[docId(doc)].state === 'uploading'"
                data-slot="spinner"
                class="size-4 animate-spin"
              />
              <CircleCheckIcon v-else-if="uploadedFiles[docId(doc)].state === 'done'" class="size-4 text-success" />
              <FileText v-else class="size-4 text-muted-foreground" />
            </AttachmentMedia>

            <AttachmentContent class="min-w-0">
              <AttachmentTitle>{{ doc.name }}</AttachmentTitle>
              <AttachmentDescription class="truncate">
                {{ uploadedFiles[docId(doc)].file.name }} ·
                <span v-if="getBlockingDocument(doc)" class="text-destructive">Add your {{ getBlockingDocument(doc)?.name }} first</span>
                <span v-else-if="uploadedFiles[docId(doc)].state === 'pending'">{{ formatFileSize(uploadedFiles[docId(doc)].file.size) }}</span>
                <span v-else-if="uploadedFiles[docId(doc)].state === 'uploading'">Uploading {{ uploadedFiles[docId(doc)].progress }}%</span>
                <span v-else-if="uploadedFiles[docId(doc)].state === 'done'">Uploaded</span>
                <span v-else class="text-destructive">{{ uploadedFiles[docId(doc)].errorMessage || 'Upload failed' }}</span>
              </AttachmentDescription>
              <Progress
                v-if="uploadedFiles[docId(doc)].state === 'uploading'"
                :model-value="uploadedFiles[docId(doc)].progress"
                class="mt-2 h-1"
              />
            </AttachmentContent>

            <AttachmentActions>
              <AttachmentAction :disabled="isSubmitting" :aria-label="`Remove ${doc.name}`" @click="clearUpload(docId(doc))">
                <XIcon class="size-4" />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
        </div>

        <!-- ─── Already on the profile ─── -->
        <div v-if="uploadedDocuments.length > 0" class="space-y-2">
          <div>
            <h3 class="text-sm font-semibold text-foreground">On your profile</h3>
            <p class="mt-0.5 text-xs text-muted-foreground">Swipe a file to the left to view or delete it.</p>
          </div>
          <div class="flex flex-col gap-2">
            <SwipeRow
              v-for="doc in uploadedDocuments"
              :key="docId(doc)"
              :label="doc.name"
              :actions="getSwipeActions(doc)"
              :full-swipe="false"
              :disabled="isDeleting"
              :radius="10"
              row-color="var(--muted)"
              text-color="var(--foreground)"
              action-color="var(--destructive)"
              action-text-color="var(--background)"
              drawer-color="var(--secondary)"
              drawer-text-color="var(--secondary-foreground)"
            >
              <div class="flex size-9 shrink-0 items-center justify-center rounded-md bg-background">
                <CircleCheckIcon class="size-4 text-success" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">{{ doc.name }}</p>
                <p class="truncate text-xs text-muted-foreground">
                  {{ describeOnFile(doc) }}
                  <span v-if="statusTextOf(doc)" :class="statusTextOf(doc)?.textClass">· {{ statusTextOf(doc)?.label }}</span>
                </p>
              </div>
            </SwipeRow>
          </div>
        </div>

        <!-- Delete confirmation dialog -->
        <Dialog v-model:open="deleteDialogOpen">
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete uploaded document</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{{ deleteTarget?.name }}"? This will remove the requirement record and its
                stored file. Press and hold the delete button to confirm.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose as-child>
                <Button variant="outline" :disabled="isDeleting">Cancel</Button>
              </DialogClose>
              <!-- Holding is the confirmation; resetAfter lets the button recover if the delete fails -->
              <HoldButton
                size="sm"
                :radius="8"
                :hold-time="1500"
                :reset-after="1500"
                :disabled="isDeleting"
                done-label="Deleting..."
                background-color="var(--muted)"
                text-color="var(--foreground)"
                fill-color="var(--destructive)"
                fill-text-color="var(--background)"
                @hold="confirmDelete"
                @tap="remindHoldToDelete"
              >
                <template #icon>
                  <Trash2 class="size-4 shrink-0" />
                </template>
                <template #doneIcon>
                  <Loader2 class="size-4 shrink-0 animate-spin" />
                </template>
                Hold to delete
              </HoldButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <component :is="Modal.Footer" class="grid shrink-0 grid-cols-1 gap-2 border-t sm:grid-cols-2">
        <component :is="Modal.Close" as-child>
          <Button type="button" variant="outline" class="w-full">Cancel</Button>
        </component>
        <Button
          type="button"
          class="w-full bg-(--buttonTwo)"
          :disabled="isSubmitting || !hasQueuedFiles || hasOutOfOrderFiles"
          @click="submitDocuments"
        >
          <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
          {{ isSubmitting ? 'Uploading...' : 'Upload' }}
        </Button>
      </component>
    </component>
  </component>
</template>
