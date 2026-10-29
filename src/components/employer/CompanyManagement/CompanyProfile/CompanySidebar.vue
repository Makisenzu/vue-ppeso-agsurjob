<script setup lang="ts">
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, Camera, ExternalLink, Globe, Loader2, Mail, MapPin, Phone, Trash2 } from '@lucide/vue'

/** Left column of the company profile, styled like the account sidebar (ProfileSidebar.vue). */
const props = defineProps<{
  companyName: string
  companyInitials: string
  logoUrl: string | null
  isUpdatingLogo: boolean
  industry: string
  /** Company status pill (set by Provincial PESO) */
  companyStatus: { label: string; class: string }
  address: string
  email: string
  contact: string
  website: string
  websiteHref: string
  hasWebsite: boolean
  createdDate: string
  isLoading: boolean
}>()

const emit = defineEmits<{
  selectLogo: [event: Event]
  removeLogo: []
}>()

const NOT_SPECIFIED = 'Not specified'
const shows = (value: string) => !!value && value !== NOT_SPECIFIED
</script>

<template>
  <div v-if="props.isLoading" class="flex flex-col space-y-5">
    <Skeleton class="mx-auto aspect-square w-48 rounded-full sm:w-56 lg:mx-0 lg:w-full" />
    <Skeleton class="h-6 w-3/4" />
    <Skeleton class="h-4 w-1/2" />
    <Skeleton class="h-10 w-full" />
  </div>

  <div v-else class="flex flex-col space-y-5">
    <!-- Company logo with owner controls (upload / replace / remove) -->
    <div class="relative mx-auto aspect-square h-48 w-48 sm:h-56 sm:w-56 lg:mx-0 lg:h-auto lg:w-full">
      <Avatar class="h-full w-full border-[3px] border-border bg-background shadow-lg ring-4 ring-primary/5">
        <AvatarImage
          v-if="props.logoUrl"
          :src="props.logoUrl"
          :alt="`Logo of ${props.companyName}`"
          class="object-contain p-4"
        />
        <AvatarFallback class="bg-primary text-4xl font-semibold text-primary-foreground">
          {{ props.companyInitials }}
        </AvatarFallback>
      </Avatar>

      <div v-if="props.isUpdatingLogo" class="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
        <Loader2 class="size-6 animate-spin text-muted-foreground" />
      </div>

      <div class="absolute right-[8%] bottom-[8%] flex gap-1.5">
        <Button
          v-if="props.logoUrl"
          variant="secondary"
          size="icon"
          class="size-9 rounded-full border border-border shadow-md"
          :disabled="props.isUpdatingLogo"
          aria-label="Remove logo"
          @click="emit('removeLogo')"
        >
          <Trash2 class="size-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          class="size-9 rounded-full border border-border shadow-md"
          :disabled="props.isUpdatingLogo"
          as-child
        >
          <label class="cursor-pointer" :aria-label="props.logoUrl ? 'Change logo' : 'Add logo'" :title="props.logoUrl ? 'Change logo' : 'Add logo'">
            <Camera class="size-4" />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="sr-only"
              :disabled="props.isUpdatingLogo"
              @change="emit('selectLogo', $event)"
            />
          </label>
        </Button>
      </div>
    </div>

    <div class="space-y-1 text-center lg:text-left">
      <h1 class="text-lg font-semibold text-foreground lg:text-xl">{{ props.companyName }}</h1>
      <p v-if="shows(props.industry)" class="text-sm text-muted-foreground">{{ props.industry }}</p>
      <div class="flex items-center justify-center gap-2 pt-1 text-xs text-muted-foreground lg:justify-start">
        <Badge variant="outline" :class="props.companyStatus.class">{{ props.companyStatus.label }}</Badge>
      </div>
    </div>

    <Button v-if="props.hasWebsite" variant="outline" class="w-full" as-child>
      <AppLink :href="props.websiteHref" target="_blank" rel="noopener noreferrer">
        <ExternalLink class="size-4" />
        Visit Website
      </AppLink>
    </Button>

    <Separator />

    <ul class="space-y-3 text-sm text-muted-foreground">
      <li v-if="shows(props.address)" class="flex min-w-0 items-start gap-3">
        <MapPin class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span class="sr-only">Address:</span>
        <span class="min-w-0 break-words">{{ props.address }}</span>
      </li>
      <li v-if="shows(props.email)" class="flex min-w-0 items-center gap-3">
        <Mail class="size-4 shrink-0" aria-hidden="true" />
        <span class="sr-only">Email:</span>
        <AppLink :href="`mailto:${props.email}`" class="min-w-0 truncate hover:text-foreground hover:underline" :title="props.email">
          {{ props.email }}
        </AppLink>
      </li>
      <li v-if="shows(props.contact)" class="flex min-w-0 items-center gap-3">
        <Phone class="size-4 shrink-0" aria-hidden="true" />
        <span class="sr-only">Phone:</span>
        <AppLink :href="`tel:${props.contact.replace(/[^\d+]/g, '')}`" class="min-w-0 truncate hover:text-foreground hover:underline">
          {{ props.contact }}
        </AppLink>
      </li>
      <li v-if="props.hasWebsite" class="flex min-w-0 items-center gap-3">
        <Globe class="size-4 shrink-0" aria-hidden="true" />
        <span class="sr-only">Website:</span>
        <AppLink :href="props.websiteHref" target="_blank" rel="noopener noreferrer" class="min-w-0 truncate hover:text-foreground hover:underline">
          {{ props.website }}
        </AppLink>
      </li>
      <li v-if="props.createdDate" class="flex min-w-0 items-center gap-3">
        <Calendar class="size-4 shrink-0" aria-hidden="true" />
        <span>Registered {{ props.createdDate }}</span>
      </li>
    </ul>
  </div>
</template>
