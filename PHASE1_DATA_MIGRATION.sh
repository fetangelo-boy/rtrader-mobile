#!/bin/bash
# Phase 1: Export Supabase chat data and import to MySQL
# Date: 2026-04-29

set -e

echo "=== Phase 1: Chat Data Migration (Supabase → MySQL) ==="
echo ""

# Step 1: Export from Supabase
echo "[1/4] Exporting data from Supabase..."
cat > /tmp/supabase_export.sql << 'EXPORT_SQL'
-- Supabase export (2026-04-29)
-- Tables: chats, chat_participants, messages

-- Chats
COPY (SELECT id, name, description, chat_type, icon, sort_order, created_at, updated_at FROM chats ORDER BY id)
TO STDOUT WITH CSV HEADER;

-- Chat Participants
COPY (SELECT id, chat_id, user_id, role, joined_at FROM chat_participants ORDER BY id)
TO STDOUT WITH CSV HEADER;

-- Messages
COPY (SELECT id, chat_id, user_id, author, content, reply_to_message_id, created_at, updated_at FROM messages ORDER BY id)
TO STDOUT WITH CSV HEADER;
EXPORT_SQL

echo "✓ Export script prepared"
echo ""

# Step 2: Prepare MySQL import
echo "[2/4] Preparing MySQL import..."
cat > /tmp/mysql_import.sql << 'IMPORT_SQL'
-- MySQL import script
-- Disable foreign key checks during import
SET FOREIGN_KEY_CHECKS=0;

-- Clear existing data (if needed)
-- TRUNCATE TABLE messages;
-- TRUNCATE TABLE chat_participants;
-- TRUNCATE TABLE chats;

-- Import will be done via LOAD DATA INFILE or INSERT statements
-- See PHASE1_IMPORT_PLAN.md for detailed instructions

SET FOREIGN_KEY_CHECKS=1;
IMPORT_SQL

echo "✓ Import script prepared"
echo ""

# Step 3: Validation queries
echo "[3/4] Preparing validation queries..."
cat > /tmp/validate.sql << 'VALIDATE_SQL'
-- Validation queries for imported data

-- Check chat counts
SELECT 'chats' as table_name, COUNT(*) as row_count FROM chats;
SELECT 'chat_participants' as table_name, COUNT(*) as row_count FROM chat_participants;
SELECT 'messages' as table_name, COUNT(*) as row_count FROM messages;

-- Check for data integrity
SELECT 'Missing chat_participants' as check_name, COUNT(*) as issues 
FROM chat_participants cp 
WHERE NOT EXISTS (SELECT 1 FROM chats c WHERE c.id = cp.chat_id);

SELECT 'Missing message authors' as check_name, COUNT(*) as issues 
FROM messages m 
WHERE NOT EXISTS (SELECT 1 FROM chat_participants cp WHERE cp.chat_id = m.chat_id);

-- Sample data
SELECT 'Sample chats' as section;
SELECT * FROM chats LIMIT 3;

SELECT 'Sample messages' as section;
SELECT * FROM messages LIMIT 5;
VALIDATE_SQL

echo "✓ Validation queries prepared"
echo ""

# Step 4: Instructions
echo "[4/4] Migration instructions:"
echo ""
echo "MANUAL STEPS REQUIRED:"
echo "1. Export data from Supabase SQL Editor:"
echo "   - Run queries in /tmp/supabase_export.sql"
echo "   - Save output as CSV files"
echo ""
echo "2. Import to MySQL on Beget:"
echo "   - Use LOAD DATA INFILE or INSERT statements"
echo "   - See PHASE1_IMPORT_PLAN.md for exact SQL"
echo ""
echo "3. Validate imported data:"
echo "   - Run queries in /tmp/validate.sql"
echo "   - Check row counts and integrity"
echo ""
echo "=== Phase 1 Data Migration Ready ==="
