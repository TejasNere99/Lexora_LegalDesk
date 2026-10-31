# Lexora LegalDesk — Backup & Disaster Recovery Guide

## 1. Practice Continuity & Regulatory Mandate

Law practice management systems must retain client communications, court orders, case history, and financial audit trails for statutory retention periods (typically 7–10 years depending on jurisdiction). A dependable, verified backup and disaster recovery policy is mandatory before migrating active litigation matters into production.

---

## 2. Backup Strategy

### MongoDB Atlas Automated Backups (Cloud Cluster)
When running on MongoDB Atlas (Dedicated or Shared Tier):
1. **Continuous Cloud Backups:** Turn on Continuous Cloud Backups with point-in-time recovery (PITR) enabled.
2. **Snapshot Schedule:**
   - Daily snapshots retained for 30 days.
   - Weekly snapshots retained for 12 weeks.
   - Monthly snapshots retained for 12 months.

### Self-Hosted / On-Premise Scripted Backup (`mongodump`)
For standalone MongoDB instances or off-site redundancy, configure a daily cron job running `mongodump`:

```bash
#!/bin/bash
set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/lexora/$TIMESTAMP"
ARCHIVE_PATH="$BACKUP_DIR/lexora_legaldesk_$TIMESTAMP.archive.gz"

mkdir -p "$BACKUP_DIR"

# Perform compressed archive dump
mongodump \
  --uri="$MONGODB_URI" \
  --archive="$ARCHIVE_PATH" \
  --gzip

# Encrypt backup archive with GPG (AES-256)
gpg --symmetric --cipher-algo AES256 --batch --yes --passphrase "$BACKUP_PASSPHRASE" "$ARCHIVE_PATH"
rm "$ARCHIVE_PATH"

# Prune backups older than 30 days
find /var/backups/lexora/ -type d -mtime +30 -exec rm -rf {} +
```

---

## 3. Disaster Recovery Drill & Restoration

### Step 1: Prepare Clean Recovery Database
Ensure the target database is empty or verify in an isolated staging environment:

```bash
# Decrypt archive
gpg --decrypt --batch --passphrase "$BACKUP_PASSPHRASE" \
  -o restored_backup.archive.gz encrypted_backup.archive.gz.gpg
```

### Step 2: Restore Data using `mongorestore`
```bash
mongorestore \
  --uri="$TARGET_MONGODB_URI" \
  --archive="restored_backup.archive.gz" \
  --gzip \
  --drop
```

### Step 3: Post-Restore Verification Checklist
1. **Case Count & Sequence Integrity:**
   - Verify `counters` collection holds the correct next sequential case ID (`LEX-YYYY-XXXX`).
2. **Access Control Check:**
   - Confirm active lawyer accounts can sign in and case-level authorizations remain intact.
3. **Audit Trail Completeness:**
   - Confirm `auditlogs` and `hearinghistories` have preserved historical timestamps.
4. **Active Sessions:**
   - For security, revoke all active sessions post-disaster recovery to force advocate re-authentication:
   ```javascript
   db.sessions.updateMany({}, { $set: { revokedAt: new Date() } });
   ```
