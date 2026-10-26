<script setup lang="ts">
import LandingPageHero from '@/components/landing/LandingPageHero.vue'
import LandingWhatIsPeso from '@/components/landing/LandingWhatIsPeso.vue'
</script>

<template>
  <!-- Same content as the public What is PESO? page, inside the applicant layout.
       Single root: App.vue's out-in <transition> needs one -->
  <div>
    <LandingPageHero page="what_is_peso" />
    <LandingWhatIsPeso />
  </div>
</template>
