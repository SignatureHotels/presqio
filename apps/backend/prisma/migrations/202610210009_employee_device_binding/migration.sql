-- Employees sign in with just their employee ID. The first phone that signs in is bound to the
-- employee (a random token kept on that phone, stored here only as a hash); another phone needs
-- the admin to reset the binding.
ALTER TABLE employees
  ADD COLUMN device_token_hash TEXT,
  ADD COLUMN device_bound_at TIMESTAMPTZ(3);
