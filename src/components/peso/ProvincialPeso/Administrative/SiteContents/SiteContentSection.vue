<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useSiteContentSection } from '@/composables/peso/provincialPeso/useSiteContentSection'

const props = defineProps<{
  /** Stable key for the remembered open / closed state */
  sectionId: string
  title: string
}>()

const { isOpen } = useSiteContentSection(props.sectionId)
</script>

<template>
  <!-- One Site Contents section (slides, program cards, municipality logos) that PESO can hide or show.
       Accordion pattern: the heading holds the toggle button; the description stays outside it -->
  <Collapsible v-model:open="isOpen" as="section" class="rounded-lg border" :aria-labelledby="`${sectionId}-title`">
    <div class="p-4">
      <h2 :id="`${sectionId}-title`" class="text-lg font-semibold">
        <CollapsibleTrigger
          class="group flex w-full cursor-pointer items-center justify-between gap-4 rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {{ title }}
          <ChevronDown
            class="size-5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
            aria-hidden="true"
          />
        </CollapsibleTrigger>
      </h2>
      <p class="text-sm text-muted-foreground">
        <slot name="description" />
      </p>
    </div>

    <CollapsibleContent class="space-y-4 px-4 pb-4">
      <slot />
    </CollapsibleContent>
  </Collapsible>
</template>
