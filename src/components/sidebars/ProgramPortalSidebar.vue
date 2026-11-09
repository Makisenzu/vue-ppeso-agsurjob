<script setup lang="ts">
import { ChevronUp, ShieldCheck, UserRound } from '@lucide/vue'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useProgramPortalSidebar } from '@/composables/applicant/useProgramPortal'

const {
  program,
  programItems,
  state,
  isMobile,
  displayName,
  userInitials,
  userEmail,
  isVerified,
  avatarSrc,
  accountRoute,
  isActive,
  collapseSidebar,
  handleSignOut,
} = useProgramPortalSidebar()
</script>

<template>
  <!-- One sidebar for every applicant program portal: only the program's own pages (programPortalHelper.ts) -->
  <Sidebar collapsible="icon" class="border-r border-sidebar-border/50">
    <SidebarHeader class="p-2">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton v-if="program" as-child size="lg" :tooltip="program.title">
            <AppLink :to="program.home" @click="collapseSidebar">
              <!-- The logo file has white margins around the seal; the scale trims them -->
              <span v-if="program.logo" class="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
                <img :src="program.logo" :alt="`${program.shortTitle} logo`" class="size-full scale-125 object-contain" />
              </span>
              <span
                v-else
                class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
              >
                <component :is="program.icon" class="size-4" />
              </span>
              <span class="flex min-w-0 flex-col leading-tight">
                <span class="truncate font-semibold">{{ program.shortTitle }}</span>
                <span class="truncate text-xs text-muted-foreground">{{ program.title }}</span>
              </span>
            </AppLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup v-if="program">
        <SidebarGroupLabel>{{ program.shortTitle }}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in programItems" :key="item.title">
              <SidebarMenuButton as-child :tooltip="item.title" :is-active="isActive(item)">
                <AppLink :to="item.to" @click="collapseSidebar">
                  <component :is="item.icon" />
                  <span>{{ item.title }}</span>
                </AppLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu :modal="false">
            <DropdownMenuTrigger as-child>
              <SidebarMenuButton
                size="lg"
                class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar class="size-8 shrink-0 rounded-lg">
                  <AvatarImage :src="avatarSrc" :alt="displayName" />
                  <AvatarFallback class="rounded-lg">{{ userInitials }}</AvatarFallback>
                </Avatar>
                <div class="min-w-0 flex-1 text-left text-sm leading-tight">
                  <div class="flex min-w-0 items-center gap-1.5">
                    <span class="truncate font-semibold">{{ displayName }}</span>
                    <Badge :variant="isVerified ? 'default' : 'secondary'" class="h-4 shrink-0 px-1 text-[10px]">
                      {{ isVerified ? 'Verified' : 'Not verified' }}
                    </Badge>
                  </div>
                  <span class="block truncate text-xs text-muted-foreground">{{ userEmail }}</span>
                </div>
                <ChevronUp v-if="state === 'expanded'" class="ml-auto size-4 shrink-0" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent :side="isMobile ? 'top' : 'right'" align="end" class="mb-2 w-60 data-[side=right]:ml-2">
              <DropdownMenuItem as-child class="cursor-pointer gap-2">
                <AppLink :to="accountRoute" @click="collapseSidebar">
                  <UserRound class="size-4" />
                  <span>My Profile</span>
                </AppLink>
              </DropdownMenuItem>
              <DropdownMenuItem as-child class="cursor-pointer gap-2">
                <AppLink :to="{ name: 'privacy-center' }" @click="collapseSidebar">
                  <ShieldCheck class="size-4" />
                  <span>Privacy & My Data</span>
                </AppLink>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                class="cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                @click="handleSignOut"
              >
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  </Sidebar>
</template>
