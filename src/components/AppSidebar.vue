<script setup lang="ts">
import { Calendar, Home, Inbox, Search, Settings, ChevronUp, ChevronRight } from '@lucide/vue'
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
  // Added sub-menu imports here:
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
// Import Collapsible primitives from your UI folder
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

const { state } = useSidebar()

// Nested sub-menu items for "Home" (similar to Playground in image_6e867f.png)
const homeSubItems = [
  { title: 'History', url: '#' },
  { title: 'Starred', url: '#' },
  { title: 'Recent', url: '#' },
]

const items = [
  { title: 'Inbox', url: '#', icon: Inbox },
  { title: 'Calendar', url: '#', icon: Calendar },
  { title: 'Search', url: '#', icon: Search },
  { title: 'Settings', url: '#', icon: Settings },
]
</script>

<template>
  <Sidebar collapsible="icon">
    
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
        <SidebarGroupLabel>Job Search</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            
            <!-- Collapsible Menu Item (Like "Playground" in image_6e867f.png) -->
            <SidebarMenuItem>
              <Collapsible as-child default-open class="group/collapsible">
                <div>
                  <CollapsibleTrigger as-child>
                    <SidebarMenuButton :tooltip="'Home'">
                      <Home />
                      <span>Home</span>
                      <!-- Arrow indicator that turns 90 degrees when open -->
                      <ChevronRight class="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem v-for="subItem in homeSubItems" :key="subItem.title">
                        <SidebarMenuSubButton as-child>
                          <a :href="subItem.url">
                            <span>{{ subItem.title }}</span>
                          </a>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </SidebarMenuItem>

            <!-- Regular Menu Items -->
            <SidebarMenuItem v-for="item in items" :key="item.title">
              <SidebarMenuButton as-child :tooltip="item.title">
                <a :href="item.url">
                  <component :is="item.icon" />
                  <span>{{ item.title }}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <!-- Footer Component -->
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <SidebarMenuButton 
                class="w-full flex items-center gap-2 h-12 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                :class="state === 'collapsed' ? 'justify-center p-0' : 'justify-start px-2'"
              >
                <Avatar class="size-8 rounded-lg shrink-0">
                  <AvatarImage src="src/assets/images/agsur.png" alt="User profile" class="rounded-lg object-contain" />
                  <AvatarFallback class="rounded-lg">U</AvatarFallback>
                </Avatar>
                <div v-if="state === 'expanded'" class="grid flex-1 text-left text-sm leading-tight">
                  <span class="truncate font-semibold">Denmark B. Rivera</span>
                  <span class="truncate text-xs text-muted-foreground">denmarkbarbarona13@gmail.com</span>
                </div>
                <ChevronUp v-if="state === 'expanded'" class="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" class="w-56">
              <DropdownMenuItem><span>Account</span></DropdownMenuItem>
              <DropdownMenuItem><span>Billing</span></DropdownMenuItem>
              <DropdownMenuItem><span>Sign out</span></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  </Sidebar>
</template>