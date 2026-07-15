<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const isDesktop = useMediaQuery('(min-width: 640px)')
const Modal = computed(() => ({
  Root: isDesktop.value ? Dialog : Drawer,
  Trigger: isDesktop.value ? DialogTrigger : DrawerTrigger,
  Content: isDesktop.value ? DialogContent : DrawerContent,
  Header: isDesktop.value ? DialogHeader : DrawerHeader,
  Title: isDesktop.value ? DialogTitle : DrawerTitle,
  Description: isDesktop.value ? DialogDescription : DrawerDescription,
  Footer: isDesktop.value ? DialogFooter : DrawerFooter,
  Close: isDesktop.value ? DialogClose : DrawerClose,
}))

const open = ref(false)
const selectedFiles = ref<File[]>([])

const documents = [
  { id: 'nsrp-form', label: 'NSRP Form' },
  { id: 'application-form', label: 'Application Form' },
  { id: 'resume', label: 'Resume' },
  { id: 'birth-certificate', label: 'Birth Certificate' },
]
</script>

<template>
  <component :is="Modal.Root" v-model:open="open">
    <component :is="Modal.Trigger" as-child>
      <Button class="bg-(--buttonTwo)">
        Upload Document
      </Button>
    </component>

    <component :is="Modal.Content" class="sm:max-w-md">
      <component :is="Modal.Header">
        <component :is="Modal.Title">
          Upload Document
        </component>
        <component :is="Modal.Description">
          Select a document to upload to your profile.
        </component>
      </component>

      <div class="space-y-4">
        <div v-for="doc in documents" :key="doc.id" class="grid w-full gap-1.5">
          <Label :for="doc.id" class="text-sm font-medium leading-none">
            {{ doc.label }}
          </Label>
          <Input
            :id="doc.id"
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.png"
            class="w-full"
          />
          <div v-if="selectedFiles.length > 0" class="text-sm text-muted-foreground">
            {{ selectedFiles[0].name }} ({{ (selectedFiles[0].size / 1024).toFixed(2) }} KB)
          </div>
        </div>
      </div>

      <component
        :is="Modal.Footer"
        class="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:space-x-0"
      >
          <Button type="button" class="w-full bg-(--buttonTwo)">
            Submit
          </Button>
        <component :is="Modal.Close" as-child>
          <Button type="button" variant="outline" class="w-full">
            Cancel
          </Button>
        </component>
      </component>
    </component>
  </component>
</template>