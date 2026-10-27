<script setup lang="ts">
import LandingFooter from '@/components/landing/LandingFooter.vue'
import LandingHeader from '@/components/landing/LandingHeader.vue'
import LandingSpes from '@/components/landing/LandingSpes.vue'
</script>

<template>
  <div class="min-h-dvh bg-background font-sans text-foreground">
    <!-- Public page opened from PESO Programs → SPES, sharing the landing page's header and footer.
         Keep this comment inside the root: App.vue's out-in <transition> needs a single element root -->
    <LandingHeader />
    <main id="main">
      <LandingSpes />
    </main>
    <LandingFooter />
  </div>
</template>
