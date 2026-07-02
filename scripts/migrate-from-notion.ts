/**
 * Notion CRM 历史数据迁移脚本
 *
 * 用法：
 *   npx tsx scripts/migrate-from-notion.ts path/to/notion-export.json
 *
 * JSON 格式示例见 scripts/notion-export.example.json
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

type NotionCustomer = {
  accountName: string;
  englishName?: string;
  region?: string;
  industry?: string;
  ownerName?: string;
  aeName?: string;
  notes?: string;
  contacts?: { name: string; title?: string; email?: string; phone?: string }[];
  opportunities?: NotionOpportunity[];
};

type NotionOpportunity = {
  name: string;
  stage?: string;
  type?: string;
  productLine?: string;
  dealSize?: number;
  currency?: string;
  closeDate?: string;
  nextStep?: string;
  ownerName?: string;
  aeName?: string;
};

type ExportFile = {
  customers: NotionCustomer[];
};

const exportPath = process.argv[2];
if (!exportPath) {
  console.error("Usage: npx tsx scripts/migrate-from-notion.ts <export.json>");
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(path.resolve(exportPath), "utf-8")) as ExportFile;

const dbUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
const filePath = dbUrl.replace(/^file:/, "");
const absolutePath = path.isAbsolute(filePath)
  ? filePath
  : path.join(process.cwd(), filePath);

const adapter = new PrismaBetterSqlite3({ url: `file:${absolutePath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  let customers = 0;
  let opportunities = 0;

  for (const c of raw.customers || []) {
    const customer = await prisma.customer.create({
      data: {
        accountName: c.accountName,
        englishName: c.englishName || null,
        region: c.region || null,
        industry: c.industry || null,
        ownerName: c.ownerName || null,
        aeName: c.aeName || null,
        notes: c.notes ? `[Notion 导入] ${c.notes}` : "[Notion 导入]",
        contacts: c.contacts?.length
          ? { create: c.contacts.map((ct) => ({
              name: ct.name,
              title: ct.title || null,
              email: ct.email || null,
              phone: ct.phone || null,
            })) }
          : undefined,
      },
    });
    customers++;

    for (const o of c.opportunities || []) {
      await prisma.opportunity.create({
        data: {
          customerId: customer.id,
          name: o.name,
          stage: o.stage || "Discovery",
          type: o.type || "New Business",
          productLine: o.productLine || null,
          dealSize: o.dealSize ?? null,
          currency: o.currency || "CNY",
          closeDate: o.closeDate ? new Date(o.closeDate) : null,
          nextStep: o.nextStep || null,
          ownerName: o.ownerName || c.ownerName || null,
          aeName: o.aeName || c.aeName || null,
        },
      });
      opportunities++;
    }
  }

  console.log(`Imported ${customers} customers, ${opportunities} opportunities`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
