ALTER TABLE kesif.kesif_room
    ADD COLUMN creation_request_id uuid NOT NULL DEFAULT gen_random_uuid(),
    ADD COLUMN event_sequence bigint NOT NULL DEFAULT 0 CHECK (event_sequence >= 0),
    ADD CONSTRAINT uq_room_creation_request UNIQUE (owner_player_id, creation_request_id);
CREATE INDEX ix_room_player_lookup ON kesif.kesif_room_player(player_id, active);
