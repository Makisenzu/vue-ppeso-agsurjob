<script setup lang="ts">
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Download,
  Eye,
  Upload,
} from '@lucide/vue'
import { computed } from 'vue'

export interface DocumentFile {
  name: string
  type: 'form' | 'application' | 'resume' | 'certificate'
  uploaded: boolean
}

const props = defineProps<{
  files?: DocumentFile[]
}>()

const defaultFiles: DocumentFile[] = [
  { name: 'NSRP Form', type: 'form', uploaded: true },
  { name: 'Application Form', type: 'application', uploaded: true },
  { name: 'Resume', type: 'resume', uploaded: true },
  { name: 'Birth Certificate', type: 'certificate', uploaded: false },
]

const displayFiles = computed(() => props.files?.length ? props.files : defaultFiles)

const typeLabelMap: Record<string, string> = {
  form: 'Form',
  application: 'Application',
  resume: 'Resume',
  certificate: 'Certificate',
}
</script>

<template>
  <div class="flex items-center justify-between">
    <h3 class="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
      My Files
    </h3>
    <span class="text-xs text-muted-foreground tabular-nums">
      {{ displayFiles.filter(f => f.uploaded).length }} / {{ displayFiles.length }} uploaded
    </span>
  </div>

  <Card class="border border-border/60 shadow-none">
    <CardContent class="p-0">
      <div class="divide-y divide-border/60">
        <div
          v-for="file in displayFiles"
          :key="file.name"
          class="flex items-center gap-3.5 px-4 py-3 hover:bg-muted/30 transition-colors duration-150 group"
        >
          <!-- File icon -->
          <div class="shrink-0 text-muted-foreground">
            <FileText class="w-4 h-4" />
          </div>

          <!-- File info -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-foreground truncate leading-tight">
              {{ file.name }}
            </p>
            <p class="text-xs text-muted-foreground mt-0.5">
              {{ typeLabelMap[file.type] }}
            </p>
          </div>

          <!-- Status -->
          <span
            class="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
            :class="file.uploaded
              ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10'
              : 'text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10'"
          >
            {{ file.uploaded ? 'Uploaded' : 'Pending' }}
          </span>

          <!-- Actions -->
          <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
            <template v-if="file.uploaded">
              <Button variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:text-foreground">
                <Eye class="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:text-foreground">
                <Download class="w-3.5 h-3.5" />
              </Button>
            </template>
            <Button
              v-else
              variant="ghost"
              size="icon"
              class="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <Upload class="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>