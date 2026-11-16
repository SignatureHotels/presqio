-- A roster: what someone works on a given date, overriding their usual shift and weekly offs.
-- Rows with a shift: the shifts worked that day (two rows = a split day).
-- A row with no shift: a day off. No rows: the usual shift applies.
CREATE TABLE roster_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  employee_id UUID NOT NULL,
  work_date   DATE NOT NULL,
  shift_id    UUID,
  created_by  UUID NOT NULL,
  created_at  TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  CONSTRAINT roster_entries_employee_fkey FOREIGN KEY (business_id, employee_id)
    REFERENCES employees(business_id, id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT roster_entries_shift_fkey FOREIGN KEY (business_id, shift_id)
    REFERENCES shifts(business_id, id) ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX roster_entries_shift_key ON roster_entries (business_id, employee_id, work_date, shift_id) WHERE shift_id IS NOT NULL;
CREATE UNIQUE INDEX roster_entries_off_key ON roster_entries (business_id, employee_id, work_date) WHERE shift_id IS NULL;
CREATE INDEX roster_entries_date_idx ON roster_entries (business_id, work_date);
