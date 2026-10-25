-- PostgreSQL 16; domain schema owned by Flyway. No production seed data.

CREATE TABLE kesif.kesif_player_profile (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    external_user_id varchar(128) NOT NULL UNIQUE,
    display_name varchar(100)
);


CREATE TABLE kesif.kesif_subject (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    code varchar(32) NOT NULL UNIQUE,
    name varchar(100) NOT NULL,
    active boolean NOT NULL DEFAULT true
);


CREATE TABLE kesif.kesif_topic (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    subject_id uuid NOT NULL REFERENCES kesif.kesif_subject(id),
    grade_level smallint NOT NULL CHECK (grade_level BETWEEN 5 AND 8),
    code varchar(64) NOT NULL,
    name varchar(150) NOT NULL,
    active boolean NOT NULL DEFAULT true,
    UNIQUE (subject_id, grade_level, code),
    UNIQUE (id, subject_id, grade_level)
);


CREATE TABLE kesif.kesif_question (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    topic_id uuid NOT NULL REFERENCES kesif.kesif_topic(id),
    external_question_id varchar(128),
    body jsonb NOT NULL CHECK (jsonb_typeof(body) = 'object'),
    difficulty_tag varchar(32),
    content_version integer NOT NULL CHECK (content_version > 0),
    status varchar(24) NOT NULL CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED'))
);
CREATE INDEX ix_question_topic_status ON kesif.kesif_question(topic_id, status);

CREATE TABLE kesif.kesif_question_option (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    question_id uuid NOT NULL REFERENCES kesif.kesif_question(id),
    option_key varchar(8) NOT NULL,
    body jsonb NOT NULL CHECK (jsonb_typeof(body) = 'object'),
    correct boolean NOT NULL,
    UNIQUE (question_id, option_key)
);
CREATE UNIQUE INDEX uq_question_correct_option ON kesif.kesif_question_option(question_id) WHERE correct;

CREATE TABLE kesif.kesif_puzzle (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    code varchar(64) NOT NULL UNIQUE,
    title varchar(120) NOT NULL,
    asset_key varchar(255) NOT NULL,
    piece_count smallint NOT NULL DEFAULT 20 CHECK (piece_count = 20),
    active boolean NOT NULL DEFAULT true
);



