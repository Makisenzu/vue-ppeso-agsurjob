<script setup lang="ts">
import { computed } from 'vue'
import { Briefcase, Globe } from '@lucide/vue'

/**
 * Logo for a social platform. Lucide v1 no longer ships brand logos, so the brand marks are
 * inline SVGs drawn in Lucide's stroke style (24px grid, 2px stroke) to sit beside Lucide icons.
 */
const props = defineProps<{ platform: string | null | undefined }>()

const BRAND_PATHS: Record<string, string[]> = {
  Facebook: ['M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z'],
  LinkedIn: [
    'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z',
    'M2 9h4v12H2z',
    'M6 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0z',
  ],
  Instagram: [
    'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5z',
    'M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z',
    'M17.5 6.5h.01',
  ],
  X: ['M4 4l11.733 16h4.267l-11.733-16z', 'M4 20l6.768-6.768m2.46-2.46L20 4'],
  TikTok: [
    'M21 7.917v4.034a9.948 9.948 0 0 1-5-1.951v4.5a6.5 6.5 0 1 1-8-6.326v4.326a2.5 2.5 0 1 0 4 2V3h4.083A6.005 6.005 0 0 0 21 7.917z',
  ],
  YouTube: [
    'M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17',
    'm10 15 5-3-5-3z',
  ],
  GitHub: [
    'M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4',
    'M9 18c-4.51 2-5-2-7-2',
  ],
}

const paths = computed(() => (props.platform ? BRAND_PATHS[props.platform] : undefined))
</script>

<template>
  <svg
    v-if="paths"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="size-4 shrink-0"
  >
    <path v-for="d in paths" :key="d" :d="d" />
  </svg>
  <Briefcase v-else-if="platform === 'Portfolio'" class="size-4 shrink-0" aria-hidden="true" />
  <Globe v-else class="size-4 shrink-0" aria-hidden="true" />
</template>
