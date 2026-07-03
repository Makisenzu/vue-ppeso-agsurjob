<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabaseClient'
import CustomBreadcrumbs from '@/components/CustomBreadcrumbs.vue'
import { Check, X } from '@lucide/vue'
import {
  Stepper,
  StepperItem,
  StepperSeparator,
  StepperTrigger,
  StepperTitle,
  StepperDescription,
} from '@/components/ui/stepper'

import ProfileSidebar from '@/components/applicant/Profile/ProfileSidebar.vue'
import ProfileReadme from '@/components/applicant/Profile/ProfileReadme.vue'
import ProfileExperience from '@/components/applicant/Profile/ProfileExperience.vue'
import ProfileFiles, { type DocumentFile } from '@/components/applicant/Profile/ProfileFiles.vue'

const authStore = useAuthStore()

// ─── File Upload State ───
const files = ref<DocumentFile[]>([
  { name: 'NSRP Form', type: 'form', uploaded: true },
  { name: 'Application Form', type: 'application', uploaded: true },
  { name: 'Resume', type: 'resume', uploaded: true },
  { name: 'Birth Certificate', type: 'certificate', uploaded: false },
])

// ─── State ───
const isLoading = ref(true)
const fullProfileData = ref<any>(null)
const applicantData = ref<any>(null)
const experiences = ref<any[]>([])
const skills = ref<any[]>([])

// ─── Data Fetching ───
async function fetchApplicantProfile() {
  if (!authStore.user) return

  try {
    isLoading.value = true

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authStore.user.id)
      .maybeSingle()

    if (prof) fullProfileData.value = prof

    const { data: applicant } = await supabase
      .from('applicants')
      .select('*')
      .eq('profile_id', authStore.user.id)
      .maybeSingle()

    if (applicant) {
      applicantData.value = applicant

      const { data: expData } = await supabase
        .from('applicant_experiences')
        .select('*')
        .eq('applicant_id', applicant.id)
      if (expData) experiences.value = expData

      const { data: skillData } = await supabase
        .from('applicant_skills')
        .select('*')
        .eq('applicant_id', applicant.id)
      if (skillData) skills.value = skillData
    }
  } catch (error) {
    console.error('Error fetching applicant data:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await authStore.init()
  await fetchApplicantProfile()
})

// ─── Computed Display Values (with fallbacks) ───
const displayEmail = computed(() => authStore.userEmail || 'candidate@example.com')
const displayUsername = computed(() => displayEmail.value.split('@')[0])
const displayPhone = computed(() => fullProfileData.value?.contact_number || '0912 345 6789')
const displayLocation = computed(() => fullProfileData.value?.current_address || 'Agusan del Sur, Philippines')
const displayBio = computed(() =>
  'Passionate and results-driven professional dedicated to delivering high-quality work. Experienced in collaborating with cross-functional teams to build efficient solutions.'
)
const displayJoinedDate = computed(() =>
  new Date(authStore.user?.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
)

const displayPreferredJob = computed(() => applicantData.value?.preferred_job || 'Software Engineer / Web Developer')
const displayEmploymentStatus = computed(() => applicantData.value?.employment_status || 'Available for Work')
const displayExpectedSalary = computed(() => {
  if (applicantData.value?.expected_salary) {
    return `₱${applicantData.value.expected_salary.toLocaleString()}`
  }
  return '₱35,000 - ₱45,000'
})
const displayExperienceYears = computed(() => {
  if (applicantData.value?.years_experience !== undefined && applicantData.value?.years_experience !== null) {
    return `${applicantData.value.years_experience} Years`
  }
  return '3 Years'
})
const displayEducationLevel = computed(() => applicantData.value?.education_level || 'Bachelor\'s Degree')
const displayCourse = computed(() => applicantData.value?.course || 'Information Technology')

const is4ps = computed(() => fullProfileData.value?.is_4ps ?? false)
const isPwd = computed(() => fullProfileData.value?.is_pwd ?? false)

// ─── Experience list (DB or fallback) ───
const displayExperiences = computed(() => {
  if (experiences.value.length > 0) return experiences.value
  return [
    {
      job_title: 'Frontend Developer',
      company_name: 'TechSolutions Inc.',
      start_date: '2024-01',
      end_date: 'Present',
      description: 'Developed responsive user interfaces using Vue.js, Vuex, and Tailwind CSS. Collaborative partner in agile workflows.'
    },
    {
      job_title: 'Junior Web Developer',
      company_name: 'DevCraft Studio',
      start_date: '2022-06',
      end_date: '2023-12',
      description: 'Designed interactive web prototypes and handled API integration with RESTful endpoints.'
    }
  ]
})

// ─── Skills list (DB or fallback) ───
const displaySkills = computed(() => {
  if (skills.value.length > 0) return skills.value.map((s: any) => s.skill_name)
  return ['Vue.js', 'JavaScript', 'TypeScript', 'Tailwind CSS', 'Node.js', 'Git', 'REST APIs', 'Supabase']
})
</script>

<template>
  <div class="flex-1 space-y-6 w-full max-w-7xl mx-auto">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <CustomBreadcrumbs />
    </div>

    <!-- Main Grid -->
    <div class="grid gap-6 md:grid-cols-7 lg:grid-cols-12">

      <!-- Left Sidebar -->
      <div class="md:col-span-2 lg:col-span-3">
        <ProfileSidebar
          :display-name="authStore.displayName"
          :user-initials="authStore.userInitials"
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

      <!-- Right Content Area -->
      <div class="md:col-span-5 lg:col-span-9 space-y-6">

        <!-- Document Upload Progress Stepper -->
        <div class="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h3 class="text-sm font-semibold text-foreground">Document Upload Progress</h3>
              <p class="text-xs text-muted-foreground mt-0.5">Please ensure all required documents are uploaded to complete your profile.</p>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              {{ files.filter(f => f.uploaded).length }} / {{ files.length }} Uploaded
            </span>
          </div>

          <Stepper class="flex w-full items-start gap-4">
            <StepperItem
              v-for="(file, index) in files"
              :key="file.name"
              :step="index + 1"
              class="relative flex flex-1 flex-col items-center group"
            >
              <StepperSeparator
                v-if="index !== files.length - 1"
                class="absolute left-[calc(50%+20px)] right-[calc(-50%+20px)] top-4 block h-0.5 shrink-0 rounded-full transition-colors duration-300"
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

                <div class="mt-3">
                  <StepperTitle class="text-xs font-semibold text-foreground">
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
          :preferred-job="displayPreferredJob"
          :experience-years="displayExperienceYears"
          :expected-salary="displayExpectedSalary"
          :verified-status="authStore.profile?.status || 'Pending'"
          :education-level="displayEducationLevel"
          :course="displayCourse"
          :skills="displaySkills"
          :bio="displayBio"
        />

        <!-- Bottom Grid: Work Experience + My Files -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div class="lg:col-span-7">
            <ProfileExperience :experiences="displayExperiences" />
          </div>
          <div class="lg:col-span-5">
            <ProfileFiles :files="files" />
          </div>
        </div>

      </div>

    </div>
  </div>
</template>