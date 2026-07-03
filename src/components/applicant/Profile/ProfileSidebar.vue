<script setup lang="ts">
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  MapPin,
  Mail,
  Phone,
  Calendar,
  Pencil,
  AtSign,
} from '@lucide/vue'

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

    <!-- Avatar with subtle ring -->
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

    <!-- Name & Handle -->
    <div class="space-y-0.5 text-center lg:text-left">
      <h1 class="text-xs font-bold tracking-tight text-foreground">
        {{ displayName }}
      </h1>
      <p class="text-muted-foreground font-mono text-sm">
        @{{ username }}
      </p>
    </div>

    <!-- Edit Profile Button -->
    <Button class="w-full rounded-xl gap-2 shadow-sm hover:shadow-md transition-shadow">
      <Pencil class="h-3.5 w-3.5" />
      Edit Profile
    </Button>

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
