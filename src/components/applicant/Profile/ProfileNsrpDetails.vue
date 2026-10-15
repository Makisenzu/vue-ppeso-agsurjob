<script setup lang="ts">
import { computed } from 'vue'
import { Loader2, Pencil } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useApplicantNsrpEditor } from '@/composables/applicant/useApplicantNsrpEditor'
import {
  describeLanguageAbilities,
  formatNsrpDate,
  formatNsrpPeso,
  joinNsrpList,
} from '@/helpers/applicant/nsrpDisplayHelper'
import NsrpPersonalFields from '@/components/applicant/Profile/Nsrp/NsrpPersonalFields.vue'
import NsrpEducationFields from '@/components/applicant/Profile/Nsrp/NsrpEducationFields.vue'
import NsrpExperienceFields from '@/components/applicant/Profile/Nsrp/NsrpExperienceFields.vue'
import NsrpPreferenceFields from '@/components/applicant/Profile/Nsrp/NsrpPreferenceFields.vue'

const {
  sections,
  editingSection,
  record,
  details,
  isLoading,
  isSubmitting,
  isComplete,
  isIncomplete,
  startEdit,
  cancelEdit,
  saveSection,
} = useApplicantNsrpEditor()

interface DetailItem {
  label: string
  value: string
}

const personalItems = computed<DetailItem[]>(() => {
  const d = details.value
  const age = record.value?.age
  return [
    { label: 'Date of birth', value: formatNsrpDate(d.date_of_birth) },
    { label: 'Age', value: age ? `${age} years old` : '' },
    { label: 'Sex', value: d.sex },
    { label: 'Civil status', value: d.civil_status },
    { label: 'Religion', value: d.religion },
    { label: 'Height', value: d.height_ft !== '' ? `${d.height_ft} ft` : '' },
    { label: 'TIN', value: d.tin },
  ]
})

const employmentItems = computed<DetailItem[]>(() => {
  const d = details.value
  const items: DetailItem[] = [{ label: 'Status', value: d.employment_status }]
  if (d.employment_status === 'Employed') {
    items.push({ label: 'Type', value: d.employment_type })
    if (d.employment_type === 'Self-employed') items.push({ label: 'Self-employment', value: d.self_employed_type })
  }
  if (d.employment_status === 'Unemployed') {
    items.push({ label: 'Reason', value: d.unemployed_reason })
    items.push({
      label: 'Looking for work',
      value: d.months_looking_for_work !== '' ? `${d.months_looking_for_work} months` : '',
    })
  }
  return items
})

/** Only the categories that apply, each with its supporting detail. */
const categoryItems = computed<DetailItem[]>(() => {
  const d = details.value
  const items: DetailItem[] = []
  if (d.is_4ps_beneficiary) items.push({ label: '4Ps beneficiary', value: d.household_id_4ps ? `Household ID ${d.household_id_4ps}` : '' })
  if (d.has_disability) items.push({ label: 'Person with disability', value: joinNsrpList(d.disabilities, d.disability_others) })
  if (d.is_ofw) items.push({ label: 'Currently an OFW', value: d.ofw_country })
  if (d.is_former_ofw) {
    const returned = formatNsrpDate(d.former_ofw_return_date)
    items.push({ label: 'Former OFW', value: [d.former_ofw_country, returned && `returned ${returned}`].filter(Boolean).join(', ') })
  }
  return items
})

const preferenceItems = computed<DetailItem[]>(() => {
  const d = details.value
  return [
    { label: 'Preferred occupations', value: d.preferred_occupations },
    { label: 'Job type', value: joinNsrpList(d.job_type_preference) },
    { label: 'Local locations', value: d.preferred_local_locations || 'Open to anywhere' },
    { label: 'Overseas locations', value: d.preferred_overseas_locations },
  ]
})

const languages = computed(() => details.value.language_proficiencies.filter((entry) => describeLanguageAbilities(entry)))
const skills = computed(() => joinNsrpList(details.value.other_skills, details.value.other_skills_specified))
const hasNoWorkExperience = computed(() => Array.isArray(record.value?.work_experiences) && record.value.work_experiences.length === 0)

const tile = 'rounded-lg bg-muted/40 px-3 py-2.5'
const entry = 'space-y-1 rounded-lg bg-muted/40 p-4'
const empty = 'rounded-lg bg-muted/40 px-4 py-5 text-sm text-muted-foreground'
</script>

