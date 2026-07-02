-- RBAC: user ownership on customers and support cases

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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Customer" ("accountName", "aeName", "createdAt", "description", "englishName", "id", "industry", "notes", "ownerName", "region", "updatedAt")
SELECT "accountName", "aeName", "createdAt", "description", "englishName", "id", "industry", "notes", "ownerName", "region", "updatedAt" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";

CREATE TABLE "new_SupportCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "title" TEXT NOT NULL,
    "customerIssue" TEXT,
    "solution" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "priority" TEXT NOT NULL DEFAULT 'Normal',
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    "notes" TEXT,
    "assignedUserId" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupportCase_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SupportCase_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SupportCase_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SupportCase" ("closedAt", "customerId", "customerIssue", "id", "notes", "openedAt", "opportunityId", "priority", "solution", "status", "title", "updatedAt")
SELECT "closedAt", "customerId", "customerIssue", "id", "notes", "openedAt", "opportunityId", "priority", "solution", "status", "title", "updatedAt" FROM "SupportCase";
DROP TABLE "SupportCase";
ALTER TABLE "new_SupportCase" RENAME TO "SupportCase";

UPDATE "User" SET "role" = 'sales' WHERE "role" = 'user' OR "role" = 'readonly';

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
