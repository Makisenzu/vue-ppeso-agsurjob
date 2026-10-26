<script setup lang="ts">
import LandingAbout from '@/components/landing/LandingAbout.vue'
import LandingHero from '@/components/landing/LandingHero.vue'
import LandingMunicipalities from '@/components/landing/LandingMunicipalities.vue'
import LandingPrograms from '@/components/landing/LandingPrograms.vue'
import { skipLandingIntro } from '@/composables/landing/useLandingIntro'

skipLandingIntro()
</script>

<template>
  <!-- Same sections as the public landing page (views/landing/Landing.vue), minus its intro animation.
       Single root: App.vue's out-in <transition> needs one -->
  <div>
    <LandingHero />
    <LandingAbout />
    <LandingPrograms />
    <LandingMunicipalities />
  </div>
</template>
