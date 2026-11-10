<script setup lang="ts">
import type { GipAccomplishmentActivity } from '@/types/common/gipAccomplishment'

/** Read-only Activities / Output / Remarks of a PGAS accomplishment report (stacked on phones) */
defineProps<{ activities: GipAccomplishmentActivity[] }>()
</script>

<template>
  <div class="overflow-hidden rounded-lg border">
    <div class="hidden grid-cols-[minmax(0,5fr)_minmax(0,3fr)_minmax(0,2fr)] gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase sm:grid">
      <span>Activities</span><span>Output</span><span>Remarks</span>
    </div>
    <ul class="divide-y">
      <li
        v-for="(row, index) in activities"
        :key="index"
        class="grid gap-1 px-3 py-2 text-sm sm:grid-cols-[minmax(0,5fr)_minmax(0,3fr)_minmax(0,2fr)] sm:gap-3"
      >
        <p class="whitespace-pre-line text-pretty">{{ row.activity }}</p>
        <p class="whitespace-pre-line text-pretty text-muted-foreground sm:text-foreground">
          <span class="text-xs font-medium sm:hidden">Output: </span>{{ row.output || '—' }}
        </p>
        <p class="text-muted-foreground sm:text-foreground">
          <span class="text-xs font-medium sm:hidden">Remarks: </span>{{ row.remarks || '—' }}
        </p>
      </li>
    </ul>
  </div>
</template>
