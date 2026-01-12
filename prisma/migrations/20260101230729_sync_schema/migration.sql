-- CreateTable
CREATE TABLE "CreatorEarnings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "marketId" INTEGER NOT NULL,
    "creatorId" INTEGER NOT NULL,
    "platformFee" DECIMAL NOT NULL,
    "commissionEarned" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CreatorEarnings_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Bet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CreatorEarnings_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Auth" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResolutionVote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "poolId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "outcome" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResolutionVote_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool" ("matchId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ResolutionVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Auth" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "creatorId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "choice" TEXT,
    "stakeAmount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "ethicsVerdict" TEXT NOT NULL DEFAULT 'APPROVED',
    "probabilityTag" TEXT NOT NULL DEFAULT 'MEDIUM_PROBABILITY',
    "aiScore" INTEGER DEFAULT 0,
    "aiAnalysis" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "creatorCommissionRate" REAL DEFAULT 0,
    "totalStake" DECIMAL NOT NULL DEFAULT 0,
    "uniqueParticipants" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" REAL DEFAULT 0,
    CONSTRAINT "Bet_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Auth" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Bet" ("category", "choice", "createdAt", "creatorId", "currency", "description", "endDate", "ethicsVerdict", "id", "options", "stakeAmount", "status", "title", "updatedAt") SELECT "category", "choice", "createdAt", "creatorId", "currency", "description", "endDate", "ethicsVerdict", "id", "options", "stakeAmount", "status", "title", "updatedAt" FROM "Bet";
DROP TABLE "Bet";
ALTER TABLE "new_Bet" RENAME TO "Bet";
CREATE TABLE "new_GamificationProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "reputationScore" INTEGER NOT NULL DEFAULT 50,
    "tier" TEXT NOT NULL DEFAULT 'Bronze',
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "maxStreak" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" DECIMAL NOT NULL DEFAULT 0,
    "totalVolume" DECIMAL NOT NULL DEFAULT 0,
    "betsCreated" INTEGER NOT NULL DEFAULT 0,
    "accuracy" REAL NOT NULL DEFAULT 0.0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GamificationProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Auth" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_GamificationProfile" ("currentStreak", "id", "losses", "maxStreak", "reputationScore", "tier", "totalEarnings", "totalVolume", "updatedAt", "userId", "wins") SELECT "currentStreak", "id", "losses", "maxStreak", "reputationScore", "tier", "totalEarnings", "totalVolume", "updatedAt", "userId", "wins" FROM "GamificationProfile";
DROP TABLE "GamificationProfile";
ALTER TABLE "new_GamificationProfile" RENAME TO "GamificationProfile";
CREATE UNIQUE INDEX "GamificationProfile_userId_key" ON "GamificationProfile"("userId");
CREATE TABLE "new_Pool" (
    "matchId" INTEGER NOT NULL,
    "marketId" TEXT,
    "listingId" INTEGER,
    "userAId" INTEGER NOT NULL,
    "userBId" INTEGER,
    "stakeA" DECIMAL NOT NULL,
    "stakeB" DECIMAL NOT NULL DEFAULT 0,
    "totalYesAmount" DECIMAL NOT NULL DEFAULT 0,
    "totalNoAmount" DECIMAL NOT NULL DEFAULT 0,
    "totalPoolAmount" DECIMAL NOT NULL DEFAULT 0,
    "participantsCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'LIVE',
    "outcome" TEXT NOT NULL DEFAULT 'YES',
    "challengeDeadline" DATETIME,
    "challengeCount" INTEGER NOT NULL DEFAULT 0,
    "challengeBond" DECIMAL NOT NULL DEFAULT 0,
    "challengerId" INTEGER,
    "healthScore" INTEGER NOT NULL DEFAULT 0,
    "riskLabel" TEXT NOT NULL DEFAULT 'High Risk',
    "closeTime" DATETIME,
    "disputeDeadline" DATETIME,
    "disputeWindowHours" INTEGER NOT NULL DEFAULT 12,
    "disputeMinStakePercent" DECIMAL NOT NULL DEFAULT 0.02,
    "disputed" BOOLEAN NOT NULL DEFAULT false,
    "disputeStakeTotal" DECIMAL NOT NULL DEFAULT 0,
    "resolutionDeadline" DATETIME,
    "resolutionYesStake" DECIMAL NOT NULL DEFAULT 0,
    "resolutionNoStake" DECIMAL NOT NULL DEFAULT 0,
    "resolutionMinStakePercent" DECIMAL NOT NULL DEFAULT 0.02,
    "resolutionWindowHours" INTEGER NOT NULL DEFAULT 12,
    "slashingRatePercent" INTEGER NOT NULL DEFAULT 50,
    "minResolutionParticipants" INTEGER NOT NULL DEFAULT 3,
    "resolutionEscalated" BOOLEAN NOT NULL DEFAULT false,
    "resolutionIncentivePercent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pool_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pool_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "Auth" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pool_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "Auth" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pool_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Pool" ("challengeCount", "challengeDeadline", "createdAt", "listingId", "marketId", "matchId", "outcome", "participantsCount", "stakeA", "stakeB", "status", "totalNoAmount", "totalPoolAmount", "totalYesAmount", "updatedAt", "userAId", "userBId") SELECT "challengeCount", "challengeDeadline", "createdAt", "listingId", "marketId", "matchId", "outcome", "participantsCount", "stakeA", "stakeB", "status", "totalNoAmount", "totalPoolAmount", "totalYesAmount", "updatedAt", "userAId", "userBId" FROM "Pool";
DROP TABLE "Pool";
ALTER TABLE "new_Pool" RENAME TO "Pool";
CREATE UNIQUE INDEX "Pool_matchId_key" ON "Pool"("matchId");
CREATE UNIQUE INDEX "Pool_listingId_key" ON "Pool"("listingId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ResolutionVote_poolId_userId_key" ON "ResolutionVote"("poolId", "userId");
