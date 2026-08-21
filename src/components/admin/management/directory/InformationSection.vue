<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  ArrowLeft,
  FileText,
  FolderOpen,
  Eye,
  SquarePen,
  Download,
  Globe,
  Loader2,
} from '@lucide/vue'
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment'
import { getRequirementAttachmentState } from '@/helpers/applicant/applicantRequirementDocuments'
import { useSystemDirectoryStore } from '@/stores/admin/systemDirectoryStore'
import {
  formatDate,
  formatDateTime,
  formatFileSize,
  getRoleBadgeVariant,
  getRoleBadgeClass,
  getStatusBadgeVariant,
  getStatusBadgeClass,
  getCategoryBadgeVariant,
  getCategoryBadgeClass,
  formatRoleLabel,
} from '@/helpers/admin/systemDirectoryHelper'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const route = useRoute()
const router = useRouter()
const store = useSystemDirectoryStore()

const {
  records,
  isLoading,
  isSubmitting,
  selectedRecord,
  isEditDocStatusOpen,
  selectedDocument,
} = storeToRefs(store)

const {
  fetchRecords,
  openEditDocumentStatusModal,
  closeEditDocumentStatusModal,
  updateDocumentStatus,
  viewSubmittedFile,
  downloadSubmittedFile,
} = store

const profileId = computed(() => route.params.id as string)

onMounted(async () => {
  if (records.value.length === 0) {
    await fetchRecords()
  }
  const found = records.value.find((r) => r.id === profileId.value)
  if (found) {
    selectedRecord.value = found
  }
})

watch(
  [records, profileId],
  () => {
    if (profileId.value) {
      const found = records.value.find((r) => r.id === profileId.value)
      if (found) {
        selectedRecord.value = found
      }
    }
  },
  { immediate: true }
)

const goBack = () => {
  router.push({ name: 'directory' })
}

// Edit document status state
const selectedDocStatus = ref<string>('submitted')

watch(selectedDocument, (newVal) => {
  if (newVal) {
    selectedDocStatus.value = newVal.status || 'submitted'
  }
})

const handleUpdateDocumentStatus = async () => {
  if (!selectedRecord.value || !selectedDocument.value) return
  const isApplicantDoc = selectedRecord.value.category === 'applicant'
  try {
    await updateDocumentStatus(selectedRecord.value.id, selectedDocument.value.id, selectedDocStatus.value, isApplicantDoc)
  } catch {
    // Error handled in store
  }
}
</script>

