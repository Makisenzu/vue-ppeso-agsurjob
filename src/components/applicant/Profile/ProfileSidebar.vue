<script setup lang="ts">
import { computed, ref } from 'vue'
import VariableProximity from '@/components/ui/variable-proximity/VariableProximity.vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMediaQuery } from '@vueuse/core'  
const isDesktop = useMediaQuery('(min-width: 640px)')
const Modal = computed(() => ({
  Root: isDesktop.value ? Dialog : Drawer,
  Trigger: isDesktop.value ? DialogTrigger : DrawerTrigger,
  Content: isDesktop.value ? DialogContent : DrawerContent,
  Header: isDesktop.value ? DialogHeader : DrawerHeader,
  Title: isDesktop.value ? DialogTitle : DrawerTitle,
  Description: isDesktop.value ? DialogDescription : DrawerDescription,
  Footer: isDesktop.value ? DialogFooter : DrawerFooter,
  Close: isDesktop.value ? DialogClose : DrawerClose,
}))
const open = ref(false)
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'

import {
  MapPin,
  Mail,
  Phone,
  Calendar,
  Pencil,
  AtSign,
  Settings,
  Share2,
} from '@lucide/vue'


const containerRef = ref<HTMLElement | null>(null)

defineProps<{
  displayName: string
  userInitials: string
  username: string
  bio: string
  email: string
  phone: string
  location: string
  joinedDate: string
  employmentStatus: string
  is4ps: boolean
  isPwd: boolean
}>()
</script>

<template>
  <div class="flex flex-col space-y-5">
    <div class="relative w-48 h-48 sm:w-56 sm:h-56 lg:w-full lg:h-auto aspect-square mx-auto lg:mx-0">
      <div class="w-full h-full rounded-full overflow-hidden border-[3px] border-border shadow-lg ring-4 ring-primary/5">
        <Avatar class="w-full h-full rounded-none">
          <AvatarImage
            :src="`https://api.dicebear.com/7.x/initials/svg?seed=${displayName}&backgroundColor=09090b&fontFamily=Arial`"
            alt="Profile Picture"
          />
          <AvatarFallback class="text-3xl font-semibold bg-primary text-primary-foreground">
            {{ userInitials }}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>

    <div ref="containerRef" class="space-y-0.5 text-center lg:text-left">
      <VariableProximity
        :label="displayName"
        class-name="variable-proximity-demo text-lg font-semibold text-foreground lg:text-xl"
        from-font-variation-settings="'wght' 400, 'opsz' 9"
        to-font-variation-settings="'wght' 1000, 'opsz' 40"
        :container-ref="containerRef"
        :radius="100"
        falloff="linear"
      />
      <p class="text-muted-foreground font-mono text-sm">
        @{{ username }}
      </p>
    </div>

    <!-- Edit Profile Button -->
    <div class="flex gap-2 w-full">
      <Button class="flex-1 rounded-xl gap-2 shadow-sm hover:shadow-md transition-shadow">
        <Pencil class="h-3.5 w-3.5" />
        Edit Profile
      </Button>
      <component :is="Modal.Root" v-model:open="open">
        <component :is="Modal.Trigger" as-child>
          <Button size="icon" variant="outline" class="h-10 w-10 shrink-0 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <Share2 class="h-4 w-4" /> 
          </Button>
        </component>
      <component
        :is="Modal.Content"
        class="sm:max-w-md" :class="[
        { 'px-2 pb-8 *:px-4': !isDesktop },
        ]"
      >
      <component :is="Modal.Header">
        <component :is="Modal.Title">
          Share Profile
        </component>
        <component :is="Modal.Description">
          Anyone with this link can view this profile.
        </component>
      </component>
      <div class="flex items-center gap-2">
        <div class="grid flex-1 gap-2">
          <Label for="link" class="sr-only">
            Link
          </Label>
          <Input
            id="link"
            default-value="https://www.shadcn-vue.com/docs/installation"
            readonly
          />
        </div>
      </div>
      <component :is="Modal.Footer" class="pt-4">
        <component :is="Modal.Close" as-child>
          <Button variant="outline">
            Close
          </Button>
        </component>
      </component>
    </component>
  </component>
    </div>

    <!-- Beneficiary Badges -->
    <div v-if="is4ps || isPwd" class="flex flex-wrap gap-2">
      <Badge v-if="is4ps" variant="secondary" class="rounded-full font-medium px-3 py-1 border-0">
        4Ps Beneficiary
      </Badge>
      <Badge v-if="isPwd" variant="secondary" class="rounded-full font-medium px-3 py-1 border-0">
        PWD Candidate
      </Badge>
    </div>

    <!-- Social Links -->
    <div class="space-y-2">
      <a
        href="#"
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/40 bg-muted/20 hover:bg-blue-500/5 hover:border-blue-500/30 transition-all duration-200 group cursor-pointer"
      >
        <div class="bg-blue-600/10 dark:bg-blue-500/20 p-1.5 rounded-lg group-hover:scale-105 transition-transform">
          <AtSign class="w-4 h-4 text-red-500 dark:text-red-400" />
        </div>
        <span class="text-sm font-medium text-foreground/80 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          Facebook
        </span>
      </a>
      <a
        :href="`mailto:${email}`"
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/40 bg-muted/20 hover:bg-red-500/5 hover:border-red-500/30 transition-all duration-200 group cursor-pointer"
      >
        <div class="bg-red-500/10 dark:bg-red-500/20 p-1.5 rounded-lg group-hover:scale-105 transition-transform">
          <AtSign class="w-4 h-4 text-red-500 dark:text-red-400" />
        </div>
        <span class="text-sm font-medium text-foreground/80 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors">
          Gmail
        </span>
      </a>
    </div>

    <Separator />

    <!-- Contact Metadata -->
    <ul class="space-y-3 text-sm text-muted-foreground">
      <li class="flex items-center gap-3">
        <MapPin class="w-4 h-4 shrink-0" />
        <span>{{ location }}</span>
      </li>
      <li class="flex items-center gap-3">
        <Mail class="w-4 h-4 shrink-0" />
        <span class="truncate">{{ email }}</span>
      </li>
      <li class="flex items-center gap-3">
        <Phone class="w-4 h-4 shrink-0" />
        <span>{{ phone }}</span>
      </li>
      <li class="flex items-center gap-3">
        <Calendar class="w-4 h-4 shrink-0" />
        <span>Joined {{ joinedDate }}</span>
      </li>
    </ul>
  </div>
</template>
