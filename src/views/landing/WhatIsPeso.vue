<script setup lang="ts">
import LandingFooter from '@/components/landing/LandingFooter.vue'
import LandingHeader from '@/components/landing/LandingHeader.vue'
import LandingPageHero from '@/components/landing/LandingPageHero.vue'
import LandingWhatIsPeso from '@/components/landing/LandingWhatIsPeso.vue'
</script>

<template>
  <div class="min-h-dvh bg-background font-sans text-foreground">
    <!-- Public page opened from About → What is PESO?, sharing the landing page's header and footer.
         Keep this comment inside the root: App.vue's out-in <transition> needs a single element root,
         and a comment beside it makes the page stay blank after navigating away -->
    <LandingHeader />
    <main id="main">
      <LandingPageHero page="what_is_peso" />
      <LandingWhatIsPeso />
    </main>
    <LandingFooter />
  </div>
</template>
