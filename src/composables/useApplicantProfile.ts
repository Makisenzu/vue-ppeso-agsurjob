import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabaseClient'
import type { DocumentFile } from '@/components/applicant/Profile/ProfileFiles.vue'

export function useApplicantProfile() {
  const authStore = useAuthStore()
  const route = useRoute()

  const files = ref<DocumentFile[]>([
    { name: 'NSRP Form', type: 'form', uploaded: true },
    { name: 'Application Form', type: 'application', uploaded: true },
    { name: 'Resume', type: 'resume', uploaded: true },
    { name: 'Birth Certificate', type: 'certificate', uploaded: false },
  ])

  const isLoading = ref(true)
  const fullProfileData = ref<any>(null)
  const applicantData = ref<any>(null)
  const experiences = ref<any[]>([])
  const skills = ref<any[]>([])

  const displayEmail = computed(() => authStore.userEmail || 'candidate@example.com')
  const displayName = computed(() => authStore.displayName)
  const userInitials = computed(() => authStore.userInitials)
  const displayUsername = computed(() => fullProfileData.value?.username || 'candidate')
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

  const displaySkills = computed(() => {
    if (skills.value.length > 0) return skills.value.map((skill: any) => skill.skill_name)
    return ['Vue.js', 'JavaScript', 'TypeScript', 'Tailwind CSS', 'Node.js', 'Git', 'REST APIs', 'Supabase']
  })

  async function fetchApplicantProfile() {
    const routeUsername = String(route.params.username ?? '')
    if (!routeUsername) return

    try {
      isLoading.value = true

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', routeUsername)
        .maybeSingle()

      if (!prof) return

      fullProfileData.value = prof

      const { data: applicant } = await supabase
        .from('applicants')
        .select('*')
        .eq('profile_id', prof.id)
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

  return {
    files,
    isLoading,
    fullProfileData,
    applicantData,
    displayEmail,
    displayName,
    userInitials,
    displayUsername,
    displayPhone,
    displayLocation,
    displayBio,
    displayJoinedDate,
    displayPreferredJob,
    displayEmploymentStatus,
    displayExpectedSalary,
    displayExperienceYears,
    displayEducationLevel,
    displayCourse,
    is4ps,
    isPwd,
    displayExperiences,
    displaySkills,
  }
}