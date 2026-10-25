<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { LandingLinkTarget } from '@/composables/landing/useLandingNavigation'

// Classes and listeners fall through to the rendered <a>
defineProps<{ link: LandingLinkTarget }>()
</script>

<template>
  <RouterLink v-if="link.to" :to="link.to"><slot /></RouterLink>
  <a v-else :href="link.href"><slot /></a>
</template>
