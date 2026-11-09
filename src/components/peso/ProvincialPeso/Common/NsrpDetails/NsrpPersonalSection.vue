<script setup lang="ts">
// ApplicantNsrpDetails.vue — Section I: personal information (view / edit)
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader2, MapPin, Pencil, Plus, Save, X } from '@lucide/vue'
import { useApplicantNsrpDetailsContext } from '@/composables/peso/provincialPeso/applicantNsrpDetailsContext'

const {
  applicant,
  formattedDob,
  editingSection,
  isSaving,
  startEdit,
  cancelEdit,
  saveSection,
  birthdateMin,
  todayMax,
  editFirstName,
  editMiddleName,
  editSurname,
  editSuffix,
  editDateOfBirth,
  editAge,
  editSex,
  editCivilStatus,
  editReligion,
  editHeightFt,
  editTin,
  editPrimaryContact,
  editAdditionalContacts,
  editNewAdditionalContact,
  editEmail,
  editHouseNumber,
  editStreet,
  editVillage,
  editPsgcProvinces,
  editPsgcCities,
  editPsgcBarangays,
  editSelectedRegion,
  editSelectedProvince,
  editSelectedCity,
  editSelectedBarangay,
  onEditProvinceChange,
  onEditCityChange,
  onEditBarangayChange,
  addEditContactNumber,
  removeEditContactNumber,
} = useApplicantNsrpDetailsContext()
</script>

