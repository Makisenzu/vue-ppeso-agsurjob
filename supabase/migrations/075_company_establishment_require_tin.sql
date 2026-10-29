-- =============================================================================
-- Migration: 075_company_establishment_require_tin.sql
-- Purpose:   A company account's NSRP Form 2 must have a TIN. employers.register_company_establishment
--            (migration 074) now rejects a form without a valid BIR TIN (9 digits, optional 3–5 digit
--            branch code, dashes optional), the same rule as the employer complete-profile form.
--            PESO-encoded establishments keep TIN optional (column stays nullable).
-- Schemas:   employers
-- Safe to re-run.
-- =============================================================================

BEGIN;

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

  v_form.tin := btrim(coalesce(v_form.tin, ''));
  IF v_form.tin = '' THEN
    RAISE EXCEPTION 'TIN is required.' USING ERRCODE = '23502';
  END IF;
  IF v_form.tin !~ '^\d{3}-?\d{3}-?\d{3}(-?\d{3,5})?$' THEN
    RAISE EXCEPTION 'Enter a valid TIN, e.g. 123-456-789-000.' USING ERRCODE = '22023';
  END IF;

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
