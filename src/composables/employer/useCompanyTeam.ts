import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { useAuthStore } from '@/stores/common/auth'
import { useCompanyTeamStore } from '@/stores/employer/companyTeamStore'
import { mediaService } from '@/services/common/mediaService'
import { getNameInitials } from '@/helpers/employer/companyProfileHelpers'
import type { CompanyTeamMember, CompanyTeamMemberFormValues } from '@/types/employer/companyProfile'

const teamMemberSchema = z.object({
  full_name: z.string().trim().min(1, 'Name is required.').max(120, 'Maximum of 120 characters.'),
  position: z.string().trim().max(120, 'Maximum of 120 characters.'),
})

/** Team Members card of the company profile: list, add / edit dialog with photo, delete confirmation */
export function useCompanyTeam() {
  const authStore = useAuthStore()
  const store = useCompanyTeamStore()
  const { members, isLoading, isSaving, deletingId } = storeToRefs(store)

  /** Display rows: photo URL and initials resolved once */
  const teamMembers = computed(() =>
    members.value.map((member) => ({
      ...member,
      photoUrl: member.photo_path ? mediaService.getPublicUrl(member.photo_path) : null,
      initials: getNameInitials(member.full_name),
    })),
  )

  // ─── Add / edit dialog ───
  const editingMember = ref<CompanyTeamMember | null>(null)
  const isDialogOpen = ref(false)
  const dialogTitle = computed(() => (editingMember.value ? 'Edit Team Member' : 'Add Team Member'))

  /** undefined = keep the saved photo, null = remove it, File = replace it */
  const photoFile = ref<File | null | undefined>(undefined)
  const photoPreview = ref<string | null>(null)

  function setPreview(url: string | null) {
    if (photoPreview.value?.startsWith('blob:')) URL.revokeObjectURL(photoPreview.value)
    photoPreview.value = url
  }

  const { handleSubmit, resetForm } = useForm<CompanyTeamMemberFormValues>({
    validationSchema: toTypedSchema(teamMemberSchema),
  })

  function openDialog(member: CompanyTeamMember | null = null) {
    editingMember.value = member
    photoFile.value = undefined
    setPreview(member?.photo_path ? mediaService.getPublicUrl(member.photo_path) : null)
    resetForm({ values: { full_name: member?.full_name ?? '', position: member?.position ?? '' } })
    isDialogOpen.value = true
  }

  function onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    photoFile.value = file
    setPreview(URL.createObjectURL(file))
  }

  function clearPhoto() {
    photoFile.value = null
    setPreview(null)
  }

  const saveMember = handleSubmit(async (values) => {
    const saved = await store.saveMember(editingMember.value?.id ?? null, values, photoFile.value)
    if (saved) isDialogOpen.value = false
  })

  // ─── Delete confirmation ───
  const memberToDelete = ref<CompanyTeamMember | null>(null)
  const isDeleteOpen = computed({
    get: () => memberToDelete.value !== null,
    set: (open: boolean) => {
      if (!open) memberToDelete.value = null
    },
  })

  async function confirmDelete() {
    const member = memberToDelete.value
    if (!member) return
    await store.deleteMember(member.id)
    memberToDelete.value = null
  }

  watch(isDialogOpen, (open) => {
    if (!open) setPreview(null)
  })

  onMounted(async () => {
    await authStore.init()
    await store.fetchMembers()
  })
  onBeforeUnmount(() => setPreview(null))

  return {
    teamMembers,
    isLoading,
    // Add / edit
    isDialogOpen,
    dialogTitle,
    isSaving,
    photoPreview,
    openDialog,
    onPhotoSelected,
    clearPhoto,
    saveMember,
    // Delete
    memberToDelete,
    isDeleteOpen,
    deletingId,
    confirmDelete,
  }
}
