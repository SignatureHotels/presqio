-- The product is now organization -> branches. Each organization has exactly one business
-- (created with it) that holds its branches, so plans are limited by branches, not businesses.
-- Prices remain placeholders until pricing is decided.
UPDATE "plans" SET "max_businesses" = 1;
UPDATE "plans" SET "max_branches" = 1  WHERE "code" = 'FREE';
UPDATE "plans" SET "max_branches" = 3  WHERE "code" = 'STARTER';
UPDATE "plans" SET "max_branches" = 10 WHERE "code" = 'GROWTH';
