-- The branches a branch manager or viewer is invited to (empty: every branch). Copied into
-- business_membership_branches when the invitation is accepted.
ALTER TABLE invitations ADD COLUMN branch_ids UUID[] NOT NULL DEFAULT '{}';
