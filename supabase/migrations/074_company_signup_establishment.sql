-- =============================================================================
-- Migration: 074_company_signup_establishment.sql
-- Purpose:   A company account registers its NSRP Form 2 (employers.establishments) at signup,
--            together with employers.companies. Form 2 is the source of the company's details.
--              1. employers.find_unclaimed_establishments: during signup (before the account
--                 exists), finds a Form 2 PESO already encoded for the same establishment, by exact
--                 TIN or exact business name, so the owner can link it instead of creating a duplicate
--              2. employers.register_company_establishment: after the company row exists, links the
--                 chosen unclaimed Form 2 to the company (keeping its job fair / LRA / SRA history)
--                 or files a new one
--              3. employers.guard_establishment_review: lets that link set company_id once, on a row
--                 that had none (RLS keeps clients from updating unlinked rows directly)
--
--            A linked or new Form 2 is always 'Pending': PESO re-verifies the company's data and
--            that the account really is that establishment.
-- Schemas:   employers
-- Safe to re-run.
-- =============================================================================

BEGIN;

-- ─── 1. Match search (signup, before sign-in) ───────────────────────────────
-- Exact matches only, and only name / place: enough for the owner to recognize their establishment,
-- not a directory to browse. Rows already linked to an account are never offered.

CREATE OR REPLACE FUNCTION employers.find_unclaimed_establishments(p_tin TEXT, p_business_name TEXT)
RETURNS TABLE (
  id UUID,
  business_name TEXT,
  trade_name TEXT,
  city_municipality TEXT,
  province TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT e.id, e.business_name, e.trade_name, e.city_municipality, e.province
  FROM employers.establishments e
  WHERE e.company_id IS NULL
    AND (
      (
        length(regexp_replace(coalesce(p_tin, ''), '\D', '', 'g')) >= 9
        AND regexp_replace(coalesce(e.tin, ''), '\D', '', 'g') = regexp_replace(p_tin, '\D', '', 'g')
      )
      OR (
        length(btrim(coalesce(p_business_name, ''))) >= 3
        AND lower(btrim(e.business_name)) = lower(btrim(p_business_name))
      )
    )
  ORDER BY e.business_name
  LIMIT 5;
$$;

REVOKE ALL ON FUNCTION employers.find_unclaimed_establishments(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION employers.find_unclaimed_establishments(TEXT, TEXT) TO anon, authenticated;


-- ─── 2. Guard: an unlinked Form 2 may be linked once, to the caller's own company ──
-- Same as 038 (trusted sessions without auth.uid(), PESO-encoded rows start Verified) with
-- municipal_peso as staff (DATABASE.md, migration 040), plus the one-time company link.

CREATE OR REPLACE FUNCTION employers.guard_establishment_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  -- No auth.uid(): migration / SQL editor / service role, which are trusted
  v_is_staff BOOLEAN := auth.uid() IS NULL OR core.has_role('provincial_peso', 'admin', 'municipal_peso');
BEGIN
  NEW.updated_at := now();

  IF NOT v_is_staff THEN
    -- Companies file their own Form 2; review fields stay with PESO
    IF TG_OP = 'INSERT' THEN
      NEW.source := 'self_registered';
      NEW.created_by := auth.uid();
    ELSE
      -- Linking a PESO-encoded Form 2 (register_company_establishment) sets company_id once
      IF OLD.company_id IS NOT NULL
         OR NEW.company_id IS NULL
         OR NOT employers.is_company_owner(NEW.company_id) THEN
        NEW.company_id := OLD.company_id;
      END IF;
      NEW.source := OLD.source;
      NEW.created_by := OLD.created_by;
    END IF;
    NEW.status := 'Pending';
    NEW.remarks := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.remarks END;
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    RETURN NEW;
  END IF;

  -- Staff typed it in themselves, so it needs no separate review
  IF TG_OP = 'INSERT' AND NEW.source = 'peso_encoded' AND NEW.status = 'Pending' THEN
    NEW.status := 'Verified';
  END IF;

  -- Stamp who reviewed and when; clear it when sent back to Pending
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'Pending' THEN
      NEW.reviewed_by := NULL;
      NEW.reviewed_at := NULL;
    ELSE
      NEW.reviewed_by := auth.uid();
      NEW.reviewed_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION employers.guard_establishment_review() FROM PUBLIC, anon, authenticated;


-- ─── 3. Register the company's Form 2 ───────────────────────────────────────

/**
 * Files the signed-in owner's Form 2 for p_company_id. p_form holds the Form 2 columns
 * (business_name ... email_address). With p_establishment_id, that unlinked PESO-encoded row is
 * linked to the company and updated with p_form; otherwise a new row is inserted.
 * Returns the establishment id.
 */
CREATE OR REPLACE FUNCTION employers.register_company_establishment(
  p_company_id UUID,
  p_form JSONB,
  p_establishment_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_form employers.establishments;
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL OR p_company_id IS NULL OR NOT employers.is_company_owner(p_company_id) THEN
    RAISE EXCEPTION 'Only the company owner can register its establishment' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM employers.establishments WHERE company_id = p_company_id) THEN
    RAISE EXCEPTION 'This company already has an NSRP Form 2.' USING ERRCODE = '23505';
  END IF;

  v_form := jsonb_populate_record(NULL::employers.establishments, p_form);

  IF p_establishment_id IS NOT NULL THEN
    UPDATE employers.establishments e
    SET company_id = p_company_id,
        business_name = v_form.business_name,
        trade_name = v_form.trade_name,
        acronym = v_form.acronym,
        tin = v_form.tin,
        employer_category = v_form.employer_category,
        public_employer_type = v_form.public_employer_type,
        private_employer_type = v_form.private_employer_type,
        is_main_office = coalesce(v_form.is_main_office, e.is_main_office),
        total_workforce = v_form.total_workforce,
        industry_line = v_form.industry_line,
        street = v_form.street,
        barangay = v_form.barangay,
        city_municipality = v_form.city_municipality,
        province = v_form.province,
        owner_president_name = v_form.owner_president_name,
        contact_person_name = v_form.contact_person_name,
        contact_person_position = v_form.contact_person_position,
        telephone_number = v_form.telephone_number,
        mobile_number = v_form.mobile_number,
        fax_number = v_form.fax_number,
        email_address = v_form.email_address
    WHERE e.id = p_establishment_id
      AND e.company_id IS NULL
    RETURNING e.id INTO v_id;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'That establishment is already linked to another account. Contact PESO.' USING ERRCODE = 'P0002';
    END IF;
    RETURN v_id;
  END IF;

  INSERT INTO employers.establishments (
    company_id, business_name, trade_name, acronym, tin, employer_category, public_employer_type,
    private_employer_type, is_main_office, total_workforce, industry_line, street, barangay,
    city_municipality, province, owner_president_name, contact_person_name, contact_person_position,
    telephone_number, mobile_number, fax_number, email_address
  )
  VALUES (
    p_company_id, v_form.business_name, v_form.trade_name, v_form.acronym, v_form.tin,
    v_form.employer_category, v_form.public_employer_type, v_form.private_employer_type,
    coalesce(v_form.is_main_office, true), v_form.total_workforce, v_form.industry_line, v_form.street,
    v_form.barangay, v_form.city_municipality, v_form.province, v_form.owner_president_name,
    v_form.contact_person_name, v_form.contact_person_position, v_form.telephone_number,
    v_form.mobile_number, v_form.fax_number, v_form.email_address
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION employers.register_company_establishment(UUID, JSONB, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION employers.register_company_establishment(UUID, JSONB, UUID) TO authenticated;

COMMIT;
