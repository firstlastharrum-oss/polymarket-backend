-- CreateTable
CREATE TABLE "Auth" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "wallet_address" TEXT,
    "role" TEXT NOT NULL,
    "setting" JSONB NOT NULL,
    "nonce" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "seller_id" INTEGER NOT NULL,
    "price" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Crypto',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Listing_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "Auth" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Listing_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "buyerId" INTEGER NOT NULL,
    "sellerId" INTEGER NOT NULL,
    "listingId" INTEGER,
    "amount" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Auth" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Auth" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bet" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bet_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Auth" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Match" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "betAId" INTEGER NOT NULL,
    "betBId" INTEGER,
    "marketId" TEXT,
    "contractAddress" TEXT,
    "marketStartTime" DATETIME,
    "participants" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Match_betAId_fkey" FOREIGN KEY ("betAId") REFERENCES "Bet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_betBId_fkey" FOREIGN KEY ("betBId") REFERENCES "Bet" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Auth" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "public_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" INTEGER,
    "type" TEXT,
    "format" TEXT,
    "size" INTEGER
);

-- CreateTable
CREATE TABLE "Balance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "available" DECIMAL NOT NULL DEFAULT 0,
    "locked" DECIMAL NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Balance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Auth" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pool" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pool_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pool_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "Auth" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pool_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "Auth" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pool_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "refMatchId" INTEGER,
    "refPoolId" INTEGER,
    "payload" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Position" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "poolId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "side" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Position_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool" ("matchId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Position_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Auth" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Auth_email_key" ON "Auth"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Auth_wallet_address_key" ON "Auth"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_public_id_key" ON "Asset"("public_id");

-- CreateIndex
CREATE INDEX "Asset_public_id_idx" ON "Asset"("public_id");

-- CreateIndex
CREATE INDEX "Asset_created_at_idx" ON "Asset"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "Balance_userId_key" ON "Balance"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Pool_matchId_key" ON "Pool"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "Pool_listingId_key" ON "Pool"("listingId");

-- CreateIndex
CREATE INDEX "Position_poolId_idx" ON "Position"("poolId");

-- CreateIndex
CREATE INDEX "Position_userId_idx" ON "Position"("userId");
