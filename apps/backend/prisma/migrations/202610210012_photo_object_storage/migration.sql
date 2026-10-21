-- Selfies move to object storage (Backblaze B2). Each check-in/out photo row keeps the object's
-- key; `data` is only used when object storage isn't configured. One of the two must be present.
BEGIN;

ALTER TABLE "attendance_photos"
  ADD COLUMN "storage_key" TEXT,
  ALTER COLUMN "data" DROP NOT NULL;
CREATE UNIQUE INDEX "attendance_photos_storage_key_key" ON "attendance_photos"("storage_key");
ALTER TABLE "attendance_photos"
  ADD CONSTRAINT "attendance_photos_has_image" CHECK ("data" IS NOT NULL OR "storage_key" IS NOT NULL);

COMMIT;
