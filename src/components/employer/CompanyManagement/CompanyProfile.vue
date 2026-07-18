<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useCompanyProfile } from '@/composables/useCompanyProfile'
import CustomBreadcrumbs from '@/components/CustomBreadcrumbs.vue'
import CompanyHero from './CompanyProfile/CompanyHero.vue'
import CompanySidebar from './CompanyProfile/CompanySidebar.vue'
import CompanyDetails from './CompanyProfile/CompanyDetails.vue'

const router = useRouter()

const {
  isLoading,
  employer,
  displayCompanyName,
  displayIndustry,
  displayBusinessType,
  displayAddress,
  displayDescription,
  hasDescription,
  displayWebsite,
  hasWebsite,
  displayContact,
  displayEmail,
  displayRegistrationNumber,
  displayEmployeeCount,
  displayVerificationStatus,
  verificationBadgeVariant,
  displayCreatedDate,
  companyInitials,
  ownerDisplayName,
  ownerInitials,
  ownerEmail,
} = useCompanyProfile()

/**
 * Handle edit profile button click
 */
function handleEditProfile() {
  // TODO: Navigate to company edit page or open edit modal
  console.log('Edit profile clicked')
  // router.push({ name: 'company-edit' })
}

/**
 * Handle visit website button click
 */
function handleVisitWebsite(website: string) {
  const url = website.startsWith('http') ? website : `https://${website}`
  window.open(url, '_blank')
}
</script>

<template>
  <div class="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
    <!-- Breadcrumbs -->
    <div>
      <CustomBreadcrumbs />
    </div>

    <!-- Company Profile Grid Layout -->
    <div class="space-y-6">
      <!-- Top Hero Block -->
      <CompanyHero
        :company-name="displayCompanyName"
        :company-initials="companyInitials"
        :industry="displayIndustry"
        :address="displayAddress"
        :verification-status="displayVerificationStatus"
        :verification-badge-variant="verificationBadgeVariant"
        :website="displayWebsite"
        :has-website="hasWebsite"
        :created-date="displayCreatedDate"
        :is-loading="isLoading"
        @edit-profile="handleEditProfile"
        @visit-website="handleVisitWebsite"
      />

      <!-- Content columns -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <!-- Sidebar Info -->
        <div class="lg:col-span-4 lg:sticky lg:top-6">
          <CompanySidebar
            :email="displayEmail"
            :contact="displayContact"
            :website="displayWebsite"
            :has-website="hasWebsite"
            :owner-name="ownerDisplayName"
            :owner-initials="ownerInitials"
            :owner-email="ownerEmail"
            :employee-count="displayEmployeeCount"
            :business-type="displayBusinessType"
            :is-loading="isLoading"
          />
        </div>

        <!-- Main Details Details Block -->
        <div class="lg:col-span-8">
          <CompanyDetails
            :description="displayDescription"
            :has-description="hasDescription"
            :business-type="displayBusinessType"
            :industry="displayIndustry"
            :registration-number="displayRegistrationNumber"
            :employee-count="displayEmployeeCount"
            :verification-status="displayVerificationStatus"
            :verification-badge-variant="verificationBadgeVariant"
            :is-loading="isLoading"
            :latitude="employer?.latitude || null"
            :longitude="employer?.longitude || null"
            :company-name="displayCompanyName"
          />
        </div>
      </div>
    </div>
  </div>
</template>