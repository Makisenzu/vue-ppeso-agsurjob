<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabaseClient'
import CustomBreadcrumbs from '@/components/CustomBreadcrumbs.vue'
import { Button } from '@/components/ui/button'
import { FileText, Share2 } from '@lucide/vue'

import ProfileSidebar from '@/components/applicant/Profile/ProfileSidebar.vue'
import ProfileReadme from '@/components/applicant/Profile/ProfileReadme.vue'
import ProfileExperience from '@/components/applicant/Profile/ProfileExperience.vue'
import ProfileFiles from '@/components/applicant/Profile/ProfileFiles.vue'

const authStore = useAuthStore()

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
    <!-- Breadcrumbs & Actions -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <CustomBreadcrumbs />
      <div class="flex items-center gap-3">
        <Button variant="outline" class="gap-2 rounded-xl">
          <FileText class="h-4 w-4" />
          Download Resume
        </Button>
        <Button class="gap-2 rounded-xl shadow-md hover:shadow-lg transition-shadow">
          <Share2 class="h-4 w-4" />
          Share Profile
        </Button>
      </div>
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

        <!-- Profile Summary Card -->
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
            <ProfileFiles />
          </div>
        </div>

      </div>

    </div>
  </div>
</template>