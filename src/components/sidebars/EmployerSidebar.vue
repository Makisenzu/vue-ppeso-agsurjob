<script setup lang="ts">
import { Activity, Hexagon, FolderSearch2, Newspaper, Mail, Home, Inbox, Search, Settings2, ChevronUp, ChevronRight, Phone, LayoutDashboard, Bookmark, UserRound, Bell, MessageCircle, Star, Settings, UserRoundCog} from '@lucide/vue'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from '@/components/ui/sidebar'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { Avatar, AvatarFallback} from '@/components/ui/avatar' 
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()

const { state, isMobile } = useSidebar()
const { displayName, userInitials, userEmail, isVerified, isLoading, handleSignOut } = useAuth()

const activitySubItems = [
  { title: 'Posting History', to: {name: 'dashboard'}, icon: Inbox },
  { title: 'Interviews', to: {name: 'dashboard'}, icon: Phone },
  { title: 'Chats', to: {name: 'dashboard'}, icon: MessageCircle },
]
const contactSubItems = [
  { title: 'Help Center & FAQ', to: {name: 'dashboard'}, icon: Search },
  { title: 'Submit a Ticket', to: {name: 'dashboard'}, icon: Mail },
  { title: 'Live Chat', to: {name: 'dashboard'}, icon: Phone },
  { title: 'Feedbacks', to: {name: 'dashboard'}, icon: Star },
]
const settingsSubItems = [
  { title: 'Company Settings', to: {name: 'dashboard'}, icon:  UserRoundCog },
  { title: 'Team Member', to: {name: 'dashboard'}, icon: Settings },
]

const companyItems = [
  { title: 'Company Profile', to: {name: 'dashboard'}, icon: Hexagon },
  { title: 'Job Posting', to: {name: 'dashboard'}, icon: Newspaper },
  { title: 'Applicants', to: {name: 'dashboard'}, icon: FolderSearch2 },
  { title: 'Shortlisted Candidates', to: {name: 'dashboard'}, icon: Bookmark },
]
</script>

