-- HRIS: the full employee record — contacts, attendance, salary, personal
-- details, profile, joining and exit — alongside the basics from 0017.
--
-- Choice fields are plain text; the app keeps them to its list of options.
--
-- Run after 0017_employees.sql. Safe to re-run.

alter type public.employee_status add value if not exists 'suspended';
alter type public.employee_status add value if not exists 'left';

alter table public.employees
  -- Overview
  add column if not exists salutation              text,
  add column if not exists gender                  text,
  add column if not exists date_of_birth           date,
  add column if not exists branch                  text,
  add column if not exists grade                   text,
  add column if not exists reports_to              uuid references public.employees (id) on delete set null,

  -- Address & Contacts
  add column if not exists personal_email          text,
  add column if not exists preferred_email         text,
  add column if not exists current_address         text,
  add column if not exists current_accommodation   text,
  add column if not exists permanent_address       text,
  add column if not exists permanent_accommodation text,
  add column if not exists emergency_name          text,
  add column if not exists emergency_relation      text,
  add column if not exists emergency_phone         text,

  -- Attendance & Leaves
  add column if not exists attendance_device_id    text,
  add column if not exists holiday_list            text,
  add column if not exists default_shift           text,
  add column if not exists leave_approver          uuid references public.employees (id) on delete set null,
  add column if not exists expense_approver        uuid references public.employees (id) on delete set null,
  add column if not exists shift_request_approver  uuid references public.employees (id) on delete set null,

  -- Salary
  add column if not exists salary_mode             text,
  add column if not exists ctc                     bigint check (ctc >= 0),
  add column if not exists payroll_cost_center     text,
  add column if not exists bank_name               text,
  add column if not exists bank_account_no         text,
  add column if not exists bank_account_holder     text,
  add column if not exists npwp                    text,
  add column if not exists ptkp_status             text,
  add column if not exists bpjs_kesehatan          text,
  add column if not exists bpjs_ketenagakerjaan    text,

  -- Personal Details
  add column if not exists nik                     text,
  add column if not exists place_of_birth          text,
  add column if not exists marital_status          text,
  add column if not exists religion                text,
  add column if not exists blood_group             text,
  add column if not exists passport_number         text,
  add column if not exists passport_place_of_issue text,
  add column if not exists passport_date_of_issue  date,
  add column if not exists passport_valid_until    date,
  add column if not exists family_background       text,
  add column if not exists health_details          text,

  -- Profile
  add column if not exists bio                     text,
  add column if not exists education_level         text,
  add column if not exists institution             text,
  add column if not exists major                   text,
  add column if not exists graduation_year         integer,
  add column if not exists previous_company        text,
  add column if not exists previous_designation    text,
  add column if not exists work_history            text,

  -- Joining (join_date is from 0017)
  add column if not exists offer_date              date,
  add column if not exists confirmation_date       date,
  add column if not exists contract_end_date       date,
  add column if not exists notice_days             integer check (notice_days >= 0),
  add column if not exists retirement_date         date,

  -- Exit
  add column if not exists resignation_letter_date date,
  add column if not exists relieving_date          date,
  add column if not exists reason_for_leaving      text,
  add column if not exists new_workplace           text,
  add column if not exists exit_interview_date     date,
  add column if not exists leave_encashed          text,
  add column if not exists encashment_date         date,
  add column if not exists exit_feedback           text;

-- Connections looks up direct reports by manager.
create index if not exists employees_reports_to_idx on public.employees (reports_to);
