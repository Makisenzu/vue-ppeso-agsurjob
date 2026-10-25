<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Separator } from '@/components/ui/separator'
import LandingLink from '@/components/landing/LandingLink.vue'
import { useLandingFooter } from '@/composables/landing/useLandingFooter'
import agsurSeal from '@/assets/images/agsur.png'

const { office, address, contacts, exploreLinks, programLinks, logos, year } = useLandingFooter()
</script>

<template>
  <footer aria-labelledby="footer-title" class="border-t border-border bg-muted/40">
    <h2 id="footer-title" class="sr-only">Footer</h2>

    <div class="mx-auto grid max-w-7xl gap-12 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:px-8">
      <!-- Brand -->
      <div class="flex flex-col gap-6">
        <!-- Logo on the left, office name and address beside it -->
        <div class="flex items-center gap-4">
          <RouterLink to="/" class="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <img :src="agsurSeal" alt="AGSURJOBS" class="size-12 object-contain" />
          </RouterLink>

          <div class="flex min-w-0 flex-col gap-1">
            <p class="text-sm font-semibold text-foreground">{{ office }}</p>
            <p class="text-xs text-muted-foreground">{{ address }}</p>
          </div>
        </div>

        <!-- The icon stands in for the visible "Email" / "Facebook" label; the dt keeps it for screen readers -->
        <dl class="flex flex-col gap-1">
          <div v-for="contact in contacts" :key="contact.type" class="min-w-0">
            <dt class="sr-only">{{ contact.type }}</dt>
            <dd class="min-w-0">
              <a
                :href="contact.href"
                :target="contact.href.startsWith('http') ? '_blank' : undefined"
                :rel="contact.href.startsWith('http') ? 'noopener noreferrer' : undefined"
                class="inline-flex min-h-10 max-w-full items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary lg:min-h-8"
              >
                <component :is="contact.icon" class="size-4 shrink-0 text-muted-foreground" />
                <span class="break-all">{{ contact.label }}</span>
              </a>
            </dd>
          </div>
        </dl>

        <ul class="flex flex-wrap items-center gap-4" aria-label="Partner offices">
          <li v-for="logo in logos" :key="logo.alt">
            <template v-if="logo.darkSrc">
              <img :src="logo.src" :alt="logo.alt" class="size-10 object-contain dark:hidden" loading="lazy" />
              <img :src="logo.darkSrc" :alt="logo.alt" :class="['hidden size-10 object-contain dark:block', logo.darkClass]" loading="lazy" />
            </template>
            <img v-else :src="logo.src" :alt="logo.alt" class="size-10 object-contain" loading="lazy" />
          </li>
        </ul>
      </div>

      <!-- Explore -->
      <nav aria-labelledby="footer-explore" class="flex flex-col gap-4">
        <h3 id="footer-explore" class="text-sm font-semibold text-foreground">Explore</h3>
        <ul class="flex flex-col gap-1">
          <li v-for="link in exploreLinks" :key="link.label">
            <LandingLink :link="link" class="inline-flex min-h-10 items-center text-sm text-muted-foreground transition-colors hover:text-foreground lg:min-h-8">
              {{ link.label }}
            </LandingLink>
          </li>
        </ul>
      </nav>

      <!-- Programs -->
      <nav aria-labelledby="footer-programs" class="flex flex-col gap-4">
        <h3 id="footer-programs" class="text-sm font-semibold text-foreground">Programs</h3>
        <ul class="flex flex-col gap-1">
          <li v-for="link in programLinks" :key="link.label">
            <LandingLink :link="link" class="inline-flex min-h-10 items-center text-sm text-muted-foreground transition-colors hover:text-foreground lg:min-h-8">
              {{ link.label }}
            </LandingLink>
          </li>
        </ul>
      </nav>

      <!-- Account -->
      <nav aria-labelledby="footer-account" class="flex flex-col gap-4">
        <h3 id="footer-account" class="text-sm font-semibold text-foreground">Account</h3>
        <ul class="flex flex-col gap-1">
          <li>
            <RouterLink :to="{ name: 'login' }" class="inline-flex min-h-10 items-center text-sm text-muted-foreground transition-colors hover:text-foreground lg:min-h-8">
              Log in
            </RouterLink>
          </li>
          <li>
            <RouterLink :to="{ name: 'signup' }" class="inline-flex min-h-10 items-center text-sm text-muted-foreground transition-colors hover:text-foreground lg:min-h-8">
              Sign up
            </RouterLink>
          </li>
        </ul>
      </nav>
    </div>

    <Separator />

    <div class="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
      <p>© {{ year }} Provincial Government of Agusan del Sur. All rights reserved.</p>
      <a href="#main" class="w-fit transition-colors hover:text-foreground">Back to top</a>
    </div>
  </footer>
</template>
