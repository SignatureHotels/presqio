-- Keep the previous refresh token briefly after rotation so a refresh whose
-- response never reached the browser (closed tab, navigation) does not sign the user out.
ALTER TABLE "sessions"
  ADD COLUMN "previous_refresh_token_hash" TEXT,
  ADD COLUMN "rotated_at" TIMESTAMPTZ(3);
CREATE UNIQUE INDEX "sessions_previous_refresh_token_hash_key" ON "sessions"("previous_refresh_token_hash");
