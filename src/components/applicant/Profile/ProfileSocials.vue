<script setup lang="ts">
import { computed } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { Plus, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import SocialPlatformIcon from './SocialPlatformIcon.vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { useProfileSocials } from '@/composables/applicant/useProfileSocials'

const props = defineProps<{
  profileId?: string | null
  isOwnProfile: boolean
}>()

const {
  displaySocials,
  isLoading,
  isSaving,
  isEditorOpen,
  platformOptions,
  drafts,
  draftErrors,
  showErrors,
  canAddDraft,
  addDraft,
  removeDraft,
  onDraftLinkInput,
  submitDrafts,
} = useProfileSocials(() => props.profileId)

const isDesktop = useMediaQuery('(min-width: 640px)')
const Modal = computed(() => ({
  Root: isDesktop.value ? Dialog : Drawer,
  Content: isDesktop.value ? DialogContent : DrawerContent,
  Header: isDesktop.value ? DialogHeader : DrawerHeader,
  Title: isDesktop.value ? DialogTitle : DrawerTitle,
  Description: isDesktop.value ? DialogDescription : DrawerDescription,
  Footer: isDesktop.value ? DialogFooter : DrawerFooter,
}))
</script>

<template>
  <section v-if="isOwnProfile || isLoading || displaySocials.length" class="space-y-2">
    <div class="flex items-center justify-between gap-2">
      <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Social links</h3>
      <Button
        v-if="isOwnProfile && displaySocials.length"
        variant="link"
        size="sm"
        class="h-auto px-0 text-xs"
        @click="isEditorOpen = true"
      >
        Edit
      </Button>
    </div>

    <div v-if="isLoading && !displaySocials.length" class="space-y-2">
      <Skeleton class="h-9 w-full" />
      <Skeleton class="h-9 w-full" />
    </div>

    <ul v-else-if="displaySocials.length" class="-mx-2 space-y-0.5">
      <li v-for="social in displaySocials" :key="social.id">
        <a
          :href="social.href"
          target="_blank"
          rel="noopener noreferrer"
          class="group flex min-h-9 min-w-0 items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/60"
        >
          <span class="flex shrink-0 items-center gap-2 font-medium text-foreground">
            <SocialPlatformIcon :platform="social.name" />
            {{ social.name }}
          </span>
          <span class="truncate text-muted-foreground group-hover:text-foreground">{{ social.handle }}</span>
        </a>
      </li>
    </ul>

    <Button
      v-else-if="isOwnProfile"
      variant="outline"
      size="sm"
      class="w-full border-dashed"
      @click="isEditorOpen = true"
    >
      Add social links
    </Button>
  </section>

  <component :is="Modal.Root" v-if="isOwnProfile" v-model:open="isEditorOpen">
    <component :is="Modal.Content" class="sm:max-w-lg" :class="{ 'px-2 pb-8 *:px-4': !isDesktop }">
      <component :is="Modal.Header">
        <component :is="Modal.Title">Social links</component>
        <component :is="Modal.Description">
          Shown on your profile. Paste a link and we'll pick the platform for you.
        </component>
      </component>

      <form id="profile-socials-form" class="space-y-4 py-2" novalidate @submit.prevent="submitDrafts">
        <div class="hidden grid-cols-[9rem_1fr_2.25rem] gap-2 sm:grid">
          <Label class="text-xs text-muted-foreground">Platform</Label>
          <Label class="text-xs text-muted-foreground">Link</Label>
        </div>

        <div
          v-for="(draft, index) in drafts"
          :key="draft.id ?? `new-${index}`"
          class="grid grid-cols-[1fr_2.25rem] items-start gap-2 sm:grid-cols-[9rem_1fr_2.25rem]"
        >
          <Select v-model="draft.social_name">
            <SelectTrigger class="w-full" :aria-label="`Platform for link ${index + 1}`">
              <SelectValue>
                <SocialPlatformIcon :platform="draft.social_name" />
                {{ draft.social_name }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="opt in platformOptions" :key="opt" :value="opt">
                <SocialPlatformIcon :platform="opt" />
                {{ opt }}
              </SelectItem>
            </SelectContent>
          </Select>

          <div class="col-span-2 row-start-2 space-y-1 sm:col-span-1 sm:col-start-2 sm:row-start-1">
            <Input
              v-model="draft.social_link"
              type="url"
              inputmode="url"
              autocomplete="url"
              placeholder="facebook.com/yourname"
              :aria-label="`Link ${index + 1}`"
              :aria-invalid="showErrors && !!draftErrors[index]"
              @update:model-value="(value) => onDraftLinkInput(index, String(value))"
            />
            <p v-if="showErrors && draftErrors[index]" class="text-xs text-destructive">{{ draftErrors[index] }}</p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="col-start-2 row-start-1 sm:col-start-3"
            :aria-label="`Remove link ${index + 1}`"
            @click="removeDraft(index)"
          >
            <X class="size-4 shrink-0" />
          </Button>
        </div>

        <p v-if="!drafts.length" class="text-sm text-muted-foreground">
          No links. Saving will remove all social links from your profile.
        </p>

        <Button type="button" variant="outline" size="sm" :disabled="!canAddDraft" @click="addDraft">
          <Plus class="size-4 shrink-0" />
          Add link
        </Button>
      </form>

      <component :is="Modal.Footer" class="pt-2">
        <Button variant="outline" :disabled="isSaving" @click="isEditorOpen = false">Cancel</Button>
        <Button type="submit" form="profile-socials-form" :disabled="isSaving">
          {{ isSaving ? 'Saving…' : 'Save' }}
        </Button>
      </component>
    </component>
  </component>
</template>
