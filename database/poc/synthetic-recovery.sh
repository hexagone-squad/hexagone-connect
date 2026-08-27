#!/usr/bin/env bash
set -euo pipefail

run_id="${RECOVERY_RUN_ID:-$(date -u +%Y%m%d%H%M%S)_$$_${RANDOM}}"
if [[ ! "$run_id" =~ ^[a-z0-9_]+$ ]]; then
  echo "ERROR recovery run ID must contain only lowercase letters, digits, and underscores" >&2
  exit 2
fi

source_database="hexagone_poc_source_${run_id}"
restore_database="hexagone_poc_restore_${run_id}"
backup_file="$(mktemp)"
compose=(docker compose)
source_created=false
restore_created=false

cleanup() {
  local status=$?
  local cleanup_failed=0
  trap - EXIT

  if [[ "$restore_created" == true ]]; then
    if ! "${compose[@]}" exec -T postgres psql -U hexagone -d postgres -v ON_ERROR_STOP=1 \
      -c "drop database ${restore_database} with (force);" >/dev/null; then
      echo "ERROR failed to clean up restore database ${restore_database}" >&2
      cleanup_failed=1
    fi
  fi

  if [[ "$source_created" == true ]]; then
    if ! "${compose[@]}" exec -T postgres psql -U hexagone -d postgres -v ON_ERROR_STOP=1 \
      -c "drop database ${source_database} with (force);" >/dev/null; then
      echo "ERROR failed to clean up source database ${source_database}" >&2
      cleanup_failed=1
    fi
  fi

  rm -f "$backup_file"
  if [[ "$status" -eq 0 && "$cleanup_failed" -ne 0 ]]; then
    status=1
  fi
  exit "$status"
}
trap cleanup EXIT

"${compose[@]}" up -d --wait postgres

collision_count="$("${compose[@]}" exec -T postgres psql -U hexagone -d postgres -At \
  -c "select count(*) from pg_database where datname in ('${source_database}', '${restore_database}');")"
if [[ "$collision_count" != 0 ]]; then
  echo "ERROR recovery database collision for run ID ${run_id}; no resources were modified" >&2
  exit 1
fi

"${compose[@]}" exec -T postgres createdb -U hexagone "$source_database"
source_created=true
"${compose[@]}" exec -T postgres createdb -U hexagone "$restore_database"
restore_created=true

"${compose[@]}" exec -T postgres psql -U hexagone -d "$source_database" -v ON_ERROR_STOP=1 <<'SQL'
create schema if not exists platform;
create table platform.synthetic_recovery_records (record_id uuid primary key, tenant_id uuid not null, label text not null check (label like 'synthetic-%'));
insert into platform.synthetic_recovery_records values
('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','synthetic-alpha'),
('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','synthetic-beta'),
('00000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000002','synthetic-gamma');
SQL

checksum_sql="select count(*) || ':' || md5(string_agg(record_id::text || tenant_id::text || label, ',' order by record_id)) from platform.synthetic_recovery_records;"
source_checksum="$("${compose[@]}" exec -T postgres psql -U hexagone -d "$source_database" -At -c "$checksum_sql")"
"${compose[@]}" exec -T postgres pg_dump -U hexagone -d "$source_database" --format=custom --no-owner --no-privileges --table=platform.synthetic_recovery_records >"$backup_file"
"${compose[@]}" exec -T postgres psql -U hexagone -d "$restore_database" -v ON_ERROR_STOP=1 -c "create schema platform;" >/dev/null
started_ms=$(( $(date +%s%N) / 1000000 ))
"${compose[@]}" exec -T postgres pg_restore -U hexagone -d "$restore_database" --no-owner --no-privileges <"$backup_file"
finished_ms=$(( $(date +%s%N) / 1000000 ))
restored_checksum="$("${compose[@]}" exec -T postgres psql -U hexagone -d "$restore_database" -At -c "$checksum_sql")"
test "$source_checksum" = "$restored_checksum"
echo "PASS synthetic recovery rows_and_checksum=$restored_checksum local_restore_ms=$((finished_ms - started_ms))"
