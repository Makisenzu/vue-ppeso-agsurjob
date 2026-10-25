<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'
import { useLandingPageHero } from '@/composables/landing/useLandingPageHero'
import type { PublicPage } from '@/types/common/siteContent'

const props = defineProps<{ page: PublicPage }>()

const { hero } = useLandingPageHero(props.page)
</script>

<template>
  <!-- Full-bleed band like the landing hero; text stays aligned with the header's max-w-7xl container -->
  <section aria-labelledby="page-hero-title" class="relative isolate w-full overflow-hidden bg-muted">
    <!-- Same footprint as the loaded banner, so the page doesn't shift when the content arrives -->
    <div
      v-if="!hero"
      class="mx-auto flex min-h-[18rem] max-w-7xl items-center px-4 py-14 sm:min-h-[22rem] sm:px-6 sm:py-16 lg:min-h-[24rem] lg:px-8"
      aria-busy="true"
    >
      <h1 id="page-hero-title" class="sr-only">Loading</h1>
      <div class="flex w-full max-w-2xl flex-col gap-4">
        <Skeleton class="h-4 w-48" />
        <Skeleton class="h-12 w-full max-w-md" />
        <Skeleton class="h-5 w-full max-w-lg" />
      </div>
    </div>

    <template v-else>
      <!-- Photo fills the band; the same fade as the landing hero keeps the text readable in both themes -->
      <template v-if="hero.backgroundImage">
        <img
          :src="hero.backgroundImage"
          :alt="hero.imageAlt"
          fetchpriority="high"
          class="absolute inset-0 -z-10 size-full object-cover"
        />
        <div class="absolute inset-0 -z-10 bg-background/80 md:bg-transparent md:bg-linear-to-r md:from-background md:via-background/80 md:to-background/10" />
      </template>

      <div class="mx-auto flex min-h-[18rem] max-w-7xl items-center px-4 py-14 sm:min-h-[22rem] sm:px-6 sm:py-16 lg:min-h-[24rem] lg:px-8">
        <div class="flex max-w-2xl flex-col gap-4">
          <p class="text-sm font-semibold tracking-wide text-primary uppercase">{{ hero.eyebrow }}</p>
          <h1 id="page-hero-title" class="text-4xl leading-tight font-extrabold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
            {{ hero.title }}
          </h1>
          <p class="text-base text-pretty text-muted-foreground sm:text-lg">{{ hero.description }}</p>
        </div>
      </div>
    </template>
  </section>
</template>
