-- ============================================================================
-- Seed: core.skills + core.skill_aliases (migration 099)
-- ============================================================================
-- The skill list employers and applicants pick from, and the other wordings
-- people type for each skill ("Good in public speaking" → Public Speaking,
-- "MS Excel" → Microsoft Excel). 255 skills in 19 categories, 1000 wordings:
--
--   Soft Skills and Communication & Language: what job orders ask for in plain
--     words (teamwork, public speaking, honesty, fluent in English, ...).
--   Technical and trade skills, with the TESDA qualification titles (NC I–III)
--     as other wordings so "SMAW NC II" or "Cookery NC II" match.
--   The 17 NSRP Form 1 checklist names (seeded by 099) keep their exact wording.
--
-- How to edit: one line per skill — name, category, source, sort order and its
-- other wordings. A wording may belong to one skill only and may never be a
-- skill's name. Keep categories in step with SKILL_CATEGORY_OPTIONS
-- (src/helpers/common/skillHelper.ts).
--
-- Re-runnable: skills are matched by name and updated (category, source, sort
-- order, shown again); wordings are added when new and left alone otherwise.
-- Skills and wordings PESO added on the Skill List page are never touched, and
-- a seeded name or wording that PESO already used elsewhere is skipped instead
-- of failing the run (the skipped ones are listed as NOTICEs).
--
-- Run in the Supabase SQL editor after migration 099. After migration 100, new
-- wordings relink existing postings and applicants by themselves.
-- ============================================================================

BEGIN;

