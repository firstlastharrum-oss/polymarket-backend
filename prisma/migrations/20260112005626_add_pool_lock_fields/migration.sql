-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "adminFinalized" BOOLEAN NOT NULL DEFAULT false,
    "settledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pool_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pool_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "Auth" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pool_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "Auth" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pool_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Pool" ("challengeBond", "challengeCount", "challengeDeadline", "challengerId", "closeTime", "createdAt", "disputeDeadline", "disputeMinStakePercent", "disputeStakeTotal", "disputeWindowHours", "disputed", "healthScore", "listingId", "marketId", "matchId", "minResolutionParticipants", "outcome", "participantsCount", "resolutionDeadline", "resolutionEscalated", "resolutionIncentivePercent", "resolutionMinStakePercent", "resolutionNoStake", "resolutionWindowHours", "resolutionYesStake", "riskLabel", "slashingRatePercent", "stakeA", "stakeB", "status", "totalNoAmount", "totalPoolAmount", "totalYesAmount", "updatedAt", "userAId", "userBId") SELECT "challengeBond", "challengeCount", "challengeDeadline", "challengerId", "closeTime", "createdAt", "disputeDeadline", "disputeMinStakePercent", "disputeStakeTotal", "disputeWindowHours", "disputed", "healthScore", "listingId", "marketId", "matchId", "minResolutionParticipants", "outcome", "participantsCount", "resolutionDeadline", "resolutionEscalated", "resolutionIncentivePercent", "resolutionMinStakePercent", "resolutionNoStake", "resolutionWindowHours", "resolutionYesStake", "riskLabel", "slashingRatePercent", "stakeA", "stakeB", "status", "totalNoAmount", "totalPoolAmount", "totalYesAmount", "updatedAt", "userAId", "userBId" FROM "Pool";
DROP TABLE "Pool";
ALTER TABLE "new_Pool" RENAME TO "Pool";
CREATE UNIQUE INDEX "Pool_matchId_key" ON "Pool"("matchId");
CREATE UNIQUE INDEX "Pool_listingId_key" ON "Pool"("listingId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
