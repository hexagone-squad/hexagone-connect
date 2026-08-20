#!/usr/bin/env bash
set -euo pipefail
source_database=hexagone
restore_database=hexagone_restore_poc
backup_file="$(mktemp)"
compose=(docker compose)
cleanup() {
  rm -f "$backup_file"
  "${compose[@]}" exec -T postgres psql -U hexagone -d postgres -c "drop database if exists ${restore_database} with (force);" >/dev/null || true
  "${compose[@]}" exec -T postgres psql -U hexagone -d "$source_database" -c 'drop table if exists platform.synthetic_recovery_records;' >/dev/null || true
}
trap cleanup EXIT
"${compose[@]}" up -d --wait postgres
"${compose[@]}" exec -T postgres psql -U hexagone -d "$source_database" -v ON_ERROR_STOP=1 <<'SQL'
create schema if not exists platform;
drop table if exists platform.synthetic_recovery_records;
create table platform.synthetic_recovery_records (record_id uuid primary key, tenant_id uuid not null, label text not null check (label like 'synthetic-%'));
insert into platform.synthetic_recovery_records values
('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','synthetic-alpha'),
('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','synthetic-beta'),
('00000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000002','synthetic-gamma');
SQL
checksum_sql="select count(*) || ':' || md5(string_agg(record_id::text || tenant_id::text || label, ',' order by record_id)) from platform.synthetic_recovery_records;"
source_checksum="$("${compose[@]}" exec -T postgres psql -U hexagone -d "$source_database" -At -c "$checksum_sql")"
"${compose[@]}" exec -T postgres pg_dump -U hexagone -d "$source_database" --format=custom --no-owner --no-privileges --table=platform.synthetic_recovery_records >"$backup_file"
"${compose[@]}" exec -T postgres psql -U hexagone -d postgres -c "drop database if exists ${restore_database} with (force);" >/dev/null
"${compose[@]}" exec -T postgres createdb -U hexagone "$restore_database"
  "${compose[@]}" exec -T postgres psql -U hexagone -d "$restore_database" -c "create schema if not exists platform;" >/dev/null
started_ms=$(( $(date +%s%N) / 1000000 ))
"${compose[@]}" exec -T postgres pg_restore -U hexagone -d "$restore_database" --no-owner --no-privileges <"$backup_file"
finished_ms=$(( $(date +%s%N) / 1000000 ))
restored_checksum="$("${compose[@]}" exec -T postgres psql -U hexagone -d "$restore_database" -At -c "$checksum_sql")"
test "$source_checksum" = "$restored_checksum"
echo "PASS synthetic recovery rows_and_checksum=$restored_checksum local_restore_ms=$((finished_ms - started_ms))"
