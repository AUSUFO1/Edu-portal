-- Audit trail guarantees enforced by the database itself, not just the application.

-- 1. The audit log is append-only: rows can be inserted but never changed or removed.
CREATE OR REPLACE FUNCTION audit_logs_block_changes() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only (% blocked)', TG_OP USING ERRCODE = 'insufficient_privilege';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE ON audit_logs FOR EACH ROW EXECUTE FUNCTION audit_logs_block_changes();
--> statement-breakpoint
CREATE TRIGGER audit_logs_no_delete BEFORE DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION audit_logs_block_changes();
--> statement-breakpoint

-- 2. Every score entered or changed is recorded with its previous value, whoever changes it.
CREATE OR REPLACE FUNCTION results_track_changes() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.ca_score = OLD.ca_score AND NEW.exam_score = OLD.exam_score THEN
    RETURN NEW;
  END IF;
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
  VALUES (
    NEW.updated_by,
    CASE TG_OP WHEN 'INSERT' THEN 'result.score_entered' ELSE 'result.score_changed' END,
    'result',
    NEW.registration_id::text,
    jsonb_build_object(
      'sheetId', NEW.sheet_id,
      'old', CASE WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('ca', OLD.ca_score, 'exam', OLD.exam_score, 'grade', OLD.grade) END,
      'new', jsonb_build_object('ca', NEW.ca_score, 'exam', NEW.exam_score, 'grade', NEW.grade)
    )
  );
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER results_track_changes AFTER INSERT OR UPDATE ON results FOR EACH ROW EXECUTE FUNCTION results_track_changes();
