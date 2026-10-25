-- Keep applied migrations immutable; extend integrity with a new migration.
ALTER TABLE kesif.kesif_room ADD CONSTRAINT uq_room_puzzle UNIQUE (id, puzzle_id);
ALTER TABLE kesif.kesif_session ADD CONSTRAINT fk_session_room_puzzle
    FOREIGN KEY (room_id, puzzle_id) REFERENCES kesif.kesif_room(id, puzzle_id);

CREATE FUNCTION kesif.protect_xp_ledger() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'XP ledger is append-only' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER trg_xp_ledger_append_only BEFORE UPDATE OR DELETE ON kesif.kesif_xp_ledger
FOR EACH ROW EXECUTE FUNCTION kesif.protect_xp_ledger();
