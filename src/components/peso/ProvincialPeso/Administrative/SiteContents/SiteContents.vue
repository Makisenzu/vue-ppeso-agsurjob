<script setup lang="ts">
import { FlexRender } from '@tanstack/vue-table'
import SwipeCardList from '@/components/SwipeCardList.vue'
import { GalleryHorizontalEnd, ImagePlus, Loader2, Plus, RefreshCw, Trash2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import ProgramCards from '@/components/peso/ProvincialPeso/Administrative/SiteContents/ProgramCards.vue'
import { Separator } from '@/components/ui/separator'
import { useSiteContents } from '@/composables/peso/provincialPeso/useSiteContents'
import { useSiteContentForm } from '@/composables/peso/provincialPeso/useSiteContentForm'

const {
  table,
  columns,
  contents,
  liveCount,
  isLoading,
  errorMessage,
  isDeleting,
  contentToDeleteName,
  isDeleteDialogOpen,
  stateOptions,
  refreshContents,
  openAddDialog,
  confirmDelete,
  getRowSwipeActions,
  getRowCard,
} = useSiteContents()

const {
  isFormDialogOpen,
  isSubmitting,
  isEditMode,
  onFormDialogOpenChange,
  submitContent,
  statusOptions,
  imagePreviewUrl,
  imageFileLabel,
  imageError,
  photoError,
  isPreviewVideo,
  imageAccept,
  imageMaxMb,
  videoMaxMb,
  selectImage,
  clearImage,
} = useSiteContentForm()
</script>

<template>
  <div class="w-full min-w-0 space-y-4">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Site Contents</h1>
      <p class="text-sm text-muted-foreground">
        Landing page carousel slides and program photos.
        <template v-if="!isLoading">
          {{ liveCount }} {{ liveCount === 1 ? 'slide is' : 'slides are' }} live now{{ liveCount === 0 ? ', so visitors see the built-in slides' : '' }}.
        </template>
      </p>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Input
          class="w-full sm:max-w-xs"
          placeholder="Search slides..."
          :model-value="(table.getColumn('title')?.getFilterValue() as string) ?? ''"
          @update:model-value="table.getColumn('title')?.setFilterValue($event)"
        />
        <Select
          :model-value="(table.getColumn('state')?.getFilterValue() as string) ?? 'all'"
          @update:model-value="(val) => table.getColumn('state')?.setFilterValue(val === 'all' ? undefined : val)"
        >
          <SelectTrigger class="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem v-for="state in stateOptions" :key="state" :value="state">{{ state }}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="flex gap-2">
        <Button variant="outline" :disabled="isLoading" @click="refreshContents">
          <RefreshCw class="size-4" :class="{ 'animate-spin': isLoading }" />
          <span class="hidden sm:inline">Refresh</span>
        </Button>
        <Button @click="openAddDialog">
          <Plus class="size-4" />
          New Slide
        </Button>
      </div>
    </div>

    <!-- Error Banner -->
    <div
      v-if="errorMessage"
      class="rounded border border-destructive/20 bg-destructive/10 p-4 text-center text-sm text-destructive"
    >
      {{ errorMessage }}
    </div>

    <!-- Empty State -->
    <Empty v-if="!isLoading && !errorMessage && contents.length === 0" class="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <GalleryHorizontalEnd />
        </EmptyMedia>
        <EmptyTitle>No slides yet</EmptyTitle>
        <EmptyDescription>Until a slide is published, the landing page shows its built-in slides.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button @click="openAddDialog">
          <Plus class="size-4" />
          New Slide
        </Button>
      </EmptyContent>
    </Empty>

    <!-- Data Table -->
    <template v-else>
      <!-- Mobile: swipeable cards (DESIGN.md 13.2) -->
      <SwipeCardList
        class="md:hidden"
        :items="table.getRowModel().rows"
        :item-key="(row) => row.id"
        :card="(row) => getRowCard(row.original)"
        :actions="(row) => getRowSwipeActions(row.original)"
        :loading="isLoading && contents.length === 0"
      >
        <template #empty>
          <p class="rounded-md border py-8 text-center text-sm text-muted-foreground">No slides match the current filters.</p>
        </template>
      </SwipeCardList>

      <!-- Desktop: table -->
      <div class="hidden overflow-x-auto rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
              <TableHead v-for="header in headerGroup.headers" :key="header.id">
                <FlexRender
                  v-if="!header.isPlaceholder"
                  :render="header.column.columnDef.header"
                  :props="header.getContext()"
                />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <template v-if="isLoading && contents.length === 0">
              <TableRow v-for="i in 4" :key="i">
                <TableCell v-for="col in columns.length" :key="col">
                  <Skeleton class="h-4 w-full" />
                </TableCell>
              </TableRow>
            </template>

            <template v-else-if="table.getRowModel().rows.length">
              <TableRow v-for="row in table.getRowModel().rows" :key="row.id">
                <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                  <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                </TableCell>
              </TableRow>
            </template>

            <TableRow v-else>
              <TableCell :colspan="columns.length" class="h-24 text-center text-muted-foreground">
                No slides match the current filters.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Pagination -->
      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
          {{ table.getFilteredRowModel().rows.length }} slide{{ table.getFilteredRowModel().rows.length === 1 ? '' : 's' }}
        </p>
        <div class="flex justify-center gap-2 sm:justify-end">
          <Button variant="outline" size="sm" :disabled="!table.getCanPreviousPage()" @click="table.previousPage()">
            Previous
          </Button>
          <Button variant="outline" size="sm" :disabled="!table.getCanNextPage()" @click="table.nextPage()">
            Next
          </Button>
        </div>
      </div>
    </template>

    <Separator class="my-6" />

    <!-- Photos of the landing page's PESO Programs gallery -->
    <ProgramCards />
  </div>

  <!-- New / Edit Slide Dialog -->
  <Dialog :open="isFormDialogOpen" @update:open="onFormDialogOpenChange">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <form class="grid gap-6" @submit="submitContent">
        <DialogHeader>
          <DialogTitle>{{ isEditMode ? 'Edit Slide' : 'New Slide' }}</DialogTitle>
          <DialogDescription>Only the background photo or video is required.</DialogDescription>
        </DialogHeader>

        <!-- Background photo / video -->
        <section class="grid gap-3">
          <div>
            <h3 class="text-sm font-semibold">Background photo or video</h3>
            <p class="text-xs text-muted-foreground">
              About 1920 × 800. JPG, PNG, WebP (up to {{ imageMaxMb }}MB) or MP4, WebM (up to {{ videoMaxMb }}MB).
            </p>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div class="flex aspect-[12/5] w-full shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted sm:w-60">
              <template v-if="imagePreviewUrl">
                <video
                  v-if="isPreviewVideo"
                  :src="imagePreviewUrl"
                  muted
                  loop
                  autoplay
                  playsinline
                  aria-hidden="true"
                  class="size-full object-cover"
                />
                <img v-else :src="imagePreviewUrl" alt="" class="size-full object-cover" />
              </template>
              <ImagePlus v-else class="size-6 text-muted-foreground" />
            </div>
            <div class="grid min-w-0 gap-2">
              <div class="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" as-child :disabled="isSubmitting">
                  <label for="site-content-image" class="cursor-pointer">
                    <ImagePlus class="size-4" />
                    {{ imagePreviewUrl ? 'Replace' : 'Upload photo or video' }}
                  </label>
                </Button>
                <Button
                  v-if="imagePreviewUrl"
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  :disabled="isSubmitting"
                  @click="clearImage"
                >
                  <Trash2 class="size-4" />
                  Remove
                </Button>
              </div>
              <input
                id="site-content-image"
                type="file"
                class="sr-only"
                :accept="imageAccept"
                :disabled="isSubmitting"
                @change="selectImage"
              />
              <p v-if="imageFileLabel" class="truncate text-xs text-muted-foreground">{{ imageFileLabel }}</p>
              <p v-if="imageError || photoError" class="text-sm text-destructive">{{ imageError || photoError }}</p>
            </div>
          </div>

          <FormField v-if="imagePreviewUrl" v-slot="{ componentField }" name="imageAlt">
            <FormItem>
              <FormLabel>{{ isPreviewVideo ? 'Video' : 'Photo' }} description <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
              <FormControl>
                <Input v-bind="componentField" placeholder="e.g. SPES beneficiaries at the Provincial Capitol" :disabled="isSubmitting" />
              </FormControl>
              <FormDescription>Read aloud by screen readers.</FormDescription>
              <FormMessage />
            </FormItem>
          </FormField>
        </section>


        <!-- Text -->
        <section class="grid gap-4">
          <div>
            <h3 class="text-sm font-semibold">Text <span class="font-normal text-muted-foreground">(optional)</span></h3>
            <p class="text-xs text-muted-foreground">Leave empty to show only the background.</p>
          </div>

          <FormField v-slot="{ componentField }" name="eyebrow">
            <FormItem>
              <FormLabel>Label</FormLabel>
              <FormControl>
                <Input v-bind="componentField" placeholder="e.g. Special Program for Employment of Students" :disabled="isSubmitting" />
              </FormControl>
              <FormDescription>Small text above the title.</FormDescription>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="title">
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input v-bind="componentField" placeholder="e.g. Earn during your school break with SPES" :disabled="isSubmitting" />
              </FormControl>
              <FormDescription>Keep it to 2–3 lines.</FormDescription>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="description">
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea v-bind="componentField" rows="2" placeholder="Who it's for, in one sentence." :disabled="isSubmitting" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </section>

        <!-- Buttons -->
        <section class="grid gap-4">
          <div>
            <h3 class="text-sm font-semibold">Buttons <span class="font-normal text-muted-foreground">(optional)</span></h3>
            <p class="text-xs text-muted-foreground">
              Links start with <code>/</code>, <code>#</code> or <code>https://</code>.
            </p>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <FormField v-slot="{ componentField }" name="primaryLabel">
              <FormItem>
                <FormLabel>Main button label</FormLabel>
                <FormControl>
                  <Input v-bind="componentField" placeholder="e.g. Apply for SPES" :disabled="isSubmitting" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="primaryLink">
              <FormItem>
                <FormLabel>Main button link</FormLabel>
                <FormControl>
                  <Input v-bind="componentField" placeholder="/signup" :disabled="isSubmitting" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="secondaryLabel">
              <FormItem>
                <FormLabel>Second button label</FormLabel>
                <FormControl>
                  <Input v-bind="componentField" placeholder="e.g. View requirements" :disabled="isSubmitting" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="secondaryLink">
              <FormItem>
                <FormLabel>Second button link</FormLabel>
                <FormControl>
                  <Input v-bind="componentField" placeholder="#program-spes" :disabled="isSubmitting" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          </div>
        </section>

        <!-- Publishing -->
        <section class="grid gap-4">
          <h3 class="text-sm font-semibold">Publishing</h3>

          <div class="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <FormField v-slot="{ componentField }" name="status">
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select v-bind="componentField" :disabled="isSubmitting">
                  <FormControl>
                    <SelectTrigger class="w-full">
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem v-for="option in statusOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="sortOrder">
              <FormItem>
                <FormLabel>Order</FormLabel>
                <FormControl>
                  <Input v-bind="componentField" type="number" min="0" step="1" :disabled="isSubmitting" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <FormField v-slot="{ componentField }" name="publishedAt">
              <FormItem>
                <FormLabel>Show from <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
                <FormControl>
                  <Input v-bind="componentField" type="datetime-local" :disabled="isSubmitting" />
                </FormControl>
                <FormDescription>Empty: once published.</FormDescription>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="expiresAt">
              <FormItem>
                <FormLabel>Show until <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
                <FormControl>
                  <Input v-bind="componentField" type="datetime-local" :disabled="isSubmitting" />
                </FormControl>
                <FormDescription>Empty: until archived.</FormDescription>
                <FormMessage />
              </FormItem>
            </FormField>
          </div>
        </section>

        <DialogFooter>
          <Button type="button" variant="outline" :disabled="isSubmitting" @click="onFormDialogOpenChange(false)">
            Cancel
          </Button>
          <Button type="submit" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
            {{ isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Slide' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>

  <!-- Delete Confirmation -->
  <AlertDialog v-model:open="isDeleteDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete slide?</AlertDialogTitle>
        <AlertDialogDescription>
          <strong class="font-medium text-foreground">{{ contentToDeleteName }}</strong> will be permanently deleted.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel class="cursor-pointer" :disabled="isDeleting">Cancel</AlertDialogCancel>
        <Button variant="destructive" class="cursor-pointer" :disabled="isDeleting" @click="confirmDelete">
          <Loader2 v-if="isDeleting" class="size-4 shrink-0 animate-spin" />
          {{ isDeleting ? 'Deleting...' : 'Delete Slide' }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
