<script setup lang="ts">
import { useApplicantProfile } from '@/composables/applicant/useApplicantProfile'
import CustomBreadcrumbs from '@/components/CustomBreadcrumbs.vue'
import ProfileDocuments from './ProfileDocuments.vue'
import ProfileSidebar from '@/components/applicant/Profile/ProfileSidebar.vue'
import ProfileNsrpDetails from '@/components/applicant/Profile/ProfileNsrpDetails.vue'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'

const {
  files,
  isOwnProfile,
  isNotFound,
  ownUsername,
  displayName,
  userInitials,

  displayEmail,
  displayUsername,
  displayPhone,
  displayLocation,
  displayBio,
  displayJoinedDate,
  displayEmploymentStatus,
  displayRequirements,
  
  is4ps,
  isPwd,
  hasRequirements,
  media,
  profileId,
} = useApplicantProfile()
</script>

<template>
  <div class="flex-1 w-full min-w-0 max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
    <div class="mb-4 sm:mb-6">
      <CustomBreadcrumbs />
    </div>

    <Empty v-if="isNotFound" class="border border-dashed">
      <EmptyHeader>
        <EmptyTitle>Profile not found</EmptyTitle>
        <EmptyDescription>
          No one uses this username. The link may be old — the username might have been changed.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent v-if="ownUsername">
        <Button as-child>
          <AppLink :to="{ name: 'profile', params: { username: ownUsername } }">Go to my profile</AppLink>
        </Button>
      </EmptyContent>
    </Empty>

    <div v-else class="grid gap-6 grid-cols-1 lg:grid-cols-12">

      <div class="min-w-0 lg:col-span-3">
        <div class="lg:sticky lg:top-6">
            <ProfileSidebar
            :display-name="displayName"
            :user-initials="userInitials"
            :username="displayUsername"
            :bio="displayBio"
            :email="displayEmail"
            :phone="displayPhone"
            :location="displayLocation"
            :joined-date="displayJoinedDate"
            :employment-status="displayEmploymentStatus"
            :is4ps="is4ps"
            :is-pwd="isPwd"
            :media="media"
            :profile-id="profileId"
            :is-own-profile="isOwnProfile"
          />
        </div>
      </div>

      <div class="min-w-0 lg:col-span-9 space-y-6">
        <div class="space-y-4">
          <ProfileDocuments
            :files="files"
            :requirements="displayRequirements"
            :has-requirements="hasRequirements"
          />
        </div>

        <ProfileNsrpDetails v-if="isOwnProfile" />
      </div>
    </div>
  </div>
</template>