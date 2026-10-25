<script setup lang="ts">
import { Loader2 } from '@lucide/vue'
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
import PageHeroEditor from '@/components/peso/ProvincialPeso/Administrative/SiteContents/PageHeroEditor.vue'
import { usePageHeroes } from '@/composables/peso/provincialPeso/usePageHeroes'

const { pages, isLoading, errorMessage, isClearing, pageToClearName, isClearDialogOpen, confirmClear } = usePageHeroes()
</script>

<template>
  <SiteContentSection section-id="page-heroes" title="Page banners">
    <template #description>Banners at the top of the public pages outside the landing page.</template>

    <div
      v-if="errorMessage"
      class="rounded border border-destructive/20 bg-destructive/10 p-4 text-center text-sm text-destructive"
    >
      {{ errorMessage }}
    </div>

    <template v-if="isLoading && !errorMessage">
      <Skeleton v-for="page in pages" :key="page.key" class="h-72 w-full rounded-lg" />
    </template>
    <template v-else>
      <PageHeroEditor v-for="page in pages" :key="page.key" :page="page.key" />
    </template>
  </SiteContentSection>

  <AlertDialog v-model:open="isClearDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Remove photo?</AlertDialogTitle>
        <AlertDialogDescription>
          The <strong class="font-medium text-foreground">{{ pageToClearName }}</strong> banner will show a plain band
          until a new photo is uploaded.
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
