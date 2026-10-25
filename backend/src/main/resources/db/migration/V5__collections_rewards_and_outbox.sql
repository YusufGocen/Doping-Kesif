-- PostgreSQL 16; domain schema owned by Flyway. No production seed data.

CREATE TABLE kesif.kesif_player_collection (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    player_id uuid NOT NULL REFERENCES kesif.kesif_player_profile(id),
    puzzle_id uuid NOT NULL REFERENCES kesif.kesif_puzzle(id),
    unlocked_count smallint NOT NULL DEFAULT 0 CHECK (unlocked_count BETWEEN 0 AND 20),
    completed_at timestamptz,
    UNIQUE (player_id, puzzle_id),
    UNIQUE (id, puzzle_id),
    CHECK ((unlocked_count = 20) = (completed_at IS NOT NULL))
);


CREATE TABLE kesif.kesif_collection_piece (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    collection_id uuid NOT NULL,
    puzzle_id uuid NOT NULL,
    piece_index smallint NOT NULL CHECK (piece_index BETWEEN 1 AND 20),
    source_session_id uuid NOT NULL,
    UNIQUE (collection_id, piece_index),
    FOREIGN KEY (collection_id, puzzle_id) REFERENCES kesif.kesif_player_collection(id, puzzle_id),
    FOREIGN KEY (source_session_id, puzzle_id) REFERENCES kesif.kesif_session(id, puzzle_id)
);


CREATE TABLE kesif.kesif_xp_ledger (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    player_id uuid NOT NULL REFERENCES kesif.kesif_player_profile(id),
    session_id uuid NOT NULL,
    event_type varchar(40) NOT NULL CHECK (event_type IN ('SESSION_COMPLETED','CORRECT_ANSWER','COLLECTION_COMPLETED')),
    amount integer NOT NULL CHECK (amount > 0),
    dedupe_key varchar(200) NOT NULL UNIQUE,
    FOREIGN KEY (session_id, player_id) REFERENCES kesif.kesif_session_player(session_id, player_id)
);
CREATE INDEX ix_xp_player_created ON kesif.kesif_xp_ledger(player_id, created_at);

CREATE TABLE kesif.kesif_outbox_event (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    aggregate_type varchar(40) NOT NULL,
    aggregate_id uuid NOT NULL,
    event_type varchar(80) NOT NULL,
    sequence_number bigint NOT NULL CHECK (sequence_number > 0),
    payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
    published_at timestamptz,
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    available_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (aggregate_type, aggregate_id, sequence_number)
);
CREATE INDEX ix_outbox_pending ON kesif.kesif_outbox_event(available_at, created_at) WHERE published_at IS NULL;


