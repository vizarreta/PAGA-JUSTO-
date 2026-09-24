-- Preserve the legacy XLM values exactly as integer stroops. Overflow aborts the
-- migration; never truncate a financial value. Run on a backup-reviewed DB.
BEGIN;
ALTER TABLE "Agreement"
  ALTER COLUMN "totalAmount" TYPE BIGINT USING ("totalAmount" * 10000000)::BIGINT,
  ALTER COLUMN "deposited" TYPE BIGINT USING ("deposited" * 10000000)::BIGINT,
  ALTER COLUMN "paid" TYPE BIGINT USING ("paid" * 10000000)::BIGINT,
  ALTER COLUMN "refunded" TYPE BIGINT USING ("refunded" * 10000000)::BIGINT;
ALTER TABLE "Milestone" ALTER COLUMN "amount" TYPE BIGINT USING ("amount" * 10000000)::BIGINT;
ALTER TABLE "Transaction" ALTER COLUMN "amount" TYPE BIGINT USING ("amount" * 10000000)::BIGINT;
ALTER TABLE "SettlementProposal"
  ALTER COLUMN "referenceBalance" TYPE BIGINT USING ("referenceBalance" * 10000000)::BIGINT,
  ALTER COLUMN "clientAmount" TYPE BIGINT USING ("clientAmount" * 10000000)::BIGINT,
  ALTER COLUMN "freelancerAmount" TYPE BIGINT USING ("freelancerAmount" * 10000000)::BIGINT;
COMMIT;
