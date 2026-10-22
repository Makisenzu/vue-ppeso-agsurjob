<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { useLandingHero } from '@/composables/landing/useLandingHero'

const { slides, selectedIndex, setApi, scrollTo, pauseAutoplay, resumeAutoplay } = useLandingHero()
</script>

<template>
  <!-- Full-bleed band; slide content stays aligned with the header's max-w-7xl container -->
  <section aria-label="Highlights" class="w-full border-b border-border bg-muted">
    <Carousel
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
          <div class="mx-auto grid min-h-[28rem] max-w-7xl items-center gap-8 px-4 pt-10 pb-6 sm:px-6 sm:pt-14 md:grid-cols-[1.4fr_1fr] lg:px-8 lg:pt-16">
            <div class="flex flex-col gap-4">
              <p class="text-sm font-semibold text-primary">{{ slide.eyebrow }}</p>
              <component
                :is="index === 0 ? 'h1' : 'h2'"
                class="max-w-2xl text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl lg:text-5xl"
              >
                {{ slide.title }}
              </component>
              <p class="max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">{{ slide.description }}</p>
              <div class="mt-2 flex flex-wrap gap-3">
                <Button size="lg" as-child>
                  <RouterLink v-if="slide.primary.to" :to="slide.primary.to">{{ slide.primary.label }}</RouterLink>
                  <a v-else :href="slide.primary.href">{{ slide.primary.label }}</a>
                </Button>
                <Button v-if="slide.secondary" size="lg" variant="outline" as-child>
                  <RouterLink v-if="slide.secondary.to" :to="slide.secondary.to">{{ slide.secondary.label }}</RouterLink>
                  <a v-else :href="slide.secondary.href">{{ slide.secondary.label }}</a>
                </Button>
              </div>
            </div>
            <div class="hidden aspect-square w-full max-w-xs items-center justify-center justify-self-center rounded-full bg-background p-10 md:flex">
              <img
                :src="slide.image"
                :alt="slide.imageAlt"
                :loading="index === 0 ? 'eager' : 'lazy'"
                class="size-full object-contain"
              />
            </div>
          </div>
        </CarouselItem>
      </CarouselContent>

      <!-- Controls sit inside the band; the primitive's default offsets would place them off-screen -->
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 pb-8 sm:px-6 lg:px-8">
        <div class="flex items-center gap-2" aria-label="Choose slide">
          <button
            v-for="(slide, index) in slides"
            :key="slide.id"
            type="button"
            :aria-current="selectedIndex === index"
            :aria-label="`Go to slide ${index + 1}: ${slide.eyebrow}`"
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
