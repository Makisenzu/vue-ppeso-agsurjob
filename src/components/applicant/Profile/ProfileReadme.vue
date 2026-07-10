<script setup lang="ts">
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Pencil } from '@lucide/vue'

const props = defineProps<{
  username: string
  bio: string
}>()
</script>

<template>
  <Card class="border border-border/50 shadow-sm rounded-xl overflow-hidden bg-card">
    <!-- Header Section -->
    <div class="px-6 py-5 sm:px-8 sm:py-6 flex items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <h2 class="text-xl font-bold tracking-tight text-black">
            Profile Summary
          </h2>
        </div>
        <p class="text-xs text-muted-foreground">
          {{ bio }}
        </p>
      </div>
    </div>

    <div class="border-t border-border/40" />

    <!-- Details Content with Accordion -->
    
  </Card>
</template>