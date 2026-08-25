// ==============================================================================
// Supabase Edge Function: process-ocr
// Description: Extracts structured data from handwritten & printed forms using
//              Google Gemini Vision API (Multimodal OCR).
// ==============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

// Standard CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Convert ArrayBuffer / Uint8Array to Base64 in Deno
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

serve(async (req: Request) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Validate Gemini API Key
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({
          error:
            'GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your Supabase project secrets or local .env file.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // 3. Parse Request Payload
    const body = await req.json().catch(() => ({}))
    const { image_path, image_url, image_base64, image_base64_list, mime_type = 'image/jpeg', applicant_id } = body

    const hasMultiImage = Array.isArray(image_base64_list) && image_base64_list.length > 0

    if (!image_path && !image_url && !image_base64 && !hasMultiImage) {
      return new Response(
        JSON.stringify({
          error: 'Missing image input. Provide image_path, image_url, image_base64, or image_base64_list.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Initialize Supabase client for storage and DB persistence
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

    // 4. Retrieve Image(s) as Base64 Data
    const imageParts: Array<{ mime_type: string; data: string }> = []

    if (hasMultiImage) {
      for (const item of image_base64_list) {
        let b64 = item.data || ''
        let mt = item.mime_type || 'image/jpeg'
        if (b64.includes(';base64,')) {
          const parts = b64.split(';base64,')
          const match = parts[0].match(/data:(.*?)$/)
          if (match) mt = match[1]
          b64 = parts[1]
        }
        if (b64) {
          imageParts.push({ mime_type: mt, data: b64 })
        }
      }
    } else if (image_base64) {
      let finalBase64 = image_base64
      let detectedMimeType = mime_type
      if (image_base64.includes(';base64,')) {
        const parts = image_base64.split(';base64,')
        const match = parts[0].match(/data:(.*?)$/)
        if (match) detectedMimeType = match[1]
        finalBase64 = parts[1]
      }
      imageParts.push({ mime_type: detectedMimeType, data: finalBase64 })
    } else if (image_path) {
      if (!supabase) {
        throw new Error('Supabase client credentials missing to fetch image from storage bucket.')
      }

      const { data: fileData, error: downloadError } = await supabase.storage
        .from('applicant-forms')
        .download(image_path)

      if (downloadError || !fileData) {
        throw new Error(`Failed to download image from storage: ${downloadError?.message || 'File not found'}`)
      }

      const detectedMimeType = fileData.type || mime_type || 'image/jpeg'
      const arrayBuffer = await fileData.arrayBuffer()
      imageParts.push({ mime_type: detectedMimeType, data: arrayBufferToBase64(arrayBuffer) })
    } else if (image_url) {
      const response = await fetch(image_url)
      if (!response.ok) {
        throw new Error(`Failed to fetch image URL: HTTP ${response.status} ${response.statusText}`)
      }
      const contentType = response.headers.get('content-type')
      const detectedMimeType = contentType ? contentType.split(';')[0] : mime_type
      const arrayBuffer = await response.arrayBuffer()
      imageParts.push({ mime_type: detectedMimeType, data: arrayBufferToBase64(arrayBuffer) })
    }

    if (imageParts.length === 0) {
      throw new Error('Image data is empty or could not be loaded.')
    }

    // 5. Build Gemini Multimodal Prompt & System Instructions
    const systemPrompt = `You are an expert OCR AI specializing in reading scanned Philippine DOLE NSRP Form 1 (National Skills Registration Program Jobseeker Registration Form).
You are analyzing images belonging to ONE single applicant's application.
The images provided represent Page 1 (Front - Personal Information & Educational Background) and Page 2 (Back - Work Experience, Other Skills, and Signatures) of this applicant.

CRITICAL EXTRACTION RULES:

1. ABSOLUTE PROHIBITION AGAINST TEMPLATE LABELS:
   - You MUST NOT output pre-printed form guide labels, section titles, column headers, or instruction notes (such as "SURNAME", "FIRST NAME", "MIDDLE NAME", "1.1 SURNAME", "1.2 FIRST NAME", "OFMONTHS, ORES POSITION", "Date, of Assessor", "Signature over Printed Name", "JOBSEEKER REGISTRATION FORM", "NSRP Form 1").
   - Extract ONLY the HANDWRITTEN ink or typed responses filled in by the applicant or PESO officer.
   - If a field box is empty or has no handwritten response, you MUST return null. Never use the field label as the value.

2. FIELD-BY-FIELD INSTRUCTIONS (Page 1):
   - "surname": The applicant's handwritten last/family name written in the SURNAME box. (e.g., "DELA CRUZ", "RIVERA", "VILLAMOR").
   - "firstName": The applicant's handwritten given name written in the FIRST NAME box. (e.g., "JUAN", "DENMARK", "MARIA").
   - "middleName": The handwritten middle name or initial. (e.g., "SANTOS", "B.").
   - "suffix": Name suffix like "JR", "SR", "III", or null if blank.
   - "sex": "Male" or "Female" based on the checked box or written text.
   - "dateOfBirth": Date written in DATE OF BIRTH field formatted as YYYY-MM-DD (e.g., "1998-05-14"). If format is ambiguous, return the string.
   - "age": The handwritten integer age (e.g., 24).
   - "civilStatus": "Single", "Married", "Widowed", or "Separated" based on checkbox/text.
   - "religion": Handwritten religion (e.g., "Roman Catholic", "Islam", "Christian").
   - "tin", "sss", "philhealth": ID numbers if written, else null.
   - "contactNumber": Mobile/cellphone number (e.g., "09123456789").
   - "email": Email address if written, else null.
   - "address.houseStreet": House No., Street, Purok (e.g., "Purok 3", "Sitio Riverside").
   - "address.barangay": Barangay name (e.g., "Poblacion", "Patin-ay", "San Teodoro", "Bajuoan").
   - "address.municipality": Agusan del Sur municipality (e.g., "Prosperidad", "Bayugan", "San Francisco", "Trento", "Bunawan", "Rosario", "Talacogon", "Esperanza", "Loreto", "La Paz", "San Luis", "Veruela", "Santa Josefa", "Sibagat").
   - "address.province": Province (defaults to "Agusan del Sur").
   - "educationalLevel": Highest educational level (e.g., "College Graduate", "High School Graduate", "Senior High School", "Vocational").
   - "course": Degree/course studied (e.g., "Bachelor of Science in Information Technology", "BS Criminology", "BS Business Administration", "BS Agriculture", "General Academic Strand").
   - "school": School or university name (e.g., "ASSCAT", "PNU Mindanao", "Agusan del Sur College").
   - "yearGraduated": Year graduated (e.g., "2023", "2022").

3. FIELD-BY-FIELD INSTRUCTIONS (Page 2):
   - "workExperience": Array of handwritten work experience rows [{ jobTitle, company, duration, description }]. If none, return [].
   - "skills": Array of handwritten skills (e.g., ["Computer Literacy", "Driving", "Carpentry"]).
   - "is4ps": true if 4Ps box is checked, false otherwise.
   - "hasDisability": true if PWD box is checked, false otherwise.
   - "employmentStatus": "Unemployed", "Employed", "Self-employed", etc.
   - "preferredOccupations": Array of handwritten preferred occupations.

4. CONFIDENCE & NOTES:
   - "confidenceScore": 0.0 to 1.0 based on legibility of handwriting.
   - "extractedNotes": Any notes regarding readability.`

    const promptText = `Extract all filled-in applicant information from this NSRP Form 1 document into this exact JSON schema:
{
  "personalInfo": {
    "surname": string | null,
    "firstName": string | null,
    "middleName": string | null,
    "suffix": string | null,
    "sex": "Male" | "Female" | null,
    "dateOfBirth": string | null,
    "age": number | null,
    "civilStatus": string | null,
    "religion": string | null,
    "tin": string | null,
    "sss": string | null,
    "philhealth": string | null,
    "contactNumber": string | null,
    "email": string | null,
    "address": {
      "houseStreet": string | null,
      "barangay": string | null,
      "municipality": string | null,
      "province": string | null
    }
  },
  "education": {
    "educationalLevel": string | null,
    "course": string | null,
    "school": string | null,
    "yearGraduated": string | null
  },
  "workExperience": [
    {
      "jobTitle": string,
      "company": string,
      "duration": string,
      "description": string
    }
  ],
  "skills": string[],
  "otherDetails": {
    "is4ps": boolean | null,
    "hasDisability": boolean | null,
    "employmentStatus": string | null,
    "preferredOccupations": string[]
  },
  "confidenceScore": number,
  "extractedNotes": string | null
}

REMEMBER: Extract ONLY handwritten or filled-in values. NEVER output printed form labels (e.g. SURNAME, FIRST NAME, Date of Assessor) as values.`

    // 6. Call Google Gemini Vision API (gemini-3.7-flash with structured JSON output)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=${geminiApiKey}`

    const contentParts: Array<Record<string, any>> = [
      { text: `${systemPrompt}\n\n${promptText}` },
    ]
    for (const img of imageParts) {
      contentParts.push({
        inline_data: {
          mime_type: img.mime_type,
          data: img.data,
        },
      })
    }

    const requestPayload = {
      contents: [
        {
          role: 'user',
          parts: contentParts,
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.1,
        max_output_tokens: 4096,
      },
    }

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    })

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.error('Gemini API Error:', errText)
      throw new Error(`Google Gemini Vision API request failed (${geminiRes.status}): ${errText}`)
    }

    const geminiData = await geminiRes.json()
    const rawContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!rawContent) {
      throw new Error('Gemini API returned an empty text response.')
    }

    // 7. Parse Extracted JSON
    let extractedJson: any = {}
    try {
      extractedJson = JSON.parse(rawContent)
    } catch (parseErr) {
      const cleaned = rawContent.replace(/```json\n?|\n?```/g, '').trim()
      extractedJson = JSON.parse(cleaned)
    }

    // 8. Persist to Supabase Database (if database is accessible)
    let savedRecordId: string | null = null
    if (supabase) {
      try {
        const { data: record, error: insertError } = await supabase
          .from('applicant_forms')
          .insert({
            user_id: applicant_id || null,
            file_path: image_path || image_url || 'direct_upload',
            status: 'processed',
            extracted_data: extractedJson,
            raw_ocr_response: geminiData,
          })
          .select('id')
          .single()

        if (record) {
          savedRecordId = record.id
        } else if (insertError) {
          console.warn('Could not persist to applicant_forms table (continuing):', insertError.message)
        }
      } catch (dbErr) {
        console.warn('Database insert skipped:', dbErr)
      }
    }

    // 9. Return JSON Response to Client
    return new Response(
      JSON.stringify({
        success: true,
        data: extractedJson,
        form_id: savedRecordId,
        metadata: {
          file_path: image_path || null,
          model: 'gemini-2.0-flash',
          processed_at: new Date().toISOString(),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('OCR Processing Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred while processing the form.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
