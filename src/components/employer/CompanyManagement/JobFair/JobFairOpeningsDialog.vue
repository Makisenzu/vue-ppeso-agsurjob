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
import { useJobFairOpeningsForm } from '@/composables/employer/useJobFairOfferForm'

const { offerToEdit, isOpen, isSaving, onOpenChange, submit, maxOpenings } = useJobFairOpeningsForm()
</script>

<template>
  <Dialog :open="isOpen" @update:open="onOpenChange">
    <DialogContent class="sm:max-w-sm">
      <form class="grid gap-6" @submit="submit">
        <DialogHeader>
          <DialogTitle>Edit openings</DialogTitle>
          <DialogDescription>{{ offerToEdit?.position_title }}</DialogDescription>
        </DialogHeader>

        <FormField v-slot="{ componentField }" name="openings">
          <FormItem>
            <FormLabel>Openings at this job fair</FormLabel>
            <FormControl>
              <Input v-bind="componentField" type="number" min="1" :max="maxOpenings" step="1" :disabled="isSaving" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <DialogFooter>
          <Button type="button" variant="outline" :disabled="isSaving" @click="onOpenChange(false)">Cancel</Button>
          <Button type="submit" :disabled="isSaving">
            <Loader2 v-if="isSaving" class="size-4 animate-spin" />
            {{ isSaving ? 'Saving...' : 'Save' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
