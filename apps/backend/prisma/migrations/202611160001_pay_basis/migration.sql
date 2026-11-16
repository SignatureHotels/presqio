-- How a salary version is paid: a monthly salary (prorated by paid days, as before), a daily wage per
-- day worked, or an hourly wage per hour worked; plus optional overtime pay beyond a standard day.
ALTER TABLE payroll_compensations
  ADD COLUMN pay_basis TEXT NOT NULL DEFAULT 'MONTHLY',
  ADD COLUMN rate BIGINT,
  ADD COLUMN standard_day_min INTEGER NOT NULL DEFAULT 480,
  ADD COLUMN overtime_pct INTEGER,
  ADD CONSTRAINT payroll_compensations_pay_basis_check CHECK (pay_basis IN ('MONTHLY', 'DAILY', 'HOURLY')),
  ADD CONSTRAINT payroll_compensations_rate_check CHECK (
    (pay_basis = 'MONTHLY' AND rate IS NULL) OR (pay_basis <> 'MONTHLY' AND rate IS NOT NULL AND rate > 0 AND rate <= 100000000000)),
  ADD CONSTRAINT payroll_compensations_standard_day_check CHECK (standard_day_min BETWEEN 60 AND 1440),
  ADD CONSTRAINT payroll_compensations_overtime_check CHECK (overtime_pct IS NULL OR overtime_pct BETWEEN 100 AND 300);
