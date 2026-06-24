<script setup lang="ts">
import { Mail, Home, Inbox, Search, Settings2, ChevronUp, ChevronRight, Phone, LayoutDashboard, Bookmark, Building, UserRound, Bell, Zap, MessageCircle, Star, Settings, UserRoundCog} from '@lucide/vue'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar' 
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { ref } from 'vue'

const isVerified = ref(true)
import { useRoute } from 'vue-router'
const route = useRoute()

const { state, isMobile } = useSidebar()

const activitySubItems = [
  { title: 'Job Applications', url: '#', icon: Inbox },
  { title: 'Interviews', url: '#', icon: Phone },
  { title: 'Chats', url: '#', icon: MessageCircle },
  { title: 'Offers', url: '#', icon: Mail },
]
const contactSubItems = [
  { title: 'Help Center & FAQ', url: '#', icon: Search },
  { title: 'Submit a Ticket', url: '#', icon: Mail },
  { title: 'Live Chat', url: '#', icon: Phone },
  { title: 'Feedbacks', url: '#', icon: Star },
]

const settingsSubItems = [
  { title: 'Profile Settings', url: '#', icon:  UserRoundCog },
  { title: 'Account Security', url: '#', icon: Settings },
  { title: 'Notification Preferences', url: '#', icon: Bell },
]

const jobHuntItems = [
  { title: 'Find Jobs', url: '#', icon: Search },
  { title: 'Saved Jobs', url: '#', icon: Bookmark },
  { title: 'Companies', url: '#', icon: Building },
]

</script>

<template>
  <Sidebar collapsible="icon" class="border-r border-sidebar-border/50">
    
    <SidebarHeader class="p-2 flex items-center w-full transition-all duration-200">
      <div v-if="state === 'expanded'" class="w-full max-w-[200px] flex justify-start mr-auto p-2">
        <img src="/src/assets/images/agsur-logo.png" alt="AGSURJOBS Logo" class="w-full h-auto object-contain">
      </div>
      <div v-else class="flex items-center justify-center size-8 mx-auto overflow-hidden">
        <img src="/src/assets/images/agsur.png" alt="AGSURJOBS Logo" class="size-full object-contain">
      </div>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup>
        <SidebarMenuItem>
            <SidebarMenuButton as-child :tooltip="'Home'">
                <RouterLink to="#">
                  <Home />
                  <span>Home</span>
                </RouterLink>
            </SidebarMenuButton>
            <SidebarMenuButton as-child :tooltip="'Dashboard'">
                <RouterLink to="#">
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
        <SidebarGroupLabel>Job Search</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>

            <SidebarMenuItem v-for="item in jobHuntItems" :key="item.title">
              <SidebarMenuButton as-child :tooltip="item.title">
                <a :href="item.url">
                  <component :is="item.icon" />
                  <span>{{ item.title }}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <div class="my-1 h-px bg-sidebar-border" />
            <SidebarGroupLabel>Others</SidebarGroupLabel>
            <SidebarMenuItem>
            <Collapsible as-child default-close class="group/collapsible">
                <div>
                <CollapsibleTrigger as-child>
                    <SidebarMenuButton :tooltip="'My Activities'">
                    <Zap />
                    <span>My Activities</span>
                    <ChevronRight class="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                </CollapsibleTrigger>
      
                <CollapsibleContent>
                    <SidebarMenuSub>
                    <SidebarMenuSubItem v-for="subItem in activitySubItems" :key="subItem.title">
                        <SidebarMenuSubButton as-child>
                            <a :href="subItem.url" class="flex items-center gap-2">
                            <!-- <component :is="subItem.icon" class="size-4 shrink-0" /> -->
                            <span>{{ subItem.title }}</span>
                        </a>
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
                            <a :href="subItem.url" class="flex items-center gap-2">
                            <!-- <component :is="subItem.icon" class="size-4 shrink-0" /> -->
                            <span>{{ subItem.title }}</span>
                        </a>
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
                            <a :href="subItem.url" class="flex items-center gap-2">
                            <!-- <component :is="subItem.icon" class="size-4 shrink-0" /> -->
                            <span>{{ subItem.title }}</span>
                        </a>
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
              <AvatarImage src="/src/assets/images/agsur.png" alt="User profile" class="rounded-lg object-contain" />
              <AvatarFallback class="rounded-lg">U</AvatarFallback>
            </Avatar>
            
            <!-- min-w-0 overrides CSS defaults so inner elements can truncate safely -->
            <div v-if="state === 'expanded'" class="min-w-0 flex-1 text-left text-sm leading-tight pr-2">
              <div class="flex items-center gap-1.5 w-full min-w-0">
                <span class="truncate font-semibold">Denmark B. Rivera</span>
                
                <!-- Micro-scaled & protected from text shrinkage -->
                <Badge 
                  :variant="isVerified ? 'default' : 'secondary'"
                  class="text-[9px] px-1 py-0 h-3.5 uppercase tracking-wider font-extrabold shrink-0 select-none"
                  :class="isVerified ? 'bg-emerald-600 hover:bg-emerald-600 text-white' : 'bg-amber-500 hover:bg-amber-500 text-black'"
                >
                  {{ isVerified ? 'Verified' : 'Pending' }}
                </Badge>
              </div>
              <span class="truncate text-xs text-muted-foreground block">denmarkbarbarona13@gmail.com</span>
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
              <AvatarImage src="/src/assets/images/agsur.png" alt="User profile" class="rounded-lg object-contain" />
              <AvatarFallback class="rounded-lg">U</AvatarFallback>
            </Avatar>
            
            <div class="min-w-0 flex-1 text-left text-sm leading-tight">
              <div class="flex items-center gap-1.5 w-full min-w-0">
                <span class="truncate font-semibold text-foreground">Denmark B. Rivera</span>
                
                <!-- Fixed color layout to match emerald theme -->
                <Badge 
                  :variant="isVerified ? 'default' : 'secondary'"
                  class="text-[9px] px-1 py-0 h-3.5 uppercase tracking-wider font-extrabold shrink-0 select-none"
                  :class="isVerified ? 'bg-emerald-600 hover:bg-emerald-600 text-white' : 'bg-amber-500 hover:bg-amber-500 text-black'"
                >
                  {{ isVerified ? 'Verified' : 'Pending' }}
                </Badge>
              </div>
              <span class="truncate text-xs text-muted-foreground block">denmarkbarbarona13@gmail.com</span>
            </div>
          </div>
          
          <div class="my-1 h-px bg-sidebar-border" />

          <DropdownMenuItem class="cursor-pointer gap-2">
            <UserRound class="size-4" />
            <span>Account</span>
          </DropdownMenuItem>
          
          <div class="my-1 h-px bg-sidebar-border" />
          
          <DropdownMenuItem class="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 gap-2">
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</SidebarFooter>
  </Sidebar>
</template>