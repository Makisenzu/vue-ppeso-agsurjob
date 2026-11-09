<script setup lang="ts">
// ApplicantNewEntry.vue — step 1: personal information and residential address
import ReferencePicker from '@/components/ReferencePicker.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { MapPin, Plus, X } from '@lucide/vue'
import { useApplicantNewEntryPageContext } from '@/composables/peso/provincialPeso/applicantNewEntryPageContext'

const {
  currentStep,
  psgcProvinces,
  psgcCities,
  psgcBarangays,
  selectedRegion,
  selectedProvince,
  selectedCity,
  selectedBarangay,
  onProvinceChange,
  onCityChange,
  onBarangayChange,
  firstName,
  middleName,
  surname,
  suffix,
  dateOfBirthFormatted,
  onDobInput,
  age,
  sex,
  civilStatus,
  religion,
  religionOptions,
  isLoadingReferenceLists,
  formResetCount,
  heightFt,
  tin,
  primaryContactNumber,
  additionalContactNumbers,
  newAdditionalContact,
  email,
  street,
  village,
  addContactNumber,
  removeContactNumber,
} = useApplicantNewEntryPageContext()
</script>

<template>
  <Card v-show="currentStep === 1" class="border shadow-xs">
    <CardHeader class="pb-4 border-b bg-muted/20">
      <CardTitle class="text-base font-semibold flex items-center gap-2">
        <span>Step 1: Personal Information & Permanent Address</span>
      </CardTitle>
      <CardDescription class="text-xs">
        Primary identification, birth records, and residential address details.
      </CardDescription>
    </CardHeader>
    <CardContent class="p-5 space-y-5 text-xs">
      <!-- Full Name Section (NSRP Standard: Surname, First Name, Middle Name, Suffix) -->
      <div class="space-y-2">
        <label class="font-semibold text-foreground text-xs">Full Name</label>
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">Surname (Apelyido) <span class="text-destructive">*</span></span>
            <Input v-model="surname" placeholder="e.g. Dela Cruz" class="h-9 text-xs" autocomplete="family-name" />
          </div>
          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">First Name (Pangalan) <span class="text-destructive">*</span></span>
            <Input v-model="firstName" placeholder="e.g. Juan" class="h-9 text-xs" autocomplete="given-name" />
          </div>
          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">Middle Name (Gitnang Pangalan)</span>
            <Input v-model="middleName" placeholder="e.g. Santos" class="h-9 text-xs" autocomplete="additional-name" />
          </div>
          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">Suffix</span>
            <Input v-model="suffix" placeholder="e.g. Jr., III" class="h-9 text-xs" />
          </div>
        </div>
      </div>

      <!-- Birth & Demographics -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-muted-foreground">Date of Birth <span class="text-destructive">*</span></span>
            <span class="text-[10px] text-muted-foreground/70 font-mono">MM/DD/YYYY</span>
          </div>
          <Input
            :model-value="dateOfBirthFormatted"
            type="text"
            inputmode="numeric"
            maxlength="10"
            placeholder="MM/DD/YYYY"
            class="h-9 text-xs font-mono"
            @input="onDobInput"
          />
        </div>
        <div class="space-y-1">
          <span class="text-[11px] text-muted-foreground">Age (years)</span>
          <Input v-model.number="age" type="number" placeholder="Calculated" class="h-9 text-xs" />
        </div>
        <div class="space-y-1">
          <span class="text-[11px] text-muted-foreground">Sex / Gender</span>
          <select
            v-model="sex"
            class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
        <div class="space-y-1">
          <span class="text-[11px] text-muted-foreground">Civil Status</span>
          <select
            v-model="civilStatus"
            class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
          >
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Widowed">Widowed</option>
            <option value="Separated">Separated</option>
            <option value="Solo Parent">Solo Parent</option>
          </select>
        </div>
      </div>

      <!-- Physical & Tax Info -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="space-y-1">
          <span class="text-[11px] text-muted-foreground">Religion</span>
          <ReferencePicker
            :key="`religion-${formResetCount}`"
            v-model="religion"
            :options="religionOptions"
            :loading="isLoadingReferenceLists"
            placeholder="Select religion"
            search-placeholder="Search religion..."
            specify-placeholder="Specify religion"
            class="h-9 text-xs"
          />
        </div>
        <div class="space-y-1">
          <span class="text-[11px] text-muted-foreground">Height (feet)</span>
          <Input v-model.number="heightFt" type="number" step="0.1" placeholder="e.g. 5.5" class="h-9 text-xs" />
        </div>
        <div class="space-y-1">
          <span class="text-[11px] text-muted-foreground">Tax Identification Number (TIN)</span>
          <Input v-model="tin" placeholder="e.g. 123-456-789-000" class="h-9 text-xs font-mono" />
        </div>
      </div>

      <!-- Permanent Address Breakdown (PSGC-powered) -->
      <div class="p-4 rounded-xl border bg-muted/10 space-y-3">
        <div class="flex items-center gap-1.5 font-semibold text-foreground text-xs">
          <MapPin class="h-3.5 w-3.5 text-primary" />
          <span>Permanent Residential Address</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">Province <span class="text-destructive">*</span></span>
            <select
              :value="selectedProvince?.code ?? ''"
              class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
              :disabled="!selectedRegion"
              @change="onProvinceChange(($event.target as HTMLSelectElement).value)"
            >
              <option value="" disabled>{{ psgcProvinces.length === 0 ? 'Loading...' : 'Select province' }}</option>
              <option v-for="p in psgcProvinces" :key="p.code" :value="p.code">
                {{ p.name }}
              </option>
            </select>
          </div>
          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">Municipality / City <span class="text-destructive">*</span></span>
            <select
              :value="selectedCity?.code ?? ''"
              class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
              :disabled="!selectedProvince"
              @change="onCityChange(($event.target as HTMLSelectElement).value)"
            >
              <option value="" disabled>{{ !selectedProvince ? 'Select province first' : psgcCities.length === 0 ? 'Loading...' : 'Select municipality / city' }}</option>
              <option v-for="c in psgcCities" :key="c.code" :value="c.code">
                {{ c.name }}
              </option>
            </select>
          </div>
          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">Barangay <span class="text-destructive">*</span></span>
            <select
              :value="selectedBarangay?.code ?? ''"
              class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
              :disabled="!selectedCity"
              @change="onBarangayChange(($event.target as HTMLSelectElement).value)"
            >
              <option value="" disabled>{{ !selectedCity ? 'Select municipality first' : psgcBarangays.length === 0 ? 'Loading...' : 'Select barangay' }}</option>
              <option v-for="b in psgcBarangays" :key="b.code" :value="b.code">
                {{ b.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">House No. / Street</span>
            <Input v-model="street" placeholder="e.g. Purok 4, Maharlika Hwy" class="h-9 text-xs" />
          </div>
          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">Village / Sitio</span>
            <Input v-model="village" placeholder="Optional" class="h-9 text-xs" />
          </div>
          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">Region</span>
            <span class="text-xs font-medium text-foreground h-9 flex items-center">{{ selectedRegion?.name || 'Region XIII (Caraga)' }}</span>
          </div>
        </div>
      </div>

      <!-- Contacts & Email -->
      <div class="space-y-2">
        <label class="font-semibold text-foreground text-xs">Contact & Communication</label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">Primary Mobile Number <span class="text-destructive">*</span></span>
            <Input v-model="primaryContactNumber" placeholder="e.g. 09123456789" class="h-9 text-xs font-mono" />
          </div>
          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">Email Address</span>
            <Input v-model="email" type="email" placeholder="e.g. applicant@gmail.com" class="h-9 text-xs font-mono" />
          </div>
        </div>

        <!-- Additional contact numbers -->
        <div class="pt-2 space-y-2">
          <span class="text-[11px] text-muted-foreground">Secondary / Alternate Contact Numbers</span>
          <div class="flex items-center gap-2 max-w-sm">
            <Input
              v-model="newAdditionalContact"
              placeholder="Add telephone or alt number"
              class="h-8 text-xs font-mono"
              @keyup.enter="addContactNumber"
            />
            <Button size="sm" variant="outline" class="h-8 text-xs cursor-pointer gap-1" @click="addContactNumber">
              <Plus class="h-3 w-3" />
              <span>Add</span>
            </Button>
          </div>
          <div v-if="additionalContactNumbers.length > 0" class="flex flex-wrap gap-1.5 pt-1">
            <Badge
              v-for="(cn, idx) in additionalContactNumbers"
              :key="idx"
              variant="secondary"
              class="text-[11px] font-mono gap-1"
            >
              <span>{{ cn }}</span>
              <button
                type="button"
                class="inline-flex items-center justify-center text-muted-foreground hover:text-destructive cursor-pointer transition-colors focus:outline-none"
                @click.stop="removeContactNumber(idx)"
              >
                <X class="h-3 w-3" />
              </button>
            </Badge>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
