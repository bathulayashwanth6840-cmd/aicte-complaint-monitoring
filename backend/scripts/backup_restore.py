"""
AICTE Integrated Institution Complaint Monitoring System
Database Backup, Verification, and Recovery Utility

Usage:
  python scripts/backup_restore.py backup [source_db] [target_dir]
  python scripts/backup_restore.py verify [db_path]
  python scripts/backup_restore.py restore [backup_file] [destination_db]
"""

import sys
import os
import sqlite3
import hashlib
import datetime
from pathlib import Path

def calculate_sha256(filepath: str) -> str:
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            sha256.update(chunk)
    return sha256.hexdigest()

def verify_db(db_path: str) -> bool:
    """Verifies SQLite database integrity and table counts."""
    if not os.path.exists(db_path):
        print(f"[ERROR] Database file not found: {db_path}")
        return False
    
    print(f"[*] Verifying integrity of: {db_path}")
    try:
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        cursor = conn.cursor()
        
        # Run PRAGMA integrity_check
        cursor.execute("PRAGMA integrity_check;")
        integrity = cursor.fetchall()
        if not integrity or integrity[0][0] != "ok":
            print(f"[FAIL] Integrity check failed: {integrity}")
            conn.close()
            return False
        
        # Verify table existence
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [r[0] for r in cursor.fetchall() if not r[0].startswith("sqlite_")]
        print(f"[OK] Integrity check passed. Found {len(tables)} tables: {', '.join(tables)}")
        
        # Record counts for key tables
        for table in ["institutions", "complaint_cases", "case_actions", "users"]:
            if table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table};")
                count = cursor.fetchone()[0]
                print(f"    - Table '{table}': {count} records")
        
        conn.close()
        return True
    except Exception as e:
        print(f"[ERROR] Verification error: {e}")
        return False

def backup_db(source_db: str = "aicte_complaints.db", target_dir: str = "backups") -> str:
    """Creates a point-in-time safe SQLite online backup."""
    if not os.path.exists(source_db):
        raise FileNotFoundError(f"Source database not found: {source_db}")
    
    os.makedirs(target_dir, exist_ok=True)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    base_name = Path(source_db).stem
    target_backup = os.path.join(target_dir, f"{base_name}_backup_{timestamp}.db")
    
    print(f"[*] Initiating online backup: {source_db} -> {target_backup}")
    
    src_conn = sqlite3.connect(source_db)
    dst_conn = sqlite3.connect(target_backup)
    
    with dst_conn:
        src_conn.backup(dst_conn, pages=100)
    
    dst_conn.close()
    src_conn.close()
    
    size_bytes = os.path.getsize(target_backup)
    checksum = calculate_sha256(target_backup)
    print(f"[OK] Backup successfully created: {target_backup}")
    print(f"     Size: {size_bytes:,} bytes")
    print(f"     SHA-256: {checksum}")
    
    # Self-verify backup
    if not verify_db(target_backup):
        raise RuntimeError("Created backup failed integrity verification!")
    
    return target_backup

def restore_db(backup_file: str, destination_db: str) -> bool:
    """Restores database from backup with pre-flight verification."""
    if not os.path.exists(backup_file):
        print(f"[ERROR] Backup file not found: {backup_file}")
        return False
    
    print(f"[*] Pre-flight check on backup: {backup_file}")
    if not verify_db(backup_file):
        print("[ERROR] Backup file failed verification. Aborting restore.")
        return False
    
    # If destination exists, create safety snapshot
    if os.path.exists(destination_db):
        pre_restore_snapshot = destination_db + ".pre_restore"
        print(f"[*] Preserving pre-restore snapshot: {pre_restore_snapshot}")
        import shutil
        shutil.copyfile(destination_db, pre_restore_snapshot)
    
    print(f"[*] Restoring {backup_file} -> {destination_db}")
    src_conn = sqlite3.connect(backup_file)
    dst_conn = sqlite3.connect(destination_db)
    
    with dst_conn:
        src_conn.backup(dst_conn, pages=100)
        
    dst_conn.close()
    src_conn.close()
    
    print("[*] Verifying restored destination database...")
    if verify_db(destination_db):
        print(f"[SUCCESS] Restore completed successfully to {destination_db}")
        return True
    else:
        print(f"[ERROR] Restored database failed verification.")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
        
    action = sys.argv[1].lower()
    if action == "verify":
        db_path = sys.argv[2] if len(sys.argv) > 2 else "aicte_complaints.db"
        success = verify_db(db_path)
        sys.exit(0 if success else 1)
    elif action == "backup":
        src = sys.argv[2] if len(sys.argv) > 2 else "aicte_complaints.db"
        dst_dir = sys.argv[3] if len(sys.argv) > 3 else "backups"
        backup_db(src, dst_dir)
        sys.exit(0)
    elif action == "restore":
        if len(sys.argv) < 4:
            print("Usage: python scripts/backup_restore.py restore <backup_file> <destination_db>")
            sys.exit(1)
        b_file = sys.argv[2]
        d_db = sys.argv[3]
        success = restore_db(b_file, d_db)
        sys.exit(0 if success else 1)
    else:
        print(f"Unknown action: {action}")
        print(__doc__)
        sys.exit(1)
