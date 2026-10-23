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
import { useMunicipalityLogos } from '@/composables/peso/provincialPeso/useMunicipalityLogos'

const {
  municipalityLogos,
  isLoading,
  errorMessage,
  isClearing,
  municipalityToClearName,
  isClearDialogOpen,
  imageAccept,
  imageMaxMb,
  selectImage,
  requestClear,
  confirmClear,
} = useMunicipalityLogos()
</script>

<template>
  <section class="space-y-4" aria-labelledby="municipality-logos-title">
    <div>
      <h2 id="municipality-logos-title" class="text-lg font-semibold">Municipality logos</h2>
      <p class="text-sm text-muted-foreground">
        Logos of the 13 municipalities and 1 city on the landing page. Square, about 512 × 512, PNG or WebP with a
        transparent background (JPG works too), up to {{ imageMaxMb }}MB.
      </p>
    </div>

    <div
      v-if="errorMessage"
      class="rounded border border-destructive/20 bg-destructive/10 p-4 text-center text-sm text-destructive"
    >
      {{ errorMessage }}
    </div>

    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
      <template v-if="isLoading && !errorMessage">
        <Skeleton v-for="municipality in municipalityLogos" :key="municipality.key" class="aspect-square w-full rounded-lg" />
      </template>

      <template v-else>
        <div v-for="municipality in municipalityLogos" :key="municipality.key" class="grid content-start gap-2">
          <div class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
            <img
              v-if="municipality.imageUrl"
              :src="municipality.imageUrl"
              :alt="`${municipality.name} logo`"
              class="size-full object-contain p-3"
            />
            <ImageOff v-else class="size-6 text-muted-foreground" aria-hidden="true" />
            <div v-if="municipality.isSaving" class="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2 class="size-5 animate-spin text-muted-foreground" />
            </div>
          </div>

          <div class="min-w-0">
            <p class="truncate text-sm font-medium">{{ municipality.name }}</p>
            <p class="text-xs text-muted-foreground">
              {{ municipality.isCity ? 'City' : 'Municipality' }} · {{ municipality.imageUrl ? 'Logo set' : 'Province seal' }}
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" as-child :disabled="municipality.isSaving">
              <label :for="`municipality-logo-${municipality.key}`" class="cursor-pointer">
                <ImagePlus class="size-4" />
                {{ municipality.imageUrl ? 'Replace' : 'Upload' }}
              </label>
            </Button>
            <Button
              v-if="municipality.imageUrl"
              type="button"
              variant="ghost"
              size="sm"
              class="text-destructive hover:bg-destructive/10 hover:text-destructive"
              :disabled="municipality.isSaving"
              :aria-label="`Remove the ${municipality.name} logo`"
              @click="requestClear(municipality.key)"
            >
              <Trash2 class="size-4" />
            </Button>
          </div>
          <input
            :id="`municipality-logo-${municipality.key}`"
            type="file"
            class="sr-only"
            :accept="imageAccept"
            :disabled="municipality.isSaving"
            @change="(event: Event) => selectImage(municipality.key, event)"
          />
          <p v-if="municipality.fileError" class="text-xs text-destructive">{{ municipality.fileError }}</p>
        </div>
      </template>
    </div>
  </section>

  <AlertDialog v-model:open="isClearDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Remove logo?</AlertDialogTitle>
        <AlertDialogDescription>
          <strong class="font-medium text-foreground">{{ municipalityToClearName }}</strong> will show the province seal
          until a new logo is uploaded.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel class="cursor-pointer" :disabled="isClearing">Cancel</AlertDialogCancel>
        <Button variant="destructive" class="cursor-pointer" :disabled="isClearing" @click="confirmClear">
          <Loader2 v-if="isClearing" class="size-4 shrink-0 animate-spin" />
          {{ isClearing ? 'Removing...' : 'Remove Logo' }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
