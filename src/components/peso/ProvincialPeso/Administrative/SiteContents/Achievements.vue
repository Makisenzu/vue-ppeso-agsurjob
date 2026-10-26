<script setup lang="ts">
import { ImagePlus, Loader2, Trash2, Trophy } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
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
import { useAchievements } from '@/composables/peso/provincialPeso/useAchievements'

const {
  achievements,
  isLoading,
  errorMessage,
  isUploading,
  uploadLabel,
  isDeleting,
  savingTitleId,
  fileErrors,
  isDeleteDialogOpen,
  achievementToDeleteTitle,
  imageAccept,
  imageMaxMb,
  maxFiles,
  selectPhotos,
  onTitleBlur,
  requestDelete,
  confirmDelete,
} = useAchievements()
</script>

<template>
  <SiteContentSection section-id="achievements" title="Achievements">
    <template #description>
      Awards, recognitions and milestones of the office, shown as a photo masonry under the organizational chart on the
      What is PESO? page, newest first. JPG, PNG or WebP, up to {{ imageMaxMb }}MB each, {{ maxFiles }} at a time.
    </template>

    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm text-muted-foreground">
        <template v-if="isUploading">{{ uploadLabel }}</template>
        <template v-else-if="!isLoading">{{ achievements.length }} achievement{{ achievements.length === 1 ? '' : 's' }}</template>
      </p>
      <Button type="button" as-child :disabled="isUploading">
        <label for="achievement-photos-input" class="cursor-pointer" :class="{ 'pointer-events-none opacity-50': isUploading }">
          <Loader2 v-if="isUploading" class="size-4 animate-spin" />
          <ImagePlus v-else class="size-4" />
          Add Achievements
        </label>
      </Button>
      <input
        id="achievement-photos-input"
        type="file"
        class="sr-only"
        multiple
        :accept="imageAccept"
        :disabled="isUploading"
        @change="selectPhotos"
      />
    </div>

    <ul v-if="fileErrors.length" class="space-y-1 text-sm text-destructive">
      <li v-for="error in fileErrors" :key="error">{{ error }}</li>
    </ul>

    <div
      v-if="errorMessage"
      class="rounded border border-destructive/20 bg-destructive/10 p-4 text-center text-sm text-destructive"
    >
      {{ errorMessage }}
    </div>

    <div v-if="isLoading && !errorMessage" class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <Skeleton v-for="i in 5" :key="i" class="aspect-[4/3] w-full rounded-lg" />
    </div>

    <Empty v-else-if="!errorMessage && achievements.length === 0" class="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Trophy />
        </EmptyMedia>
        <EmptyTitle>No achievements yet</EmptyTitle>
        <EmptyDescription>The section stays hidden on the What is PESO? page until one is added.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button type="button" as-child :disabled="isUploading">
          <label for="achievement-photos-input" class="cursor-pointer">
            <ImagePlus class="size-4" />
            Add Achievements
          </label>
        </Button>
      </EmptyContent>
    </Empty>

    <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <div v-for="(achievement, index) in achievements" :key="achievement.id" class="grid content-start gap-2">
        <div class="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-muted">
          <img :src="achievement.image_url" :alt="achievement.title ?? ''" class="size-full object-cover" loading="lazy" />
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            class="absolute top-2 right-2 text-destructive shadow-sm hover:text-destructive"
            :aria-label="`Remove ${achievement.title || 'this achievement'}`"
            @click="requestDelete(achievement)"
          >
            <Trash2 class="size-4" />
          </Button>
          <div v-if="savingTitleId === achievement.id" class="absolute inset-x-0 bottom-0 flex justify-center bg-background/70 py-1">
            <Loader2 class="size-4 animate-spin text-muted-foreground" />
          </div>
        </div>
        <Input
          :model-value="achievement.title ?? ''"
          placeholder="e.g. Best PESO in Caraga, 2025"
          class="h-8 text-xs"
          :aria-label="`Title of achievement ${index + 1}`"
          @blur="(event: Event) => onTitleBlur(achievement, event)"
          @keydown.enter.prevent="(event: KeyboardEvent) => (event.target as HTMLInputElement).blur()"
        />
      </div>
    </div>
  </SiteContentSection>

  <AlertDialog v-model:open="isDeleteDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Remove achievement?</AlertDialogTitle>
        <AlertDialogDescription>
          <strong v-if="achievementToDeleteTitle" class="font-medium text-foreground">{{ achievementToDeleteTitle }}</strong>
          <template v-else>This achievement</template>
          will be removed from the What is PESO? page and its photo deleted.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel class="cursor-pointer" :disabled="isDeleting">Cancel</AlertDialogCancel>
        <Button variant="destructive" class="cursor-pointer" :disabled="isDeleting" @click="confirmDelete">
          <Loader2 v-if="isDeleting" class="size-4 shrink-0 animate-spin" />
          {{ isDeleting ? 'Removing...' : 'Remove Achievement' }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
