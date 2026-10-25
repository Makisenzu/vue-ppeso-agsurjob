<script setup lang="ts">
import { ImagePlus, Loader2, Trash2, UserRound } from '@lucide/vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useOrgPositionForm } from '@/composables/peso/provincialPeso/useOrgPositionForm'

const {
  isPositionDialogOpen,
  isSubmitting,
  isEditMode,
  isTopGroup,
  groupOptions,
  statusOptions,
  limits,
  photoPreviewUrl,
  photoFileLabel,
  photoError,
  previewInitials,
  photoAccept,
  photoMaxMb,
  selectPhoto,
  clearPhoto,
  onDialogOpenChange,
  submitPosition,
} = useOrgPositionForm()
</script>

<template>
  <Dialog :open="isPositionDialogOpen" @update:open="onDialogOpenChange">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <form class="grid gap-6" @submit="submitPosition">
        <DialogHeader>
          <DialogTitle>{{ isEditMode ? 'Edit Position' : 'New Position' }}</DialogTitle>
          <DialogDescription>Leave the name empty to show the position as vacant.</DialogDescription>
        </DialogHeader>

        <!-- Photo: uploaded when the position is saved -->
        <section class="grid gap-3">
          <div>
            <h3 class="text-sm font-semibold">Photo <span class="font-normal text-muted-foreground">(optional)</span></h3>
            <p class="text-xs text-muted-foreground">Square, about 400 × 400. JPG, PNG or WebP, up to {{ photoMaxMb }}MB.</p>
          </div>

          <div class="flex items-center gap-4">
            <Avatar class="size-20 shrink-0">
              <AvatarImage v-if="photoPreviewUrl" :src="photoPreviewUrl" alt="" class="object-cover" />
              <AvatarFallback class="text-lg font-semibold">
                <span v-if="previewInitials" aria-hidden="true">{{ previewInitials }}</span>
                <UserRound v-else class="size-8 text-muted-foreground" aria-hidden="true" />
              </AvatarFallback>
            </Avatar>
            <div class="grid min-w-0 gap-2">
              <div class="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" as-child :disabled="isSubmitting">
                  <label for="org-position-photo" class="cursor-pointer">
                    <ImagePlus class="size-4" />
                    {{ photoPreviewUrl ? 'Replace' : 'Upload photo' }}
                  </label>
                </Button>
                <Button
                  v-if="photoPreviewUrl"
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  :disabled="isSubmitting"
                  @click="clearPhoto"
                >
                  <Trash2 class="size-4" />
                  Remove
                </Button>
              </div>
              <input
                id="org-position-photo"
                type="file"
                class="sr-only"
                :accept="photoAccept"
                :disabled="isSubmitting"
                @change="selectPhoto"
              />
              <p v-if="photoFileLabel" class="truncate text-xs text-muted-foreground">{{ photoFileLabel }}</p>
              <p v-if="photoError" class="text-sm text-destructive">{{ photoError }}</p>
            </div>
          </div>
        </section>

        <!-- Who and what -->
        <section class="grid gap-4">
          <FormField v-slot="{ componentField }" name="holderName">
            <FormItem>
              <FormLabel>Name <span class="font-normal text-muted-foreground">(empty if vacant)</span></FormLabel>
              <FormControl>
                <Input v-bind="componentField" placeholder="e.g. Juan A. Dela Cruz" :maxlength="limits.holderName" :disabled="isSubmitting" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="title">
            <FormItem>
              <FormLabel>Position</FormLabel>
              <FormControl>
                <Input
                  v-bind="componentField"
                  placeholder="e.g. Administrative Aide IV (Clerk II)"
                  :maxlength="limits.title"
                  :disabled="isSubmitting"
                />
              </FormControl>
              <FormDescription>Plantilla title, with the designation in parentheses if any.</FormDescription>
              <FormMessage />
            </FormItem>
          </FormField>

          <div class="grid gap-4 sm:grid-cols-2">
            <FormField v-slot="{ componentField }" name="status">
              <FormItem class="min-w-0">
                <FormLabel>Employment status</FormLabel>
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
                <FormDescription>Ignored while the position is vacant.</FormDescription>
                <FormMessage />
              </FormItem>
            </FormField>

            <!-- min-w-0 + truncate: long division names end in "…" instead of widening the dialog -->
            <FormField v-slot="{ componentField }" name="unitId">
              <FormItem class="min-w-0">
                <FormLabel>Belongs to</FormLabel>
                <Select v-bind="componentField" :disabled="isSubmitting">
                  <FormControl>
                    <SelectTrigger class="w-full min-w-0">
                      <SelectValue placeholder="Select a group" class="block! min-w-0 truncate" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent class="max-w-[calc(100vw-2rem)]">
                    <SelectItem v-for="option in groupOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            </FormField>
          </div>

          <div class="grid gap-4 sm:grid-cols-[1fr_8rem] sm:items-start">
            <FormField v-slot="{ value, handleChange }" name="isHead" type="checkbox">
              <FormItem class="flex min-h-11 items-center gap-3 sm:mt-6">
                <FormControl>
                  <Checkbox :model-value="value" :disabled="isSubmitting" @update:model-value="handleChange" />
                </FormControl>
                <div class="grid gap-0.5">
                  <FormLabel class="font-normal">{{ isTopGroup ? 'Office head' : 'Head of this division' }}</FormLabel>
                  <FormDescription>
                    {{ isTopGroup ? 'Highlighted at the top of the chart.' : 'Shown first, with the staff under it.' }}
                  </FormDescription>
                </div>
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="sortOrder">
              <FormItem>
                <FormLabel>Order</FormLabel>
                <FormControl>
                  <Input v-bind="componentField" type="number" min="0" step="1" :disabled="isSubmitting" />
                </FormControl>
                <FormDescription>Top to bottom.</FormDescription>
                <FormMessage />
              </FormItem>
            </FormField>
          </div>
        </section>

        <DialogFooter>
          <Button type="button" variant="outline" :disabled="isSubmitting" @click="onDialogOpenChange(false)">Cancel</Button>
          <Button type="submit" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
            {{ isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Position' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
