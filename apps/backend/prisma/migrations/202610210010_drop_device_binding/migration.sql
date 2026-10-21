-- Employees may sign in from any phone (shared phones for staff without one), so the
-- one-phone binding from 202610210009 is removed.
ALTER TABLE employees
  DROP COLUMN device_token_hash,
  DROP COLUMN device_bound_at;
