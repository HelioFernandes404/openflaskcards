-- Remove length limit from card front/back fields to support rich markdown content
ALTER TABLE cards
  ALTER COLUMN front TYPE TEXT,
  ALTER COLUMN back TYPE TEXT;
