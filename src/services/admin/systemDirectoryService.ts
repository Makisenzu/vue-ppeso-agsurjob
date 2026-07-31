import { supabase } from '@/lib/supabaseClient'
import { mediaService } from '@/services/common/mediaService'
import type { Database } from '@/types/database.types'
import type {
  DirectoryProfileRow,
  CompanyRow,
  ApplicantRow,
  SubmittedDocument,
} from '@/types/admin/systemDirectory'

function normalizeProfileStatus(status: string): Database['core']['Enums']['status_type'] {
  return status as Database['core']['Enums']['status_type']
}

function normalizeRequirementStatus(status: string): Database['public']['Enums']['status_type'] {
  return status === 'inactive'
    ? 'closed'
    : (status as Database['public']['Enums']['status_type'])
}

export const systemDirectoryService = {
  // Fast, instant URL generator for initial table rendering
  getQuickPublicUrl(filePath: string | null | undefined): string | null {
    if (!filePath) return null
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath
    return mediaService.getPublicUrl(filePath, 'documents') || mediaService.getPublicUrl(filePath, 'media') || null
  },

  // On-demand resolver for when viewing/opening actual files
  async getDocumentViewUrl(filePath: string | null | undefined): Promise<string | null> {
    if (!filePath) return null
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath

    const cleanPath = filePath.replace(/^(documents|media)\//, '').replace(/^\/+/, '')

    // 1. Try 'documents' bucket signed URL first
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(cleanPath, 3600)

      if (!error && data?.signedUrl) {
        return data.signedUrl
      }
    } catch {
      // Fallback
    }

    // 2. Try 'media' bucket signed URL next
    try {
      const { data, error } = await supabase.storage
        .from('media')
        .createSignedUrl(cleanPath, 3600)

      if (!error && data?.signedUrl) {
        return data.signedUrl
      }
    } catch {
      // Fallback
    }

    return mediaService.getPublicUrl(filePath, 'documents') || mediaService.getPublicUrl(filePath, 'media')
  },

  async fetchAllDirectoryRecords(): Promise<DirectoryProfileRow[]> {
    // 1. Fetch core profile records
    const { data: profiles, error: profileErr } = await supabase
      .schema('core')
      .from('profiles')
      .select('*')
      .in('role', ['applicant', 'company_owner', 'company_member'])
      .order('created_at', { ascending: false })

    if (profileErr) {
      throw new Error(profileErr.message || 'Failed to fetch directory profiles')
    }

    if (!profiles || profiles.length === 0) {
      return []
    }

    const profileIds = profiles.map((p) => p.id)

    // 2. PARALLEL FETCH (Run all related table queries concurrently!)
    const [
      emailRes,
      templatesRes,
      companiesRes,
      membersRes,
      applicantsRes,
      appReqsRes,
      appMediaRes,
      empReqsRes,
      empMediaRes,
      profileMediaRes,
    ] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Promise.resolve((supabase.schema('core') as any).rpc('get_user_emails')).catch(() => ({ data: null, error: null })),
      Promise.resolve(supabase.schema('public').from('requirement_templates').select('id, name')).catch(() => ({ data: null, error: null })),
      Promise.resolve(supabase.schema('employers').from('companies').select('*').in('profile_id', profileIds)).catch(() => ({ data: null, error: null })),
      Promise.resolve(supabase.schema('employers').from('company_members').select('profile_id, company_id').in('profile_id', profileIds)).catch(() => ({ data: null, error: null })),
      Promise.resolve(supabase.schema('applicants').from('applicants').select('*').in('profile_id', profileIds)).catch(() => ({ data: null, error: null })),
      Promise.resolve(supabase.schema('applicants').from('applicant_requirements').select('*').in('profile_id', profileIds)).catch(() => ({ data: null, error: null })),
      Promise.resolve(supabase.schema('applicants').from('applicant_requirement_media').select('*').in('profiles_id', profileIds)).catch(() => ({ data: null, error: null })),
      Promise.resolve(supabase.schema('employers').from('employer_requirements').select('*')).catch(() => ({ data: null, error: null })),
      Promise.resolve(supabase.schema('employers').from('employer_requirement_media').select('*').in('profile_id', profileIds)).catch(() => ({ data: null, error: null })),
      Promise.resolve(supabase.schema('core').from('profile_media').select('*').in('profile_id', profileIds).order('created_at', { ascending: false })).catch(() => ({ data: null, error: null })),
    ])

    // Build Maps synchronously in JS memory
    const emailMap = new Map<string, string>()
    if (emailRes.data && Array.isArray(emailRes.data)) {
      emailRes.data.forEach((row: { id: string; email: string }) => {
        if (row?.id && row?.email) emailMap.set(row.id, row.email)
      })
    }

    const templateMap = new Map<number, string>()
    if (templatesRes.data) {
      templatesRes.data.forEach((t) => {
        if (t?.id != null && t?.name) {
          templateMap.set(t.id, t.name)
        }
      })
    }

    const companyMap = new Map<string, CompanyRow>()
    const companyByIdMap = new Map<number, CompanyRow>()
    if (companiesRes.data) {
      companiesRes.data.forEach((c: any) => {
        companyByIdMap.set(c.id, c as CompanyRow)
        if (c.profile_id) companyMap.set(c.profile_id, c as CompanyRow)
      })
    }

    if (membersRes.data) {
      membersRes.data.forEach((m: any) => {
        if (m.profile_id && m.company_id && !companyMap.has(m.profile_id)) {
          const comp = companyByIdMap.get(m.company_id)
          if (comp) companyMap.set(m.profile_id, comp)
        }
      })
    }

    const applicantMap = new Map<string, ApplicantRow>()
    if (applicantsRes.data) {
      applicantsRes.data.forEach((a: any) => {
        if (a.profile_id) applicantMap.set(a.profile_id, a as ApplicantRow)
      })
    }

    // Process Applicant Documents SYNCHRONOUSLY (Zero await inside loops!)
    const applicantDocsMap = new Map<string, SubmittedDocument[]>()
    const appReqs = appReqsRes.data || []
    const appMedia = appMediaRes.data || []
    if (appReqs.length > 0 || appMedia.length > 0) {
      const reqByIdMap = new Map<number, any>(appReqs.map((r: any) => [r.id, r]))

      appMedia.forEach((m: any) => {
        const profileId = m.profiles_id
        const reqRow = m.applicant_requirement_id ? reqByIdMap.get(m.applicant_requirement_id) : null
        const reqTemplateName = reqRow?.requirement_id ? templateMap.get(reqRow.requirement_id) : null
        const docName = reqTemplateName || m.description || m.filename || 'Applicant Document'

        if (profileId) {
          const currentDocs = applicantDocsMap.get(profileId) || []
          // Fast synchronous URL calculation:
          const publicUrl = this.getQuickPublicUrl(m.path)

          currentDocs.push({
            id: m.id,
            name: docName,
            filename: m.filename,
            mime_type: m.mime_type,
            size: m.size,
            path: m.path,
            publicUrl,
            status: reqRow?.status || 'submitted',
            remarks: m.description || reqRow?.remarks || null,
            created_at: m.created_at,
          })
          applicantDocsMap.set(profileId, currentDocs)
        }
      })
    }

    // Process Employer Documents SYNCHRONOUSLY
    const employerDocsMap = new Map<number, SubmittedDocument[]>()
    const employerProfileDocsMap = new Map<string, SubmittedDocument[]>()
    const empReqs = empReqsRes.data || []
    const empMedia = empMediaRes.data || []
    if (empReqs.length > 0 || empMedia.length > 0) {
      const reqByIdMap = new Map<number, any>(empReqs.map((r: any) => [r.id, r]))

      empMedia.forEach((m: any) => {
        const reqRow = m.employer_requirement_id ? reqByIdMap.get(m.employer_requirement_id) : null
        const reqTemplateName = reqRow?.requirement_id ? templateMap.get(reqRow.requirement_id) : null
        const docName = reqTemplateName || m.description || m.filename || 'Company Requirement'
        const companyId = reqRow?.employer_id
        const profileId = m.profile_id
        const publicUrl = this.getQuickPublicUrl(m.path)

        const docItem: SubmittedDocument = {
          id: m.id,
          name: docName,
          filename: m.filename,
          mime_type: m.mime_type,
          size: m.size,
          path: m.path,
          publicUrl,
          status: reqRow?.status || 'submitted',
          remarks: m.description || reqRow?.remarks || null,
          created_at: m.created_at,
        }

        if (companyId) {
          const list = employerDocsMap.get(companyId) || []
          list.push(docItem)
          employerDocsMap.set(companyId, list)
        }
        if (profileId) {
          const list = employerProfileDocsMap.get(profileId) || []
          list.push(docItem)
          employerProfileDocsMap.set(profileId, list)
        }
      })
    }

    const profileMediaMap = new Map<string, string>()
    if (profileMediaRes.data && Array.isArray(profileMediaRes.data)) {
      profileMediaRes.data.forEach((pm: any) => {
        if (pm?.profile_id && !profileMediaMap.has(pm.profile_id)) {
          const url = pm.public_url || (pm.path ? mediaService.getPublicUrl(pm.path, 'media') : null)
          if (url) profileMediaMap.set(pm.profile_id, url)
        }
      })
    }

    // Assemble final records
    return profiles.map((p) => {
      const isCompanyRole = p.role === 'company_owner' || p.role === 'company_member'
      const category = isCompanyRole ? 'company' : 'applicant'
      const company = companyMap.get(p.id) ?? null
      const applicant = applicantMap.get(p.id) ?? null
      const avatarUrl = profileMediaMap.get(p.id) ?? null

      let documents: SubmittedDocument[] = []

      if (category === 'company') {
        if (company?.id && employerDocsMap.has(company.id)) {
          documents = employerDocsMap.get(company.id)!
        } else if (employerProfileDocsMap.has(p.id)) {
          documents = employerProfileDocsMap.get(p.id)!
        }
      } else {
        if (applicantDocsMap.has(p.id)) {
          documents = applicantDocsMap.get(p.id)!
        }
      }

      return {
        ...p,
        email: emailMap.get(p.id) ?? null,
        avatarUrl,
        category,
        companyDetails: company,
        applicantDetails: applicant,
        documents,
        documentCount: documents.length,
        hasDocuments: documents.length > 0,
      } as DirectoryProfileRow
    })
  },

  async updateAccountStatus(profileId: string, status: string): Promise<DirectoryProfileRow> {
    const normalizedStatus = normalizeProfileStatus(status)

    const { data, error } = await supabase
      .schema('core')
      .from('profiles')
      .update({ status: normalizedStatus, updated_at: new Date().toISOString() })
      .eq('id', profileId)
      .select()
      .single()

    if (error || !data) {
      throw new Error(error?.message || 'Failed to update account status')
    }

    const isCompanyRole = data.role === 'company_owner' || data.role === 'company_member'
    const category = isCompanyRole ? 'company' : 'applicant'

    return {
      ...data,
      category,
    } as DirectoryProfileRow
  },

  async updateDocumentStatus(
    documentId: number,
    newStatus: string,
    isApplicantDoc: boolean
  ): Promise<void> {
    const normalizedStatus = normalizeRequirementStatus(newStatus)

    if (isApplicantDoc) {
      const { data: docData, error: docError } = await supabase
        .schema('applicants')
        .from('applicant_requirement_media')
        .select('applicant_requirement_id')
        .eq('id', documentId)
        .single()

      if (docError || !docData?.applicant_requirement_id) {
        throw new Error(docError?.message || 'Document or requirement link not found')
      }

      const { error: updateError } = await supabase
        .schema('applicants')
        .from('applicant_requirements')
        .update({ status: normalizedStatus })
        .eq('id', docData.applicant_requirement_id)

      if (updateError) throw new Error(updateError.message || 'Failed to update document status')
    } else {
      const { data: docData, error: docError } = await supabase
        .schema('employers')
        .from('employer_requirement_media')
        .select('employer_requirement_id')
        .eq('id', documentId)
        .single()

      if (docError || !docData?.employer_requirement_id) {
        throw new Error(docError?.message || 'Document or requirement link not found')
      }

      const { error: updateError } = await supabase
        .schema('employers')
        .from('employer_requirements')
        .update({ status: normalizedStatus })
        .eq('id', docData.employer_requirement_id)

      if (updateError) throw new Error(updateError.message || 'Failed to update document status')
    }
  },

  async viewSubmittedFile(doc: SubmittedDocument): Promise<void> {
    const resolvedUrl = await this.getDocumentViewUrl(doc.path)
    const finalUrl = resolvedUrl || doc.publicUrl

    if (finalUrl) {
      window.open(finalUrl, '_blank', 'noopener')
    }
  },

  async downloadSubmittedFile(doc: SubmittedDocument): Promise<void> {
    const resolvedUrl = await this.getDocumentViewUrl(doc.path)
    const finalUrl = resolvedUrl || doc.publicUrl
    if (!finalUrl) return

    try {
      const res = await fetch(finalUrl)
      if (!res.ok) throw new Error('Failed to fetch file')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.filename || doc.name || 'document'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch {
      window.open(finalUrl, '_blank', 'noopener')
    }
  },
}