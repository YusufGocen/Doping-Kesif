-- PostgreSQL 16; domain schema owned by Flyway. No production seed data.

CREATE TABLE kesif.kesif_round (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    session_id uuid NOT NULL REFERENCES kesif.kesif_session(id),
    round_no smallint NOT NULL CHECK (round_no BETWEEN 1 AND 10),
    question_reference varchar(128) NOT NULL,
    question_snapshot jsonb NOT NULL CHECK (jsonb_typeof(question_snapshot) = 'object'),
    correct_option_key varchar(8) NOT NULL,
    status varchar(24) NOT NULL CHECK (status IN ('PENDING','QUESTION_OPEN','REVEAL','COMPLETED')),
    opened_at timestamptz,
    deadline_at timestamptz,
    resolved_at timestamptz,
    reveal_deadline_at timestamptz,
    UNIQUE (session_id, round_no),
    UNIQUE (id, session_id),
    UNIQUE (session_id, question_reference),
    CHECK (deadline_at IS NULL OR (opened_at IS NOT NULL AND deadline_at > opened_at))
);
CREATE INDEX ix_round_deadline ON kesif.kesif_round(deadline_at) WHERE status = 'QUESTION_OPEN';

CREATE TABLE kesif.kesif_round_answer (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    session_id uuid NOT NULL,
    round_id uuid NOT NULL,
    player_id uuid NOT NULL,
    option_key varchar(8),
    correct boolean NOT NULL,
    source varchar(24) NOT NULL CHECK (source IN ('SUBMITTED','TIMEOUT')),
    client_request_id uuid,
    answered_at timestamptz NOT NULL,
    UNIQUE (round_id, player_id),
    FOREIGN KEY (round_id, session_id) REFERENCES kesif.kesif_round(id, session_id),
    FOREIGN KEY (session_id, player_id) REFERENCES kesif.kesif_session_player(session_id, player_id),
    CHECK ((source = 'SUBMITTED' AND option_key IS NOT NULL AND client_request_id IS NOT NULL) OR (source = 'TIMEOUT' AND option_key IS NULL AND client_request_id IS NULL AND NOT correct))
);
CREATE UNIQUE INDEX uq_answer_request ON kesif.kesif_round_answer(player_id, client_request_id) WHERE client_request_id IS NOT NULL;

CREATE TABLE kesif.kesif_piece_unlock (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    session_id uuid NOT NULL,
    round_id uuid NOT NULL,
    earned_by_player_id uuid NOT NULL,
    piece_index smallint NOT NULL CHECK (piece_index BETWEEN 1 AND 20),
    UNIQUE (session_id, piece_index),
    UNIQUE (round_id, earned_by_player_id),
    FOREIGN KEY (round_id, session_id) REFERENCES kesif.kesif_round(id, session_id),
    FOREIGN KEY (round_id, earned_by_player_id) REFERENCES kesif.kesif_round_answer(round_id, player_id)
);


-- A content-bank edit or accidental update cannot alter a running/historical question.
CREATE FUNCTION kesif.protect_round_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF (NEW.session_id, NEW.round_no, NEW.question_reference, NEW.question_snapshot, NEW.correct_option_key)
       IS DISTINCT FROM
       (OLD.session_id, OLD.round_no, OLD.question_reference, OLD.question_snapshot, OLD.correct_option_key) THEN
        RAISE EXCEPTION 'Round question snapshot is immutable' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_round_snapshot_immutable BEFORE UPDATE ON kesif.kesif_round
FOR EACH ROW EXECUTE FUNCTION kesif.protect_round_snapshot();

