<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { useLandingHero } from '@/composables/landing/useLandingHero'

const {
  slides,
  isLoading,
  hasMultipleSlides,
  selectedIndex,
  registerVideo,
  setApi,
  scrollTo,
  pauseAutoplay,
  resumeAutoplay,
} = useLandingHero()
</script>

<template>
  <!-- Full-bleed band; slide content stays aligned with the header's max-w-7xl container -->
  <section aria-label="Highlights" class="w-full bg-muted">
    <!-- Slides can be photo-only, so the page heading can't depend on a slide title -->
    <h1 class="sr-only">AGSURJOBS, the job portal of PESO Agusan del Sur</h1>
    <!-- Same footprint as a slide, so the page doesn't shift when the content arrives -->
    <div v-if="isLoading" class="mx-auto flex min-h-[32rem] max-w-7xl items-center px-4 pt-12 pb-24 sm:px-6 sm:pt-16 lg:px-8" aria-busy="true">
      <div class="flex w-full max-w-2xl flex-col gap-4">
        <Skeleton class="h-4 w-48" />
        <Skeleton class="h-12 w-full max-w-xl" />
        <Skeleton class="h-12 w-3/4 max-w-md" />
        <Skeleton class="h-5 w-full max-w-lg" />
        <div class="mt-2 flex gap-3">
          <Skeleton class="h-10 w-40" />
          <Skeleton class="h-10 w-36" />
        </div>
      </div>
    </div>
    <Carousel
      v-else
      :opts="{ loop: true }"
      class="overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      @init-api="setApi"
      @mouseenter="pauseAutoplay"
      @mouseleave="resumeAutoplay"
      @focusin="pauseAutoplay"
      @focusout="resumeAutoplay"
    >
      <CarouselContent class="ml-0">
        <CarouselItem
          v-for="(slide, index) in slides"
          :key="slide.id"
          :aria-label="`${index + 1} of ${slides.length}`"
          class="pl-0"
        >
          <div class="relative isolate">
            <!-- Uploaded photo / video fills the slide; with text on top, a fade in the page color keeps it readable in both themes -->
            <template v-if="slide.backgroundImage">
              <!-- Silent looping background: no controls, playback is handled by useLandingHero -->
              <video
                v-if="slide.backgroundType === 'video'"
                :ref="registerVideo(index)"
                :src="slide.backgroundImage"
                :aria-label="slide.imageAlt || undefined"
                :aria-hidden="slide.imageAlt ? undefined : 'true'"
                :preload="index === 0 ? 'auto' : 'metadata'"
                muted
                loop
                playsinline
                disablepictureinpicture
                disableremoteplayback
                class="absolute inset-0 -z-10 size-full object-cover"
              />
              <img
                v-else
                :src="slide.backgroundImage"
                :alt="slide.imageAlt"
                :loading="index === 0 ? 'eager' : 'lazy'"
                :fetchpriority="index === 0 ? 'high' : 'auto'"
                class="absolute inset-0 -z-10 size-full object-cover"
              />
              <div v-if="slide.hasText" class="absolute inset-0 -z-10 bg-background/80 md:bg-transparent md:bg-linear-to-r md:from-background md:via-background/80 md:to-background/10" />
            </template>
            <!-- Soft bottom edge: the slide fades into the page instead of ending on a hard line -->
            <div class="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-6 bg-linear-to-b from-transparent to-background" />

            <!-- Bottom padding leaves room for the controls floating over the slide -->
            <div class="mx-auto flex min-h-[32rem] max-w-7xl items-center px-4 pt-12 pb-24 sm:px-6 sm:pt-16 lg:px-8">
            <div v-if="slide.hasText" class="flex max-w-2xl flex-col gap-4">
              <p v-if="slide.eyebrow" class="text-sm font-semibold text-primary">{{ slide.eyebrow }}</p>
              <h2
                v-if="slide.title"
                class="max-w-2xl text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl lg:text-5xl"
              >
                {{ slide.title }}
              </h2>
              <p v-if="slide.description" class="max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">{{ slide.description }}</p>
              <div v-if="slide.primary || slide.secondary" class="mt-2 flex flex-wrap gap-3">
                <Button v-if="slide.primary" size="lg" as-child>
                  <RouterLink v-if="slide.primary.to" :to="slide.primary.to">{{ slide.primary.label }}</RouterLink>
                  <a
                    v-else
                    :href="slide.primary.href"
                    :target="slide.primary.external ? '_blank' : undefined"
                    :rel="slide.primary.external ? 'noopener noreferrer' : undefined"
                  >{{ slide.primary.label }}</a>
                </Button>
                <Button v-if="slide.secondary" size="lg" variant="outline" as-child>
                  <RouterLink v-if="slide.secondary.to" :to="slide.secondary.to">{{ slide.secondary.label }}</RouterLink>
                  <a
                    v-else
                    :href="slide.secondary.href"
                    :target="slide.secondary.external ? '_blank' : undefined"
                    :rel="slide.secondary.external ? 'noopener noreferrer' : undefined"
                  >{{ slide.secondary.label }}</a>
                </Button>
              </div>
            </div>
          </div>
          </div>
        </CarouselItem>
      </CarouselContent>

      <!-- Controls float over the slide's bottom edge so the photo covers the whole band -->
      <div v-if="hasMultipleSlides" class="absolute inset-x-0 bottom-0 mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 pb-8 sm:px-6 lg:px-8">
        <div class="flex items-center gap-2" aria-label="Choose slide">
          <button
            v-for="(slide, index) in slides"
            :key="slide.id"
            type="button"
            :aria-current="selectedIndex === index"
            :aria-label="`Go to slide ${index + 1}${slide.eyebrow || slide.title ? `: ${slide.eyebrow || slide.title}` : ''}`"
            :class="[
              'h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selectedIndex === index ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50',
            ]"
            @click="scrollTo(index)"
          />
        </div>
        <div class="flex items-center gap-2">
          <CarouselPrevious class="static translate-y-0" />
          <CarouselNext class="static translate-y-0" />
        </div>
      </div>
    </Carousel>
  </section>
</template>
