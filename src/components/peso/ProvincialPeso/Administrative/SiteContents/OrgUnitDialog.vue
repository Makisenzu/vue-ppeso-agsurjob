<script setup lang="ts">
import { Loader2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useOrgUnitForm } from '@/composables/peso/provincialPeso/useOrgUnitForm'

const { isUnitDialogOpen, isSubmitting, isEditMode, limits, onDialogOpenChange, submitUnit } = useOrgUnitForm()
</script>

<template>
  <Dialog :open="isUnitDialogOpen" @update:open="onDialogOpenChange">
    <DialogContent class="sm:max-w-lg">
      <form class="grid gap-6" @submit="submitUnit">
        <DialogHeader>
          <DialogTitle>{{ isEditMode ? 'Edit Division' : 'New Division' }}</DialogTitle>
          <DialogDescription>A division or unit is a column of the chart under the PESO Manager.</DialogDescription>
        </DialogHeader>

        <FormField v-slot="{ componentField }" name="name">
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input v-bind="componentField" placeholder="e.g. Skills Development Division" :maxlength="limits.unitName" :disabled="isSubmitting" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <div class="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <FormField v-slot="{ componentField }" name="abbreviation">
            <FormItem>
              <FormLabel>Abbreviation <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
              <FormControl>
                <Input v-bind="componentField" placeholder="e.g. SDD" :maxlength="limits.abbreviation" :disabled="isSubmitting" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="sortOrder">
            <FormItem>
              <FormLabel>Order</FormLabel>
              <FormControl>
                <Input v-bind="componentField" type="number" min="0" step="1" :disabled="isSubmitting" />
              </FormControl>
              <FormDescription>Left to right.</FormDescription>
              <FormMessage />
            </FormItem>
          </FormField>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" :disabled="isSubmitting" @click="onDialogOpenChange(false)">Cancel</Button>
          <Button type="submit" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
            {{ isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Division' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
