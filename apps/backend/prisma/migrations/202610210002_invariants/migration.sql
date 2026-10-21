BEGIN;

CREATE UNIQUE INDEX attendance_sessions_one_open_per_employee
  ON attendance_sessions(employee_id) WHERE status = 'OPEN';
CREATE UNIQUE INDEX face_enrollments_one_active_per_employee
  ON face_enrollments(employee_id) WHERE status = 'ACTIVE';
CREATE INDEX geofences_center_gist ON geofences USING GIST(center);
CREATE INDEX activation_tokens_employee_expiry ON activation_tokens(employee_id, expires_at);

ALTER TABLE geofences ADD CONSTRAINT geofence_positive_dimensions
  CHECK (radius_m > 0 AND max_accuracy_m > 0);
ALTER TABLE geofences ADD CONSTRAINT geofence_valid_dates
  CHECK (active_to IS NULL OR active_to > active_from);
ALTER TABLE employee_branch_assignments ADD CONSTRAINT branch_assignment_valid_dates
  CHECK (effective_to IS NULL OR effective_to > effective_from);
ALTER TABLE shift_assignments ADD CONSTRAINT shift_assignment_valid_dates
  CHECK (effective_to IS NULL OR effective_to >= effective_from);
ALTER TABLE shifts ADD CONSTRAINT shift_nonnegative_durations
  CHECK (grace_min >= 0 AND break_min >= 0);
ALTER TABLE credentials ADD CONSTRAINT credentials_nonnegative_attempts CHECK (failed_attempts >= 0);
ALTER TABLE attendance_attempts ADD CONSTRAINT attempt_valid_expiry CHECK (expires_at > issued_at);
ALTER TABLE attendance_attempts ADD CONSTRAINT consumed_attempt_timestamp
  CHECK ((status = 'CONSUMED') = (consumed_at IS NOT NULL));
ALTER TABLE attendance_sessions ADD CONSTRAINT session_valid_times
  CHECK (closed_at IS NULL OR closed_at >= opened_at);
ALTER TABLE attendance_sessions ADD CONSTRAINT session_state_time
  CHECK ((status = 'OPEN' AND closed_at IS NULL) OR (status <> 'OPEN' AND closed_at IS NOT NULL));
ALTER TABLE attendance_sessions ADD CONSTRAINT session_nonnegative_minutes
  CHECK (minutes_worked_cached IS NULL OR minutes_worked_cached >= 0);
ALTER TABLE face_enrollments ADD CONSTRAINT active_enrollment_approved
  CHECK (status <> 'ACTIVE' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL));
ALTER TABLE face_checks ADD CONSTRAINT face_scores_in_range
  CHECK ((liveness_score IS NULL OR liveness_score BETWEEN 0 AND 100)
    AND (similarity_score IS NULL OR similarity_score BETWEEN 0 AND 100));
ALTER TABLE location_checks ADD CONSTRAINT location_valid_coordinates
  CHECK (reported_lat BETWEEN -90 AND 90 AND reported_lon BETWEEN -180 AND 180
    AND accuracy_m >= 0 AND (distance_m IS NULL OR distance_m >= 0));
ALTER TABLE attendance_corrections ADD CONSTRAINT correction_nonempty_reason CHECK (length(trim(reason)) > 0);
ALTER TABLE attendance_corrections ADD CONSTRAINT correction_review_identity
  CHECK (status = 'PENDING' OR (reviewer_id IS NOT NULL AND reviewed_at IS NOT NULL AND reviewer_id <> requester_id));
ALTER TABLE attendance_corrections ADD CONSTRAINT correction_valid_times
  CHECK (requested_out IS NULL OR requested_in IS NULL OR requested_out >= requested_in);
ALTER TABLE attendance_adjustments ADD CONSTRAINT adjustment_valid_times
  CHECK (approved_out IS NULL OR approved_in IS NULL OR approved_out >= approved_in);

CREATE FUNCTION reject_immutable_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% records are append-only', TG_TABLE_NAME;
END;
$$;
CREATE TRIGGER immutable_attendance_events BEFORE UPDATE OR DELETE ON attendance_events
  FOR EACH ROW EXECUTE FUNCTION reject_immutable_change();
CREATE TRIGGER immutable_audit_logs BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION reject_immutable_change();
CREATE TRIGGER immutable_attendance_adjustments BEFORE UPDATE OR DELETE ON attendance_adjustments
  FOR EACH ROW EXECUTE FUNCTION reject_immutable_change();

-- Application transactions must lock and consume an attempt after authoritative
-- provider, assignment and policy checks. This is an additional database gate.
CREATE FUNCTION validate_attendance_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  attempt attendance_attempts%ROWTYPE;
  attendance attendance_sessions%ROWTYPE;
BEGIN
  SELECT * INTO attempt FROM attendance_attempts WHERE id = NEW.attempt_id FOR UPDATE;
  SELECT * INTO attendance FROM attendance_sessions WHERE id = NEW.session_id FOR UPDATE;
  IF attempt.id IS NULL OR attendance.id IS NULL
    OR attempt.business_id <> NEW.business_id OR attempt.employee_id <> NEW.employee_id
    OR attempt.branch_id <> NEW.branch_id OR attempt.action <> NEW.type
    OR attendance.business_id <> NEW.business_id OR attendance.employee_id <> NEW.employee_id
    OR attendance.branch_id <> NEW.branch_id
    OR attempt.status <> 'CONSUMED' OR attempt.consumed_at IS NULL
    OR attempt.expires_at <= clock_timestamp()
    OR NOT EXISTS (SELECT 1 FROM face_checks f JOIN face_enrollments e ON e.id = f.enrollment_id
      WHERE f.attempt_id = attempt.id AND f.result = 'PASS' AND e.status = 'ACTIVE'
        AND e.employee_id = NEW.employee_id AND e.business_id = NEW.business_id)
    OR NOT EXISTS (SELECT 1 FROM location_checks WHERE attempt_id = attempt.id AND result = 'PASS')
  THEN
    RAISE EXCEPTION 'Attendance event requires a matching unexpired consumed attempt and passing verification';
  END IF;
  NEW.occurred_at := clock_timestamp();
  NEW.created_at := NEW.occurred_at;
  RETURN NEW;
END;
$$;
CREATE TRIGGER attendance_event_verified BEFORE INSERT ON attendance_events
  FOR EACH ROW EXECUTE FUNCTION validate_attendance_event();

COMMIT;