CREATE TEMP TABLE seed_skills (
  name        TEXT     NOT NULL,
  category    TEXT     NOT NULL,
  source      TEXT     NOT NULL,
  sort_order  SMALLINT NOT NULL,
  aliases     TEXT[]   NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_skills (name, category, source, sort_order, aliases)
VALUES
  -- ─── Soft Skills ───────────────────────────────────────────────────────────────
  ('Communication Skills', 'Soft Skills', 'peso', 101, ARRAY['Communication', 'Good Communication Skills', 'Good Communication', 'Excellent Communication Skills', 'Strong Communication Skills', 'Effective Communication', 'Good Communicator', 'Interpersonal Communication', 'Oral and Written Communication']::TEXT[]),
  ('Public Speaking', 'Soft Skills', 'peso', 102, ARRAY['Good in Public Speaking', 'Good at Public Speaking', 'Public Speaker', 'Speaking in Public', 'Oral Presentation', 'Presentation Skills', 'Confident in Public Speaking']::TEXT[]),
  ('Written Communication', 'Soft Skills', 'peso', 103, ARRAY['Writing Skills', 'Good Writing Skills', 'Business Writing', 'Report Writing', 'Letter Writing', 'Technical Writing']::TEXT[]),
  ('Active Listening', 'Soft Skills', 'peso', 104, ARRAY['Good Listener', 'Listening Skills', 'Listening']::TEXT[]),
  ('Interpersonal Skills', 'Soft Skills', 'peso', 105, ARRAY['People Skills', 'Good Interpersonal Skills', 'Good Interpersonal Relationship', 'Relating With People', 'Good With People', 'Approachable']::TEXT[]),
  ('Teamwork', 'Soft Skills', 'peso', 106, ARRAY['Team Player', 'Team Work', 'Good Team Player', 'Working in a Team', 'Can Work in a Team', 'Collaboration', 'Cooperative']::TEXT[]),
  ('Leadership', 'Soft Skills', 'peso', 107, ARRAY['Leadership Skills', 'Good Leadership Skills', 'Team Leadership', 'Leader', 'Can Lead a Team']::TEXT[]),
  ('Problem Solving', 'Soft Skills', 'peso', 108, ARRAY['Problem-Solving', 'Problem Solver', 'Problem-Solving Skills', 'Good Problem Solver']::TEXT[]),
  ('Critical Thinking', 'Soft Skills', 'peso', 109, ARRAY['Analytical Thinking', 'Analytical Skills', 'Logical Thinking', 'Analytical']::TEXT[]),
  ('Decision Making', 'Soft Skills', 'peso', 110, ARRAY['Decision-Making', 'Sound Judgment', 'Good Judgment']::TEXT[]),
  ('Time Management', 'Soft Skills', 'peso', 111, ARRAY['Good Time Management', 'Managing Time', 'Meeting Deadlines', 'Can Meet Deadlines']::TEXT[]),
  ('Working Under Pressure', 'Soft Skills', 'peso', 112, ARRAY['Can Work Under Pressure', 'Works Well Under Pressure', 'Ability to Work Under Pressure', 'Willing to Work Under Pressure', 'Stress Management', 'Handles Pressure Well']::TEXT[]),
  ('Attention to Detail', 'Soft Skills', 'peso', 113, ARRAY['Detail-Oriented', 'Detail Oriented', 'Keen Eye for Detail', 'Meticulous', 'Accuracy', 'Keen to Details']::TEXT[]),
  ('Organizational Skills', 'Soft Skills', 'peso', 114, ARRAY['Organized', 'Well-Organized', 'Well Organized', 'Planning and Organizing', 'Organizing']::TEXT[]),
  ('Multitasking', 'Soft Skills', 'peso', 115, ARRAY['Multi-Tasking', 'Can Multitask', 'Ability to Multitask', 'Multi Tasking']::TEXT[]),
  ('Adaptability', 'Soft Skills', 'peso', 116, ARRAY['Adaptable', 'Flexible', 'Flexibility', 'Can Adapt to Change', 'Adjusts Easily']::TEXT[]),
  ('Willingness to Learn', 'Soft Skills', 'peso', 117, ARRAY['Willing to Learn', 'Eager to Learn', 'Quick Learner', 'Fast Learner', 'Trainable', 'Teachable', 'Willing to Be Trained']::TEXT[]),
  ('Work Ethic', 'Soft Skills', 'peso', 118, ARRAY['Hardworking', 'Hard-Working', 'Hard Working', 'Diligent', 'Industrious', 'Dedicated', 'Committed', 'Strong Work Ethic']::TEXT[]),
  ('Reliability', 'Soft Skills', 'peso', 119, ARRAY['Reliable', 'Dependable', 'Responsible', 'Trustworthy']::TEXT[]),
  ('Honesty and Integrity', 'Soft Skills', 'peso', 120, ARRAY['Honest', 'Honesty', 'Integrity', 'Honest and Trustworthy']::TEXT[]),
  ('Punctuality', 'Soft Skills', 'peso', 121, ARRAY['Punctual', 'Always on Time', 'Good Attendance', 'Good Attendance Record']::TEXT[]),
  ('Initiative', 'Soft Skills', 'peso', 122, ARRAY['Self-Starter', 'Self Starter', 'Self-Motivated', 'Self Motivated', 'Proactive', 'Resourceful', 'Resourcefulness']::TEXT[]),
  ('Working Independently', 'Soft Skills', 'peso', 123, ARRAY['Can Work Independently', 'Works Independently', 'Independent Worker', 'Can Work With Minimal Supervision', 'Minimal Supervision', 'Can Work With Little Supervision']::TEXT[]),
  ('Conflict Resolution', 'Soft Skills', 'peso', 124, ARRAY['Conflict Management', 'Handling Conflicts', 'Dispute Resolution']::TEXT[]),
  ('Negotiation', 'Soft Skills', 'peso', 125, ARRAY['Negotiation Skills', 'Negotiating', 'Good Negotiator', 'Persuasion', 'Persuasion Skills']::TEXT[]),
  ('Creativity', 'Soft Skills', 'peso', 126, ARRAY['Creative', 'Creative Thinking', 'Innovative', 'Innovation']::TEXT[]),
  ('Emotional Intelligence', 'Soft Skills', 'peso', 127, ARRAY['EQ', 'Empathy', 'Emotional Maturity', 'Empathetic']::TEXT[]),
  ('Patience', 'Soft Skills', 'peso', 128, ARRAY['Patient', 'Long Patience', 'Patience and Tolerance']::TEXT[]),
  ('Courtesy', 'Soft Skills', 'peso', 129, ARRAY['Courteous', 'Polite', 'Respectful', 'Good Manners', 'Friendly']::TEXT[]),
  ('Positive Attitude', 'Soft Skills', 'peso', 130, ARRAY['Good Attitude', 'With Positive Attitude', 'Positive Outlook', 'Optimistic', 'Good Work Attitude']::TEXT[]),
  ('Self-Confidence', 'Soft Skills', 'peso', 131, ARRAY['Confident', 'Confidence', 'Self-Confident', 'Self Confidence']::TEXT[]),
  ('Self-Discipline', 'Soft Skills', 'peso', 132, ARRAY['Disciplined', 'Discipline', 'Self Discipline']::TEXT[]),
  ('Professionalism', 'Soft Skills', 'peso', 133, ARRAY['Professional', 'Professional Attitude', 'Professional Demeanor']::TEXT[]),
  ('Customer Orientation', 'Soft Skills', 'peso', 134, ARRAY['Customer-Oriented', 'Customer Oriented', 'Customer Focus', 'Customer-Focused', 'Service-Oriented', 'Service Oriented']::TEXT[]),
  ('Physical Stamina', 'Soft Skills', 'peso', 135, ARRAY['Physically Fit', 'Physical Fitness', 'Good Physical Condition', 'Physically Strong', 'Can Lift Heavy Loads', 'Can Lift Heavy Objects']::TEXT[]),

  -- ─── Communication & Language ──────────────────────────────────────────────────
  ('English Communication', 'Communication & Language', 'peso', 201, ARRAY['Good in English', 'Good English Communication', 'Fluent in English', 'English Proficiency', 'Proficient in English', 'English Speaking', 'Spoken English', 'Oral and Written English', 'English Language', 'Good in Oral and Written English']::TEXT[]),
  ('Filipino Communication', 'Communication & Language', 'peso', 202, ARRAY['Good in Filipino', 'Fluent in Filipino', 'Filipino Language', 'Tagalog', 'Fluent in Tagalog']::TEXT[]),
  ('Cebuano / Bisaya Communication', 'Communication & Language', 'peso', 203, ARRAY['Bisaya', 'Cebuano', 'Binisaya', 'Fluent in Bisaya', 'Fluent in Cebuano']::TEXT[]),
  ('Translation and Interpretation', 'Communication & Language', 'peso', 204, ARRAY['Translation', 'Translator', 'Interpreting', 'Interpreter']::TEXT[]),
  ('Telephone Etiquette', 'Communication & Language', 'peso', 205, ARRAY['Phone Etiquette', 'Telephone Handling', 'Answering Phone Calls', 'Phone Handling']::TEXT[]),
  ('Sign Language', 'Communication & Language', 'peso', 206, ARRAY['Filipino Sign Language', 'FSL', 'Sign Language Interpretation']::TEXT[]),

  -- ─── Computer / ICT ────────────────────────────────────────────────────────────
  ('Computer Literate', 'Computer / ICT', 'nsrp', 4, ARRAY['Computer Literacy', 'Basic Computer', 'Computer Skills', 'Basic Computer Skills', 'Basic Computer Operation', 'Computer Operation', 'Knowledge in Computer', 'Computer Knowledge']::TEXT[]),
  ('Microsoft Office', 'Computer / ICT', 'peso', 302, ARRAY['MS Office', 'Microsoft Office Suite', 'MS Office Applications', 'Office Applications', 'Office Productivity Tools']::TEXT[]),
  ('Microsoft Excel', 'Computer / ICT', 'peso', 303, ARRAY['MS Excel', 'Excel', 'Spreadsheet', 'Spreadsheets', 'Advanced Excel', 'Excel Formulas', 'Pivot Tables']::TEXT[]),
  ('Microsoft Word', 'Computer / ICT', 'peso', 304, ARRAY['MS Word', 'Word Processing']::TEXT[]),
  ('Microsoft PowerPoint', 'Computer / ICT', 'peso', 305, ARRAY['MS PowerPoint', 'PowerPoint', 'Presentation Software']::TEXT[]),
  ('Google Workspace', 'Computer / ICT', 'peso', 306, ARRAY['G Suite', 'Google Suite', 'Google Docs', 'Google Sheets', 'Google Drive']::TEXT[]),
  ('Email Management', 'Computer / ICT', 'peso', 307, ARRAY['Email', 'Emailing', 'Email Correspondence', 'Outlook', 'Gmail']::TEXT[]),
  ('Internet Research', 'Computer / ICT', 'peso', 308, ARRAY['Online Research', 'Web Research', 'Research', 'Research Skills']::TEXT[]),
  ('Computer Systems Servicing', 'Computer / ICT', 'tesda', 309, ARRAY['CSS', 'CSS NC II', 'Computer Repair', 'Computer Hardware Servicing', 'Computer Technician', 'PC Troubleshooting', 'Computer Troubleshooting']::TEXT[]),
  ('Technical Support', 'Computer / ICT', 'peso', 310, ARRAY['IT Support', 'Tech Support', 'Help Desk', 'Helpdesk Support', 'Desktop Support']::TEXT[]),
  ('Network Administration', 'Computer / ICT', 'peso', 311, ARRAY['Networking', 'Computer Networking', 'Network Setup', 'LAN Setup', 'Network Technician']::TEXT[]),
  ('Cybersecurity', 'Computer / ICT', 'peso', 312, ARRAY['Information Security', 'Network Security', 'IT Security']::TEXT[]),
  ('Computer Programming', 'Computer / ICT', 'peso', 313, ARRAY['Programming', 'Programmer', 'Coding', 'Software Development', 'Software Developer']::TEXT[]),
  ('Web Development', 'Computer / ICT', 'peso', 314, ARRAY['Web Developer', 'Website Development', 'Full-stack Development', 'Full Stack Development', 'Full-Stack Developer', 'Front-end Development', 'Frontend Development', 'Back-end Development', 'Backend Development']::TEXT[]),
  ('Web Design', 'Computer / ICT', 'peso', 315, ARRAY['Web Designer', 'Website Design']::TEXT[]),
  ('UI/UX Design', 'Computer / ICT', 'peso', 316, ARRAY['UI Design', 'UX Design', 'User Interface Design', 'User Experience Design', 'UI/UX Designer']::TEXT[]),
  ('Mobile App Development', 'Computer / ICT', 'peso', 317, ARRAY['Mobile Development', 'App Development', 'Android Development', 'iOS Development']::TEXT[]),
  ('Database Management', 'Computer / ICT', 'peso', 318, ARRAY['Database Administration', 'Database', 'SQL', 'MySQL', 'PostgreSQL']::TEXT[]),
  ('Data Analysis', 'Computer / ICT', 'peso', 319, ARRAY['Data Analyst', 'Data Analytics', 'Statistical Analysis', 'Data Analysis Skills']::TEXT[]),
  ('Graphic Design', 'Computer / ICT', 'peso', 320, ARRAY['Graphic Designer', 'Graphics Design', 'Layout Design', 'Layout Artist']::TEXT[]),
  ('Adobe Photoshop', 'Computer / ICT', 'peso', 321, ARRAY['Photoshop', 'Photo Editing', 'Image Editing']::TEXT[]),
  ('Canva', 'Computer / ICT', 'peso', 322, ARRAY['Canva Design']::TEXT[]),
  ('Video Editing', 'Computer / ICT', 'peso', 323, ARRAY['Video Editor', 'Adobe Premiere', 'Premiere Pro', 'CapCut']::TEXT[]),
  ('Animation', 'Computer / ICT', 'tesda', 324, ARRAY['Animator', '2D Animation', '3D Animation', 'Animation NC II']::TEXT[]),
  ('Social Media Management', 'Computer / ICT', 'peso', 325, ARRAY['Social Media', 'Social Media Marketing', 'Social Media Manager', 'Facebook Page Management']::TEXT[]),
  ('Digital Marketing', 'Computer / ICT', 'peso', 326, ARRAY['Online Marketing', 'Internet Marketing']::TEXT[]),
  ('Search Engine Optimization', 'Computer / ICT', 'peso', 327, ARRAY['SEO', 'SEO Specialist']::TEXT[]),
  ('Content Writing', 'Computer / ICT', 'peso', 328, ARRAY['Content Writer', 'Copywriting', 'Copywriter', 'Blog Writing', 'Article Writing']::TEXT[]),
  ('Virtual Assistance', 'Computer / ICT', 'peso', 329, ARRAY['Virtual Assistant', 'VA', 'Online Assistant']::TEXT[]),
  ('AutoCAD', 'Computer / ICT', 'peso', 330, ARRAY['CAD', 'Computer-Aided Design', 'AutoCAD Drafting']::TEXT[]),

  -- ─── Office / Clerical ─────────────────────────────────────────────────────────
  ('Data Entry', 'Office / Clerical', 'peso', 401, ARRAY['Encoding', 'Data Encoding', 'Encoder', 'Data Encoder']::TEXT[]),
  ('Typing', 'Office / Clerical', 'peso', 402, ARRAY['Keyboarding', 'Typist', 'Fast Typing', 'Typing Skills']::TEXT[]),
  ('Clerical Work', 'Office / Clerical', 'peso', 403, ARRAY['Clerical', 'Clerk', 'Office Clerk', 'Clerical Skills', 'Office Work']::TEXT[]),
  ('Office Administration', 'Office / Clerical', 'peso', 404, ARRAY['Administrative Support', 'Administrative Assistant', 'Admin Assistant', 'Admin Work', 'Office Administration NC II']::TEXT[]),
  ('Receptionist Duties', 'Office / Clerical', 'peso', 405, ARRAY['Receptionist', 'Front Desk', 'Reception']::TEXT[]),
  ('Secretarial Work', 'Office / Clerical', 'peso', 406, ARRAY['Secretary', 'Secretarial Skills', 'Executive Assistance', 'Executive Assistant']::TEXT[]),
  ('Records Management', 'Office / Clerical', 'peso', 407, ARRAY['Filing', 'Record Keeping', 'Records Keeping', 'Document Filing']::TEXT[]),
  ('Document Preparation', 'Office / Clerical', 'peso', 408, ARRAY['Documentation', 'Document Processing', 'Paperwork', 'Preparing Reports']::TEXT[]),
  ('Scheduling', 'Office / Clerical', 'peso', 409, ARRAY['Calendar Management', 'Appointment Setting', 'Scheduling Appointments']::TEXT[]),
  ('Minutes Taking', 'Office / Clerical', 'peso', 410, ARRAY['Minute Taking', 'Taking Minutes', 'Note Taking']::TEXT[]),
  ('Stenography', 'Office / Clerical', 'nsrp', 16, ARRAY['Stenographer', 'Shorthand']::TEXT[]),
  ('Purchasing', 'Office / Clerical', 'peso', 412, ARRAY['Procurement', 'Purchaser', 'Buyer', 'Purchasing Assistant']::TEXT[]),
  ('Human Resources', 'Office / Clerical', 'peso', 413, ARRAY['HR', 'HR Management', 'Human Resource Management', 'HR Assistant']::TEXT[]),
  ('Recruitment', 'Office / Clerical', 'peso', 414, ARRAY['Recruiting', 'Talent Acquisition', 'Hiring', 'Recruiter']::TEXT[]),
  ('Payroll Processing', 'Office / Clerical', 'peso', 415, ARRAY['Payroll', 'Payroll Preparation', 'Payroll Management']::TEXT[]),
  ('Paralegal Work', 'Office / Clerical', 'peso', 416, ARRAY['Paralegal', 'Legal Assistant', 'Legal Research']::TEXT[]),

  -- ─── Finance & Accounting ──────────────────────────────────────────────────────
  ('Bookkeeping', 'Finance & Accounting', 'tesda', 501, ARRAY['Bookkeeper', 'Bookkeeping NC III']::TEXT[]),
  ('Accounting', 'Finance & Accounting', 'peso', 502, ARRAY['Accountant', 'Accounting Skills', 'General Accounting', 'Financial Accounting']::TEXT[]),
  ('Accounts Payable', 'Finance & Accounting', 'peso', 503, ARRAY['Payables', 'AP Processing']::TEXT[]),
  ('Accounts Receivable', 'Finance & Accounting', 'peso', 504, ARRAY['Receivables', 'AR Processing']::TEXT[]),
  ('Credit and Collection', 'Finance & Accounting', 'peso', 505, ARRAY['Collection', 'Collections', 'Collector', 'Bill Collection']::TEXT[]),
  ('Auditing', 'Finance & Accounting', 'peso', 506, ARRAY['Audit', 'Auditor', 'Internal Audit']::TEXT[]),
  ('Tax Preparation', 'Finance & Accounting', 'peso', 507, ARRAY['Taxation', 'Tax Filing', 'Tax Compliance', 'BIR Forms']::TEXT[]),
  ('Budgeting', 'Finance & Accounting', 'peso', 508, ARRAY['Budget Management', 'Budget Preparation']::TEXT[]),
  ('Financial Analysis', 'Finance & Accounting', 'peso', 509, ARRAY['Financial Analyst', 'Financial Reporting']::TEXT[]),
  ('QuickBooks', 'Finance & Accounting', 'peso', 510, ARRAY['QuickBooks Accounting']::TEXT[]),
  ('Banking Operations', 'Finance & Accounting', 'peso', 511, ARRAY['Banking', 'Bank Teller', 'Teller']::TEXT[]),

  -- ─── Sales & Service ───────────────────────────────────────────────────────────
  ('Customer Service', 'Sales & Service', 'peso', 601, ARRAY['Client Service', 'Customer Relations', 'Client Relations', 'Customer Support', 'Customer Care', 'CSR', 'Customer Service Representative']::TEXT[]),
  ('Cashiering', 'Sales & Service', 'peso', 602, ARRAY['Cashier', 'Cash Handling', 'POS Operation', 'Point of Sale']::TEXT[]),
  ('Sales', 'Sales & Service', 'peso', 603, ARRAY['Selling', 'Salesmanship', 'Sales Agent', 'Sales Representative', 'Sales Associate', 'Sales Skills']::TEXT[]),
  ('Retail Operations', 'Sales & Service', 'peso', 604, ARRAY['Retail', 'Retail Sales', 'Store Operations', 'Sales Clerk', 'Saleslady', 'Salesman', 'Store Clerk']::TEXT[]),
  ('Merchandising', 'Sales & Service', 'peso', 605, ARRAY['Merchandiser', 'Visual Merchandising', 'Product Display']::TEXT[]),
  ('Product Promotion', 'Sales & Service', 'peso', 606, ARRAY['Promodiser', 'Promotions', 'Brand Promotion']::TEXT[]),
  ('Telemarketing', 'Sales & Service', 'peso', 607, ARRAY['Telemarketer', 'Telesales', 'Outbound Calls']::TEXT[]),
  ('Contact Center Services', 'Sales & Service', 'tesda', 608, ARRAY['Call Center', 'Call Center Agent', 'Call Center Representative', 'BPO', 'Contact Center Services NC II']::TEXT[]),
  ('Marketing', 'Sales & Service', 'peso', 609, ARRAY['Marketing Skills', 'Marketing Strategy', 'Brand Management']::TEXT[]),
  ('Real Estate Sales', 'Sales & Service', 'peso', 610, ARRAY['Real Estate Agent', 'Property Sales']::TEXT[]),
  ('Insurance Sales', 'Sales & Service', 'peso', 611, ARRAY['Insurance Agent', 'Financial Advisor']::TEXT[]),
  ('Order Taking', 'Sales & Service', 'peso', 612, ARRAY['Taking Orders']::TEXT[]),

  -- ─── Management & Supervision ──────────────────────────────────────────────────
  ('Supervision', 'Management & Supervision', 'peso', 701, ARRAY['Supervisor', 'Supervisory Skills', 'Team Supervision']::TEXT[]),
  ('Team Management', 'Management & Supervision', 'peso', 702, ARRAY['People Management', 'Managing People', 'Staff Management']::TEXT[]),
  ('Project Management', 'Management & Supervision', 'peso', 703, ARRAY['Project Manager', 'Project Coordination', 'Project Coordinator']::TEXT[]),
  ('Operations Management', 'Management & Supervision', 'peso', 704, ARRAY['Operations', 'Operations Manager', 'Business Operations']::TEXT[]),
  ('Strategic Planning', 'Management & Supervision', 'peso', 705, ARRAY['Planning', 'Business Planning']::TEXT[]),
  ('Coaching and Mentoring', 'Management & Supervision', 'peso', 706, ARRAY['Coaching', 'Mentoring', 'Mentor']::TEXT[]),
  ('Store Management', 'Management & Supervision', 'peso', 707, ARRAY['Store Manager', 'Branch Management', 'Branch Manager']::TEXT[]),

  -- ─── Education & Training ──────────────────────────────────────────────────────
  ('Teaching', 'Education & Training', 'peso', 801, ARRAY['Teacher', 'Classroom Teaching', 'Instruction']::TEXT[]),
  ('Tutoring', 'Education & Training', 'peso', 802, ARRAY['Tutor', 'Private Tutoring', 'Online Tutoring']::TEXT[]),
  ('Training Facilitation', 'Education & Training', 'peso', 803, ARRAY['Trainer', 'Facilitator', 'Facilitation', 'Conducting Trainings', 'Training Delivery']::TEXT[]),
  ('Lesson Planning', 'Education & Training', 'peso', 804, ARRAY['Lesson Plan Preparation', 'Curriculum Development']::TEXT[]),
  ('Early Childhood Education', 'Education & Training', 'peso', 805, ARRAY['Preschool Teaching', 'Kindergarten Teaching', 'Day Care Work', 'Daycare Worker']::TEXT[]),
  ('Special Education', 'Education & Training', 'peso', 806, ARRAY['SPED', 'SPED Teaching']::TEXT[]),
  ('Child Care', 'Education & Training', 'peso', 807, ARRAY['Childcare', 'Babysitting', 'Babysitter', 'Nanny', 'Child Minding']::TEXT[]),

  -- ─── Health & Care ─────────────────────────────────────────────────────────────
  ('Caregiving', 'Health & Care', 'tesda', 901, ARRAY['Caregiver', 'Caregiving NC II', 'Elderly Care']::TEXT[]),
  ('Massage Therapy', 'Health & Care', 'tesda', 902, ARRAY['Massage', 'Massage Therapist', 'Hilot', 'Wellness Massage', 'Hilot (Wellness Massage) NC II']::TEXT[]),
  ('First Aid / CPR', 'Health & Care', 'peso', 903, ARRAY['First Aid', 'Basic First Aid', 'CPR', 'Basic Life Support', 'BLS']::TEXT[]),
  ('Nursing Care', 'Health & Care', 'peso', 904, ARRAY['Nursing', 'Patient Care', 'Bedside Care']::TEXT[]),
  ('Health Care Services', 'Health & Care', 'tesda', 905, ARRAY['Health Care Services NC II', 'Nursing Aide', 'Nursing Assistant', 'Hospital Aide']::TEXT[]),
  ('Pharmacy Services', 'Health & Care', 'tesda', 906, ARRAY['Pharmacy Assistant', 'Pharmacy Aide', 'Pharmacy Services NC III', 'Dispensing Medicines']::TEXT[]),
  ('Medical Records Management', 'Health & Care', 'peso', 907, ARRAY['Medical Records', 'Health Records']::TEXT[]),
  ('Phlebotomy', 'Health & Care', 'peso', 908, ARRAY['Blood Extraction', 'Blood Collection', 'Phlebotomist']::TEXT[]),
  ('Dental Assisting', 'Health & Care', 'peso', 909, ARRAY['Dental Assistant', 'Dental Aide']::TEXT[]),
  ('Barangay Health Services', 'Health & Care', 'tesda', 910, ARRAY['Barangay Health Worker', 'BHW']::TEXT[]),
  ('Emergency Medical Services', 'Health & Care', 'tesda', 911, ARRAY['EMS', 'Emergency Medical Technician', 'EMT']::TEXT[]),

  -- ─── Beauty & Wellness ─────────────────────────────────────────────────────────
  ('Beautician', 'Beauty & Wellness', 'nsrp', 2, ARRAY['Beauty Care', 'Hairdressing', 'Haircutting', 'Hairstylist', 'Hair Stylist', 'Beauty Care NC II', 'Hairdressing NC II']::TEXT[]),
  ('Barbering', 'Beauty & Wellness', 'tesda', 1002, ARRAY['Barber', 'Barbering NC II']::TEXT[]),
  ('Nail Care', 'Beauty & Wellness', 'tesda', 1003, ARRAY['Manicure', 'Pedicure', 'Manicurist', 'Nail Technician', 'Nail Care NC II']::TEXT[]),
  ('Make-up Artistry', 'Beauty & Wellness', 'peso', 1004, ARRAY['Makeup Artist', 'Make-up Artist', 'Makeup', 'Make-up', 'Cosmetology']::TEXT[]),
  ('Spa Services', 'Beauty & Wellness', 'peso', 1005, ARRAY['Spa Therapist', 'Spa Attendant']::TEXT[]),

  -- ─── Household & Personal Care ─────────────────────────────────────────────────
  ('Domestic Chores', 'Household & Personal Care', 'nsrp', 5, ARRAY['Household Chores', 'Household Work', 'Household Services', 'Household Services NC II', 'Kasambahay', 'Domestic Helper', 'Housemaid']::TEXT[]),
  ('Laundry', 'Household & Personal Care', 'peso', 1102, ARRAY['Laundry Services', 'Laundering', 'Ironing', 'Washing Clothes', 'Laundry Attendant']::TEXT[]),
  ('Cleaning', 'Household & Personal Care', 'peso', 1103, ARRAY['Cleaner', 'General Cleaning', 'Housecleaning', 'Janitorial Services', 'Janitor', 'Utility Work', 'Utility Worker']::TEXT[]),

  -- ─── Food & Hospitality ────────────────────────────────────────────────────────
  ('Cookery', 'Food & Hospitality', 'tesda', 1201, ARRAY['Cooking', 'Cook', 'Cookery NC II', 'Food Preparation']::TEXT[]),
  ('Commercial Cooking', 'Food & Hospitality', 'tesda', 1202, ARRAY['Commercial Cooking NC III', 'Line Cook']::TEXT[]),
  ('Kitchen Assistance', 'Food & Hospitality', 'peso', 1203, ARRAY['Kitchen Helper', 'Kitchen Crew', 'Kitchen Staff', 'Dishwashing', 'Dishwasher']::TEXT[]),
  ('Bread and Pastry Production', 'Food & Hospitality', 'tesda', 1204, ARRAY['Baking', 'Baker', 'Bread and Pastry', 'Pastry', 'Bread and Pastry Production NC II']::TEXT[]),
  ('Food Processing', 'Food & Hospitality', 'tesda', 1205, ARRAY['Food Processing NC II', 'Food Preservation', 'Meat Processing', 'Fish Processing']::TEXT[]),
  ('Food Safety and Sanitation', 'Food & Hospitality', 'peso', 1206, ARRAY['Food Safety', 'Food Handling', 'Sanitation', 'HACCP']::TEXT[]),
  ('Food and Beverage Services', 'Food & Hospitality', 'tesda', 1207, ARRAY['Food and Beverage Service', 'F&B Service', 'Waiter', 'Waitress', 'Waiting Tables', 'Service Crew', 'Restaurant Crew', 'Food Server', 'Fast Food Crew', 'Food and Beverage Services NC II']::TEXT[]),
  ('Bartending', 'Food & Hospitality', 'tesda', 1208, ARRAY['Bartender', 'Bartending NC II']::TEXT[]),
  ('Barista', 'Food & Hospitality', 'tesda', 1209, ARRAY['Coffee Making', 'Barista NC II']::TEXT[]),
  ('Catering', 'Food & Hospitality', 'peso', 1210, ARRAY['Caterer', 'Catering Services', 'Food Catering']::TEXT[]),
  ('Housekeeping', 'Food & Hospitality', 'tesda', 1211, ARRAY['Housekeeping NC II', 'Room Attendant', 'Hotel Housekeeping']::TEXT[]),
  ('Front Office Services', 'Food & Hospitality', 'tesda', 1212, ARRAY['Front Office', 'Front Office Services NC II', 'Hotel Front Desk', 'Hotel Receptionist']::TEXT[]),
  ('Events Management', 'Food & Hospitality', 'tesda', 1213, ARRAY['Event Management', 'Event Planning', 'Events Coordinator', 'Event Organizer', 'Events Management NC III']::TEXT[]),
  ('Tour Guiding', 'Food & Hospitality', 'tesda', 1214, ARRAY['Tour Guide', 'Tour Guiding Services NC II']::TEXT[]),
  ('Travel Services', 'Food & Hospitality', 'peso', 1215, ARRAY['Travel Agent', 'Ticketing', 'Ticketing and Reservations', 'Travel and Tours']::TEXT[]),

  -- ─── Construction & Trades ─────────────────────────────────────────────────────
  ('Carpentry Work', 'Construction & Trades', 'nsrp', 3, ARRAY['Carpentry', 'Carpenter', 'Carpentry NC II']::TEXT[]),
  ('Masonry', 'Construction & Trades', 'nsrp', 10, ARRAY['Mason', 'Masonry NC II', 'Bricklaying', 'Hollow Block Laying', 'Concreting']::TEXT[]),
  ('Electrician', 'Construction & Trades', 'nsrp', 7, ARRAY['Electrical Work', 'Electrical Wiring', 'Electrical', 'House Wiring', 'Building Wiring Installation']::TEXT[]),
  ('Electrical Installation and Maintenance', 'Construction & Trades', 'tesda', 1304, ARRAY['EIM', 'EIM NC II', 'Electrical Installation']::TEXT[]),
  ('Plumbing', 'Construction & Trades', 'nsrp', 14, ARRAY['Plumber', 'Plumbing NC II', 'Plumbing Installation']::TEXT[]),
  ('Painting Jobs', 'Construction & Trades', 'nsrp', 12, ARRAY['House Painting', 'Painting', 'Construction Painting', 'Construction Painting NC II', 'Building Painting']::TEXT[]),
  ('Tile Setting', 'Construction & Trades', 'tesda', 1307, ARRAY['Tile Setter', 'Tiling', 'Tile Installation', 'Tile Setting NC II']::TEXT[]),
  ('Rebar Works', 'Construction & Trades', 'tesda', 1308, ARRAY['Rebar Installation', 'Steel Bar Works', 'Steelman', 'Reinforcing Steel Works', 'Rebar Fabrication']::TEXT[]),
  ('Scaffolding', 'Construction & Trades', 'tesda', 1309, ARRAY['Scaffolding Works', 'Scaffolder', 'Scaffold Erection', 'Scaffolding Works NC II']::TEXT[]),
  ('Pipefitting', 'Construction & Trades', 'tesda', 1310, ARRAY['Pipe Fitting', 'Pipefitter', 'Pipe Fitter', 'Pipefitting NC II']::TEXT[]),
  ('Shielded Metal Arc Welding (SMAW)', 'Construction & Trades', 'tesda', 1311, ARRAY['SMAW', 'SMAW NC II', 'Welding', 'Arc Welding', 'Welder']::TEXT[]),
  ('Gas Metal Arc Welding (GMAW)', 'Construction & Trades', 'tesda', 1312, ARRAY['GMAW', 'GMAW NC II', 'MIG Welding']::TEXT[]),
  ('Gas Tungsten Arc Welding (GTAW)', 'Construction & Trades', 'tesda', 1313, ARRAY['GTAW', 'GTAW NC II', 'TIG Welding']::TEXT[]),
  ('Gas Welding', 'Construction & Trades', 'peso', 1314, ARRAY['Oxy-Acetylene Welding']::TEXT[]),
  ('Metal Fabrication', 'Construction & Trades', 'peso', 1315, ARRAY['Fabrication', 'Steel Fabrication', 'Fabricator']::TEXT[]),
  ('Machining', 'Construction & Trades', 'tesda', 1316, ARRAY['Machinist', 'Lathe Machine Operation', 'Lathe Operator', 'Machining NC II']::TEXT[]),
  ('CNC Machine Operation', 'Construction & Trades', 'peso', 1317, ARRAY['CNC Operator', 'CNC Machining', 'CNC Programming']::TEXT[]),
  ('Refrigeration and Air-Conditioning Servicing', 'Construction & Trades', 'tesda', 1318, ARRAY['RAC Servicing', 'RAC NC II', 'Aircon Servicing', 'Aircon Technician', 'Air Conditioning Repair', 'Refrigeration', 'HVAC']::TEXT[]),
  ('Electronic Products Assembly and Servicing', 'Construction & Trades', 'tesda', 1319, ARRAY['EPAS', 'EPAS NC II', 'Electronics Servicing', 'Electronics Technician', 'Electronics Repair']::TEXT[]),
  ('Appliance Repair', 'Construction & Trades', 'peso', 1320, ARRAY['Appliance Servicing', 'Appliance Technician']::TEXT[]),
  ('Solar PV Installation', 'Construction & Trades', 'tesda', 1321, ARRAY['Solar Panel Installation', 'Solar Installer', 'Solar PV Installation NC II']::TEXT[]),
  ('Furniture Making', 'Construction & Trades', 'tesda', 1322, ARRAY['Furniture Maker', 'Cabinet Making', 'Cabinetmaking', 'Woodworking', 'Furniture Making NC II']::TEXT[]),
  ('Roofing', 'Construction & Trades', 'peso', 1323, ARRAY['Roofer', 'Roof Installation']::TEXT[]),
  ('Glass and Aluminum Installation', 'Construction & Trades', 'peso', 1324, ARRAY['Aluminum Fabrication', 'Glass Installation', 'Aluminum and Glass Installation']::TEXT[]),
  ('Drywall and Ceiling Installation', 'Construction & Trades', 'peso', 1325, ARRAY['Drywall', 'Drywall Installation', 'Ceiling Installation', 'Gypsum Board Installation']::TEXT[]),
  ('Technical Drafting', 'Construction & Trades', 'tesda', 1326, ARRAY['Drafting', 'Draftsman', 'Drafter', 'Technical Drawing', 'Technical Drafting NC II']::TEXT[]),
  ('Surveying', 'Construction & Trades', 'peso', 1327, ARRAY['Surveyor', 'Land Surveying', 'Survey Aide']::TEXT[]),
  ('Building Maintenance', 'Construction & Trades', 'peso', 1328, ARRAY['Maintenance Work', 'Maintenance Technician', 'Facilities Maintenance', 'General Maintenance', 'Building Repair', 'Handyman']::TEXT[]),
  ('Construction Labor', 'Construction & Trades', 'peso', 1329, ARRAY['Construction Worker', 'Construction Helper', 'General Construction', 'Laborer']::TEXT[]),

  -- ─── Automotive & Machinery ────────────────────────────────────────────────────
  ('Auto Mechanic', 'Automotive & Machinery', 'nsrp', 1, ARRAY['Mechanic', 'Automotive Servicing', 'Auto Repair', 'Automotive Mechanic', 'Car Mechanic', 'Automotive Servicing NC I', 'Automotive Servicing NC II']::TEXT[]),
  ('Driver', 'Automotive & Machinery', 'nsrp', 6, ARRAY['Driving', 'Professional Driver', 'Driving (Professional)', 'Driving NC II', 'Light Vehicle Driving', 'Company Driver', 'Delivery Driver']::TEXT[]),
  ('Truck Driving', 'Automotive & Machinery', 'tesda', 1403, ARRAY['Truck Driver', 'Dump Truck Driving', 'Heavy Vehicle Driving', 'Delivery Truck Driving']::TEXT[]),
  ('Motorcycle Driving', 'Automotive & Machinery', 'peso', 1404, ARRAY['Motorcycle Rider', 'Delivery Rider', 'Motorcycle Delivery Rider', 'Rider']::TEXT[]),
  ('Motorcycle / Small Engine Servicing', 'Automotive & Machinery', 'tesda', 1405, ARRAY['Motorcycle Repair', 'Motorcycle Mechanic', 'Small Engine Repair', 'Motorcycle/Small Engine Servicing NC II']::TEXT[]),
  ('Diesel Engine Mechanic', 'Automotive & Machinery', 'peso', 1406, ARRAY['Diesel Mechanic', 'Diesel Engine Repair', 'Heavy Equipment Mechanic', 'Heavy Equipment Servicing']::TEXT[]),
  ('Auto Electrical', 'Automotive & Machinery', 'peso', 1407, ARRAY['Automotive Electrical', 'Auto Electrician', 'Automotive Electrician']::TEXT[]),
  ('Auto Body Repair', 'Automotive & Machinery', 'tesda', 1408, ARRAY['Auto Body Painting', 'Body Repair', 'Panel Beating', 'Auto Body Repair NC II']::TEXT[]),
  ('Tire Repair', 'Automotive & Machinery', 'peso', 1409, ARRAY['Vulcanizing', 'Vulcanizer', 'Tire Service']::TEXT[]),
  ('Forklift Operation', 'Automotive & Machinery', 'tesda', 1410, ARRAY['Forklift', 'Forklift Operator', 'Forklift Driving', 'Forklift NC II']::TEXT[]),
  ('Heavy Equipment Operation', 'Automotive & Machinery', 'tesda', 1411, ARRAY['Heavy Equipment Operator', 'Heavy Equipment']::TEXT[]),
  ('Hydraulic Excavator Operation', 'Automotive & Machinery', 'tesda', 1412, ARRAY['Excavator Operator', 'Excavator Operation', 'Hydraulic Excavator NC II']::TEXT[]),
  ('Backhoe Loader Operation', 'Automotive & Machinery', 'tesda', 1413, ARRAY['Backhoe Operator', 'Backhoe Operation', 'Backhoe Loader NC II']::TEXT[]),
  ('Wheel Loader Operation', 'Automotive & Machinery', 'tesda', 1414, ARRAY['Wheel Loader Operator', 'Payloader Operator', 'Payloader Operation', 'Wheel Loader NC II']::TEXT[]),
  ('Bulldozer Operation', 'Automotive & Machinery', 'tesda', 1415, ARRAY['Bulldozer Operator', 'Dozer Operator', 'Bulldozer NC II']::TEXT[]),
  ('Crane Operation', 'Automotive & Machinery', 'peso', 1416, ARRAY['Crane Operator', 'Mobile Crane Operation', 'Overhead Crane Operation']::TEXT[]),
  ('Tractor Operation', 'Automotive & Machinery', 'peso', 1417, ARRAY['Tractor Driver', 'Farm Tractor Operation', 'Agricultural Machinery Operation']::TEXT[]),
  ('Chainsaw Operation', 'Automotive & Machinery', 'peso', 1418, ARRAY['Chainsaw Operator']::TEXT[]),

  -- ─── Manufacturing & Production ────────────────────────────────────────────────
  ('Machine Operation', 'Manufacturing & Production', 'peso', 1501, ARRAY['Machine Operator', 'Production Machine Operator', 'Equipment Operation']::TEXT[]),
  ('Production Work', 'Manufacturing & Production', 'peso', 1502, ARRAY['Production Worker', 'Production Operator', 'Factory Worker', 'Production Staff']::TEXT[]),
  ('Product Assembly', 'Manufacturing & Production', 'peso', 1503, ARRAY['Assembly', 'Assembler', 'Assembly Line', 'Assembly Line Work']::TEXT[]),
  ('Quality Control', 'Manufacturing & Production', 'peso', 1504, ARRAY['QC', 'QA', 'Quality Assurance', 'Quality Inspector', 'Quality Checking', 'Product Inspection']::TEXT[]),
  ('Packing and Packaging', 'Manufacturing & Production', 'peso', 1505, ARRAY['Packing', 'Packaging', 'Packer', 'Product Packaging']::TEXT[]),
  ('Mechatronics Servicing', 'Manufacturing & Production', 'tesda', 1506, ARRAY['Mechatronics', 'Mechatronics Servicing NC II']::TEXT[]),
  ('Instrumentation and Control Servicing', 'Manufacturing & Production', 'tesda', 1507, ARRAY['Instrumentation', 'Instrumentation and Control']::TEXT[]),

  -- ─── Logistics & Warehousing ───────────────────────────────────────────────────
  ('Inventory Management', 'Logistics & Warehousing', 'peso', 1601, ARRAY['Inventory', 'Stock Keeping', 'Stockkeeping', 'Inventory Control', 'Stockman']::TEXT[]),
  ('Warehouse Operations', 'Logistics & Warehousing', 'peso', 1602, ARRAY['Warehousing', 'Warehouse Worker', 'Warehouse Staff', 'Warehouse Management']::TEXT[]),
  ('Shipping and Receiving', 'Logistics & Warehousing', 'peso', 1603, ARRAY['Receiving', 'Shipping', 'Receiving Clerk', 'Dispatching', 'Dispatcher']::TEXT[]),
  ('Logistics Coordination', 'Logistics & Warehousing', 'peso', 1604, ARRAY['Logistics', 'Logistics Management', 'Supply Chain', 'Supply Chain Management']::TEXT[]),
  ('Delivery Services', 'Logistics & Warehousing', 'peso', 1605, ARRAY['Delivery', 'Delivery Personnel', 'Courier', 'Messenger', 'Messengerial Services']::TEXT[]),
  ('Loading and Unloading', 'Logistics & Warehousing', 'peso', 1606, ARRAY['Loader', 'Porter', 'Cargo Handling', 'Hauling', 'Stevedoring']::TEXT[]),
  ('Fleet Management', 'Logistics & Warehousing', 'peso', 1607, ARRAY['Fleet Coordinator', 'Vehicle Dispatch']::TEXT[]),

  -- ─── Agriculture ───────────────────────────────────────────────────────────────
  ('Gardening', 'Agriculture', 'nsrp', 9, ARRAY['Gardener', 'Landscaping', 'Landscape Maintenance']::TEXT[]),
  ('Agricultural Crop Production', 'Agriculture', 'tesda', 1702, ARRAY['Crop Production', 'Farming', 'Farm Work', 'Agricultural Crop Production NC II']::TEXT[]),
  ('Organic Agriculture Production', 'Agriculture', 'tesda', 1703, ARRAY['Organic Farming', 'Organic Agriculture', 'Organic Agriculture Production NC II']::TEXT[]),
  ('Rice Production', 'Agriculture', 'peso', 1704, ARRAY['Rice Farming', 'Palay Production']::TEXT[]),
  ('Coconut Farming', 'Agriculture', 'peso', 1705, ARRAY['Coconut Production', 'Copra Making']::TEXT[]),
  ('Oil Palm Production', 'Agriculture', 'peso', 1706, ARRAY['Oil Palm Farming', 'Palm Oil Plantation Work']::TEXT[]),
  ('Rubber Tapping', 'Agriculture', 'peso', 1707, ARRAY['Rubber Tapper', 'Rubber Production']::TEXT[]),
  ('Plantation Work', 'Agriculture', 'peso', 1708, ARRAY['Plantation Worker', 'Harvesting', 'Harvester']::TEXT[]),
  ('Horticulture', 'Agriculture', 'tesda', 1709, ARRAY['Horticulturist', 'Plant Nursery', 'Nursery Operations', 'Ornamental Plant Production', 'Horticulture NC II']::TEXT[]),
  ('Animal Production', 'Agriculture', 'tesda', 1710, ARRAY['Livestock Raising', 'Animal Husbandry', 'Poultry Raising', 'Hog Raising', 'Piggery', 'Animal Production NC II']::TEXT[]),
  ('Veterinary Assistance', 'Agriculture', 'tesda', 1711, ARRAY['Veterinary Aide', 'Animal Health Care', 'Animal Health Care and Management NC III']::TEXT[]),
  ('Fishing', 'Agriculture', 'peso', 1712, ARRAY['Fisherfolk', 'Fisherman', 'Commercial Fishing', 'Fishing Operations']::TEXT[]),
  ('Aquaculture', 'Agriculture', 'tesda', 1713, ARRAY['Fish Farming', 'Fishpond Operation', 'Fishpond Management', 'Aquaculture NC II']::TEXT[]),
  ('Forestry', 'Agriculture', 'peso', 1714, ARRAY['Tree Planting', 'Reforestation', 'Forest Management']::TEXT[]),
  ('Agricultural Extension', 'Agriculture', 'peso', 1715, ARRAY['Extension Work', 'Farm Advisory']::TEXT[]),

  -- ─── Creative ──────────────────────────────────────────────────────────────────
  ('Painter/Artist', 'Creative', 'nsrp', 11, ARRAY['Painter / Artist', 'Artist', 'Fine Arts', 'Visual Artist', 'Mural Painting']::TEXT[]),
  ('Photography', 'Creative', 'nsrp', 13, ARRAY['Photographer', 'Event Photography']::TEXT[]),
  ('Videography', 'Creative', 'peso', 1803, ARRAY['Videographer', 'Video Production', 'Camera Operation']::TEXT[]),
  ('Embroidery', 'Creative', 'nsrp', 8, ARRAY['Embroider', 'Machine Embroidery', 'Hand Embroidery']::TEXT[]),
  ('Sewing Dresses', 'Creative', 'nsrp', 15, ARRAY['Dressmaking', 'Sewing', 'Dressmaking NC II', 'Garment Sewing', 'Seamstress', 'Sewer']::TEXT[]),
  ('Tailoring', 'Creative', 'nsrp', 17, ARRAY['Tailor', 'Tailoring NC II', 'Alterations']::TEXT[]),
  ('Fashion Design', 'Creative', 'peso', 1807, ARRAY['Fashion Designer', 'Clothing Design']::TEXT[]),
  ('Interior Design', 'Creative', 'peso', 1808, ARRAY['Interior Designer', 'Interior Decorating', 'Interior Decoration']::TEXT[]),
  ('Handicraft Making', 'Creative', 'peso', 1809, ARRAY['Handicraft', 'Handicrafts', 'Arts and Crafts', 'Crafts']::TEXT[]),
  ('Weaving', 'Creative', 'peso', 1810, ARRAY['Loom Weaving', 'Mat Weaving', 'Basket Weaving']::TEXT[]),
  ('Floral Arrangement', 'Creative', 'peso', 1811, ARRAY['Florist', 'Flower Arrangement']::TEXT[]),
  ('Music', 'Creative', 'peso', 1812, ARRAY['Musician', 'Singing', 'Singer', 'Playing Musical Instruments']::TEXT[]),
  ('Dancing', 'Creative', 'peso', 1813, ARRAY['Dancer', 'Dance', 'Choreography']::TEXT[]),
  ('Hosting / Emceeing', 'Creative', 'peso', 1814, ARRAY['Emcee', 'Emceeing', 'Host', 'Event Host', 'Master of Ceremonies']::TEXT[]),
  ('Creative Writing', 'Creative', 'peso', 1815, ARRAY['Creative Writer', 'Storytelling']::TEXT[]),

  -- ─── Security & Safety ─────────────────────────────────────────────────────────
  ('Security Services', 'Security & Safety', 'tesda', 1901, ARRAY['Security Guard', 'Security', 'Security Services NC II']::TEXT[]),
  ('Occupational Safety and Health', 'Security & Safety', 'peso', 1902, ARRAY['OSH', 'Workplace Safety', 'Safety Officer', 'Safety Compliance', 'Construction Safety', 'BOSH', 'COSH', 'Basic Occupational Safety and Health']::TEXT[]),
  ('Fire Safety', 'Security & Safety', 'peso', 1903, ARRAY['Firefighting', 'Fire Prevention', 'Fire Safety Officer']::TEXT[]),
  ('CCTV Monitoring', 'Security & Safety', 'peso', 1904, ARRAY['CCTV Operator', 'CCTV Operation', 'Surveillance']::TEXT[]),
  ('Lifeguarding', 'Security & Safety', 'peso', 1905, ARRAY['Lifeguard', 'Water Safety']::TEXT[]),
  ('Traffic Management', 'Security & Safety', 'peso', 1906, ARRAY['Traffic Enforcer', 'Traffic Aide', 'Traffic Control']::TEXT[]);

-- ─── 1. Skills ──────────────────────────────────────────────────────────────
-- A name PESO already added as another skill's wording is skipped (reported below)

INSERT INTO core.skills (name, category, source, sort_order)
SELECT s.name, s.category, s.source, s.sort_order
FROM seed_skills s
WHERE NOT EXISTS (
  SELECT 1 FROM core.skill_aliases a WHERE a.alias_key = core.normalize_skill_key(s.name)
)
ON CONFLICT (skill_key) DO UPDATE
SET category = EXCLUDED.category,
    source = EXCLUDED.source,
    sort_order = EXCLUDED.sort_order,
    is_active = true;

-- ─── 2. Other wordings ──────────────────────────────────────────────────────
-- Skipped when it's a skill's name or already another skill's wording

INSERT INTO core.skill_aliases (skill_id, alias)
SELECT DISTINCT ON (core.normalize_skill_key(w.alias)) k.id, w.alias
FROM seed_skills s
JOIN core.skills k ON k.skill_key = core.normalize_skill_key(s.name)
CROSS JOIN LATERAL unnest(s.aliases) AS w (alias)
WHERE NOT EXISTS (
  SELECT 1 FROM core.skills other WHERE other.skill_key = core.normalize_skill_key(w.alias)
)
ORDER BY core.normalize_skill_key(w.alias), k.id
ON CONFLICT (alias_key) DO NOTHING;

-- ─── 3. Report what was skipped ─────────────────────────────────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT s.name, a.alias AS existing_alias, owner.name AS owner
    FROM seed_skills s
    JOIN core.skill_aliases a ON a.alias_key = core.normalize_skill_key(s.name)
    JOIN core.skills owner ON owner.id = a.skill_id
  LOOP
    RAISE NOTICE 'Skill "%" skipped: already a wording of %', r.name, r.owner;
  END LOOP;

  FOR r IN
    SELECT s.name, w.alias, owner.name AS owner
    FROM seed_skills s
    CROSS JOIN LATERAL unnest(s.aliases) AS w (alias)
    JOIN core.skill_aliases a ON a.alias_key = core.normalize_skill_key(w.alias)
    JOIN core.skills owner ON owner.id = a.skill_id
    WHERE owner.skill_key <> core.normalize_skill_key(s.name)
  LOOP
    RAISE NOTICE 'Wording "%" kept on % (seed puts it on %)', r.alias, r.owner, r.name;
  END LOOP;
END;
$$;

COMMIT;
