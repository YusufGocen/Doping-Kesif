-- Durable reveal recovery uses the same bounded deadline scan as open questions.
CREATE INDEX ix_round_reveal_deadline ON kesif.kesif_round(reveal_deadline_at, session_id)
    WHERE status = 'REVEAL';
