<script setup lang="ts">
import LandingHeader from '@/components/landing/LandingHeader.vue'
import LandingHero from '@/components/landing/LandingHero.vue'
</script>

<template>
  <div class="min-h-dvh bg-background font-sans text-foreground">
    <LandingHeader />
    <main id="main">
      <LandingHero />
      <!-- Remaining landing sections (jobs, programs, about, contact) go here -->
    </main>
  </div>
</template>
