<script setup lang="ts">
import { computed, ref } from 'vue'
import VariableProximity from '@/components/ui/variable-proximity/VariableProximity.vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useToastAlert } from '@/composables/useToastAlert'
import { HoverCard, HoverCardTrigger, } from '@/components/ui/hover-card'
import ProfileEdit from './ProfileEdit.vue'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMediaQuery } from '@vueuse/core'  
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
  AtSign,
  Share2,
  Upload,
} from '@lucide/vue'

import { useProfileMedia } from '@/composables/useProfileMedia'
const isDesktop = useMediaQuery('(min-width: 640px)')
const toastAlert = useToastAlert()
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
const containerRef = ref<HTMLElement | null>(null)

const props = defineProps<{
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
  media?: any[]
}>()

const { isUploading, handleUpload, createAvatarSource } = useProfileMedia()
const { avatarSrc } = createAvatarSource(() => props.displayName, () => props.media)

const onFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    try {
      await handleUpload(file, avatarSrc.value)
      toastAlert.success('Profile picture updated successfully')
    } catch (err: any) {
      toastAlert.error(err.message || 'Failed to upload profile picture')
    }
  }
}

const profileShareUrl = computed(() => {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const safeUsername = encodeURIComponent(props.username || '')
  return `${origin}/app/profile/${safeUsername}`
})
</script>

<template>
  <div class="flex flex-col space-y-5">
    <div class="relative w-48 h-48 sm:w-56 sm:h-56 lg:w-full lg:h-auto aspect-square mx-auto lg:mx-0 group/avatar">
      <div class="w-full h-full rounded-full overflow-hidden border-[3px] border-border shadow-lg ring-4 ring-primary/5 relative">
        <Avatar class="w-full h-full rounded-none relative">
          <AvatarImage
            :src="avatarSrc"
            alt="Profile Picture"
            class="object-cover w-full h-full"
          />
          <AvatarFallback class="text-3xl font-semibold bg-primary text-primary-foreground">
            {{ props.userInitials }}
          </AvatarFallback>

          <!-- Upload overlay wrapped inside Avatar component -->
          <label 
            for="avatar-upload" 
            class="absolute inset-0 bg-black/50 hover:bg-black/70 flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 cursor-pointer rounded-full z-20"
          >
            <div class="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white transition-all duration-200 shadow-inner">
              <Upload class="w-6 h-6" />
            </div>
            <span class="text-xs text-white mt-2 font-medium tracking-wide">Upload Photo</span>
          </label>
        </Avatar>

        <input 
          id="avatar-upload" 
          type="file" 
          accept="image/jpeg,image/png,image/webp" 
          class="hidden" 
          @change="onFileChange"
          :disabled="isUploading"
        />

        <!-- Loading spinner over the entire container -->
        <div v-if="isUploading" class="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-full flex flex-col items-center justify-center z-10">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span class="text-xs font-medium text-muted-foreground mt-2">Uploading...</span>
        </div>
      </div>
    </div>

    <div ref="containerRef" class="space-y-0.5 text-center lg:text-left">
      <VariableProximity
        :label="props.displayName"
        class-name="variable-proximity-demo text-lg font-semibold text-foreground lg:text-xl"
        from-font-variation-settings="'wght' 400, 'opsz' 9"
        to-font-variation-settings="'wght' 1000, 'opsz' 40"
        :container-ref="containerRef"
        :radius="100"
        falloff="linear"
      />
      <p class="text-muted-foreground font-mono text-sm">
        @{{ props.email.split('@')[0] }}
      </p>
    </div>

    <!-- Edit Profile Button -->
    <div class="flex gap-2 w-full">
        <ProfileEdit />
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
            :model-value="profileShareUrl"
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
    <div v-if="props.is4ps || props.isPwd" class="flex flex-wrap gap-2">
      <Badge v-if="props.is4ps" variant="secondary" class="rounded-full font-medium px-3 py-1 border-0">
        4Ps Beneficiary
      </Badge>
      <Badge v-if="props.isPwd" variant="secondary" class="rounded-full font-medium px-3 py-1 border-0">
        PWD Candidate
      </Badge>
    </div>
<div class="space-y-2">
  <HoverCard>
    <HoverCardTrigger as-child>
      <a
        href="#"
        class="flex items-center gap-2 px-1 py-2.5 group cursor-pointer"
      >
        <div>
          <AtSign class="w-4 h-4 text-red-500 dark:text-red-400" />
        </div>
        <span class="text-sm font-medium text-foreground/80 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          Facebook
        </span>
      </a>
    </HoverCardTrigger>
  </HoverCard>

  <HoverCard>
    <HoverCardTrigger as-child>
      <a
        :href="`mailto:${props.email}`"
        class="flex items-center gap-2 px-1 py-2.5 group cursor-pointer"
      >
        <div>
          <AtSign class="w-4 h-4 text-red-500 dark:text-red-400" />
        </div>
        <span class="text-sm font-medium text-foreground/80 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors">
          Gmail
        </span>
      </a>
    </HoverCardTrigger>
  </HoverCard>

</div>

    <Separator />

    <!-- Contact Metadata -->
    <ul class="space-y-3 text-sm text-muted-foreground">
      <li class="flex items-center gap-3">
        <MapPin class="w-4 h-4 shrink-0" />
        <span>{{ props.location }}</span>
      </li>
      <li class="flex items-center gap-3">
        <Mail class="w-4 h-4 shrink-0" />
        <span class="truncate">{{ props.email }}</span>
      </li>
      <li class="flex items-center gap-3">
        <Phone class="w-4 h-4 shrink-0" />
        <span>{{ props.phone }}</span>
      </li>
      <li class="flex items-center gap-3">
        <Calendar class="w-4 h-4 shrink-0" />
        <span>Joined {{ props.joinedDate }}</span>
      </li>
    </ul>
  </div>
</template>
