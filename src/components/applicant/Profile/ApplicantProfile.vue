<script setup lang="ts">
import { useApplicantProfile } from '@/composables/useApplicantProfile'
import CustomBreadcrumbs from '@/components/CustomBreadcrumbs.vue'
import { Check, X } from '@lucide/vue'
import ProfileReadme from './ProfileReadme.vue'

import {
  Stepper,
  StepperItem,
  StepperSeparator,
  StepperTrigger,
  StepperTitle,
  StepperDescription,
} from '@/components/ui/stepper'

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
  
  is4ps,
  isPwd,
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
          />
        </div>
      </div>

      <div class="lg:col-span-9 space-y-6">

        <div class="space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 class="text-sm font-semibold text-foreground">Document Upload Progress</h3>
              <p class="text-xs text-muted-foreground mt-0.5">Please ensure all required documents are uploaded to verify your profile.</p>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 w-fit">
              {{ files.filter(f => f.uploaded).length }} / {{ files.length }} Uploaded
            </span>
          </div>

          <Stepper class="flex w-full items-start gap-2 overflow-x-auto pb-2">
            <StepperItem
              v-for="(file, index) in files"
              :key="file.name"
              :step="index + 1"
              class="relative flex min-w-32 flex-1 flex-col items-center group"
            >
              <StepperSeparator
                v-if="index !== files.length - 1"
                class="absolute left-[calc(50%+18px)] right-[calc(-50%+18px)] top-4 hidden sm:block h-0.5 shrink-0 rounded-full transition-colors duration-300"
                :class="file.uploaded ? 'bg-emerald-500' : 'bg-muted'"
              />

              <div class="flex flex-col items-center text-center">
                <StepperTrigger as-child>
                  <div
                    class="z-10 size-9 shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-300"
                    :class="[
                      file.uploaded
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-500/30'
                        : 'border-red-500 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 dark:border-red-500/30'
                    ]"
                  >
                    <Check v-if="file.uploaded" class="size-4 stroke-3" />
                    <X v-else class="size-4 stroke-3" />
                  </div>
                </StepperTrigger>

                <div class="mt-2">
                  <StepperTitle class="text-xs font-semibold text-foreground truncate max-w-28">
                    {{ file.name }}
                  </StepperTitle>
                  <StepperDescription
                    class="text-[10px] mt-0.5 font-medium"
                    :class="file.uploaded ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'"
                  >
                    {{ file.uploaded ? 'Uploaded' : 'Pending' }}
                  </StepperDescription>
                </div>
              </div>
            </StepperItem>
          </Stepper>
        </div>

        <ProfileReadme
          :username="displayUsername"
          :bio="displayBio"
        />

        <!-- Bottom Grid: Work Experience + My Files -->
        <!-- <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          <div class="md:col-span-1 lg:col-span-7">
            <ProfileExperience :experiences="displayExperiences" />
          </div>
          <div class="md:col-span-1 lg:col-span-5">
            <ProfileFiles :files="files" />
          </div>
        </div> -->

      </div>

    </div>
  </div>
</template>