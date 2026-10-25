-- PostgreSQL 16; domain schema owned by Flyway. No production seed data.

CREATE FUNCTION kesif.valid_piece_order(candidate jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE STRICT AS $$
    SELECT CASE WHEN jsonb_typeof(candidate) <> 'array' THEN false
        ELSE jsonb_array_length(candidate) = 20 AND
            (SELECT count(DISTINCT item) = 20 AND bool_and(item IN ('1'::jsonb, '2'::jsonb, '3'::jsonb, '4'::jsonb, '5'::jsonb, '6'::jsonb, '7'::jsonb, '8'::jsonb, '9'::jsonb, '10'::jsonb, '11'::jsonb, '12'::jsonb, '13'::jsonb, '14'::jsonb, '15'::jsonb, '16'::jsonb, '17'::jsonb, '18'::jsonb, '19'::jsonb, '20'::jsonb))
             FROM jsonb_array_elements(candidate) AS elements(item))
    END;
$$;

CREATE TABLE kesif.kesif_room (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    owner_player_id uuid NOT NULL REFERENCES kesif.kesif_player_profile(id),
    group_external_id varchar(128) NOT NULL,
    join_method varchar(24) NOT NULL CHECK (join_method IN ('INVITATION','CODE')),
    code_digest varchar(128),
    puzzle_id uuid NOT NULL REFERENCES kesif.kesif_puzzle(id),
    subject_id uuid NOT NULL REFERENCES kesif.kesif_subject(id),
    grade_level smallint NOT NULL CHECK (grade_level BETWEEN 5 AND 8),
    topic_id uuid,
    rules_snapshot jsonb NOT NULL CHECK (jsonb_typeof(rules_snapshot) = 'object'),
    status varchar(24) NOT NULL CHECK (status IN ('OPEN','FULL','STARTED','CLOSED','CANCELLED','EXPIRED')),
    expires_at timestamptz NOT NULL,
    FOREIGN KEY (topic_id, subject_id, grade_level) REFERENCES kesif.kesif_topic(id, subject_id, grade_level),
    CHECK ((join_method = 'CODE' AND code_digest IS NOT NULL) OR (join_method = 'INVITATION' AND code_digest IS NULL)),
    CHECK (expires_at > created_at)
);
CREATE UNIQUE INDEX uq_active_room_code ON kesif.kesif_room(code_digest) WHERE code_digest IS NOT NULL AND status IN ('OPEN','FULL');
CREATE INDEX ix_room_status_expiry ON kesif.kesif_room(status, expires_at);

CREATE TABLE kesif.kesif_room_player (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    room_id uuid NOT NULL REFERENCES kesif.kesif_room(id),
    player_id uuid NOT NULL REFERENCES kesif.kesif_player_profile(id),
    slot smallint NOT NULL CHECK (slot IN (1,2)),
    ready boolean NOT NULL DEFAULT false,
    active boolean NOT NULL DEFAULT true,
    last_seen_at timestamptz,
    UNIQUE (room_id, player_id),
    UNIQUE (room_id, slot)
);
ALTER TABLE kesif.kesif_room ADD CONSTRAINT fk_room_owner_membership
    FOREIGN KEY (id, owner_player_id) REFERENCES kesif.kesif_room_player(room_id, player_id)
    DEFERRABLE INITIALLY DEFERRED;
CREATE UNIQUE INDEX uq_player_active_room ON kesif.kesif_room_player(player_id) WHERE active;

CREATE TABLE kesif.kesif_invitation (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    room_id uuid NOT NULL REFERENCES kesif.kesif_room(id),
    inviter_id uuid NOT NULL REFERENCES kesif.kesif_player_profile(id),
    invitee_id uuid NOT NULL REFERENCES kesif.kesif_player_profile(id),
    status varchar(24) NOT NULL CHECK (status IN ('PENDING','ACCEPTED','REJECTED','CANCELLED','EXPIRED')),
    expires_at timestamptz NOT NULL,
    responded_at timestamptz,
    CHECK (inviter_id <> invitee_id),
    FOREIGN KEY (room_id, inviter_id) REFERENCES kesif.kesif_room_player(room_id, player_id),
    CHECK (expires_at > created_at)
);
CREATE UNIQUE INDEX uq_room_pending_invitation ON kesif.kesif_invitation(room_id) WHERE status = 'PENDING';
CREATE UNIQUE INDEX uq_room_accepted_invitation ON kesif.kesif_invitation(room_id) WHERE status = 'ACCEPTED';
CREATE INDEX ix_invitation_incoming ON kesif.kesif_invitation(invitee_id, status, expires_at);

CREATE TABLE kesif.kesif_session (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    room_id uuid NOT NULL UNIQUE REFERENCES kesif.kesif_room(id),
    puzzle_id uuid NOT NULL REFERENCES kesif.kesif_puzzle(id),
    rules_snapshot jsonb NOT NULL CHECK (jsonb_typeof(rules_snapshot) = 'object'),
    status varchar(24) NOT NULL CHECK (status IN ('READY','IN_PROGRESS','COMPLETED','CANCELLED','ABANDONED')),
    current_round_no smallint NOT NULL DEFAULT 0 CHECK (current_round_no BETWEEN 0 AND 10),
    revealed_count smallint NOT NULL DEFAULT 0 CHECK (revealed_count BETWEEN 0 AND 20),
    piece_order jsonb NOT NULL CHECK (kesif.valid_piece_order(piece_order)),
    event_sequence bigint NOT NULL DEFAULT 0 CHECK (event_sequence >= 0),
    started_at timestamptz,
    ended_at timestamptz,
    UNIQUE (id, room_id),
    UNIQUE (id, puzzle_id),
    CHECK (ended_at IS NULL OR (started_at IS NOT NULL AND ended_at >= started_at))
);
CREATE INDEX ix_session_status_started ON kesif.kesif_session(status, started_at);

CREATE TABLE kesif.kesif_session_player (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    session_id uuid NOT NULL,
    room_id uuid NOT NULL,
    player_id uuid NOT NULL REFERENCES kesif.kesif_player_profile(id),
    slot smallint NOT NULL CHECK (slot IN (1,2)),
    correct_count smallint NOT NULL DEFAULT 0 CHECK (correct_count BETWEEN 0 AND 10),
    continue_round_no smallint NOT NULL DEFAULT 0 CHECK (continue_round_no BETWEEN 0 AND 10),
    active boolean NOT NULL DEFAULT true,
    UNIQUE (session_id, player_id),
    UNIQUE (session_id, slot),
    FOREIGN KEY (session_id, room_id) REFERENCES kesif.kesif_session(id, room_id),
    FOREIGN KEY (room_id, player_id) REFERENCES kesif.kesif_room_player(room_id, player_id)
);
CREATE UNIQUE INDEX uq_player_active_session ON kesif.kesif_session_player(player_id) WHERE active;


