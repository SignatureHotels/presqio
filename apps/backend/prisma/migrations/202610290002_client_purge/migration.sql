-- The owner console can delete a client outright. Only that purge sets presqio.purging for its
-- own transaction (SET LOCAL); every other change to these records is still refused.
CREATE OR REPLACE FUNCTION reject_immutable_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('presqio.purging', true) = 'on' THEN RETURN OLD; END IF;
  RAISE EXCEPTION '% records are append-only', TG_TABLE_NAME;
END;
$$;

CREATE OR REPLACE FUNCTION protect_finalized_payroll_run() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('presqio.purging', true) = 'on' THEN RETURN OLD; END IF;
  IF OLD.status = 'FINALIZED' THEN RAISE EXCEPTION 'Finalized payroll cannot be changed'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION protect_finalized_payroll_item() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE run_status text;
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('presqio.purging', true) = 'on' THEN RETURN OLD; END IF;
  IF TG_OP <> 'INSERT' THEN
    SELECT status INTO run_status FROM payroll_runs WHERE id = OLD.run_id FOR UPDATE;
    IF run_status = 'FINALIZED' THEN RAISE EXCEPTION 'Finalized payroll cannot be changed'; END IF;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    SELECT status INTO run_status FROM payroll_runs WHERE id = NEW.run_id FOR UPDATE;
    IF run_status = 'FINALIZED' THEN RAISE EXCEPTION 'Finalized payroll cannot be changed'; END IF;
    RETURN NEW;
  END IF;
  RETURN OLD;
END $$;

CREATE OR REPLACE FUNCTION protect_payroll_payment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE run_status text;
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('presqio.purging', true) = 'on' THEN RETURN OLD; END IF;
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Payment records are append only'; END IF;
  SELECT r.status INTO run_status FROM payroll_items i JOIN payroll_runs r ON r.id = i.run_id WHERE i.id = NEW.item_id FOR UPDATE OF r;
  IF run_status <> 'FINALIZED' THEN RAISE EXCEPTION 'Payments require finalized payroll'; END IF;
  RETURN NEW;
END $$;
