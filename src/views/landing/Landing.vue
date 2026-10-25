<script setup lang="ts">
import LandingFooter from '@/components/landing/LandingFooter.vue'
import LandingHeader from '@/components/landing/LandingHeader.vue'
import LandingAbout from '@/components/landing/LandingAbout.vue'
import LandingHero from '@/components/landing/LandingHero.vue'
import LandingIntro from '@/components/landing/LandingIntro.vue'
import LandingMunicipalities from '@/components/landing/LandingMunicipalities.vue'
import LandingPrograms from '@/components/landing/LandingPrograms.vue'
</script>

<template>
  <div class="min-h-dvh bg-background font-sans text-foreground">
    <LandingIntro />
    <LandingHeader />
    <main id="main">
      <LandingHero />
      <LandingAbout />
      <LandingPrograms />
      <LandingMunicipalities />
      <!-- Remaining landing sections (jobs, programs, about, contact) go here -->
    </main>
    <LandingFooter />
  </div>
</template>
