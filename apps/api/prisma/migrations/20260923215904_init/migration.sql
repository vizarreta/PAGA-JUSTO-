-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agreement" (
    "id" TEXT NOT NULL,
    "clientAddress" TEXT NOT NULL,
    "freelancerAddress" TEXT NOT NULL,
    "token" TEXT NOT NULL DEFAULT 'XLM',
    "totalAmount" DECIMAL(20,7) NOT NULL,
    "deposited" DECIMAL(20,7) NOT NULL DEFAULT 0,
    "paid" DECIMAL(20,7) NOT NULL DEFAULT 0,
    "refunded" DECIMAL(20,7) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Created',
    "milestoneCount" INTEGER NOT NULL DEFAULT 0,
    "currentMilestone" INTEGER NOT NULL DEFAULT 0,
    "termsHash" TEXT NOT NULL DEFAULT '',
    "contractId" TEXT,
    "clientAcceptedAt" TIMESTAMP(3),
    "freelancerAcceptedAt" TIMESTAMP(3),
    "fundedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "termsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "acceptanceCriteria" TEXT[],
    "amount" DECIMAL(20,7) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "evidenceHash" TEXT,
    "evidenceUrl" TEXT,
    "dueDate" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signature" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "termsHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "milestoneIndex" INTEGER NOT NULL,
    "submittedByRole" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "url" TEXT,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "hash" TEXT,
    "amount" DECIMAL(20,7) NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "network" TEXT NOT NULL DEFAULT 'testnet',
    "milestoneIndex" INTEGER,
    "error" TEXT,
    "xdr" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementProposal" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "proposedByRole" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "referenceBalance" DECIMAL(20,7) NOT NULL,
    "clientAmount" DECIMAL(20,7) NOT NULL,
    "freelancerAmount" DECIMAL(20,7) NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),

    CONSTRAINT "SettlementProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentActivity" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledJob" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),

    CONSTRAINT "ScheduledJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_address_key" ON "User"("address");

-- CreateIndex
CREATE UNIQUE INDEX "User_publicKey_key" ON "User"("publicKey");

-- CreateIndex
CREATE INDEX "Agreement_clientAddress_idx" ON "Agreement"("clientAddress");

-- CreateIndex
CREATE INDEX "Agreement_freelancerAddress_idx" ON "Agreement"("freelancerAddress");

-- CreateIndex
CREATE INDEX "Agreement_status_idx" ON "Agreement"("status");

-- CreateIndex
CREATE INDEX "Milestone_agreementId_idx" ON "Milestone"("agreementId");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_agreementId_index_key" ON "Milestone"("agreementId", "index");

-- CreateIndex
CREATE INDEX "Signature_agreementId_idx" ON "Signature"("agreementId");

-- CreateIndex
CREATE UNIQUE INDEX "Signature_agreementId_role_key" ON "Signature"("agreementId", "role");

-- CreateIndex
CREATE INDEX "Evidence_agreementId_idx" ON "Evidence"("agreementId");

-- CreateIndex
CREATE INDEX "Evidence_agreementId_milestoneIndex_idx" ON "Evidence"("agreementId", "milestoneIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_hash_key" ON "Transaction"("hash");

-- CreateIndex
CREATE INDEX "Transaction_agreementId_idx" ON "Transaction"("agreementId");

-- CreateIndex
CREATE INDEX "Transaction_hash_idx" ON "Transaction"("hash");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "SettlementProposal_agreementId_idx" ON "SettlementProposal"("agreementId");

-- CreateIndex
CREATE INDEX "SettlementProposal_status_idx" ON "SettlementProposal"("status");

-- CreateIndex
CREATE INDEX "AgentActivity_agreementId_idx" ON "AgentActivity"("agreementId");

-- CreateIndex
CREATE INDEX "AgentActivity_executedAt_idx" ON "AgentActivity"("executedAt");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_agreementId_idx" ON "Notification"("agreementId");

-- CreateIndex
CREATE INDEX "ScheduledJob_status_runAt_idx" ON "ScheduledJob"("status", "runAt");

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_clientAddress_fkey" FOREIGN KEY ("clientAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_freelancerAddress_fkey" FOREIGN KEY ("freelancerAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_agreementId_milestoneIndex_fkey" FOREIGN KEY ("agreementId", "milestoneIndex") REFERENCES "Milestone"("agreementId", "index") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementProposal" ADD CONSTRAINT "SettlementProposal_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentActivity" ADD CONSTRAINT "AgentActivity_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
