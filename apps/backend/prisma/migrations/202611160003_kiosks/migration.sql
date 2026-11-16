-- A shared check-in device fixed at a branch entrance. An admin creates it and gets a short pairing
-- code; the device trades the code for a long-lived token (only hashes are stored). Revoking it
-- signs the device out at once.
CREATE TABLE kiosks (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id        UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  branch_id          UUID NOT NULL,
  name               TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  token_hash         TEXT UNIQUE,
  pairing_code_hash  TEXT UNIQUE,
  pairing_expires_at TIMESTAMPTZ(3),
  paired_at          TIMESTAMPTZ(3),
  last_seen_at       TIMESTAMPTZ(3),
  revoked_at         TIMESTAMPTZ(3),
  created_by         UUID NOT NULL,
  created_at         TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  CONSTRAINT kiosks_branch_fkey FOREIGN KEY (business_id, branch_id)
    REFERENCES branches(business_id, id) ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE INDEX kiosks_business_idx ON kiosks (business_id);
