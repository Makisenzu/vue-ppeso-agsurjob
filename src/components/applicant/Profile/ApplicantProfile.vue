<script setup lang="ts">
import { useApplicantProfile } from '@/composables/useApplicantProfile'
import CustomBreadcrumbs from '@/components/CustomBreadcrumbs.vue'
import { Check, X, FolderCode } from '@lucide/vue'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'

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
          <Card v-if="hasRequirements" class="border-none shadow-sm">
            <CardContent class="space-y-4 px-6 py-5">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-sm font-semibold text-foreground">Uploaded Requirements</h3>
                  <p class="text-xs text-muted-foreground mt-0.5">These are the requirements currently uploaded to your profile.</p>
                </div>
                <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 w-fit">
                  {{ displayRequirements.length }} Uploaded
                </span>
              </div>

              <ul class="grid gap-2 sm:grid-cols-2">
                <li
                  v-for="requirement in displayRequirements"
                  :key="requirement"
                  class="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground"
                >
                  <FolderCode class="size-4 text-muted-foreground" />
                  <span class="truncate">{{ requirement }}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Empty v-else>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FolderCode />
              </EmptyMedia>
            <EmptyTitle>No requirements uploaded yet</EmptyTitle>
            <EmptyDescription>
              Get started by uploading your required documents.
            </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button>Upload requirements</Button>
            </EmptyContent>
          </Empty>
        </div>

        <!-- <ProfileReadme
          :username="displayUsername"
          :bio="displayBio"
        /> -->

        <!-- <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProfileExperience
            v-if="hasExperiences"
            :experiences="displayExperiences"
          />

          <Card v-else class="border-none shadow-sm">
            <CardContent class="flex items-center justify-center px-6 py-10 text-center">
              <p class="text-sm text-muted-foreground">
                No work experience added yet.
              </p>
            </CardContent>
          </Card>

          <ProfileSkillsEducation
            v-if="hasSkills"
            :skills="displaySkills"
            :education-level="displayEducationLevel || 'No education level added yet.'"
            :course="displayCourse || 'No course added yet.'"
          />

          <Card v-else class="border-none shadow-sm">
            <CardContent class="flex items-center justify-center px-6 py-10 text-center">
              <p class="text-sm text-muted-foreground">
                No skills or education details added yet.
              </p>
            </CardContent>
          </Card>
        </div> -->

      </div>

    </div>
  </div>
</template>