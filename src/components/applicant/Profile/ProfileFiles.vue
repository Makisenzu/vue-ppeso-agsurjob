<script setup lang="ts">
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  FolderOpen,
  FileText,
  FileCheck2,
  FileUser,
  FileBadge2,
  Download,
  Eye,
  Upload,
  CheckCircle2,
  Clock,
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

const fileIconMap: Record<string, any> = {
  form: FileCheck2,
  application: FileText,
  resume: FileUser,
  certificate: FileBadge2,
}

const fileColorMap: Record<string, string> = {
  form: 'text-blue-500 bg-blue-500/10 dark:bg-blue-500/20',
  application: 'text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20',
  resume: 'text-violet-500 bg-violet-500/10 dark:bg-violet-500/20',
  certificate: 'text-amber-500 bg-amber-500/10 dark:bg-amber-500/20',
}
</script>

<template>
  <Card class="border-none shadow-sm overflow-hidden">
    <!-- Header -->
    <div class="bg-muted/30 border-b border-border/40 px-5 py-3 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="bg-indigo-500/10 dark:bg-indigo-500/20 p-1.5 rounded-lg">
          <FolderOpen class="w-4 h-4 text-indigo-500" />
        </div>
        <h3 class="text-sm font-bold tracking-wide text-foreground uppercase">
          My Files
        </h3>
      </div>
      <span class="text-[10px] text-muted-foreground font-mono bg-muted/50 px-2 py-0.5 rounded-full">
        {{ displayFiles.filter(f => f.uploaded).length }}/{{ displayFiles.length }}
      </span>
    </div>

    <!-- File List -->
    <CardContent class="p-0">
      <div class="divide-y divide-border/30">
        <div
          v-for="(file, idx) in displayFiles"
          :key="file.name"
          class="flex items-center gap-3.5 px-5 py-3.5 hover:bg-muted/20 transition-all duration-200 group cursor-pointer"
          :style="{ animationDelay: `${idx * 60}ms` }"
        >
          <!-- File Icon -->
          <div
            class="p-2 rounded-xl shrink-0 transition-all duration-200 group-hover:scale-105"
            :class="fileColorMap[file.type]"
          >
            <component
              :is="fileIconMap[file.type] || FileText"
              class="w-4.5 h-4.5"
            />
          </div>

          <!-- File Info -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-foreground/90 truncate group-hover:text-foreground transition-colors">
              {{ file.name }}
            </p>
            <div class="flex items-center gap-1.5 mt-0.5">
              <CheckCircle2
                v-if="file.uploaded"
                class="w-3 h-3 text-emerald-500"
              />
              <Clock
                v-else
                class="w-3 h-3 text-amber-500"
              />
              <span class="text-[10px] font-mono" :class="file.uploaded ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'">
                {{ file.uploaded ? 'Uploaded' : 'Pending' }}
              </span>
            </div>
          </div>

          <!-- Actions (reveal on hover) -->
          <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button
              v-if="file.uploaded"
              variant="ghost"
              size="icon"
              class="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary"
            >
              <Eye class="w-3.5 h-3.5" />
            </Button>
            <Button
              v-if="file.uploaded"
              variant="ghost"
              size="icon"
              class="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary"
            >
              <Download class="w-3.5 h-3.5" />
            </Button>
            <Button
              v-if="!file.uploaded"
              variant="ghost"
              size="icon"
              class="h-7 w-7 rounded-lg hover:bg-amber-500/10 hover:text-amber-500"
            >
              <Upload class="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
