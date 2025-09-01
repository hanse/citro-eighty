-- Migration add_action created Sun Aug 31 2025 15:54:32 GMT+0200 (Central European Summer Time)

ALTER TABLE vehicles ADD COLUMN action_id text;

-- ROLLBACK --

ALTER TABLE vehicles DROP COLUMN action_id;
