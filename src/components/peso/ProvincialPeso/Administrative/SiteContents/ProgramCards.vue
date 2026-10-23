<script setup lang="ts">
import { ImageOff, ImagePlus, Loader2, Trash2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import SiteContentSection from '@/components/peso/ProvincialPeso/Administrative/SiteContents/SiteContentSection.vue'
import { useProgramCards } from '@/composables/peso/provincialPeso/useProgramCards'

const {
  programCards,
  isLoading,
  errorMessage,
  isClearing,
  programToClearLabel,
  isClearDialogOpen,
  imageAccept,
  imageMaxMb,
  selectImage,
  requestClear,
  confirmClear,
} = useProgramCards()
</script>

<template>
  <SiteContentSection section-id="program-cards" title="Program cards">
    <template #description>
      Background photos of the PESO Programs gallery. Portrait, about 900 × 1200, JPG, PNG or WebP up to {{ imageMaxMb }}MB.
    </template>

    <div
      v-if="errorMessage"
      class="rounded border border-destructive/20 bg-destructive/10 p-4 text-center text-sm text-destructive"
    >
      {{ errorMessage }}
    </div>

    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <template v-if="isLoading && !errorMessage">
        <Skeleton v-for="program in programCards" :key="program.key" class="aspect-[3/4] w-full rounded-lg" />
      </template>

      <template v-else>
        <div v-for="program in programCards" :key="program.key" class="grid content-start gap-2">
          <div class="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
            <img v-if="program.imageUrl" :src="program.imageUrl" :alt="program.name" class="size-full object-cover" />
            <ImageOff v-else class="size-6 text-muted-foreground" aria-hidden="true" />
            <div v-if="program.isSaving" class="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2 class="size-5 animate-spin text-muted-foreground" />
            </div>
          </div>

          <div class="min-w-0">
            <p class="truncate text-sm font-medium">{{ program.label }}</p>
            <p class="text-xs text-muted-foreground">{{ program.imageUrl ? 'Photo set' : 'Plain background' }}</p>
          </div>

          <div class="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" as-child :disabled="program.isSaving">
              <label :for="`program-card-${program.key}`" class="cursor-pointer">
                <ImagePlus class="size-4" />
                {{ program.imageUrl ? 'Replace' : 'Upload' }}
              </label>
            </Button>
            <Button
              v-if="program.imageUrl"
              type="button"
              variant="ghost"
              size="sm"
              class="text-destructive hover:bg-destructive/10 hover:text-destructive"
              :disabled="program.isSaving"
              :aria-label="`Remove the ${program.label} photo`"
              @click="requestClear(program.key)"
            >
              <Trash2 class="size-4" />
            </Button>
          </div>
          <input
            :id="`program-card-${program.key}`"
            type="file"
            class="sr-only"
            :accept="imageAccept"
            :disabled="program.isSaving"
            @change="(event: Event) => selectImage(program.key, event)"
          />
          <p v-if="program.fileError" class="text-xs text-destructive">{{ program.fileError }}</p>
        </div>
      </template>
    </div>
  </SiteContentSection>

  <AlertDialog v-model:open="isClearDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Remove photo?</AlertDialogTitle>
        <AlertDialogDescription>
          The <strong class="font-medium text-foreground">{{ programToClearLabel }}</strong> card will show a plain background.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel class="cursor-pointer" :disabled="isClearing">Cancel</AlertDialogCancel>
        <Button variant="destructive" class="cursor-pointer" :disabled="isClearing" @click="confirmClear">
          <Loader2 v-if="isClearing" class="size-4 shrink-0 animate-spin" />
          {{ isClearing ? 'Removing...' : 'Remove Photo' }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
