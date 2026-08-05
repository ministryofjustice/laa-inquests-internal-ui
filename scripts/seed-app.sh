#!/usr/bin/env sh
set -eu

if [ -n "${API_DB_CONTAINER_ID:-}" ]; then
  docker exec -i "$API_DB_CONTAINER_ID" env PGPASSWORD="${DB_PASSWORD:-postgres}" psql \
    -v ON_ERROR_STOP=1 \
    -U "${DB_USER:-postgres}" \
    -d "${DB_NAME:-api}" <<'SQL'
INSERT INTO public.provider (provider_id, firm_code, office_id, email_address)
VALUES (12345, '0KA123', '1', 'e2e-provider@example.com')
ON CONFLICT (provider_id) DO NOTHING;

INSERT INTO public.client (
  client_id,
  client_first_name,
  client_last_name,
  date_of_birth,
  has_applied_previously,
  has_no_fixed_abode,
  is_client_correspondence_recipient
)
VALUES (12345, 'E2E', 'Client', '01-01-1990', false, false, true)
ON CONFLICT (client_id) DO NOTHING;

INSERT INTO public.deceased (
  deceased_id,
  client_id,
  deceased_first_name,
  deceased_last_name,
  deceased_date_of_birth,
  deceased_date_of_death,
  coroners_reference,
  client_relationship_to_deceased
)
VALUES (
  12345,
  12345,
  'E2E',
  'Deceased',
  '01-01-1980',
  '01-01-2025',
  'E2E-REF-12345',
  'Family Member'
)
ON CONFLICT (deceased_id) DO NOTHING;

INSERT INTO application_proceeding; (
  application_proceeding_id,
  client_involvement_type,
  merits_decision,
  laa_reference,
  proceeding_id
)
VALUES (
  12345,
  'RESPONDENT',
  'PENDING',
  12345,
  'IQPC'
)
ON CONFLICT (application_proceeding_id) DO NOTHING;

INSERT INTO public.application (
  laa_reference,
  created_at,
  updated_at,
  status,
  used_delegated_functions,
  application_type,
  auto_grant,
  client_id,
  deceased_id,
  provider_id
)
VALUES (
  12345,
  NOW(),
  NOW(),
  'LIVE',
  false,
  'INITIAL',
  false,
  12345,
  12345,
  12345
)
ON CONFLICT (laa_reference) DO NOTHING;
SQL
  exit 0
fi

if [ -z "${DB_HOST:-}" ]; then
  echo "DB_HOST is required when API_DB_CONTAINER_ID is not set" >&2
  exit 1
fi

export PGPASSWORD="${DB_PASSWORD:-postgres}"
psql \
  -v ON_ERROR_STOP=1 \
  -h "$DB_HOST" \
  -p "${DB_PORT:-5432}" \
  -U "${DB_USER:-postgres}" \
  -d "${DB_NAME:-api}" <<'SQL'
INSERT INTO public.provider (provider_id, firm_code, office_id, email_address)
VALUES (12345, '0KA123', '1', 'e2e-provider@example.com')
ON CONFLICT (provider_id) DO NOTHING;

INSERT INTO public.client (
  client_id,
  client_first_name,
  client_last_name,
  date_of_birth,
  has_applied_previously,
  has_no_fixed_abode,
  is_client_correspondence_recipient
)
VALUES (12345, 'E2E', 'Client', '01-01-1990', false, false, true)
ON CONFLICT (client_id) DO NOTHING;

INSERT INTO public.deceased (
  deceased_id,
  client_id,
  deceased_first_name,
  deceased_last_name,
  deceased_date_of_birth,
  deceased_date_of_death,
  coroners_reference,
  client_relationship_to_deceased
)
VALUES (
  12345,
  12345,
  'E2E',
  'Deceased',
  '01-01-1980',
  '01-01-2025',
  'E2E-REF-12345',
  'Family Member'
)
ON CONFLICT (deceased_id) DO NOTHING;

INSERT INTO public.application (
  laa_reference,
  created_at,
  updated_at,
  status,
  used_delegated_functions,
  application_type,
  auto_grant,
  client_id,
  deceased_id,
  provider_id
)
VALUES (
  12345,
  NOW(),
  NOW(),
  'LIVE',
  false,
  'INITIAL',
  false,
  12345,
  12345,
  12345
)
ON CONFLICT (laa_reference) DO NOTHING;
SQL



