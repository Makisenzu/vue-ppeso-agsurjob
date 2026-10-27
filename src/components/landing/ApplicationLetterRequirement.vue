<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { ApplicationLetterGuide } from '@/types/common/applicationLetter'

defineProps<{
  name: string
  guide: ApplicationLetterGuide
}>()
</script>

<template>
  <!-- Application Letter: a dropdown holding the guide on who to address it to (GIP and SPES pages) -->
  <Collapsible class="flex flex-col">
    <CollapsibleTrigger class="group flex w-full items-center justify-between gap-3 text-left text-base font-semibold text-foreground sm:text-lg">
      {{ name }}
      <ChevronDown class="size-5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
    <CollapsibleContent class="mt-3 flex flex-col gap-3 rounded-lg border border-border p-4">
      <p class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Address your letter to</p>
      <address class="flex flex-col text-sm text-foreground not-italic">
        <span v-for="(line, i) in guide.addressLines" :key="line" :class="i === 0 && 'font-semibold'">{{ line }}</span>
      </address>
      <div class="flex gap-2 text-sm text-foreground">
        <span class="font-semibold">Thru:</span>
        <address class="flex flex-col not-italic">
          <span class="font-semibold">{{ guide.through.name }}</span>
          <span>{{ guide.through.title }}</span>
        </address>
      </div>
      <p class="text-sm text-foreground">{{ guide.salutation }}</p>
      <ul class="flex list-disc flex-col gap-1 border-t border-border pt-3 pl-5 text-sm text-muted-foreground">
        <li v-for="tip in guide.tips" :key="tip">{{ tip }}</li>
      </ul>
    </CollapsibleContent>
  </Collapsible>
</template>
