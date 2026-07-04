-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CustomerAddress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "addressType" TEXT NOT NULL,
    "label" TEXT,
    "addressLine" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CustomerAddress" ("addressLine", "addressType", "createdAt", "customerId", "id", "label", "notes") SELECT "addressLine", "addressType", "createdAt", "customerId", "id", "label", "notes" FROM "CustomerAddress";
DROP TABLE "CustomerAddress";
ALTER TABLE "new_CustomerAddress" RENAME TO "CustomerAddress";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
