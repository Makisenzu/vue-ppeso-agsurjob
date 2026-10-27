// ==============================================================================
// Service: ocrVisionService.ts
// Description: Handles storage uploads and calls Gemini Vision API through the
//              Supabase Edge Function 'process-ocr' (supabase/functions/process-ocr).
//              The Gemini key and the prompts live only there: anything the browser
//              holds can be read in DevTools.
// ==============================================================================

import { supabase } from '@/lib/supabaseClient'
import type { ApplicantFormOcrData, OcrProcessResponse } from '@/types/common/ocrVision'

export const ocrVisionService = {
  /**
   * Converts a File object to a base64 string
   */
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
        } else {
          reject(new Error('Failed to read file as base64 string.'))
        }
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  },

  /**
   * Uploads an applicant form image or scanned document to the 'applicant-forms' storage bucket
   */
  async uploadFormImage(file: File, folder = 'forms'): Promise<{ path: string; fullPath: string }> {
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${safeName}`

    const { data, error } = await supabase.storage
      .from('applicant-forms')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'image/jpeg',
      })

    if (error) {
      throw new Error(`Failed to upload form image to storage: ${error.message}`)
    }

    return {
      path: data.path,
      fullPath: data.fullPath,
    }
  },

  /**
   * Gets a temporary signed URL for a private storage image
   */
  async getSignedUrl(filePath: string, expiresIn = 3600): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from('applicant-forms')
        .createSignedUrl(filePath, expiresIn)

      if (error || !data) return null
      return data.signedUrl
    } catch {
      return null
    }
  },

  /**
   * Reads an NSRP form image with Gemini Vision through the 'process-ocr' Edge Function, which checks
   * the caller's session and role (Provincial PESO / admin) and keeps the Gemini key server-side.
   */
  async processOcrWithGemini(params: {
    imagePath?: string
    imageBase64?: string
    imageBase64List?: Array<{ data: string; mime_type: string }>
    mimeType?: string
    applicantId?: string
  }): Promise<OcrProcessResponse> {
    // Collect image parts
    let imageParts: Array<{ data: string; mime_type: string }> = []
    if (params.imageBase64List && params.imageBase64List.length > 0) {
      imageParts = params.imageBase64List
    } else if (params.imageBase64) {
      imageParts = [{ data: params.imageBase64, mime_type: params.mimeType || 'image/jpeg' }]
    }

    const payload = {
      image_path: params.imagePath,
      image_base64: params.imageBase64 || (imageParts[0]?.data),
      image_base64_list: params.imageBase64List || imageParts,
      mime_type: params.mimeType || 'image/jpeg',
      applicant_id: params.applicantId,
    }

    const { data, error } = await supabase.functions.invoke<OcrProcessResponse>('process-ocr', {
      body: payload,
    })

    if (error) {
      // Non-2xx responses carry the function's own message (e.g. 401 / 403) in the body
      const body = await (error as any).context?.json?.().catch(() => null)
      throw new Error(body?.error || error.message || 'Edge function process-ocr invocation failed.')
    }

    if (!data) {
      throw new Error('Received an empty response from process-ocr function.')
    }

    if (!data.success && data.error) {
      throw new Error(data.error)
    }

    return data
  },

  /**
   * Persists or updates the verified/edited form data into the 'applicant_forms' table
   */
  async saveApplicantFormRecord(params: {
    filePath: string
    extractedData: ApplicantFormOcrData
    applicantId?: string
    formId?: string | null
  }) {
    if (params.formId) {
      const { data, error } = await (supabase.from('applicant_forms' as any) as any)
        .update({
          extracted_data: params.extractedData,
          status: 'processed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.formId)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    } else {
      const { data, error } = await (supabase.from('applicant_forms' as any) as any)
        .insert({
          user_id: params.applicantId || null,
          file_path: params.filePath,
          status: 'processed',
          extracted_data: params.extractedData,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    }
  },
}
