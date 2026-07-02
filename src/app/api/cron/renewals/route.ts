import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const RENEWAL_THRESHOLDS = [60, 30, 7];

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  let created = 0;

  for (const days of RENEWAL_THRESHOLDS) {
    const target = new Date();
    target.setDate(target.getDate() + days);
    const start = new Date(target);
    start.setHours(0, 0, 0, 0);
    const end = new Date(target);
    end.setHours(23, 59, 59, 999);

    const licenses = await prisma.license.findMany({
      where: {
        endDate: { gte: start, lte: end },
        status: { in: ["Active", "Expiring"] },
      },
    });

    for (const license of licenses) {
      const exists = await prisma.renewalTask.findFirst({
        where: {
          licenseId: license.id,
          dueDate: license.endDate!,
          status: "Open",
        },
      });
      if (!exists && license.endDate) {
        await prisma.renewalTask.create({
          data: {
            licenseId: license.id,
            dueDate: license.endDate,
            notes: `License 将在 ${days} 天内到期`,
          },
        });
        created++;
      }

      if (license.endDate && license.endDate <= new Date(now.getTime() + 90 * 86400000)) {
        await prisma.license.update({
          where: { id: license.id },
          data: { status: "Expiring" },
        });
      }
    }
  }

  const overdueInvoices = await prisma.financeRecord.updateMany({
    where: {
      recordType: "Invoice",
      status: "Pending",
      dueDate: { lt: now },
    },
    data: { status: "Overdue" },
  });

  return NextResponse.json({
    ok: true,
    renewalTasksCreated: created,
    invoicesMarkedOverdue: overdueInvoices.count,
  });
}
