# Synthetic PostgreSQL recovery POC

> **POC / TRAINING / NOT FOR PRODUCTION**

Run `bash database/poc/synthetic-recovery.sh` from the repository root. The
script starts the existing Compose PostgreSQL service, seeds three synthetic
tenant-tagged rows, uses `pg_dump` and `pg_restore`, compares row-count/checksum
evidence, prints local restore milliseconds, and cleans up its table, dump, and
restore database. Run `docker compose down` to stop PostgreSQL.

The timing is not an RTO/RPO. Encryption, remote storage, retention, scheduling,
point-in-time recovery, monitoring, access control, and production-scale tests
remain open decisions.
