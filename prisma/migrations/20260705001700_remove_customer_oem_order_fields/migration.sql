-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountName" TEXT NOT NULL,
    "englishName" TEXT,
    "region" TEXT,
    "industry" TEXT,
    "description" TEXT,
    "ownerName" TEXT,
    "aeName" TEXT,
    "ownerUserId" TEXT,
    "notes" TEXT,
    "oemOpportunityNo" TEXT,
    "oemOpportunityName" TEXT,
    "oemRegisterStartAt" DATETIME,
    "oemRegisterExpiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Customer" ("accountName", "aeName", "createdAt", "description", "englishName", "id", "industry", "notes", "oemOpportunityName", "oemOpportunityNo", "oemRegisterExpiresAt", "oemRegisterStartAt", "ownerName", "ownerUserId", "region", "updatedAt") SELECT "accountName", "aeName", "createdAt", "description", "englishName", "id", "industry", "notes", "oemOpportunityName", "oemOpportunityNo", "oemRegisterExpiresAt", "oemRegisterStartAt", "ownerName", "ownerUserId", "region", "updatedAt" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