<template>
  <div class="w-full min-w-0 space-y-4">
    <!-- Header with Back Button -->
    <div class="flex items-center gap-3">
      <Button variant="outline" size="icon" @click="goBack" title="Back to Directory">
        <ArrowLeft class="h-4 w-4" />
      </Button>
      <div>
        <h1 class="text-2xl font-bold tracking-tight flex items-center gap-2">
          <span>{{ selectedRecord?.category === 'company' ? 'Company & Account Details' : 'Applicant Account Details' }}</span>
        </h1>
        <p class="text-sm text-muted-foreground">
          Detailed view of directory record and submitted requirements for {{ selectedRecord?.companyDetails?.company_name || selectedRecord?.firstname + ' ' + selectedRecord?.lastname }}
        </p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading && !selectedRecord" class="flex flex-col items-center justify-center p-12 space-y-3">
      <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
      <p class="text-sm text-muted-foreground">Loading record details...</p>
    </div>

    <!-- Record Not Found -->
    <div v-else-if="!selectedRecord" class="p-8 text-center border rounded-lg bg-muted/20">
      <p class="text-base font-semibold">Profile Record Not Found</p>
      <p class="text-sm text-muted-foreground mt-1">The requested profile ID does not exist or was removed.</p>
      <Button variant="outline" class="mt-4" @click="goBack">Return to System Directory</Button>
    </div>

    <!-- Main Content Container without card background -->
    <div v-else class="space-y-6">
      <!-- Overview / Account Summary -->
      <div class="space-y-3">
        <h3 class="text-sm font-semibold border-b pb-1">Overview / Account Summary</h3>
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-1">
          <Avatar class="h-20 w-20 border-2 border-primary/10 shadow-sm">
            <AvatarImage
              v-if="selectedRecord.avatarUrl"
              :src="selectedRecord.avatarUrl"
              :alt="selectedRecord.firstname || 'Profile Picture'"
              class="object-cover"
            />
            <AvatarFallback class="text-lg font-semibold bg-muted">
              {{ (selectedRecord.firstname?.[0] || '') + (selectedRecord.lastname?.[0] || '') || 'U' }}
            </AvatarFallback>
          </Avatar>
          <div class="space-y-1">
            <h2 class="text-xl font-bold tracking-tight text-foreground">
              {{ selectedRecord.companyDetails?.company_name || ((selectedRecord.firstname || '') + ' ' + (selectedRecord.lastname || '')).trim() || 'User Profile' }}
            </h2>
            <p class="text-xs text-muted-foreground font-mono" v-if="selectedRecord.email">
              {{ selectedRecord.email }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-muted-foreground">Category:</span>
            <span class="ml-2 inline-flex items-center">
              <Badge
                :variant="getCategoryBadgeVariant(selectedRecord.category)"
                :class="['capitalize', getCategoryBadgeClass(selectedRecord.category)]"
              >
                {{ selectedRecord.category === 'company' ? 'Company' : 'Applicant' }}
              </Badge>
            </span>
          </div>
          <div>
            <span class="text-muted-foreground">System Role:</span>
            <span class="ml-2 inline-flex items-center">
              <Badge
                :variant="getRoleBadgeVariant(selectedRecord.role)"
                :class="['capitalize', getRoleBadgeClass(selectedRecord.role)]"
              >
                {{ formatRoleLabel(selectedRecord.role) }}
              </Badge>
            </span>
          </div>
          <div>
            <span class="text-muted-foreground">Full Name:</span>
            <span class="ml-2 font-medium">
              {{ selectedRecord.firstname || '-' }} {{ selectedRecord.middlename || '' }} {{ selectedRecord.lastname || '-' }}
            </span>
          </div>
          <div>
            <span class="text-muted-foreground">Email Address:</span>
            <span class="ml-2 font-medium font-mono text-xs">{{ selectedRecord.email || 'N/A' }}</span>
          </div>
          <div>
            <span class="text-muted-foreground">Username:</span>
            <span class="ml-2 font-medium">@{{ selectedRecord.username || 'N/A' }}</span>
          </div>
          <div>
            <span class="text-muted-foreground">Account Status:</span>
            <span class="ml-2 inline-flex items-center">
              <Badge
                :variant="getStatusBadgeVariant(selectedRecord.status)"
                :class="['capitalize', getStatusBadgeClass(selectedRecord.status)]"
              >
                {{ selectedRecord.status || 'N/A' }}
              </Badge>
            </span>
          </div>
        </div>
      </div>

      <!-- Submitted Files & Documents -->
      <div class="space-y-3">
        <h3 class="text-sm font-semibold border-b pb-1">Submitted Files & Documents</h3>
        <div v-if="selectedRecord.documents && selectedRecord.documents.length > 0" class="space-y-2">
          <Attachment
            v-for="doc in selectedRecord.documents"
            :key="doc.id"
            class="w-full"
            :state="getRequirementAttachmentState(doc.status)"
          >
            <AttachmentMedia>
              <FileText class="size-4 text-muted-foreground" />
            </AttachmentMedia>

            <AttachmentContent>
              <AttachmentTitle>{{ doc.name }}</AttachmentTitle>
              <AttachmentDescription>
                <span v-if="doc.filename">
                  {{ doc.filename }} <template v-if="doc.size">· {{ formatFileSize(doc.size) }}</template>
                </span>
                <span v-else>Submitted</span>
                <span v-if="doc.created_at" class="hidden sm:inline"> · {{ formatDate(doc.created_at) }}</span>
              </AttachmentDescription>
            </AttachmentContent>

            <AttachmentActions>
              <Badge
                :variant="getStatusBadgeVariant(doc.status)"
                :class="['capitalize text-xs mr-1', getStatusBadgeClass(doc.status)]"
              >
                {{ doc.status || 'submitted' }}
              </Badge>

              <AttachmentAction
                title="Review / Edit Document Status"
                @click="openEditDocumentStatusModal(selectedRecord!, doc)"
              >
                <SquarePen class="size-4 text-muted-foreground hover:text-foreground" />
              </AttachmentAction>

              <AttachmentAction
                v-if="doc.path || doc.publicUrl"
                title="View Document"
                @click="viewSubmittedFile(doc)"
              >
                <Eye class="size-4 text-muted-foreground hover:text-foreground" />
              </AttachmentAction>

              <AttachmentAction
                v-if="doc.path || doc.publicUrl"
                title="Download Document"
                @click="downloadSubmittedFile(doc)"
              >
                <Download class="size-4 text-muted-foreground hover:text-foreground" />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
        </div>

        <div v-else class="flex flex-col items-center justify-center p-6 rounded-lg border border-dashed text-center bg-muted/20">
          <FolderOpen class="h-8 w-8 text-muted-foreground mb-2 stroke-[1.5]" />
          <p class="text-sm font-medium text-foreground">No Required Documents Submitted</p>
          <p class="text-xs text-muted-foreground mt-0.5">
            This account has not uploaded any required document files or media attachments yet.
          </p>
        </div>
      </div>

      <!-- Company Details Section (If Company Account) -->
      <div v-if="selectedRecord.category === 'company'" class="space-y-3">
        <h3 class="text-sm font-semibold border-b pb-1 flex items-center gap-1.5 text-black-700 dark:text-black-400">
          Company Profile Details
        </h3>
        <div v-if="selectedRecord.companyDetails" class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-muted-foreground">Company Name:</span>
            <span class="ml-2 font-semibold text-foreground">{{ selectedRecord.companyDetails.company_name || 'N/A' }}</span>
          </div>
          <div>
            <span class="text-muted-foreground">Industry:</span>
            <span class="ml-2 font-medium">{{ selectedRecord.companyDetails.industry || 'N/A' }}</span>
          </div>
          <div>
            <span class="text-muted-foreground">Business Type:</span>
            <span class="ml-2 font-medium">{{ selectedRecord.companyDetails.business_type || 'N/A' }}</span>
          </div>
          <div>
            <span class="text-muted-foreground">Registration No:</span>
            <span class="ml-2 font-mono text-xs font-medium">{{ selectedRecord.companyDetails.registration_number || 'N/A' }}</span>
          </div>
          <div>
            <span class="text-muted-foreground">Verification Status:</span>
            <span class="ml-2">
              <Badge
                :variant="getStatusBadgeVariant(selectedRecord.companyDetails.verification_status)"
                :class="['capitalize', getStatusBadgeClass(selectedRecord.companyDetails.verification_status)]"
              >
                {{ selectedRecord.companyDetails.verification_status || 'unverified' }}
              </Badge>
            </span>
          </div>
          <div>
            <span class="text-muted-foreground">Employee Count:</span>
            <span class="ml-2 font-medium">{{ selectedRecord.companyDetails.employee_count ? selectedRecord.companyDetails.employee_count + ' employees' : 'N/A' }}</span>
          </div>
          <div>
            <span class="text-muted-foreground">Company Contact:</span>
            <span class="ml-2 font-medium">{{ selectedRecord.companyDetails.company_contact || 'N/A' }}</span>
          </div>
          <div>
            <span class="text-muted-foreground">Company Email:</span>
            <span class="ml-2 font-medium font-mono text-xs">{{ selectedRecord.companyDetails.company_email || 'N/A' }}</span>
          </div>
          <div class="sm:col-span-2">
            <span class="text-muted-foreground">Website:</span>
            <span class="ml-2">
              <a
                v-if="selectedRecord.companyDetails.website"
                :href="selectedRecord.companyDetails.website"
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-600 hover:underline font-medium text-xs inline-flex items-center gap-1"
              >
                <Globe class="h-3.5 w-3.5" /> {{ selectedRecord.companyDetails.website }}
              </a>
              <span v-else class="font-medium text-muted-foreground">N/A</span>
            </span>
          </div>
          <div class="sm:col-span-2">
            <span class="text-muted-foreground">Company Address:</span>
            <p class="font-medium mt-0.5">{{ selectedRecord.companyDetails.company_address || 'N/A' }}</p>
          </div>
        </div>
        <div v-else class="text-sm text-muted-foreground italic bg-muted p-3 rounded">
          No linked employer company record found for this profile.
        </div>
      </div>

      <!-- Applicant Details Section (If Applicant Account) -->
      <div v-if="selectedRecord.category === 'applicant'" class="space-y-3">
        <h3 class="text-sm font-semibold border-b pb-1 flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
          Applicant Qualification & Details
        </h3>
        <div v-if="selectedRecord.applicantDetails" class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-muted-foreground flex items-center gap-1">
              Civil Status:
            </span>
            <span class="ml-2 font-medium capitalize">{{ selectedRecord.applicantDetails.civil_status || 'N/A' }}</span>
          </div>
          <div>
            <span class="text-muted-foreground flex items-center gap-1">
              Employment Status:
            </span>
            <span class="ml-2 font-medium capitalize">{{ selectedRecord.applicantDetails.employment_status || 'N/A' }}</span>
          </div>
          <div>
            <span class="text-muted-foreground flex items-center gap-1">
              Employment Type:
            </span>
            <span class="ml-2 font-medium capitalize">{{ selectedRecord.applicantDetails.employment_type || 'N/A' }}</span>
          </div>
          <div>
            <span class="text-muted-foreground flex items-center gap-1">
              Preferred Occupations:
            </span>
            <span class="ml-2 font-medium">{{ (selectedRecord.applicantDetails.preferred_occupations as string[])?.join(', ') || 'N/A' }}</span>
          </div>
          <div class="sm:col-span-2">
            <span class="text-muted-foreground flex items-center gap-1">
              Preferred Locations:
            </span>
            <span class="ml-2 font-medium">{{ (selectedRecord.applicantDetails.preferred_local_locations as string[])?.join(', ') || 'N/A' }}</span>
          </div>
        </div>
        <div v-else class="text-sm text-muted-foreground italic bg-muted p-3 rounded">
          Standard job seeker profile.
        </div>
      </div>

      <!-- Personal Information -->
      <div class="space-y-3">
        <h3 class="text-sm font-semibold border-b pb-1">Personal Details</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-muted-foreground">Birthdate:</span>
            <span class="ml-2 font-medium">{{ formatDate(selectedRecord.birthdate) }}</span>
          </div>
          <div>
            <span class="text-muted-foreground">Gender:</span>
            <span class="ml-2 font-medium capitalize">{{ selectedRecord.gender || 'N/A' }}</span>
          </div>
          <div>
            <span class="text-muted-foreground">Contact Number:</span>
            <span class="ml-2 font-medium">{{ selectedRecord.contact_number || 'N/A' }}</span>
          </div>
          <div>
            <span class="text-muted-foreground">Special Category:</span>
            <div class="inline-flex gap-2 ml-2">
              <span v-if="selectedRecord.is_pwd" class="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">PWD</span>
              <span v-if="selectedRecord.is_4ps" class="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">4Ps</span>
              <span v-if="!selectedRecord.is_pwd && !selectedRecord.is_4ps" class="text-muted-foreground">None</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Location Information -->
      <div class="space-y-3">
        <h3 class="text-sm font-semibold border-b pb-1">Location / Address</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-muted-foreground">Region:</span>
            <span class="ml-2 font-medium">{{ selectedRecord.region || 'N/A' }}</span>
          </div>
          <div>
            <span class="text-muted-foreground">Province:</span>
            <span class="ml-2 font-medium">{{ selectedRecord.province || 'N/A' }}</span>
          </div>
          <div>
            <span class="text-muted-foreground">City/Municipality:</span>
            <span class="ml-2 font-medium">{{ selectedRecord.geographic || 'N/A' }}</span>
          </div>
          <div>
            <span class="text-muted-foreground">Barangay:</span>
            <span class="ml-2 font-medium">{{ selectedRecord.barangay || 'N/A' }}</span>
          </div>
        </div>
      </div>

      <!-- System Metadata -->
      <div class="space-y-3">
        <h3 class="text-sm font-semibold border-b pb-1">System Audit Information</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-muted-foreground">Profile ID:</span>
            <p class="font-mono text-xs break-all bg-muted p-1 rounded mt-1">{{ selectedRecord.id }}</p>
          </div>
          <div>
            <span class="text-muted-foreground">Last Login:</span>
            <p class="font-medium mt-1">{{ formatDateTime(selectedRecord.last_login) }}</p>
          </div>
          <div>
            <span class="text-muted-foreground">Registered At:</span>
            <p class="font-medium mt-1">{{ formatDateTime(selectedRecord.created_at) }}</p>
          </div>
          <div>
            <span class="text-muted-foreground">Updated At:</span>
            <p class="font-medium mt-1">{{ formatDateTime(selectedRecord.updated_at) }}</p>
          </div>
        </div>
      </div>

      <!-- Bottom Action Row -->
      <div class="flex justify-end pt-4 border-t">
        <Button variant="outline" @click="goBack">Back to Directory</Button>
      </div>
    </div>

    <!-- Edit Document Status Modal -->
    <Dialog :open="isEditDocStatusOpen" @update:open="isEditDocStatusOpen = $event">
      <DialogContent class="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            Edit Document Status
          </DialogTitle>
          <DialogDescription>
            Update status for {{ selectedDocument?.name || selectedDocument?.filename }}
          </DialogDescription>
        </DialogHeader>

        <form @submit.prevent="handleUpdateDocumentStatus" class="space-y-4 py-2">
          <div v-if="selectedDocument && selectedRecord" class="space-y-4">
            <div>
              <Label class="text-xs font-semibold text-muted-foreground uppercase">Document Name</Label>
              <p class="font-medium text-base mt-0.5">{{ selectedDocument.name || selectedDocument.filename || 'N/A' }}</p>
            </div>

            <div>
              <Label class="text-xs font-semibold text-muted-foreground uppercase">File Name</Label>
              <p class="font-medium text-sm font-mono mt-0.5">{{ selectedDocument.filename || 'N/A' }}</p>
            </div>

            <div>
              <Label class="text-xs font-semibold text-muted-foreground uppercase">Current Status</Label>
              <div class="mt-1">
                <Badge
                  :variant="getStatusBadgeVariant(selectedDocument.status)"
                  :class="['capitalize', getStatusBadgeClass(selectedDocument.status)]"
                >
                  {{ selectedDocument.status || 'submitted' }}
                </Badge>
              </div>
            </div>

            <div class="space-y-2 pt-2">
              <Label for="edit-doc-status-select">New Document Status <span class="text-destructive">*</span></Label>
              <Select v-model="selectedDocStatus">
                <SelectTrigger id="edit-doc-status-select" class="w-full">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter class="pt-4">
            <Button type="button" variant="outline" @click="closeEditDocumentStatusModal" :disabled="isSubmitting">
              Cancel
            </Button>
            <Button
              type="submit"
              class="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
              :disabled="isSubmitting"
            >
              <Loader2 v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
              {{ isSubmitting ? 'Saving...' : 'Save Changes' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>