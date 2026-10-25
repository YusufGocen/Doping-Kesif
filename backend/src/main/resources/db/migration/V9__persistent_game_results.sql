ALTER TABLE kesif.kesif_session ADD COLUMN rewards_finalized_at timestamptz;
ALTER TABLE kesif.kesif_session ADD CONSTRAINT ck_finalized_completed
    CHECK (rewards_finalized_at IS NULL OR status='COMPLETED');
ALTER TABLE kesif.kesif_session_player ADD COLUMN collection_added_count smallint NOT NULL DEFAULT 0
    CHECK (collection_added_count BETWEEN 0 AND 20);
CREATE INDEX ix_completed_history ON kesif.kesif_session(ended_at DESC,id DESC) WHERE status='COMPLETED';
CREATE INDEX ix_session_player_history ON kesif.kesif_session_player(player_id,session_id);
