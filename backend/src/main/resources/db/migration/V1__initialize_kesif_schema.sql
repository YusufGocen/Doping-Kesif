-- Flyway creates the kesif schema and its history table before this migration.
-- Domain tables will be introduced by new migrations after the unified schema review.
COMMENT ON SCHEMA kesif IS 'Doping Keşif application data; managed by Flyway';
