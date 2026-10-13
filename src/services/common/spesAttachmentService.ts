import { supabase } from '@/lib/supabaseClient'
import { fileHelpers } from '@/helpers/common/fileHelpers'
import { DOCUMENT_UPLOAD_BUCKET } from '@/helpers/common/uploadHelpers'
import {
  SPES_DOCUMENT_REQUIREMENTS,
  SPES_REQUIREMENT_TYPE,
  type SpesDocumentAttachmentMap,
  type SpesDocumentKey,
  type SpesPendingAttachmentMap,
} from '@/types/common/spesForm'

const SIGNED_URL_TTL_SECONDS = 60 * 60

// SPES requirement templates (migration 014) are matched to the checklist by label
let templateIdsPromise: Promise<Map<SpesDocumentKey, number>> | null = null

function fetchTemplateIds(): Promise<Map<SpesDocumentKey, number>> {
  templateIdsPromise ??= (async () => {
    const { data, error } = await supabase
      .schema('public')
      .from('requirement_templates')
      .select('id, name')
      .eq('requirement_type', SPES_REQUIREMENT_TYPE)

    if (error) throw new Error(error.message || 'Failed to load the SPES requirement list.')

    const ids = new Map<SpesDocumentKey, number>()
    for (const doc of SPES_DOCUMENT_REQUIREMENTS) {
      const template = (data ?? []).find((t) => (t.name ?? '').trim().toLowerCase() === doc.label.toLowerCase())
      if (template) ids.set(doc.key, template.id)
    }
    return ids
  })().catch((err) => {
    templateIdsPromise = null
    throw err
  })
  return templateIdsPromise
}

async function requireTemplateId(key: SpesDocumentKey): Promise<number> {
  const id = (await fetchTemplateIds()).get(key)
  if (!id) throw new Error('SPES requirement templates are missing. Run migration 014_spes_form_requirement_attachments.sql.')
  return id
}

async function removeStorageFiles(paths: string[]) {
  if (!paths.length) return
  const { error } = await supabase.storage.from(DOCUMENT_UPLOAD_BUCKET).remove(paths)
  // The database rows are already gone; a leftover file is only storage clutter
  if (error) console.warn('[spesAttachmentService] Failed to remove files from storage:', error.message)
}

async function fetchFormRequirements(formId: string) {
  const { data, error } = await supabase
    .schema('applicants')
    .from('applicant_requirements')
    .select('id, requirement_id')
    .eq('spes_form_id', formId)

  if (error) throw new Error(error.message || 'Failed to load the SPES requirement attachments.')
  return data ?? []
}

async function fetchMediaRows(requirementIds: number[]) {
  if (!requirementIds.length) return []
  const { data, error } = await supabase
    .schema('applicants')
    .from('applicant_requirement_media')
    .select('id, applicant_requirement_id, filename, mime_type, path, created_at')
    .in('applicant_requirement_id', requirementIds)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message || 'Failed to load the SPES requirement attachments.')
  return data ?? []
}

async function deleteRequirement(requirementId: number) {
  const media = await fetchMediaRows([requirementId])
  // applicant_requirement_media cascades with its requirement (migration 014)
  const { error } = await supabase.schema('applicants').from('applicant_requirements').delete().eq('id', requirementId)
  if (error) throw new Error(error.message || 'Failed to remove the requirement attachment.')
  await removeStorageFiles(media.flatMap((m) => (m.path ? [m.path] : [])))
}

async function upsertRequirement(formId: string, profileId: string | null, requirementId: number, label: string) {
  const { data: existing, error: findErr } = await supabase
    .schema('applicants')
    .from('applicant_requirements')
    .select('id')
    .eq('spes_form_id', formId)
    .eq('requirement_id', requirementId)
    .maybeSingle()

  if (findErr) throw new Error(findErr.message || 'Failed to save the requirement attachment.')
  if (existing) return existing.id

  const { data, error } = await supabase
    .schema('applicants')
    .from('applicant_requirements')
    .insert({ spes_form_id: formId, profile_id: profileId, requirement_id: requirementId, remarks: label, status: 'pending' })
    .select('id')
    .single()

  if (error) throw new Error(error.message || 'Failed to save the requirement attachment.')
  return data.id
}

