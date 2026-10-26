<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ChevronDown, LifeBuoy, LogOut, Menu, Moon, Settings2, Sun, UserRound } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import GoeyNav from '@/components/GoeyNav.vue'
import NotificationBell from '@/components/NotificationBell.vue'
import { useApplicantNavigation } from '@/composables/applicant/useApplicantNavigation'
import agsurLogo from '@/assets/images/agsur-logo.png'
import agsurSeal from '@/assets/images/agsur.png'

const {
  navItems,
  gooeyNavItems,
  activeNavIndex,
  supportItems,
  settingsItems,
  mobileOpen,
  isDark,
  displayName,
  userInitials,
  userEmail,
  isVerified,
  isLoading,
  avatarSrc,
  accountRoute,
  isActive,
  isCurrentRoute,
  toggleTheme,
  closeMobileMenu,
  handleSignOut,
} = useApplicantNavigation()
</script>

<template>
  <!-- Solid background, no backdrop-blur: blurring the content scrolling underneath a sticky header
       re-renders every scroll frame and was the main source of scroll jank.
       overflow-hidden: GoeyNav's blend-mode canvas would otherwise show as a box outside the header -->
  <header class="sticky top-0 z-50 w-full overflow-hidden border-b border-border bg-background">
    <div class="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
      <!-- Brand -->
      <RouterLink :to="{ name: 'home' }" class="flex shrink-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <img :src="agsurLogo" alt="AGSURJOBS" class="h-9 w-auto object-contain dark:hidden" />
        <img :src="agsurSeal" alt="AGSURJOBS" class="hidden size-9 object-contain dark:block" />
      </RouterLink>

      <!-- Desktop navigation -->
      <div class="ml-auto hidden items-center md:flex">
        <GoeyNav
          :items="gooeyNavItems"
          :active-index="activeNavIndex"
          list-class="gap-1"
          aria-label="Main"
          class="text-[13px] font-medium"
        />
      </div>

      <!-- Actions -->
      <div class="ml-auto flex items-center gap-1 md:ml-0">
        <NotificationBell :to="{ name: 'notification' }" />
        <Button variant="ghost" size="icon-sm" title="Toggle color theme" aria-label="Toggle color theme" @click="toggleTheme">
          <component :is="isDark ? Sun : Moon" class="size-4" />
        </Button>

        <!-- Account menu -->
        <Skeleton v-if="isLoading" class="ml-1 size-8 rounded-full" />
        <DropdownMenu v-else :modal="false">
          <DropdownMenuTrigger
            class="ml-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :aria-label="`Account menu for ${displayName}`"
          >
            <Avatar class="size-8">
              <AvatarImage :src="avatarSrc" :alt="displayName" />
              <AvatarFallback>{{ userInitials }}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-64">
            <DropdownMenuLabel class="flex items-center gap-2 font-normal">
              <Avatar class="size-8 shrink-0">
                <AvatarImage :src="avatarSrc" :alt="displayName" />
                <AvatarFallback>{{ userInitials }}</AvatarFallback>
              </Avatar>
              <div class="min-w-0 flex-1 leading-tight">
                <div class="flex min-w-0 items-center gap-1.5">
                  <span class="truncate text-sm font-semibold text-foreground">{{ displayName }}</span>
                  <Badge
                    class="h-3.5 shrink-0 select-none px-1 py-0 text-[9px] font-extrabold uppercase tracking-wider"
                    :class="isVerified ? 'bg-success text-primary-foreground' : 'bg-warning text-foreground'"
                  >
                    {{ isVerified ? 'Verified' : 'Not Verified' }}
                  </Badge>
                </div>
                <span class="block truncate text-xs text-muted-foreground">{{ userEmail }}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem as-child>
              <RouterLink :to="accountRoute">
                <UserRound class="size-4" />
                Account
              </RouterLink>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel class="flex items-center gap-2 text-xs text-muted-foreground">
                <LifeBuoy class="size-3.5" /> Support
              </DropdownMenuLabel>
              <DropdownMenuItem v-for="item in supportItems" :key="item.title" as-child>
                <RouterLink :to="item.to">
                  <component :is="item.icon" class="size-4" />
                  {{ item.title }}
                </RouterLink>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel class="flex items-center gap-2 text-xs text-muted-foreground">
                <Settings2 class="size-3.5" /> Settings
              </DropdownMenuLabel>
              <DropdownMenuItem v-for="item in settingsItems" :key="item.title" as-child>
                <RouterLink :to="item.to">
                  <component :is="item.icon" class="size-4" />
                  {{ item.title }}
                </RouterLink>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem class="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive" @click="handleSignOut">
              <LogOut class="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
              <SheetDescription>Applicant navigation</SheetDescription>
            </SheetHeader>
            <nav aria-label="Mobile" class="flex flex-col gap-1 px-4 pb-4">
              <template v-for="item in navItems" :key="item.title">
                <Collapsible v-if="item.children" :default-open="isActive(item)">
                  <CollapsibleTrigger
                    class="group flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {{ item.title }}
                    <ChevronDown class="size-4 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent class="ml-3 flex flex-col gap-1 border-l border-border pl-2">
                    <template v-for="child in item.children" :key="child.title">
                      <RouterLink
                        v-if="child.to"
                        :to="child.to"
                        class="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                        :class="isCurrentRoute(child) ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'"
                        @click="closeMobileMenu"
                      >
                        {{ child.title }}
                      </RouterLink>
                      <span
                        v-else
                        class="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground opacity-50"
                        aria-disabled="true"
                      >
                        {{ child.title }}
                        <span class="ml-auto text-xs">Coming soon</span>
                      </span>
                    </template>
                  </CollapsibleContent>
                </Collapsible>
                <RouterLink
                  v-else-if="item.to"
                  :to="item.to"
                  class="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                  :class="isActive(item) ? 'bg-muted text-foreground' : 'text-foreground'"
                  @click="closeMobileMenu"
                >
                  {{ item.title }}
                </RouterLink>
              </template>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  </header>
</template>
