<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ChevronDown, Menu, Moon, Sun } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import GoeyNav from '@/components/GoeyNav.vue'
import LandingLink from '@/components/landing/LandingLink.vue'
import { useLandingNavigation } from '@/composables/landing/useLandingNavigation'
import agsurLogo from '@/assets/images/agsur-logo.png'
import agsurSeal from '@/assets/images/agsur.png'

const { navLinks, activeNavIndex, mobileOpen, isDark, isSignedIn, toggleTheme, closeMobileMenu } = useLandingNavigation()
</script>

<template>
  <!-- Solid background + overflow-hidden: GoeyNav's blend-mode canvas would otherwise show as a box outside the header -->
  <header class="sticky top-0 z-40 w-full overflow-hidden border-b border-border bg-background">
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
      <!-- Brand -->
      <RouterLink to="/" class="flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <!-- The wordmark has a light background, so dark mode shows the seal instead (same as ApplicantHeader) -->
        <img :src="agsurLogo" alt="AGSURJOBS" class="h-9 w-auto shrink-0 object-contain dark:hidden" />
        <img :src="agsurSeal" alt="AGSURJOBS" class="hidden size-9 shrink-0 object-contain dark:block" />
      </RouterLink>

      <!-- Desktop navigation -->
      <div class="ml-auto hidden items-center gap-2 md:flex">
        <!-- Links with children render as GoeyNav dropdowns; opening one moves the gooey pill onto it -->
        <GoeyNav
          :items="navLinks"
          :particle-count="15"
          :particle-distances="[90, 10]"
          :particle-r="100"
          :initial-active-index="activeNavIndex"
          :animation-time="600"
          :time-variance="300"
          :colors="[1, 2, 3, 1, 2, 3, 1, 4]"
          aria-label="Main"
          class="text-[13px] font-medium"
        />
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" title="Toggle color theme" aria-label="Toggle color theme" @click="toggleTheme">
          <component :is="isDark ? Sun : Moon" class="size-4" />
        </Button>

        <!-- "/" redirects a signed-in user to their role's dashboard (router guard) -->
        <Button v-if="isSignedIn" size="sm" class="hidden sm:inline-flex" as-child>
          <RouterLink to="/">Dashboard</RouterLink>
        </Button>
        <div v-else class="hidden items-center gap-2 sm:flex">
          <Button variant="outline" size="sm" as-child>
            <RouterLink :to="{ name: 'login' }">Log in</RouterLink>
          </Button>
          <Button size="sm" as-child>
            <RouterLink :to="{ name: 'signup' }">Sign up</RouterLink>
          </Button>
        </div>

        <!-- Mobile menu -->
        <Sheet v-model:open="mobileOpen">
          <SheetTrigger as-child>
            <Button variant="ghost" size="icon" class="md:hidden" aria-label="Open menu">
              <Menu class="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="top" class="max-h-dvh overflow-y-auto">
            <SheetHeader>
              <SheetTitle>AGSURJOBS</SheetTitle>
              <SheetDescription>Province of Agusan del Sur job portal</SheetDescription>
            </SheetHeader>
            <nav aria-label="Mobile" class="flex flex-col gap-1 px-4">
              <template v-for="link in navLinks" :key="link.label">
                <Collapsible v-if="link.children">
                  <CollapsibleTrigger
                    class="group flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {{ link.label }}
                    <ChevronDown class="size-4 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent class="ml-3 flex flex-col gap-1 border-l border-border pl-2">
                    <LandingLink
                      v-for="child in link.children"
                      :key="child.label"
                      :link="child"
                      class="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      @click="closeMobileMenu"
                    >
                      {{ child.label }}
                    </LandingLink>
                  </CollapsibleContent>
                </Collapsible>
                <LandingLink
                  v-else
                  :link="link"
                  class="rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  @click="closeMobileMenu"
                >
                  {{ link.label }}
                </LandingLink>
              </template>
            </nav>
            <div class="mt-auto flex flex-col gap-2 p-4">
              <Button v-if="isSignedIn" as-child>
                <RouterLink to="/" @click="closeMobileMenu">Dashboard</RouterLink>
              </Button>
              <template v-else>
                <Button variant="outline" as-child>
                  <RouterLink :to="{ name: 'login' }">Log in</RouterLink>
                </Button>
                <Button as-child>
                  <RouterLink :to="{ name: 'signup' }">Sign up</RouterLink>
                </Button>
              </template>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  </header>
</template>
