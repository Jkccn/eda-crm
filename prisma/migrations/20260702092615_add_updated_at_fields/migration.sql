-- Add updatedAt columns, backfill from existing timestamps

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Acceptance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "acceptedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Acceptance_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Acceptance" ("acceptedAt", "createdAt", "id", "notes", "opportunityId", "status", "updatedAt")
SELECT "acceptedAt", "createdAt", "id", "notes", "opportunityId", "status", COALESCE("createdAt", CURRENT_TIMESTAMP) FROM "Acceptance";
DROP TABLE "Acceptance";
ALTER TABLE "new_Acceptance" RENAME TO "Acceptance";

CREATE TABLE "new_Contract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "contractNo" TEXT,
    "contractType" TEXT NOT NULL DEFAULT 'Contract',
    "amount" REAL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "signedDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contract_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Contract" ("amount", "contractNo", "contractType", "createdAt", "currency", "id", "notes", "opportunityId", "signedDate", "status", "updatedAt")
SELECT "amount", "contractNo", "contractType", "createdAt", "currency", "id", "notes", "opportunityId", "signedDate", "status", COALESCE("createdAt", CURRENT_TIMESTAMP) FROM "Contract";
DROP TABLE "Contract";
ALTER TABLE "new_Contract" RENAME TO "Contract";

CREATE TABLE "new_Delivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "deliveryNo" TEXT,
    "deliveredAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Delivery_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Delivery" ("createdAt", "deliveredAt", "deliveryNo", "id", "notes", "opportunityId", "status", "updatedAt")
SELECT "createdAt", "deliveredAt", "deliveryNo", "id", "notes", "opportunityId", "status", COALESCE("createdAt", CURRENT_TIMESTAMP) FROM "Delivery";
DROP TABLE "Delivery";
ALTER TABLE "new_Delivery" RENAME TO "Delivery";

CREATE TABLE "new_Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "version" INTEGER,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "storagePath" TEXT NOT NULL,
    "notes" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Document" ("category", "fileName", "fileSize", "id", "mimeType", "notes", "opportunityId", "storagePath", "uploadedAt", "version", "updatedAt")
SELECT "category", "fileName", "fileSize", "id", "mimeType", "notes", "opportunityId", "storagePath", "uploadedAt", "version", COALESCE("uploadedAt", CURRENT_TIMESTAMP) FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";

CREATE TABLE "new_FinanceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "amount" REAL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "recordDate" DATETIME,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FinanceRecord_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FinanceRecord" ("amount", "createdAt", "currency", "dueDate", "id", "notes", "opportunityId", "recordDate", "recordType", "status", "updatedAt")
SELECT "amount", "createdAt", "currency", "dueDate", "id", "notes", "opportunityId", "recordDate", "recordType", "status", COALESCE("createdAt", CURRENT_TIMESTAMP) FROM "FinanceRecord";
DROP TABLE "FinanceRecord";
ALTER TABLE "new_FinanceRecord" RENAME TO "FinanceRecord";

CREATE TABLE "new_License" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "productLine" TEXT,
    "licenseKey" TEXT,
    "seats" INTEGER,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "License_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "License_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_License" ("createdAt", "customerId", "endDate", "id", "licenseKey", "notes", "opportunityId", "productLine", "seats", "startDate", "status", "updatedAt")
SELECT "createdAt", "customerId", "endDate", "id", "licenseKey", "notes", "opportunityId", "productLine", "seats", "startDate", "status", COALESCE("createdAt", CURRENT_TIMESTAMP) FROM "License";
DROP TABLE "License";
ALTER TABLE "new_License" RENAME TO "License";

CREATE TABLE "new_Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "amount" REAL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Quote_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Quote" ("amount", "createdAt", "currency", "id", "isFinal", "name", "opportunityId", "status", "version", "updatedAt")
SELECT "amount", "createdAt", "currency", "id", "isFinal", "name", "opportunityId", "status", "version", COALESCE("createdAt", CURRENT_TIMESTAMP) FROM "Quote";
DROP TABLE "Quote";
ALTER TABLE "new_Quote" RENAME TO "Quote";

CREATE TABLE "new_SalesActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalesActivity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SalesActivity" ("createdAt", "dueDate", "id", "notes", "opportunityId", "status", "title", "updatedAt")
SELECT "createdAt", "dueDate", "id", "notes", "opportunityId", "status", "title", COALESCE("createdAt", CURRENT_TIMESTAMP) FROM "SalesActivity";
DROP TABLE "SalesActivity";
ALTER TABLE "new_SalesActivity" RENAME TO "SalesActivity";

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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupportCase_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SupportCase_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SupportCase" ("closedAt", "customerId", "customerIssue", "id", "notes", "openedAt", "opportunityId", "priority", "solution", "status", "title", "updatedAt")
SELECT "closedAt", "customerId", "customerIssue", "id", "notes", "openedAt", "opportunityId", "priority", "solution", "status", "title", COALESCE("openedAt", CURRENT_TIMESTAMP) FROM "SupportCase";
DROP TABLE "SupportCase";
ALTER TABLE "new_SupportCase" RENAME TO "SupportCase";

CREATE TABLE "new_VendorBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "vendorId" TEXT,
    "bookingNo" TEXT,
    "amount" REAL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "orderDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VendorBooking_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VendorBooking_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_VendorBooking" ("amount", "bookingNo", "createdAt", "currency", "id", "notes", "opportunityId", "orderDate", "status", "vendorId", "updatedAt")
SELECT "amount", "bookingNo", "createdAt", "currency", "id", "notes", "opportunityId", "orderDate", "status", "vendorId", COALESCE("createdAt", CURRENT_TIMESTAMP) FROM "VendorBooking";
DROP TABLE "VendorBooking";
ALTER TABLE "new_VendorBooking" RENAME TO "VendorBooking";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