<template>
  <Sidebar collapsible="icon" class="border-r border-sidebar-border/50">
    
    <template v-if="isLoading">
      <SidebarHeader class="p-4 flex items-center w-full">
        <Skeleton v-if="state === 'expanded'" class="h-7 w-32 mr-auto" />
        <Skeleton v-else class="size-8 rounded-md mx-auto" />
      </SidebarHeader>

      <SidebarContent class="px-2 space-y-6">
        <div class="space-y-2 pt-2">
          <Skeleton v-if="state === 'expanded'" class="h-3 w-16 mx-2 mb-3" />
          <div v-for="i in 3" :key="'gen-'+i" class="flex items-center gap-3 h-9 px-2">
            <Skeleton class="size-4 shrink-0 rounded" />
            <Skeleton v-if="state === 'expanded'" class="h-4 flex-1 max-w-27.5" />
          </div>
        </div>

        <div class="h-px bg-sidebar-border/50 my-1 mx-2" />

        <div class="space-y-2">
          <Skeleton v-if="state === 'expanded'" class="h-3 w-20 mx-2 mb-3" />
          <div v-for="i in 3" :key="'job-'+i" class="flex items-center gap-3 h-9 px-2">
            <Skeleton class="size-4 shrink-0 rounded" />
            <Skeleton v-if="state === 'expanded'" class="h-4 flex-1 max-w-22.5" />
          </div>
        </div>

        <div class="h-px bg-sidebar-border/50 my-1 mx-2" />

        <div class="space-y-2">
          <Skeleton v-if="state === 'expanded'" class="h-3 w-14 mx-2 mb-3" />
          <div v-for="i in 3" :key="'oth-'+i" class="flex items-center gap-3 h-9 px-2">
            <Skeleton class="size-4 shrink-0 rounded" />
            <Skeleton v-if="state === 'expanded'" class="h-4 flex-1 max-w-30" />
            <Skeleton v-if="state === 'expanded'" class="size-3 ml-auto rounded" />
          </div>
        </div>
      </SidebarContent>

      <SidebarFooter class="p-2">
        <div class="w-full flex items-center gap-2 h-12" :class="state === 'collapsed' ? 'justify-center p-0' : 'justify-start px-2'">
          <Skeleton class="size-8 rounded-lg shrink-0" />
          <div v-if="state === 'expanded'" class="space-y-1.5 flex-1 min-w-0 pr-2">
            <Skeleton class="h-4 w-[85%]" />
            <Skeleton class="h-3 w-[60%]" />
          </div>
        </div>
      </SidebarFooter>
    </template>

    <template v-else>
      <SidebarHeader class="p-2 flex items-center w-full transition-all duration-200">
  
        <div v-if="state === 'expanded'" class="w-full max-w-50 flex justify-start mr-auto p-2">
          <img src="/src/assets/images/agsur-logo.png" alt="AGSURJOBS Logo" class="dark:hidden w-full h-auto object-contain">
          <img src="/src/assets/images/agsur.png" alt="AGSURJOBS Seal" class="hidden dark:block size-8 object-contain">
        </div>
        <div v-else class="flex items-center justify-center size-8 mx-auto overflow-hidden">
          <img src="/src/assets/images/agsur.png" alt="AGSURJOBS Seal" class="size-full object-contain">
        </div>

      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarMenuItem>
              <SidebarMenuButton as-child :tooltip="'Home'">
                  <RouterLink :to="{ name: 'login' }">
                    <Home />
                    <span>Home</span>
                  </RouterLink>
              </SidebarMenuButton>
              <SidebarMenuButton as-child :tooltip="'Dashboard'" :is-active="route.name === 'dashboard'">
                  <RouterLink :to="{ name: 'dashboard' }">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </RouterLink>
              </SidebarMenuButton>
              <SidebarMenuButton as-child :tooltip="'Notification'">
                  <RouterLink to="#">
                    <Bell />
                    <span>Notification</span>
                  </RouterLink>
              </SidebarMenuButton>
          </SidebarMenuItem>
          
          <div class="my-1 h-px bg-sidebar-border" />
          <SidebarGroupLabel>Company Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem v-for="item in companyItems" :key="item.title">
                <SidebarMenuButton as-child :tooltip="item.title">
                  <RouterLink to="">
                    <component :is="item.icon" />
                    <span>{{ item.title }}</span>
                  </RouterLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <div class="my-1 h-px bg-sidebar-border" />
              <SidebarGroupLabel>Others</SidebarGroupLabel>
              
              <SidebarMenuItem>
                <Collapsible as-child default-close class="group/collapsible">
                  <div>
                    <CollapsibleTrigger as-child>
                      <SidebarMenuButton :tooltip="'My Activities'">
                        <Activity />
                        <span>Activities    </span>
                        <ChevronRight class="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem v-for="subItem in activitySubItems" :key="subItem.title">
                          <SidebarMenuSubButton as-child>
                            <RouterLink to="">
                              <span>{{ subItem.title }}</span>
                            </RouterLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <Collapsible as-child default-close class="group/collapsible">
                  <div>
                    <CollapsibleTrigger as-child>
                      <SidebarMenuButton :tooltip="'Support'">
                        <UserRound />
                        <span>Support</span>
                        <ChevronRight class="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem v-for="subItem in contactSubItems" :key="subItem.title">
                          <SidebarMenuSubButton as-child>
                            <RouterLink to="">
                              <span>{{ subItem.title }}</span>
                            </RouterLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <Collapsible as-child default-close class="group/collapsible">
                  <div>
                    <CollapsibleTrigger as-child>
                      <SidebarMenuButton :tooltip="'Settings'">
                        <Settings2 />
                        <span>Settings</span>
                        <ChevronRight class="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem v-for="subItem in settingsSubItems" :key="subItem.title">
                          <SidebarMenuSubButton as-child>
                            <RouterLink to="">
                              <span>{{ subItem.title }}</span>
                            </RouterLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
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
                  class="w-full flex items-center gap-2 h-12 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  :class="state === 'collapsed' ? 'justify-center p-0' : 'justify-start px-2'"
                >
                  <Avatar class="size-8 rounded-lg shrink-0">
                    <AvatarFallback class="rounded-lg">{{ userInitials }}</AvatarFallback>
                  </Avatar>
                  
                  <div v-if="state === 'expanded'" class="min-w-0 flex-1 text-left text-sm leading-tight pr-2">
                    <div class="flex items-center gap-1.5 w-full min-w-0">
                      <span class="truncate font-semibold">{{ displayName }}</span>
                      <Badge 
                        :variant="isVerified ? 'default' : 'secondary'"
                        class="text-[9px] px-1 py-0 h-3.5 uppercase tracking-wider font-extrabold shrink-0 select-none"
                        :class="isVerified ? 'bg-emerald-600 hover:bg-emerald-600 text-white' : 'bg-amber-500 hover:bg-amber-500 text-black'"
                      >
                        {{ isVerified ? 'Verified' : 'Pending' }}
                      </Badge>
                    </div>
                    <span class="truncate text-xs text-muted-foreground block">{{ userEmail }}</span>
                  </div>
                  
                  <ChevronUp v-if="state === 'expanded'" class="ml-auto size-4 shrink-0" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent 
                :side="isMobile ? 'top' : 'right'" 
                align="end" 
                class="w-64 p-1 mb-2 data-[side=right]:ml-2"
              >
                <div class="flex items-center gap-2 px-2 py-1.5 text-sm font-normal">
                  <Avatar class="size-8 rounded-lg shrink-0">
                    <AvatarFallback class="rounded-lg">{{ userInitials }}</AvatarFallback>
                  </Avatar>
                  
                  <div class="min-w-0 flex-1 text-left text-sm leading-tight">
                    <div class="flex items-center gap-1.5 w-full min-w-0">
                      <span class="truncate font-semibold text-foreground">{{ displayName }}</span>
                      <Badge 
                        :variant="isVerified ? 'default' : 'secondary'"
                        class="text-[9px] px-1 py-0 h-3.5 uppercase tracking-wider font-extrabold shrink-0 select-none"
                        :class="isVerified ? 'bg-emerald-600 hover:bg-emerald-600 text-white' : 'bg-amber-500 hover:bg-amber-500 text-black'"
                      >
                        {{ isVerified ? 'Verified' : 'Pending' }}
                      </Badge>
                    </div>
                    <span class="truncate text-xs text-muted-foreground block">{{ userEmail }}</span>
                  </div>
                </div>
                
                <div class="my-1 h-px bg-sidebar-border" />

                <DropdownMenuItem class="cursor-pointer gap-2">
                  <UserRound class="size-4" />
                  <span>Account</span>
                </DropdownMenuItem>
                
                <div class="my-1 h-px bg-sidebar-border" />
                
                <DropdownMenuItem class="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 gap-2" @click="handleSignOut">
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </template>

  </Sidebar>
</template>