export const spesAttachmentService = {
  /** Latest attachment per checked requirement of a SPES form, with signed URLs for viewing. */
  async fetchAttachments(formId: string): Promise<SpesDocumentAttachmentMap> {
    const [templateIds, requirements] = await Promise.all([fetchTemplateIds(), fetchFormRequirements(formId)])
    const media = await fetchMediaRows(requirements.map((r) => r.id))

    const keyByTemplateId = new Map([...templateIds].map(([key, id]) => [id, key]))
    const attachments: SpesDocumentAttachmentMap = {}

    await Promise.all(
      requirements.map(async (requirement) => {
        const key = requirement.requirement_id ? keyByTemplateId.get(requirement.requirement_id) : undefined
        // media is newest first
        const latest = media.find((m) => m.applicant_requirement_id === requirement.id && m.path)
        if (!key || !latest?.path) return

        const { data: signed } = await supabase.storage
          .from(DOCUMENT_UPLOAD_BUCKET)
          .createSignedUrl(latest.path, SIGNED_URL_TTL_SECONDS)

        attachments[key] = {
          key,
          applicantRequirementId: requirement.id,
          mediaId: latest.id,
          filename: latest.filename ?? 'Attachment',
          mimeType: latest.mime_type,
          path: latest.path,
          url: signed?.signedUrl ?? null,
        }
      })
    )

    return attachments
  },

  /**
   * Brings a saved SPES form's attachments in line with its checklist: uploads the newly picked
   * files (replacing the previous one) and removes the attachments of unchecked requirements.
   */
  async syncAttachments(options: {
    formId: string
    /** Owner of the form (`spes_form.profile_id`); null for walk-in applicants. */
    profileId: string | null
    /** Signed-in user; files go into their own folder of the documents bucket. */
    uploaderId: string
    checked: Partial<Record<SpesDocumentKey, boolean>>
    pending: SpesPendingAttachmentMap
  }): Promise<void> {
    const { formId, profileId, uploaderId, checked, pending } = options
    const templateIds = await fetchTemplateIds()
    const requirements = await fetchFormRequirements(formId)

    for (const doc of SPES_DOCUMENT_REQUIREMENTS) {
      const templateId = templateIds.get(doc.key)
      const existing = requirements.find((r) => templateId && r.requirement_id === templateId)

      if (!checked[doc.key]) {
        if (existing) await deleteRequirement(existing.id)
        continue
      }

      const file = pending[doc.key]
      if (!file) continue

      const requirementId = existing?.id ?? (await upsertRequirement(formId, profileId, await requireTemplateId(doc.key), doc.label))
      const previousMedia = await fetchMediaRows([requirementId])

      const path = fileHelpers.generateUniquePath(uploaderId, file.name)
      const { error: uploadErr } = await supabase.storage
        .from(DOCUMENT_UPLOAD_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false })
      if (uploadErr) throw new Error(uploadErr.message || `Failed to upload the ${doc.label.toLowerCase()}.`)

      const { error: mediaErr } = await supabase
        .schema('applicants')
        .from('applicant_requirement_media')
        .insert({
          applicant_requirement_id: requirementId,
          profiles_id: profileId,
          filename: file.name,
          path,
          mime_type: file.type,
          size: file.size,
          alt_text: file.name,
          description: `SPES requirement: ${doc.label}`,
        })

      if (mediaErr) {
        await removeStorageFiles([path])
        throw new Error(mediaErr.message || `Failed to save the ${doc.label.toLowerCase()}.`)
      }

      // Only the latest file is kept per requirement
      if (previousMedia.length) {
        const { error } = await supabase
          .schema('applicants')
          .from('applicant_requirement_media')
          .delete()
          .in('id', previousMedia.map((m) => m.id))
        if (error) console.warn('[spesAttachmentService] Failed to remove the replaced attachment:', error.message)
        else await removeStorageFiles(previousMedia.flatMap((m) => (m.path ? [m.path] : [])))
      }
    }
  },
}
