<script setup lang="ts">
import { Loader2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
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
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useTupadBatchForm } from '@/composables/peso/provincialPeso/useTupadBatchForm'

const { isBatchDialogOpen, isEditMode, isSubmitting, batchStatusOptions, onBatchDialogOpenChange, submitBatch } =
  useTupadBatchForm()
</script>

<template>
  <Dialog :open="isBatchDialogOpen" @update:open="onBatchDialogOpenChange">
    <DialogContent class="sm:max-w-md">
      <form class="space-y-6" @submit="submitBatch">
        <DialogHeader>
          <DialogTitle>{{ isEditMode ? 'Edit Batch' : 'Create Batch' }}</DialogTitle>
          <DialogDescription>
            A TUPAD batch is identified by its EDL number. Add applicants to it once it is created.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4">
          <FormField v-slot="{ componentField }" name="edl_number">
            <FormItem>
              <FormLabel>EDL Number</FormLabel>
              <FormControl>
                <Input v-bind="componentField" placeholder="e.g. EDL-2026-001" :disabled="isSubmitting" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField v-slot="{ componentField }" name="start_date">
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input v-bind="componentField" type="date" :disabled="isSubmitting" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
            <FormField v-slot="{ componentField }" name="end_date">
              <FormItem>
                <FormLabel>End Date</FormLabel>
                <FormControl>
                  <Input v-bind="componentField" type="date" :disabled="isSubmitting" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          </div>

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
                  <SelectItem v-for="status in batchStatusOptions" :key="status" :value="status">
                    {{ status }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          </FormField>
        </div>

        <DialogFooter class="gap-2">
          <Button type="button" variant="outline" :disabled="isSubmitting" @click="onBatchDialogOpenChange(false)">
            Cancel
          </Button>
          <Button type="submit" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="size-4 shrink-0 animate-spin" />
            {{ isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Batch' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
