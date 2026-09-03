import { computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useApplicantEntryStore } from '@/stores/peso/provincialPeso/applicantEntryStore'
import {
  computeApplicantStats,
  exportApplicantsToCsv,
  formatDateDisplay,
  getInitials,
} from '@/helpers/peso/provincialPeso/applicantEntryHelper'
import type { ApplicantEntryRecord, ApplicantStatsSummary } from '@/types/peso/provincialPeso/applicantEntry'

export function useApplicantEntry() {
  const store = useApplicantEntryStore()

  const {
    applicants,
    isLoading,
    selectedApplicant,
    isDetailsModalOpen,
    searchQuery,
    selectedGenderFilter,
    selectedEmploymentStatusFilter,
    selected4psFilter,
    selectedPwdFilter,
    selectedMunicipalityFilter,
    currentPage,
    pageSize,
  } = storeToRefs(store)

  const { fetchApplicants, openDetails, closeDetails, resetFilters } = store

  // ─── Available Municipalities for Filter ───
  const availableMunicipalities = computed<string[]>(() => {
    const set = new Set<string>()
    for (const record of applicants.value) {
      if (record.address.municipality && record.address.municipality !== 'N/A') {
        set.add(record.address.municipality)
      }
    }
    return Array.from(set).sort()
  })

  // ─── Filtered Applicants ───
  const filteredApplicants = computed<ApplicantEntryRecord[]>(() => {
    const q = searchQuery.value.trim().toLowerCase()
    const gender = selectedGenderFilter.value
    const empStatus = selectedEmploymentStatusFilter.value
    const is4ps = selected4psFilter.value
    const isPwd = selectedPwdFilter.value
    const muni = selectedMunicipalityFilter.value

    return applicants.value.filter((a) => {
      // Search query filter
      if (q) {
        const nameMatch = a.fullName.toLowerCase().includes(q)
        const emailMatch = a.email ? a.email.toLowerCase().includes(q) : false
        const contactMatch = a.contactNumber ? a.contactNumber.toLowerCase().includes(q) : false
        const muniMatch = a.address.municipality.toLowerCase().includes(q)
        const brgyMatch = a.address.barangay.toLowerCase().includes(q)
        const courseMatch = a.highestEducationalAttainment.toLowerCase().includes(q)
        const occMatch = a.preferredOccupations.some((occ) => occ.toLowerCase().includes(q))
        const skillsMatch = a.otherSkills.some((s) => s.toLowerCase().includes(q))

        if (
          !nameMatch &&
          !emailMatch &&
          !contactMatch &&
          !muniMatch &&
          !brgyMatch &&
          !courseMatch &&
          !occMatch &&
          !skillsMatch
        ) {
          return false
        }
      }

      // Gender filter
      if (gender !== 'ALL') {
        const rawSex = a.sex.toLowerCase()
        if (gender === 'Male' && !rawSex.startsWith('m')) return false
        if (gender === 'Female' && (!rawSex.startsWith('f') && rawSex !== 'woman')) return false
      }

      // Employment Status filter
      if (empStatus !== 'ALL') {
        const rawEmp = a.employmentStatus.toLowerCase()
        if (empStatus === 'Employed' && (!rawEmp.includes('employed') || rawEmp.includes('unemployed'))) {
          return false
        }
        if (empStatus === 'Unemployed' && !rawEmp.includes('unemployed')) {
          return false
        }
        if (empStatus === 'Self-Employed' && !rawEmp.includes('self')) {
          return false
        }
      }

      // 4Ps Filter
      if (is4ps !== 'ALL') {
        if (is4ps === 'YES' && !a.is4psBeneficiary) return false
        if (is4ps === 'NO' && a.is4psBeneficiary) return false
      }

      // PWD Filter
      if (isPwd !== 'ALL') {
        if (isPwd === 'YES' && !a.hasDisability) return false
        if (isPwd === 'NO' && a.hasDisability) return false
      }

      // Municipality Filter
      if (muni !== 'ALL') {
        if (a.address.municipality.toLowerCase() !== muni.toLowerCase()) return false
      }

      return true
    })
  })

  // ─── Pagination ───
  const totalPages = computed<number>(() => {
    const count = Math.ceil(filteredApplicants.value.length / pageSize.value)
    return count > 0 ? count : 1
  })

  const paginatedApplicants = computed<ApplicantEntryRecord[]>(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return filteredApplicants.value.slice(start, start + pageSize.value)
  })

  // Automatically adjust current page if total pages shrink
  watch([filteredApplicants, totalPages], () => {
    if (currentPage.value > totalPages.value) {
      currentPage.value = 1
    }
  })

  // ─── Stats Summary ───
  const statsSummary = computed<ApplicantStatsSummary>(() => {
    return computeApplicantStats(applicants.value)
  })

  // ─── Actions ───
  const refreshApplicants = () => {
    fetchApplicants(true)
  }

  const exportCsv = () => {
    exportApplicantsToCsv(filteredApplicants.value, selectedEmploymentStatusFilter.value)
  }

  onMounted(() => {
    fetchApplicants()
  })

  return {
    applicants,
    filteredApplicants,
    paginatedApplicants,
    availableMunicipalities,
    totalPages,
    statsSummary,
    selectedApplicant,
    isDetailsModalOpen,
    isLoading,
    searchQuery,
    selectedGenderFilter,
    selectedEmploymentStatusFilter,
    selected4psFilter,
    selectedPwdFilter,
    selectedMunicipalityFilter,
    currentPage,
    pageSize,
    openDetails,
    closeDetails,
    resetFilters,
    refreshApplicants,
    exportCsv,
    getInitials,
    formatDateDisplay,
  }
}