<template>
  <Card v-if="applicant" class="border shadow-xs">
    <CardHeader class="pb-3 border-b bg-muted/20">
      <div class="flex items-center justify-between">
        <CardTitle class="text-sm font-semibold flex items-center gap-2">
          <span>I. Personal Information</span>
        </CardTitle>
        <Button
          v-if="editingSection !== 'personal'"
          variant="ghost"
          size="sm"
          class="gap-1.5 text-xs cursor-pointer print:hidden h-7 px-2 hover:bg-muted"
          @click="startEdit('personal')"
        >
          <Pencil class="h-3.5 w-3.5 text-muted-foreground" />
          <span>Edit</span>
        </Button>
        <div v-else class="flex items-center gap-1.5 print:hidden">
          <Button
            variant="ghost"
            size="sm"
            class="gap-1 text-xs h-7 px-2 cursor-pointer"
            :disabled="isSaving"
            @click="cancelEdit"
          >
            <X class="h-3.5 w-3.5" />
            <span>Cancel</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            class="gap-1 text-xs h-7 px-2.5 cursor-pointer shadow-xs"
            :disabled="isSaving"
            @click="saveSection('personal')"
          >
            <Loader2 v-if="isSaving" class="h-3.5 w-3.5 animate-spin" />
            <Save v-else class="h-3.5 w-3.5" />
            <span>Save</span>
          </Button>
        </div>
      </div>
    </CardHeader>

    <!-- VIEW MODE -->
    <CardContent v-if="editingSection !== 'personal'" class="p-4 space-y-4 text-xs">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="p-3 rounded-lg border bg-card/60">
          <span class="text-muted-foreground block text-[11px]">First Name</span>
          <span class="font-semibold text-foreground mt-0.5 block text-sm">{{ applicant.firstName }}</span>
        </div>
        <div class="p-3 rounded-lg border bg-card/60">
          <span class="text-muted-foreground block text-[11px]">Middle Name</span>
          <span class="font-semibold text-foreground mt-0.5 block text-sm">{{ applicant.middleName || 'N/A' }}</span>
        </div>
        <div class="p-3 rounded-lg border bg-card/60">
          <span class="text-muted-foreground block text-[11px]">Surname</span>
          <span class="font-semibold text-foreground mt-0.5 block text-sm">{{ applicant.surname }}</span>
        </div>
        <div class="p-3 rounded-lg border bg-card/60">
          <span class="text-muted-foreground block text-[11px]">Suffix</span>
          <span class="font-semibold text-foreground mt-0.5 block text-sm">{{ applicant.suffix || 'None' }}</span>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="p-3 rounded-lg border bg-card/60">
          <span class="text-muted-foreground block text-[11px]">Date of Birth</span>
          <span class="font-medium text-foreground mt-0.5 block">{{ formattedDob }}</span>
        </div>
        <div class="p-3 rounded-lg border bg-card/60">
          <span class="text-muted-foreground block text-[11px]">Age</span>
          <span class="font-medium text-foreground mt-0.5 block">{{ applicant.age ? `${applicant.age} years old` : 'N/A' }}</span>
        </div>
        <div class="p-3 rounded-lg border bg-card/60">
          <span class="text-muted-foreground block text-[11px]">Sex</span>
          <span class="font-medium text-foreground mt-0.5 block">{{ applicant.sex }}</span>
        </div>
        <div class="p-3 rounded-lg border bg-card/60">
          <span class="text-muted-foreground block text-[11px]">Civil Status</span>
          <span class="font-medium text-foreground mt-0.5 block">{{ applicant.civilStatus }}</span>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div class="p-3 rounded-lg border bg-card/60">
          <span class="text-muted-foreground block text-[11px]">Religion</span>
          <span class="font-medium text-foreground mt-0.5 block">{{ applicant.religion || 'Not Specified' }}</span>
        </div>
        <div class="p-3 rounded-lg border bg-card/60">
          <span class="text-muted-foreground block text-[11px]">Height</span>
          <span class="font-medium text-foreground mt-0.5 block font-mono">
            {{ applicant.heightFt ? `${applicant.heightFt} ft` : 'Not Specified' }}
          </span>
        </div>
        <div class="p-3 rounded-lg border bg-card/60">
          <span class="text-muted-foreground block text-[11px]">Tax Identification No. (TIN)</span>
          <span class="font-medium text-foreground mt-0.5 block font-mono">{{ applicant.tin || 'N/A' }}</span>
        </div>
      </div>

      <!-- Address Breakdown -->
      <div class="p-3.5 rounded-lg border bg-muted/10 space-y-2">
        <span class="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
          <MapPin class="h-3.5 w-3.5 text-primary" />
          Permanent Residential Address Breakdown
        </span>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs pt-1">
          <div>
            <span class="text-muted-foreground text-[10px]">House / Street / Village</span>
            <p class="font-medium text-foreground">
              {{ [applicant.address.houseNumber, applicant.address.street, applicant.address.village].filter(Boolean).join(', ') || 'N/A' }}
            </p>
          </div>
          <div>
            <span class="text-muted-foreground text-[10px]">Barangay</span>
            <p class="font-medium text-foreground">{{ applicant.address.barangay }}</p>
          </div>
          <div>
            <span class="text-muted-foreground text-[10px]">Municipality / City</span>
            <p class="font-medium text-foreground">{{ applicant.address.municipality }}</p>
          </div>
          <div>
            <span class="text-muted-foreground text-[10px]">Province</span>
            <p class="font-medium text-foreground">{{ applicant.address.province }}</p>
          </div>
          <div>
            <span class="text-muted-foreground text-[10px]">Region</span>
            <p class="font-medium text-foreground">{{ applicant.address.region || 'Region XIII (Caraga)' }}</p>
          </div>
          <div>
            <span class="text-muted-foreground text-[10px]">Full Address</span>
            <p class="font-medium text-foreground truncate" :title="applicant.fullAddressString">
              {{ applicant.fullAddressString }}
            </p>
          </div>
        </div>
      </div>

      <!-- Contact Numbers & Email -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="p-3 rounded-lg border bg-card/60">
          <span class="text-muted-foreground block text-[11px]">Primary Contact Number</span>
          <span class="font-semibold text-foreground mt-0.5 block font-mono text-sm">
            {{ applicant.contactNumber }}
          </span>
          <div v-if="applicant.allContactNumbers.length > 1" class="mt-2 pt-2 border-t text-[11px]">
            <span class="text-muted-foreground block text-[10px]">Other Contact Numbers:</span>
            <div class="flex flex-wrap gap-1 mt-1">
              <Badge
                v-for="(cn, idx) in applicant.allContactNumbers"
                :key="idx"
                variant="outline"
                class="text-[10px] font-mono"
              >
                {{ cn }}
              </Badge>
            </div>
          </div>
        </div>
        <div class="p-3 rounded-lg border bg-card/60">
          <span class="text-muted-foreground block text-[11px]">Email Address</span>
          <span class="font-semibold text-foreground mt-0.5 block font-mono text-sm">
            {{ applicant.email || 'No email provided' }}
          </span>
        </div>
      </div>
    </CardContent>

    <!-- EDIT MODE -->
    <CardContent v-else class="p-4 space-y-4 text-xs">
      <!-- Full Name Section -->
      <div class="space-y-1.5">
        <span class="font-semibold text-foreground text-xs block">Full Name</span>
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">First Name <span class="text-destructive">*</span></span>
            <Input v-model="editFirstName" placeholder="First Name" class="h-9 text-xs" />
          </div>
          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">Middle Name</span>
            <Input v-model="editMiddleName" placeholder="Middle Name" class="h-9 text-xs" />
          </div>
          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">Surname <span class="text-destructive">*</span></span>
            <Input v-model="editSurname" placeholder="Surname" class="h-9 text-xs" />
          </div>
          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">Suffix</span>
            <Input v-model="editSuffix" placeholder="Suffix (Jr, III)" class="h-9 text-xs" />
          </div>
        </div>
      </div>

      <!-- Birth & Demographics -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div class="space-y-1">
          <span class="text-[11px] text-muted-foreground">Date of Birth <span class="text-destructive">*</span></span>
          <Input v-model="editDateOfBirth" type="date" :min="birthdateMin" :max="todayMax" class="h-9 text-xs" />
        </div>
        <div class="space-y-1">
          <span class="text-[11px] text-muted-foreground">Age</span>
          <Input v-model.number="editAge" type="number" placeholder="Age" class="h-9 text-xs" />
        </div>
        <div class="space-y-1">
          <span class="text-[11px] text-muted-foreground">Sex</span>
          <select
            v-model="editSex"
            class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
        <div class="space-y-1">
          <span class="text-[11px] text-muted-foreground">Civil Status</span>
          <select
            v-model="editCivilStatus"
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
          <Input v-model="editReligion" placeholder="e.g. Roman Catholic, Christian" class="h-9 text-xs" />
        </div>
        <div class="space-y-1">
          <span class="text-[11px] text-muted-foreground">Height (feet)</span>
          <Input v-model.number="editHeightFt" type="number" step="0.1" placeholder="e.g. 5.6" class="h-9 text-xs" />
        </div>
        <div class="space-y-1">
          <span class="text-[11px] text-muted-foreground">Tax Identification No. (TIN)</span>
          <Input v-model="editTin" placeholder="e.g. 123-456-789-000" class="h-9 text-xs font-mono" />
        </div>
      </div>

      <!-- Permanent Address Breakdown (PSGC) -->
      <div class="p-3.5 rounded-xl border bg-muted/10 space-y-3">
        <div class="flex items-center gap-1.5 font-semibold text-foreground text-xs">
          <MapPin class="h-3.5 w-3.5 text-primary" />
          <span>Permanent Residential Address</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">Province <span class="text-destructive">*</span></span>
            <select
              :value="editSelectedProvince?.code ?? ''"
              class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
              @change="onEditProvinceChange(($event.target as HTMLSelectElement).value)"
            >
              <option value="" disabled>{{ editPsgcProvinces.length === 0 ? 'Loading...' : 'Select province' }}</option>
              <option v-for="p in editPsgcProvinces" :key="p.code" :value="p.code">
                {{ p.name }}
              </option>
            </select>
          </div>
          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">Municipality / City <span class="text-destructive">*</span></span>
            <select
              :value="editSelectedCity?.code ?? ''"
              class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
              :disabled="!editSelectedProvince"
              @change="onEditCityChange(($event.target as HTMLSelectElement).value)"
            >
              <option value="" disabled>{{ !editSelectedProvince ? 'Select province first' : editPsgcCities.length === 0 ? 'Loading...' : 'Select municipality / city' }}</option>
              <option v-for="c in editPsgcCities" :key="c.code" :value="c.code">
                {{ c.name }}
              </option>
            </select>
          </div>
          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">Barangay <span class="text-destructive">*</span></span>
            <select
              :value="editSelectedBarangay?.code ?? ''"
              class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
              :disabled="!editSelectedCity"
              @change="onEditBarangayChange(($event.target as HTMLSelectElement).value)"
            >
              <option value="" disabled>{{ !editSelectedCity ? 'Select municipality first' : editPsgcBarangays.length === 0 ? 'Loading...' : 'Select barangay' }}</option>
              <option v-for="b in editPsgcBarangays" :key="b.code" :value="b.code">
                {{ b.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">House No.</span>
            <Input v-model="editHouseNumber" placeholder="e.g. Blk 1 Lot 2" class="h-9 text-xs" />
          </div>
          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">Street</span>
            <Input v-model="editStreet" placeholder="e.g. Purok 4, Maharlika Hwy" class="h-9 text-xs" />
          </div>
          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">Village / Sitio</span>
            <Input v-model="editVillage" placeholder="Optional" class="h-9 text-xs" />
          </div>
          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">Region</span>
            <span class="text-xs font-medium text-foreground h-9 flex items-center">{{ editSelectedRegion?.name || 'Region XIII (Caraga)' }}</span>
          </div>
        </div>
      </div>

      <!-- Contacts & Email -->
      <div class="space-y-2">
        <span class="font-semibold text-foreground text-xs block">Contact & Communication</span>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">Primary Mobile Number <span class="text-destructive">*</span></span>
            <Input v-model="editPrimaryContact" placeholder="e.g. 09123456789" class="h-9 text-xs font-mono" />
          </div>
          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">Email Address</span>
            <Input v-model="editEmail" type="email" placeholder="e.g. applicant@gmail.com" class="h-9 text-xs font-mono" />
          </div>
        </div>

        <!-- Secondary contact numbers -->
        <div class="pt-2 space-y-2">
          <span class="text-[11px] text-muted-foreground">Secondary / Alternate Contact Numbers</span>
          <div class="flex items-center gap-2 max-w-sm">
            <Input
              v-model="editNewAdditionalContact"
              placeholder="Add telephone or alt number"
              class="h-8 text-xs font-mono"
              @keyup.enter="addEditContactNumber"
            />
            <Button size="sm" variant="outline" class="h-8 text-xs cursor-pointer gap-1" @click="addEditContactNumber">
              <Plus class="h-3 w-3" />
              <span>Add</span>
            </Button>
          </div>
          <div v-if="editAdditionalContacts.length > 0" class="flex flex-wrap gap-1.5 pt-1">
            <Badge
              v-for="(cn, idx) in editAdditionalContacts"
              :key="idx"
              variant="secondary"
              class="text-[11px] font-mono gap-1"
            >
              <span>{{ cn }}</span>
              <X class="h-3 w-3 cursor-pointer hover:text-destructive" @click="removeEditContactNumber(idx)" />
            </Badge>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
