<script setup lang="ts">
import { useApplicantProfile } from '@/composables/useApplicantProfile'
import CustomBreadcrumbs from '@/components/CustomBreadcrumbs.vue'
import ProfileDocuments from './ProfileDocuments.vue'
import ProfileSidebar from '@/components/applicant/Profile/ProfileSidebar.vue'

const {
  files,
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
} = useApplicantProfile()
</script>

<template>
  <div class="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="mb-6">
      <CustomBreadcrumbs />
    </div>

    <div class="grid gap-6 grid-cols-1 lg:grid-cols-12">

      <div class="lg:col-span-3">
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
          />
        </div>
      </div>

      <div class="lg:col-span-9 space-y-6">
        <div class="space-y-4">
          <ProfileDocuments
            :files="files"
            :requirements="displayRequirements"
            :has-requirements="hasRequirements"
          />        
        </div>
      </div>
    </div>
  </div>
</template>