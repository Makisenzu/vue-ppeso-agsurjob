<script setup lang="ts">
import LandingFooter from '@/components/landing/LandingFooter.vue'
import LandingGip from '@/components/landing/LandingGip.vue'
import LandingHeader from '@/components/landing/LandingHeader.vue'
</script>

<template>
  <div class="min-h-dvh bg-background font-sans text-foreground">
    <!-- Public page opened from PESO Programs → GIP, sharing the landing page's header and footer.
         Keep this comment inside the root: App.vue's out-in <transition> needs a single element root -->
    <LandingHeader />
    <main id="main">
      <LandingGip />
    </main>
    <LandingFooter />
  </div>
</template>
