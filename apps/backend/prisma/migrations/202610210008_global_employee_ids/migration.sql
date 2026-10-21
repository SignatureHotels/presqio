-- Employees sign in with only their employee ID + PIN, so an employee ID must identify one
-- employee across all of Presqio. Each organization gets a short prefix from its initials
-- (Signature Group of Hotels -> SGH) and generated IDs become SGH0001, SGH0002, ...
BEGIN;

ALTER TABLE "businesses" ADD COLUMN "employee_prefix" TEXT;

-- Backfill: initials of the name (ignoring "of", "the", "and"), at most 4 letters; one-word names
-- use their first 3 letters; later organizations with the same initials get a number (SGH2).
WITH base AS (
  SELECT b.id, b.created_at,
         upper(coalesce((
           SELECT string_agg(left(w, 1), '')
             FROM regexp_split_to_table(regexp_replace(b.name, '[^A-Za-z0-9 ]', '', 'g'), '\s+') AS w
            WHERE lower(w) NOT IN ('of', 'the', 'and', '')
         ), '')) AS initials,
         upper(left(regexp_replace(b.name, '[^A-Za-z0-9]', '', 'g'), 3)) AS first_letters
    FROM businesses b
), cleaned AS (
  SELECT id, created_at,
         left(CASE WHEN length(initials) >= 2 THEN initials
                   WHEN length(first_letters) >= 2 THEN first_letters
                   ELSE 'ORG' END, 4) AS prefix
    FROM base
), ranked AS (
  SELECT id, prefix, row_number() OVER (PARTITION BY prefix ORDER BY created_at, id) AS rn FROM cleaned
)
UPDATE businesses b
   SET employee_prefix = CASE WHEN r.rn = 1 THEN r.prefix ELSE r.prefix || r.rn END
  FROM ranked r
 WHERE r.id = b.id;

ALTER TABLE "businesses" ALTER COLUMN "employee_prefix" SET NOT NULL;
CREATE UNIQUE INDEX "businesses_employee_prefix_key" ON "businesses"("employee_prefix");
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_employee_prefix_format"
  CHECK ("employee_prefix" ~ '^[A-Z0-9]{2,12}$');

-- Renumber existing employees into their organization's format (they were EMP-0001 everywhere).
WITH numbered AS (
  SELECT e.id, b.employee_prefix || lpad((row_number() OVER (PARTITION BY e.business_id ORDER BY e.created_at, e.id))::text, 4, '0') AS code
    FROM employees e JOIN businesses b ON b.id = e.business_id
)
UPDATE employees e SET employee_code = n.code FROM numbered n WHERE n.id = e.id;

CREATE UNIQUE INDEX "employees_employee_code_key" ON "employees"("employee_code");

COMMIT;
