-- ==============================================================================
-- Migration: 001_ocr_setup.sql
-- Description: Sets up Supabase storage bucket 'applicant-forms' and 
--              'applicant_forms' table for storing OCR extracted handwritten data.
-- ==============================================================================

-- 1. Create Storage Bucket for Applicant Forms (Private Bucket)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'applicant-forms',
    'applicant-forms',
    false,
    20971520, -- 20MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage Policies for 'applicant-forms' Bucket
-- Allow authenticated users to upload files into the bucket
CREATE POLICY "Authenticated users can upload applicant form images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'applicant-forms');

-- Allow authenticated users to read their own or authorized form uploads
CREATE POLICY "Authenticated users can view applicant form images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'applicant-forms');

-- Allow users to update their own uploads
CREATE POLICY "Authenticated users can update applicant form images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'applicant-forms');

-- Allow users to delete their uploads
CREATE POLICY "Authenticated users can delete applicant form images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'applicant-forms');


-- 3. Create 'applicant_forms' Table
CREATE TABLE IF NOT EXISTS public.applicant_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    file_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
    extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    raw_ocr_response JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for querying by user and status
CREATE INDEX IF NOT EXISTS idx_applicant_forms_user_id ON public.applicant_forms(user_id);
CREATE INDEX IF NOT EXISTS idx_applicant_forms_created_at ON public.applicant_forms(created_at DESC);

-- 4. Enable Row Level Security (RLS) on 'applicant_forms'
ALTER TABLE public.applicant_forms ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own records
CREATE POLICY "Users can insert their own applicant forms"
ON public.applicant_forms
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Allow authenticated users to view their own records (or all for staff/admins)
CREATE POLICY "Users can view their own applicant forms"
ON public.applicant_forms
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR auth.role() = 'authenticated');

-- Allow users to update their own records
CREATE POLICY "Users can update their own applicant forms"
ON public.applicant_forms
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR auth.role() = 'authenticated');

-- 5. Updated_at Trigger Function
CREATE OR REPLACE FUNCTION public.set_applicant_forms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_applicant_forms_updated_at ON public.applicant_forms;
CREATE TRIGGER trigger_applicant_forms_updated_at
BEFORE UPDATE ON public.applicant_forms
FOR EACH ROW
EXECUTE FUNCTION public.set_applicant_forms_updated_at();
