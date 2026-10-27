<script setup lang="ts">
import { ExternalLink, ImageOff, ImagePlus, Loader2, Trash2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { usePageHeroEditor } from '@/composables/peso/provincialPeso/usePageHeroEditor'
import type { PublicPage } from '@/types/common/siteContent'

const props = defineProps<{ page: PublicPage }>()

const {
  pageInfo,
  defaults,
  imageUrl,
  isDirty,
  isSavingText,
  isSavingImage,
  fileError,
  imageAccept,
  imageMaxMb,
  limits,
  submitText,
  resetText,
  selectImage,
  requestClear,
} = usePageHeroEditor(props.page)
</script>

<template>
  <div class="grid gap-6 rounded-lg border border-border p-4 lg:grid-cols-[20rem_1fr]">
    <!-- Photo: uploads right away, like the program cards and logos -->
    <section class="grid content-start gap-3">
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-sm font-semibold">{{ pageInfo.name }}</h3>
        <Button variant="ghost" size="sm" as-child>
          <AppLink :to="pageInfo.path" target="_blank">
            View page
            <ExternalLink class="size-4" />
          </AppLink>
        </Button>
      </div>

      <div class="relative flex aspect-[12/5] w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
        <img v-if="imageUrl" :src="imageUrl" alt="" class="size-full object-cover" />
        <ImageOff v-else class="size-6 text-muted-foreground" aria-hidden="true" />
        <div v-if="isSavingImage" class="absolute inset-0 flex items-center justify-center bg-background/70">
          <Loader2 class="size-5 animate-spin text-muted-foreground" />
        </div>
      </div>
      <p class="text-xs text-muted-foreground">
        About 1920 × 600, JPG, PNG or WebP, up to {{ imageMaxMb }}MB. Without a photo the banner is a plain band.
      </p>

      <div class="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" as-child :disabled="isSavingImage">
          <label :for="`page-hero-${page}`" class="cursor-pointer">
            <ImagePlus class="size-4" />
            {{ imageUrl ? 'Replace photo' : 'Upload photo' }}
          </label>
        </Button>
        <Button
          v-if="imageUrl"
          type="button"
          variant="ghost"
          size="sm"
          class="text-destructive hover:bg-destructive/10 hover:text-destructive"
          :disabled="isSavingImage"
          @click="requestClear"
        >
          <Trash2 class="size-4" />
          Remove
        </Button>
      </div>
      <input
        :id="`page-hero-${page}`"
        type="file"
        class="sr-only"
        :accept="imageAccept"
        :disabled="isSavingImage"
        @change="selectImage"
      />
      <p v-if="fileError" class="text-sm text-destructive">{{ fileError }}</p>
    </section>

    <!-- Text: saved with the button below; empty fields show the built-in text (the placeholders) -->
    <form class="grid content-start gap-4" @submit="submitText">
      <FormField v-slot="{ componentField }" name="eyebrow">
        <FormItem>
          <FormLabel>Label</FormLabel>
          <FormControl>
            <Input v-bind="componentField" :placeholder="defaults.eyebrow" :maxlength="limits.eyebrow" :disabled="isSavingText" />
          </FormControl>
          <FormDescription>Small text above the title.</FormDescription>
          <FormMessage />
        </FormItem>
      </FormField>

      <FormField v-slot="{ componentField }" name="title">
        <FormItem>
          <FormLabel>Title</FormLabel>
          <FormControl>
            <Input v-bind="componentField" :placeholder="defaults.title" :maxlength="limits.title" :disabled="isSavingText" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <FormField v-slot="{ componentField }" name="description">
        <FormItem>
          <FormLabel>Description</FormLabel>
          <FormControl>
            <Textarea v-bind="componentField" rows="2" :placeholder="defaults.description" :maxlength="limits.description" :disabled="isSavingText" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <FormField v-slot="{ componentField }" name="imageAlt">
        <FormItem>
          <FormLabel>Photo description <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
          <FormControl>
            <Input
              v-bind="componentField"
              placeholder="e.g. Job seekers at the Provincial PESO job fair"
              :maxlength="limits.imageAlt"
              :disabled="isSavingText"
            />
          </FormControl>
          <FormDescription>Read aloud by screen readers.</FormDescription>
          <FormMessage />
        </FormItem>
      </FormField>

      <p class="text-xs text-muted-foreground">Leave a field empty to use the built-in text shown in it.</p>

      <div class="flex justify-end gap-2">
        <Button type="button" variant="outline" :disabled="isSavingText || !isDirty" @click="resetText">Discard</Button>
        <Button type="submit" :disabled="isSavingText || !isDirty">
          <Loader2 v-if="isSavingText" class="size-4 animate-spin" />
          {{ isSavingText ? 'Saving...' : 'Save Text' }}
        </Button>
      </div>
    </form>
  </div>
</template>
