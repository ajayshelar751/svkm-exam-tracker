-- ==============================================================================
-- Migration 07: Add Staff Employee Details to users table
-- Description: Adds Employee ID, SAP ID, and Working Hours (start and end times)
-- Safe to execute in Supabase SQL Editor (Idempotent via IF NOT EXISTS)
-- ==============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS sap_id VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS working_hours_start VARCHAR(20) DEFAULT '09:00';
ALTER TABLE users ADD COLUMN IF NOT EXISTS working_hours_end VARCHAR(20) DEFAULT '17:30';

-- Institutional audit comments
COMMENT ON COLUMN users.employee_id IS 'Institutional Employee ID (e.g. EMP-10492)';
COMMENT ON COLUMN users.sap_id IS 'Institutional SAP ID (e.g. 5002184)';
COMMENT ON COLUMN users.working_hours_start IS 'Staff daily shift start time (e.g. 09:00)';
COMMENT ON COLUMN users.working_hours_end IS 'Staff daily shift end time (e.g. 17:30)';
