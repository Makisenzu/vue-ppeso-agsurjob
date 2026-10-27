<script setup lang="ts">
import type { LandingLinkTarget } from '@/composables/landing/useLandingNavigation'

// Classes and listeners fall through to the rendered link (AppLink: a route or an href)
defineProps<{ link: LandingLinkTarget }>()
</script>

<template>
  <AppLink v-if="link.to" :to="link.to"><slot /></AppLink>
  <AppLink v-else :href="link.href"><slot /></AppLink>
</template>
