import "dotenv/config";
import path from "path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth";
import { ensureDefaultConfigs } from "../src/lib/config-options";

const dbUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
const filePath = dbUrl.replace(/^file:/, "");
const absolutePath = path.isAbsolute(filePath)
  ? filePath
  : path.join(process.cwd(), filePath);

const adapter = new PrismaBetterSqlite3({ url: `file:${absolutePath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.renewalTask.deleteMany();
  await prisma.salesActivity.deleteMany();
  await prisma.supportCase.deleteMany();
  await prisma.financeRecord.deleteMany();
  await prisma.license.deleteMany();
  await prisma.acceptance.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.vendorBooking.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.document.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.customerAddress.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.appConfig.deleteMany();
  await prisma.user.deleteMany();

  await ensureDefaultConfigs();

  const admin = await prisma.user.create({
    data: {
      username: "admin",
      passwordHash: hashPassword("admin123"),
      role: "admin",
      displayName: "管理员",
    },
  });

  const manager = await prisma.user.create({
    data: {
      username: "manager",
      passwordHash: hashPassword("manager123"),
      role: "manager",
      displayName: "王经理",
    },
  });

  const sales = await prisma.user.create({
    data: {
      username: "sales",
      passwordHash: hashPassword("sales123"),
      role: "sales",
      displayName: "张销售",
    },
  });

  const engineer = await prisma.user.create({
    data: {
      username: "engineer",
      passwordHash: hashPassword("engineer123"),
      role: "engineer",
      displayName: "李工程师",
    },
  });

  const engineer2 = await prisma.user.create({
    data: {
      username: "engineer2",
      passwordHash: hashPassword("engineer123"),
      role: "engineer",
      displayName: "陈工程师",
    },
  });

  void admin;
  void manager;

  const cadence = await prisma.vendor.create({
    data: {
      name: "Cadence",
      productLines: "Allegro, OrCAD, Sigrity",
      contactInfo: "vendor@cadence.example.com",
    },
  });

  const taiji = await prisma.customer.create({
    data: {
      accountName: "太极半导体",
      englishName: "Taiji Semiconductor",
      region: "CN",
      industry: "IC",
      ownerName: sales.displayName,
      ownerUserId: sales.id,
      aeName: engineer.displayName,
      notes: "战略客户，主攻 Allegro + CAM350",
      description: "国内领先的 IC 设计公司，长期合作客户，重点关注 CAM350 维保续费。",
      addresses: {
        create: [
          {
            addressType: "official",
            label: "总部",
            addressLine: "上海市浦东新区张江高科技园区",
            city: "上海",
            province: "上海",
            country: "CN",
          },
        ],
      },
      contacts: {
        create: [
          {
            name: "王经理",
            title: "研发经理",
            email: "wang@taiji.example.com",
            phone: "13800001001",
          },
        ],
      },
    },
  });

  const opp1 = await prisma.opportunity.create({
    data: {
      name: "202605-太极-CAM350-维保",
      customerId: taiji.id,
      stage: "Proposal",
      type: "Renewal",
      productLine: "CAM350",
      dealSize: 180000,
      currency: "CNY",
      closeDate: new Date("2026-06-30"),
      nextStep: "发送 V3 报价并约评审会议",
      ownerName: sales.displayName,
      aeName: engineer.displayName,
      quotes: {
        create: [
          { name: "CAM350 维保报价 V1", version: 1, amount: 175000, status: "Sent" },
          { name: "CAM350 维保报价 V2", version: 2, amount: 180000, status: "Sent", isFinal: true },
        ],
      },
      activities: {
        create: [
          { title: "安排技术评审", dueDate: new Date("2026-03-15"), status: "Open" },
        ],
      },
    },
  });

  const huaweiOpp = await prisma.opportunity.create({
    data: {
      name: "202604-华芯-Allegro-新购",
      customerId: (
        await prisma.customer.create({
          data: {
            accountName: "华芯科技",
            region: "CN",
            industry: "PCB",
            ownerName: sales.displayName,
            ownerUserId: sales.id,
            aeName: engineer2.displayName,
          },
        })
      ).id,
      stage: "Negotiation",
      type: "New Business",
      productLine: "Allegro",
      dealSize: 520000,
      closeDate: new Date("2026-05-15"),
      nextStep: "等待客户 PO 盖章",
      ownerName: sales.displayName,
      contracts: {
        create: {
          contractNo: "HT-2026-0042",
          contractType: "Contract",
          amount: 520000,
          status: "Signed",
          signedDate: new Date("2026-02-01"),
        },
      },
      vendorBookings: {
        create: {
          vendorId: cadence.id,
          bookingNo: "CAD-PO-8821",
          amount: 380000,
          status: "Done",
          orderDate: new Date("2026-02-10"),
        },
      },
    },
  });

  const licenseEnd = new Date();
  licenseEnd.setDate(licenseEnd.getDate() + 45);

  await prisma.license.create({
    data: {
      customerId: taiji.id,
      opportunityId: opp1.id,
      productLine: "CAM350",
      seats: 5,
      startDate: new Date("2025-01-01"),
      endDate: licenseEnd,
      status: "Expiring",
    },
  });

  await prisma.financeRecord.create({
    data: {
      opportunityId: huaweiOpp.id,
      recordType: "Invoice",
      amount: 260000,
      dueDate: new Date("2026-01-15"),
      status: "Overdue",
    },
  });

  await prisma.supportCase.create({
    data: {
      customerId: taiji.id,
      opportunityId: opp1.id,
      title: "CAM350 导入 Gerber 报错",
      customerIssue: "客户反馈 CAM350 导入 Gerber 文件时出现 layer mismatch 报错，无法完成 DRC 检查。",
      solution: "建议升级至最新 patch 版本，并检查 Gerber 导出设置中的 layer 命名规范。",
      status: "Open",
      priority: "High",
      assignedUserId: engineer.id,
    },
  });

  await prisma.supportCase.create({
    data: {
      customerId: taiji.id,
      title: "License 激活失败",
      customerIssue: "客户新购 License 激活时提示 invalid key。",
      status: "Open",
      priority: "Normal",
      assignedUserId: engineer2.id,
    },
  });

  console.log("Seed OK — accounts:");
  console.log("  admin / admin123");
  console.log("  manager / manager123");
  console.log("  sales / sales123");
  console.log("  engineer / engineer123");
  console.log("  engineer2 / engineer123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
