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
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import SearchSelect from '@/components/SearchSelect.vue'
import { useJobFairOfferForm } from '@/composables/employer/useJobFairOfferForm'

const { isAddOfferOpen, isSubmitting, postingOptions, onOpenChange, submit, maxOpenings } = useJobFairOfferForm()
</script>

<template>
  <Dialog :open="isAddOfferOpen" @update:open="onOpenChange">
    <DialogContent class="sm:max-w-lg">
      <form class="grid gap-6" @submit="submit">
        <DialogHeader>
          <DialogTitle>Add vacancy</DialogTitle>
          <DialogDescription>Offer one of your open job postings at this job fair.</DialogDescription>
        </DialogHeader>

        <FormField v-slot="{ componentField }" name="postingId">
          <FormItem>
            <FormLabel>Job posting</FormLabel>
            <FormControl>
              <SearchSelect
                v-bind="componentField"
                :options="postingOptions"
                placeholder="Pick a posting"
                search-placeholder="Search position"
                empty-text="No open postings left to add."
                :disabled="isSubmitting"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="openings">
          <FormItem>
            <FormLabel>Openings at this job fair</FormLabel>
            <FormControl>
              <Input v-bind="componentField" type="number" min="1" :max="maxOpenings" step="1" :disabled="isSubmitting" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <DialogFooter>
          <Button type="button" variant="outline" :disabled="isSubmitting" @click="onOpenChange(false)">Cancel</Button>
          <Button type="submit" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
            {{ isSubmitting ? 'Adding...' : 'Add vacancy' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
