<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useColorMode } from '@vueuse/core'
import { ChevronDown, Menu, Moon, Sun } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import agsurLogo from '@/assets/images/agsur-logo.png'

interface NavLink {
  label: string
  href: string
  children?: { label: string; href: string }[]
}

// Anchors point to landing page sections (to be added below the header)
const navLinks: NavLink[] = [
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
  { label: 'Vacancies', href: '#jobs' },
  {
    label: 'Gov. Programs',
    href: '#programs',
    children: [
      { label: 'TUPAD', href: '#program-tupad' },
      { label: 'SPES', href: '#program-spes' },
      { label: 'GIP', href: '#program-gip' },
      { label: 'Fly Now Pay Later Program', href: '#program-fly-now-pay-later' },
      { label: 'Skills Training', href: '#program-skills-training' },
    ],
  },
]

// GoeyNav only renders plain links, so links with children get a dropdown beside it
const gooeyLinks = navLinks.filter(link => !link.children)
const dropdownLinks = navLinks.filter(link => link.children)

const mode = useColorMode()
const mobileOpen = ref(false)

function toggleTheme() {
  mode.value = mode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <!-- Solid background + overflow-hidden: GoeyNav's blend-mode canvas would otherwise show as a box outside the header -->
  <header class="sticky top-0 z-40 w-full overflow-hidden border-b border-border bg-background">
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
      <!-- Brand -->
      <RouterLink to="/" class="flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <img :src="agsurLogo" alt="AGSURJOBS" class="h-9 w-auto shrink-0 object-contain" />
      </RouterLink>

      <!-- Desktop navigation -->
      <div class="ml-auto hidden items-center gap-2 md:flex">
        <GoeyNav
          :items="gooeyLinks"
          :particle-count="15"
          :particle-distances="[90, 10]"
          :particle-r="100"
          :initial-active-index="0"
          :animation-time="600"
          :time-variance="300"
          :colors="[1, 2, 3, 1, 2, 3, 1, 4]"
          class="text-[13px] font-medium"
        />
        <DropdownMenu v-for="link in dropdownLinks" :key="link.href">
          <DropdownMenuTrigger
            class="group flex items-center gap-1 rounded-full px-[1em] py-[0.6em] text-[13px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted"
          >
            {{ link.label }}
            <ChevronDown class="size-4 transition-transform group-data-[state=open]:rotate-180" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-56">
            <DropdownMenuItem v-for="child in link.children" :key="child.href" as-child>
              <a :href="child.href">{{ child.label }}</a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" title="Toggle color theme" aria-label="Toggle color theme" @click="toggleTheme">
          <component :is="mode === 'dark' ? Sun : Moon" class="size-4" />
        </Button>

        <div class="hidden items-center gap-2 sm:flex">
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
              <template v-for="link in navLinks" :key="link.href">
                <Collapsible v-if="link.children">
                  <CollapsibleTrigger
                    class="group flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {{ link.label }}
                    <ChevronDown class="size-4 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent class="ml-3 flex flex-col gap-1 border-l border-border pl-2">
                    <a
                      v-for="child in link.children"
                      :key="child.href"
                      :href="child.href"
                      class="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      @click="mobileOpen = false"
                    >
                      {{ child.label }}
                    </a>
                  </CollapsibleContent>
                </Collapsible>
                <a
                  v-else
                  :href="link.href"
                  class="rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  @click="mobileOpen = false"
                >
                  {{ link.label }}
                </a>
              </template>
            </nav>
            <div class="mt-auto flex flex-col gap-2 p-4">
              <Button variant="outline" as-child>
                <RouterLink :to="{ name: 'login' }">Log in</RouterLink>
              </Button>
              <Button as-child>
                <RouterLink :to="{ name: 'signup' }">Sign up</RouterLink>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  </header>
</template>