<template>
  <section aria-labelledby="nsrp-details-heading" class="space-y-4">
    <div class="space-y-1">
      <h2 id="nsrp-details-heading" class="text-base font-semibold text-foreground">NSRP details</h2>
      <p class="text-sm text-muted-foreground">
        <template v-if="isComplete">
          Your National Skills Registration Program record with PESO Agusan del Sur. Keep it current so programs and
          employers match you correctly.
        </template>
        <template v-else>Some sections of your NSRP record still need answers.</template>
      </p>
    </div>

    <div v-if="isLoading && !record" class="space-y-4">
      <Skeleton v-for="n in 4" :key="n" class="h-40 w-full rounded-xl" />
    </div>

    <template v-else>
      <Card v-for="section in sections" :key="section.key" class="gap-0 py-0 shadow-none">
        <CardHeader class="gap-0.5 bg-muted/40 px-5 py-3.5">
          <CardTitle class="text-sm font-semibold">{{ section.title }}</CardTitle>
          <CardDescription class="text-xs">
            <span v-if="isIncomplete(section.key)" class="font-medium text-destructive">Needs answers. </span>
            {{ section.description }}
          </CardDescription>
          <CardAction class="self-center">
            <Button
              v-if="editingSection !== section.key"
              variant="ghost"
              size="sm"
              class="h-8 gap-1.5 px-2.5 text-xs"
              :disabled="editingSection !== null"
              :aria-label="`Edit ${section.title}`"
              @click="startEdit(section.key)"
            >
              <Pencil class="size-3.5 text-muted-foreground" />
              Edit
            </Button>
            <div v-else class="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" class="h-8 px-2.5 text-xs" :disabled="isSubmitting" @click="cancelEdit">
                Cancel
              </Button>
              <Button size="sm" class="h-8 px-3 text-xs" :disabled="isSubmitting" @click="saveSection">
                <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin" />
                {{ isSubmitting ? 'Saving...' : 'Save' }}
              </Button>
            </div>
          </CardAction>
        </CardHeader>

        <!-- ─── Edit mode: the wizard's field sections, flat inside this card ─── -->
        <CardContent
          v-if="editingSection === section.key"
          class="px-5 py-5 animate-in fade-in duration-200 motion-reduce:animate-none **:data-[slot=native-select-wrapper]:w-full!
            max-sm:px-4 max-sm:**:data-[slot=input]:h-11 max-sm:**:data-[slot=native-select]:h-11 max-sm:**:data-[slot=native-select]:text-base"
        >
          <form novalidate class="space-y-6" @submit.prevent="saveSection">
            <NsrpPersonalFields v-if="section.key === 'personal'" flat about-description="Your basic personal details." />
            <NsrpEducationFields v-else-if="section.key === 'education'" flat />
            <NsrpExperienceFields v-else-if="section.key === 'experience'" flat />
            <NsrpPreferenceFields v-else flat />

            <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" class="h-11 sm:h-9" :disabled="isSubmitting" @click="cancelEdit">
                Cancel
              </Button>
              <Button type="submit" class="h-11 sm:h-9" :disabled="isSubmitting">
                <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
                {{ isSubmitting ? 'Saving...' : 'Save changes' }}
              </Button>
            </div>
          </form>
        </CardContent>

        <!-- ─── View mode ─── -->
        <CardContent v-else class="space-y-6 px-5 py-5 max-sm:px-4">
          <!-- Personal & employment -->
          <template v-if="section.key === 'personal'">
            <dl class="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div v-for="item in personalItems" :key="item.label" :class="tile">
                <dt class="text-xs text-muted-foreground">{{ item.label }}</dt>
                <dd class="mt-0.5 text-sm font-medium text-foreground">
                  {{ item.value }}<span v-if="!item.value" class="font-normal text-muted-foreground">Not specified</span>
                </dd>
              </div>
            </dl>

            <div class="space-y-3">
              <h3 class="text-sm font-semibold text-foreground">Employment</h3>
              <dl class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div v-for="item in employmentItems" :key="item.label" :class="tile">
                  <dt class="text-xs text-muted-foreground">{{ item.label }}</dt>
                  <dd class="mt-0.5 text-sm font-medium text-foreground">
                    {{ item.value }}<span v-if="!item.value" class="font-normal text-muted-foreground">Not specified</span>
                  </dd>
                </div>
              </dl>
            </div>

            <div class="space-y-3">
              <h3 class="text-sm font-semibold text-foreground">Special categories</h3>
              <dl v-if="categoryItems.length > 0" class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div v-for="item in categoryItems" :key="item.label" :class="tile">
                  <dt class="text-sm font-medium text-foreground">{{ item.label }}</dt>
                  <dd v-if="item.value" class="mt-0.5 text-sm text-muted-foreground">{{ item.value }}</dd>
                </div>
              </dl>
              <p v-else :class="empty">No special categories declared (4Ps, PWD, OFW).</p>
            </div>
          </template>

          <!-- Education & training -->
          <template v-else-if="section.key === 'education'">
            <div class="space-y-3">
              <h3 class="text-sm font-semibold text-foreground">Educational background</h3>
              <p v-if="details.currently_in_school" class="text-sm text-foreground">Currently enrolled in school.</p>
              <ul v-if="details.educational_background.length > 0" class="space-y-2">
                <li v-for="(edu, index) in details.educational_background" :key="index" :class="entry">
                  <p class="text-sm font-semibold text-foreground">{{ edu.course || edu.level }}</p>
                  <p class="text-sm text-foreground">{{ edu.school }}</p>
                  <p class="text-xs text-muted-foreground">
                    {{
                      [
                        edu.course ? edu.level : '',
                        edu.year_graduated ? `Graduated ${edu.year_graduated}` : edu.undergraduate_level_reached ? `Reached ${edu.undergraduate_level_reached}` : '',
                        edu.awards,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    }}
                  </p>
                </li>
              </ul>
              <p v-else :class="empty">No schools added yet.</p>
            </div>

            <div class="space-y-3">
              <h3 class="text-sm font-semibold text-foreground">Technical / vocational training</h3>
              <ul v-if="details.vocational_trainings.length > 0" class="space-y-2">
                <li v-for="(training, index) in details.vocational_trainings" :key="index" :class="entry">
                  <p class="text-sm font-semibold text-foreground">{{ training.course_training_title }}</p>
                  <p v-if="training.training_institution" class="text-sm text-foreground">{{ training.training_institution }}</p>
                  <p class="text-xs text-muted-foreground">
                    {{ [training.duration, training.certificates_received, training.skills_acquired].filter(Boolean).join(' · ') }}
                  </p>
                </li>
              </ul>
              <p v-else :class="empty">No trainings added.</p>
            </div>

            <div class="space-y-3">
              <h3 class="text-sm font-semibold text-foreground">Eligibility / professional license</h3>
              <ul v-if="details.eligibilities.length > 0" class="space-y-2">
                <li v-for="(eligibility, index) in details.eligibilities" :key="index" :class="entry">
                  <p class="text-sm font-semibold text-foreground">{{ eligibility.eligibility_title }}</p>
                  <p class="text-xs text-muted-foreground">
                    {{
                      [
                        eligibility.rating ? `Rating ${eligibility.rating}%` : '',
                        formatNsrpDate(eligibility.date_of_examination),
                        eligibility.place_of_examination,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    }}
                  </p>
                </li>
              </ul>
              <p v-else :class="empty">No eligibilities added.</p>
            </div>
          </template>

          <!-- Work & skills -->
          <template v-else-if="section.key === 'experience'">
            <div class="space-y-3">
              <h3 class="text-sm font-semibold text-foreground">Work experience</h3>
              <ul v-if="details.work_experiences.length > 0" class="space-y-2">
                <li v-for="(work, index) in details.work_experiences" :key="index" :class="entry">
                  <p class="text-sm font-semibold text-foreground">{{ work.position || 'Position not specified' }}</p>
                  <p class="text-sm text-foreground">
                    {{ work.company_name }}<span v-if="work.address" class="text-muted-foreground">, {{ work.address }}</span>
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {{
                      [
                        work.inclusive_dates,
                        work.number_of_months ? `${work.number_of_months} months` : '',
                        formatNsrpPeso(work.monthly_salary) && `${formatNsrpPeso(work.monthly_salary)} a month`,
                        work.status_of_appointment,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    }}
                  </p>
                </li>
              </ul>
              <p v-else :class="empty">
                {{ hasNoWorkExperience ? 'No work experience yet.' : 'No work experience added.' }}
              </p>
            </div>

            <div class="space-y-3">
              <h3 class="text-sm font-semibold text-foreground">Languages</h3>
              <dl v-if="languages.length > 0" class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div v-for="language in languages" :key="language.language" :class="tile">
                  <dt class="text-sm font-medium text-foreground">{{ language.language }}</dt>
                  <dd class="mt-0.5 text-sm text-muted-foreground">{{ describeLanguageAbilities(language) }}</dd>
                </div>
              </dl>
              <p v-else :class="empty">No languages added.</p>
            </div>

            <div class="space-y-3">
              <h3 class="text-sm font-semibold text-foreground">Skills</h3>
              <p v-if="skills" class="text-sm leading-relaxed text-foreground">{{ skills }}</p>
              <p v-else :class="empty">No skills added.</p>
            </div>
          </template>

          <!-- Job preference -->
          <dl v-else class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div v-for="item in preferenceItems" :key="item.label" :class="tile">
              <dt class="text-xs text-muted-foreground">{{ item.label }}</dt>
              <dd class="mt-0.5 text-sm font-medium text-foreground">
                {{ item.value }}<span v-if="!item.value" class="font-normal text-muted-foreground">Not specified</span>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </template>
  </section>
</template>
