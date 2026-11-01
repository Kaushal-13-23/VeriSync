# VeriSync Backup and Disaster Recovery Runbook

This runbook documents operational procedures for automated database backups, disaster recovery, Point-in-Time Recovery (PITR), and restoration drill validation to satisfy **SRS Section 7.5**, **NFR-REL-006**, and **Test Case TC-19**.

## Recovery Objectives

- **Recovery Point Objective (RPO)**: **<= 15 minutes**
  - Achieved through daily base snapshots (`pg_dump -Fc`) combined with continuous Write-Ahead Log (WAL) archiving every 15 minutes.
- **Recovery Time Objective (RTO)**: **<= 4.0 hours**
  - Automated restoration script validates clean re-import, index rebuilding, and database integrity checks within 4 hours.

## Backup Process

### Automated Daily Snapshots

Backups are executed via cron or Kubernetes CronJob using `infra/backup/backup.sh`:

```bash
# Execute manual backup snapshot
./infra/backup/backup.sh
```

Artifacts produced:

- Compressed dump: `/var/backups/verisync/verisync_backup_<TIMESTAMP>.dump`
- Metadata & SHA256 catalog: `/var/backups/verisync/verisync_backup_<TIMESTAMP>.json`

### Continuous WAL Archiving

PostgreSQL `postgresql.conf` parameters:

```ini
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /var/lib/postgresql/wal_archive/%f && cp %p /var/lib/postgresql/wal_archive/%f'
archive_timeout = 900 # 15 minutes max WAL window (RPO <= 15 min)
```

## Restoration Drill (TC-19)

Regular automated drills restore production snapshots into the staging database environment to verify:

1. **Cryptographic Checksum Verification**: SHA256 integrity match before executing restore.
2. **Data Consistency**: 100% preservation of:
   - Candidate accounts & profiles
   - Assessment configurations & question banks
   - Active & completed assessment sessions
   - Accepted answer records & tamper-evident hashes
   - Audit log chains
   - Evaluated score corrections & results
3. **Recovery Duration**: Validated against RTO <= 4 hours.

```bash
# Execute staging restoration drill
./infra/backup/restore.sh /var/backups/verisync/verisync_backup_20261101_120000Z.dump verisync_staging
```
