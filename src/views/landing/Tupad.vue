<script setup lang="ts">
import LandingFooter from '@/components/landing/LandingFooter.vue'
import LandingHeader from '@/components/landing/LandingHeader.vue'
import LandingTupad from '@/components/landing/LandingTupad.vue'
</script>

<template>
  <div class="min-h-dvh bg-background font-sans text-foreground">
    <!-- Public page opened from PESO Programs → TUPAD, sharing the landing page's header and footer.
         Keep this comment inside the root: App.vue's out-in <transition> needs a single element root -->
    <LandingHeader />
    <main id="main">
      <LandingTupad />
    </main>
    <LandingFooter />
  </div>
</template>
