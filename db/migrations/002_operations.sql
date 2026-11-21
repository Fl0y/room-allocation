-- Lotul 6a (D38): anularea rezervărilor și închiderea sălilor cu repararea automată, înregistrate ca operații
-- idempotente în același tabel ca cererile; raportul reparării se păstrează lângă închidere.

ALTER TABLE requests DROP CONSTRAINT requests_outcome_check;
ALTER TABLE requests ADD CONSTRAINT requests_outcome_check CHECK (outcome IN ('accepted', 'rejected', 'cancelled', 'closure'));

ALTER TABLE closures ADD COLUMN report jsonb;
ALTER TABLE closures ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
