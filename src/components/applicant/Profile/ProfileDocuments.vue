<script setup lang="ts">
import { computed } from 'vue'
import { Check, X, FolderUp } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Card, CardContent } from '@/components/ui/card'
import {
  Stepper,
  StepperItem,
  StepperSeparator,
  StepperTrigger,
  StepperTitle,
  StepperDescription,
} from '@/components/ui/stepper'
import type { DocumentFile } from '@/components/applicant/Profile/ProfileFiles.vue'

const props = defineProps<{
  files: DocumentFile[]
  requirements: string[]
  hasRequirements: boolean
}>()

const uploadedCount = computed(() => props.files.filter((file) => file.uploaded).length)
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-foreground">Document Upload Progress</h3>
        <p class="text-xs text-muted-foreground mt-0.5">
          Please ensure all required documents are uploaded to verify your profile.
        </p>
      </div>
      <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 w-fit">
        {{ uploadedCount }} / {{ files.length }} Uploaded
      </span>
    </div>

    <Stepper class="flex w-full items-start gap-2 overflow-x-auto pb-2">
      <StepperItem
        v-for="(file, index) in files"
        :key="file.name"
        :step="index + 1"
        class="relative flex min-w-32 flex-1 flex-col items-center group"
      >
        <StepperSeparator
          v-if="index !== files.length - 1"
          class="absolute left-[calc(50%+18px)] right-[calc(-50%+18px)] top-4 hidden sm:block h-0.5 shrink-0 rounded-full transition-colors duration-300"
          :class="file.uploaded ? 'bg-emerald-500' : 'bg-muted'"
        />

        <div class="flex flex-col items-center text-center">
          <StepperTrigger as-child>
            <div
              class="z-10 size-9 shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-300"
              :class="[
                file.uploaded
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-500/30'
                  : 'border-red-500 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 dark:border-red-500/30'
              ]"
            >
              <Check v-if="file.uploaded" class="size-4 stroke-3" />
              <X v-else class="size-4 stroke-3" />
            </div>
          </StepperTrigger>

          <div class="mt-2">
            <StepperTitle class="text-xs font-semibold text-foreground truncate max-w-28">
              {{ file.name }}
            </StepperTitle>
            <StepperDescription
              class="text-[10px] mt-0.5 font-medium"
              :class="file.uploaded ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'"
            >
              {{ file.uploaded ? 'Uploaded' : 'Pending' }}
            </StepperDescription>
          </div>
        </div>
      </StepperItem>
    </Stepper>

    <Card v-if="hasRequirements" class="border-none shadow-sm">
      <CardContent class="space-y-4 px-6 py-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h3 class="text-sm font-semibold text-foreground">Uploaded Requirements</h3>
            <p class="text-xs text-muted-foreground mt-0.5">
              These are the requirements currently uploaded to your profile.
            </p>
          </div>
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 w-fit">
            {{ requirements.length }} Uploaded
          </span>
        </div>

        <ul class="grid gap-2 sm:grid-cols-2">
          <li
            v-for="requirement in requirements"
            :key="requirement"
            class="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground"
          >
            <FolderCode class="size-4 text-muted-foreground" />
            <span class="truncate">{{ requirement }}</span>
          </li>
        </ul>
      </CardContent>
    </Card>

    <Empty v-else class="border border-border/50 shadow-sm rounded-xl overflow-hidden bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderUp />
        </EmptyMedia>
      </EmptyHeader>
      <EmptyTitle>No requirements uploaded yet</EmptyTitle>
      <EmptyDescription>
        Get started by uploading your required documents.
      </EmptyDescription>
      <EmptyContent>
        <Button class="bg-(--buttonTwo)">Upload requirements</Button>
      </EmptyContent>
    </Empty>
  </div>
</template>
