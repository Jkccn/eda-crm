-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "isImportant" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN "importanceUpdatedAt" DATETIME;
