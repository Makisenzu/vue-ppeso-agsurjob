<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import CustomBreadcrumbs from '@/components/CustomBreadcrumbs.vue'
import ProfileSidebar from '@/components/applicant/Profile/ProfileSidebar.vue'
import { useEmployerAccount } from '@/composables/employer/useEmployerAccount'

const {
  displayName,
  userInitials,
  username,
  email,
  phone,
  location,
  joinedDate,
  media,
  profileId,
  accountDetails,
  companyName,
  form2Status,
  form2StatusClass,
} = useEmployerAccount()
</script>

<template>
  <!-- Same layout as the applicant profile (ApplicantProfile.vue), without the documents stepper -->
  <div class="mx-auto w-full min-w-0 max-w-7xl flex-1 px-0 sm:px-6 lg:px-8">
    <div class="mb-4 sm:mb-6">
      <CustomBreadcrumbs />
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div class="min-w-0 lg:col-span-3">
        <div class="lg:sticky lg:top-6">
          <ProfileSidebar
            :display-name="displayName"
            :user-initials="userInitials"
            :username="username"
            bio=""
            :email="email"
            :phone="phone"
            :location="location"
            :joined-date="joinedDate"
            employment-status=""
            :is4ps="false"
            :is-pwd="false"
            :media="media"
            :profile-id="profileId"
            :is-own-profile="true"
            hide-share
          />
        </div>
      </div>

      <div class="min-w-0 space-y-6 lg:col-span-9">
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>Your personal sign-in account. Use Edit Profile to change these details.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <div v-for="row in accountDetails" :key="row.label" class="min-w-0">
                <dt class="text-xs text-muted-foreground">{{ row.label }}</dt>
                <dd class="truncate text-sm font-medium text-foreground" :title="row.value">{{ row.value || '—' }}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Company</CardTitle>
            <CardDescription>The establishment this account manages.</CardDescription>
          </CardHeader>
          <CardContent class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0 space-y-1">
              <p class="truncate text-sm font-medium text-foreground">{{ companyName || '—' }}</p>
              <div class="flex items-center gap-2 text-xs text-muted-foreground">
                NSRP Form 2
                <Badge variant="outline" :class="form2StatusClass">{{ form2Status }}</Badge>
              </div>
            </div>
            <Button variant="outline" as-child>
              <AppLink :to="{ name: 'company-profile' }">View company profile</AppLink>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
