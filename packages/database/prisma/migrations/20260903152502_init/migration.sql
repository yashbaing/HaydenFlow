-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "benchmarkSymbol" TEXT,
    "isBridgeAsset" BOOLEAN NOT NULL DEFAULT false,
    "logoColor" TEXT NOT NULL,
    "currentPrice" REAL NOT NULL DEFAULT 0,
    "priceChange24h" REAL NOT NULL DEFAULT 0,
    "marketCap" REAL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "pools" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "poolId" TEXT NOT NULL,
    "token0Symbol" TEXT NOT NULL,
    "token1Symbol" TEXT NOT NULL,
    "poolType" TEXT NOT NULL,
    "correlation" REAL,
    "correlationClassification" TEXT,
    "feeBps" INTEGER NOT NULL,
    "tvl" REAL NOT NULL DEFAULT 0,
    "volume24h" REAL NOT NULL DEFAULT 0,
    "volume7d" REAL NOT NULL DEFAULT 0,
    "fees24h" REAL NOT NULL DEFAULT 0,
    "apr" REAL NOT NULL DEFAULT 0,
    "riskLevel" TEXT NOT NULL DEFAULT 'MODERATE',
    "reserve0" TEXT NOT NULL DEFAULT '0',
    "reserve1" TEXT NOT NULL DEFAULT '0',
    "totalLpTokens" TEXT NOT NULL DEFAULT '0',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "open" REAL NOT NULL,
    "high" REAL NOT NULL,
    "low" REAL NOT NULL,
    "close" REAL NOT NULL,
    "volume" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "price_history_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "correlations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetAId" TEXT NOT NULL,
    "assetBId" TEXT NOT NULL,
    "correlation" REAL NOT NULL,
    "classification" TEXT NOT NULL,
    "dataPoints" INTEGER NOT NULL,
    "periodDays" INTEGER NOT NULL DEFAULT 90,
    "calculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "correlations_assetAId_fkey" FOREIGN KEY ("assetAId") REFERENCES "assets" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "correlations_assetBId_fkey" FOREIGN KEY ("assetBId") REFERENCES "assets" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "volume_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "poolId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "volume" REAL NOT NULL,
    "tvl" REAL NOT NULL,
    "fees" REAL NOT NULL,
    CONSTRAINT "volume_history_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "pools" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lp_positions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "positionId" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "lpTokens" TEXT NOT NULL,
    "token0Deposited" REAL NOT NULL,
    "token1Deposited" REAL NOT NULL,
    "feesEarned0" TEXT NOT NULL DEFAULT '0',
    "feesEarned1" TEXT NOT NULL DEFAULT '0',
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "lp_positions_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "pools" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "protocol_snapshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "totalTvl" REAL NOT NULL,
    "volume24h" REAL NOT NULL,
    "totalVolume" REAL NOT NULL,
    "fees24h" REAL NOT NULL,
    "totalFees" REAL NOT NULL,
    "marketCount" INTEGER NOT NULL,
    "correlatedMarketCount" INTEGER NOT NULL,
    "activeLPs" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "assets_symbol_key" ON "assets"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "assets_tokenAddress_key" ON "assets"("tokenAddress");

-- CreateIndex
CREATE UNIQUE INDEX "pools_poolId_key" ON "pools"("poolId");

-- CreateIndex
CREATE INDEX "price_history_assetId_timestamp_idx" ON "price_history"("assetId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "price_history_assetId_timestamp_key" ON "price_history"("assetId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "correlations_assetAId_assetBId_key" ON "correlations"("assetAId", "assetBId");

-- CreateIndex
CREATE INDEX "volume_history_poolId_timestamp_idx" ON "volume_history"("poolId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "volume_history_poolId_timestamp_key" ON "volume_history"("poolId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "lp_positions_positionId_key" ON "lp_positions"("positionId");

-- CreateIndex
CREATE INDEX "lp_positions_ownerAddress_idx" ON "lp_positions"("ownerAddress");

-- CreateIndex
CREATE UNIQUE INDEX "protocol_snapshots_date_key" ON "protocol_snapshots"("date");
