<script setup lang="ts">
import LandingHeader from '@/components/landing/LandingHeader.vue'
import LandingAbout from '@/components/landing/LandingAbout.vue'
import LandingHero from '@/components/landing/LandingHero.vue'
import LandingIntro from '@/components/landing/LandingIntro.vue'
</script>

<template>
  <div class="min-h-dvh bg-background font-sans text-foreground">
    <LandingIntro />
    <LandingHeader />
    <main id="main">
      <LandingHero />
      <LandingAbout />
      <!-- Remaining landing sections (jobs, programs, about, contact) go here -->
    </main>
  </div>
</template>
