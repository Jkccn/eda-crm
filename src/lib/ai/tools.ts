import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";
import {
  canAccessCustomer,
  canManageOpportunities,
  customerScopeWhere,
  opportunityScopeWhere,
} from "@/lib/rbac";
import {
  CURRENCIES,
  DOCUMENT_CATEGORIES,
  FINANCE_STATUSES,
  OPPORTUNITY_STAGES,
  OPPORTUNITY_TYPES,
  QUOTE_STATUSES,
} from "@/lib/constants";
import { parseAmount } from "@/lib/utils";
import { consumeAiTempFile } from "@/lib/ai/temp-files";

const DOCUMENT_CATEGORY_KEYS = DOCUMENT_CATEGORIES.map((c) => c.key);

/** OpenAI 兼容的工具（function calling）定义 */
export const AI_TOOLS = [
  {
    type: "function",
    function: {
      name: "list_customers",
      description: "查询客户列表。可按名称关键字、区域、行业过滤。返回客户基础信息与商机数量。",
      parameters: {
        type: "object",
        properties: {
          keyword: { type: "string", description: "客户名称关键字（中文或英文名）" },
          region: { type: "string", description: "区域，如 CN、SG、EU、US" },
          industry: { type: "string", description: "行业，如 IC、PCB、Automotive" },
          limit: { type: "number", description: "返回条数上限，默认 20" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_customer",
      description: "按客户 ID 或名称获取客户详情，包含联系人、地址、商机、License。",
      parameters: {
        type: "object",
        properties: {
          customerId: { type: "string", description: "客户 ID（优先使用）" },
          name: { type: "string", description: "客户名称（模糊匹配）" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_opportunities",
      description: "查询销售机会列表。可按阶段、客户关键字过滤。返回商机名称、阶段、金额、预计成交日等。",
      parameters: {
        type: "object",
        properties: {
          stage: {
            type: "string",
            enum: [...OPPORTUNITY_STAGES],
            description: "商机阶段",
          },
          customerKeyword: { type: "string", description: "客户名称关键字" },
          limit: { type: "number", description: "返回条数上限，默认 30" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_opportunity",
      description: "按商机 ID 获取完整详情：报价、合同、原厂下单、交付、验收、财务记录、License、销售活动。",
      parameters: {
        type: "object",
        properties: {
          opportunityId: { type: "string", description: "商机 ID" },
        },
        required: ["opportunityId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "sales_summary",
      description:
        "销售汇总统计：按阶段汇总商机数量与金额（pipeline），以及指定年份/季度赢单（Won）情况。适合生成销售报告。",
      parameters: {
        type: "object",
        properties: {
          year: { type: "number", description: "年份，如 2026。不传则统计全部" },
          quarter: { type: "number", description: "季度 1-4，需与 year 一起使用" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_expiring_licenses",
      description: "查询即将到期的 License（默认未来 90 天内到期），用于续费提醒。",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "未来多少天内到期，默认 90" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_overdue_invoices",
      description: "查询逾期未回款的客户发票（应收账款 AR）。",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "create_customer",
      description: "创建新客户。执行前必须先向用户复述将要创建的内容并获得确认。",
      parameters: {
        type: "object",
        properties: {
          accountName: { type: "string", description: "客户名称（必填）" },
          englishName: { type: "string" },
          region: { type: "string" },
          industry: { type: "string" },
          notes: { type: "string" },
        },
        required: ["accountName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_customer",
      description: "更新客户基础信息。执行前必须先向用户复述改动并获得确认。",
      parameters: {
        type: "object",
        properties: {
          customerId: { type: "string", description: "客户 ID（必填）" },
          accountName: { type: "string" },
          englishName: { type: "string" },
          region: { type: "string" },
          industry: { type: "string" },
          notes: { type: "string" },
          description: { type: "string" },
        },
        required: ["customerId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_contact",
      description: "为客户添加联系人。执行前必须先向用户确认。",
      parameters: {
        type: "object",
        properties: {
          customerId: { type: "string", description: "客户 ID（必填）" },
          name: { type: "string", description: "联系人姓名（必填）" },
          title: { type: "string", description: "职位" },
          email: { type: "string" },
          phone: { type: "string" },
        },
        required: ["customerId", "name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_opportunity",
      description: "创建销售机会。执行前必须先向用户复述将要创建的内容并获得确认。",
      parameters: {
        type: "object",
        properties: {
          customerId: { type: "string", description: "客户 ID（必填）" },
          name: { type: "string", description: "商机名称（必填），建议格式 YYYYMM-客户-产品-类型" },
          stage: { type: "string", enum: [...OPPORTUNITY_STAGES] },
          type: { type: "string", enum: [...OPPORTUNITY_TYPES] },
          productLine: { type: "string" },
          dealSize: { type: "number", description: "预计金额，支持小数" },
          currency: { type: "string", enum: [...CURRENCIES] },
          closeDate: { type: "string", description: "预计成交日 YYYY-MM-DD" },
          nextStep: { type: "string" },
        },
        required: ["customerId", "name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_opportunity",
      description: "更新销售机会（阶段、金额、下一步行动等）。执行前必须先向用户复述改动并获得确认。",
      parameters: {
        type: "object",
        properties: {
          opportunityId: { type: "string", description: "商机 ID（必填）" },
          stage: { type: "string", enum: [...OPPORTUNITY_STAGES] },
          dealSize: { type: "number", description: "预计金额，支持小数" },
          currency: { type: "string", enum: [...CURRENCIES] },
          closeDate: { type: "string", description: "预计成交日 YYYY-MM-DD" },
          nextStep: { type: "string" },
          name: { type: "string" },
        },
        required: ["opportunityId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_finance_record",
      description:
        "为商机添加财务记录（客户发票 Invoice / 客户回款 Payment / 原厂发票 VendorInvoice / 向原厂付款 VendorPayment）。执行前必须先向用户确认。",
      parameters: {
        type: "object",
        properties: {
          opportunityId: { type: "string", description: "商机 ID（必填）" },
          recordType: {
            type: "string",
            enum: ["Invoice", "Payment", "VendorInvoice", "VendorPayment"],
            description: "记录类型（必填）",
          },
          amount: { type: "number", description: "金额，支持小数" },
          currency: { type: "string", enum: [...CURRENCIES] },
          recordNo: { type: "string", description: "单号/发票号" },
          dueDate: { type: "string", description: "到期日 YYYY-MM-DD" },
          status: { type: "string", enum: [...FINANCE_STATUSES] },
          notes: { type: "string" },
        },
        required: ["opportunityId", "recordType"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_finance_record",
      description:
        "更新已有财务记录（修改到期日、状态、金额、单号、备注等）。可先用 get_opportunity 或 list_overdue_invoices 查到记录 ID。执行前必须先向用户确认。",
      parameters: {
        type: "object",
        properties: {
          recordId: { type: "string", description: "财务记录 ID（必填）" },
          amount: { type: "number", description: "金额，支持小数" },
          currency: { type: "string", enum: [...CURRENCIES] },
          recordNo: { type: "string", description: "单号/发票号" },
          dueDate: { type: "string", description: "到期日 YYYY-MM-DD" },
          status: { type: "string", enum: [...FINANCE_STATUSES] },
          notes: { type: "string" },
        },
        required: ["recordId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_quote",
      description:
        "为商机创建报价记录。版本号不传时自动取该商机现有最大版本+1。执行前必须先向用户确认。",
      parameters: {
        type: "object",
        properties: {
          opportunityId: { type: "string", description: "商机 ID（必填）" },
          name: { type: "string", description: "报价名称（必填），如「Allegro 新购报价 V1」" },
          amount: { type: "number", description: "报价金额，支持小数" },
          currency: { type: "string", enum: [...CURRENCIES] },
          status: { type: "string", enum: [...QUOTE_STATUSES], description: "默认 Sent" },
          version: { type: "number", description: "版本号，不传自动递增" },
          isFinal: { type: "boolean", description: "是否最终版报价" },
        },
        required: ["opportunityId", "name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_quote",
      description: "更新已有报价记录（金额、状态、是否最终版等）。执行前必须先向用户确认。",
      parameters: {
        type: "object",
        properties: {
          quoteId: { type: "string", description: "报价记录 ID（必填）" },
          name: { type: "string" },
          amount: { type: "number", description: "报价金额，支持小数" },
          currency: { type: "string", enum: [...CURRENCIES] },
          status: { type: "string", enum: [...QUOTE_STATUSES] },
          isFinal: { type: "boolean" },
        },
        required: ["quoteId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "attach_document",
      description:
        "把用户在本次对话中上传的附件原文件归档到商机的阶段文件中。fileToken 来自消息中「【附件文件：xxx】(fileToken: ...)」标注。执行前必须先向用户确认商机和文件分类。",
      parameters: {
        type: "object",
        properties: {
          opportunityId: { type: "string", description: "商机 ID（必填）" },
          fileToken: { type: "string", description: "附件的 fileToken（必填）" },
          category: {
            type: "string",
            enum: DOCUMENT_CATEGORY_KEYS,
            description:
              "文件分类（必填）：quote=报价单 contract=合同 po=采购单 invoice=发票 license=License acceptance=验收单 delivery=交付 other=其他",
          },
          notes: { type: "string", description: "备注" },
          version: { type: "number", description: "文件版本号" },
        },
        required: ["opportunityId", "fileToken", "category"],
      },
    },
  },
] as const;

type ToolArgs = Record<string, unknown>;

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function num(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

async function assertCustomerAccess(user: SessionUser, customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, accountName: true, ownerUserId: true, ownerName: true },
  });
  if (!customer) throw new Error("客户不存在");
  if (!canAccessCustomer(user, customer)) throw new Error("你没有权限操作该客户");
  return customer;
}

async function assertOpportunityAccess(user: SessionUser, opportunityId: string) {
  const opp = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    select: {
      id: true,
      name: true,
      customerId: true,
      customer: { select: { ownerUserId: true, ownerName: true, accountName: true } },
    },
  });
  if (!opp) throw new Error("商机不存在");
  if (!canAccessCustomer(user, { id: opp.customerId, ...opp.customer })) {
    throw new Error("你没有权限操作该商机");
  }
  return opp;
}

function requireWrite(user: SessionUser) {
  if (!canManageOpportunities(user)) {
    throw new Error("当前角色没有写入权限");
  }
}

/** 执行 AI 请求的工具调用，所有数据访问按当前用户 RBAC 范围过滤 */
export async function executeAiTool(
  user: SessionUser,
  name: string,
  args: ToolArgs,
): Promise<unknown> {
  switch (name) {
    case "list_customers": {
      const keyword = str(args.keyword);
      const customers = await prisma.customer.findMany({
        where: {
          ...customerScopeWhere(user),
          ...(keyword
            ? {
                OR: [
                  { accountName: { contains: keyword } },
                  { englishName: { contains: keyword } },
                ],
              }
            : {}),
          ...(str(args.region) ? { region: str(args.region) } : {}),
          ...(str(args.industry) ? { industry: str(args.industry) } : {}),
        },
        select: {
          id: true,
          accountName: true,
          englishName: true,
          region: true,
          industry: true,
          ownerName: true,
          _count: { select: { opportunities: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: Math.min(num(args.limit) ?? 20, 100),
      });
      return customers;
    }

    case "get_customer": {
      const id = str(args.customerId);
      const nameKeyword = str(args.name);
      if (!id && !nameKeyword) throw new Error("需要提供 customerId 或 name");
      const customer = await prisma.customer.findFirst({
        where: {
          ...customerScopeWhere(user),
          ...(id ? { id } : { accountName: { contains: nameKeyword! } }),
        },
        include: {
          contacts: true,
          addresses: true,
          opportunities: {
            select: {
              id: true,
              name: true,
              stage: true,
              dealSize: true,
              currency: true,
              closeDate: true,
              nextStep: true,
            },
            orderBy: { updatedAt: "desc" },
          },
          licenses: {
            select: { id: true, productLine: true, seats: true, endDate: true, status: true },
          },
        },
      });
      if (!customer) throw new Error("未找到客户（或无权限查看）");
      return customer;
    }

    case "list_opportunities": {
      const customerKeyword = str(args.customerKeyword);
      const opportunities = await prisma.opportunity.findMany({
        where: {
          ...opportunityScopeWhere(user),
          ...(str(args.stage) ? { stage: str(args.stage) } : {}),
          ...(customerKeyword
            ? { customer: { accountName: { contains: customerKeyword } } }
            : {}),
        },
        select: {
          id: true,
          name: true,
          stage: true,
          type: true,
          productLine: true,
          dealSize: true,
          currency: true,
          closeDate: true,
          nextStep: true,
          customer: { select: { id: true, accountName: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: Math.min(num(args.limit) ?? 30, 100),
      });
      return opportunities;
    }

    case "get_opportunity": {
      const id = str(args.opportunityId);
      if (!id) throw new Error("缺少 opportunityId");
      await assertOpportunityAccess(user, id);
      const opp = await prisma.opportunity.findUnique({
        where: { id },
        include: {
          customer: { select: { id: true, accountName: true } },
          quotes: { orderBy: { version: "desc" } },
          contracts: true,
          vendorBookings: { include: { vendor: { select: { name: true } } } },
          deliveries: true,
          acceptances: true,
          financeRecords: true,
          licenses: true,
          activities: { orderBy: { dueDate: "asc" } },
        },
      });
      return opp;
    }

    case "sales_summary": {
      const year = num(args.year);
      const quarter = num(args.quarter);
      let dateFilter: { gte: Date; lt: Date } | undefined;
      if (year) {
        const startMonth = quarter ? (quarter - 1) * 3 : 0;
        const endMonth = quarter ? startMonth + 3 : 12;
        dateFilter = {
          gte: new Date(Date.UTC(year, startMonth, 1)),
          lt: new Date(Date.UTC(year, endMonth, 1)),
        };
      }
      const scope = opportunityScopeWhere(user);
      const [pipeline, won] = await Promise.all([
        prisma.opportunity.findMany({
          where: { ...scope, stage: { notIn: ["Won", "Lost"] } },
          select: { stage: true, dealSize: true, currency: true },
        }),
        prisma.opportunity.findMany({
          where: {
            ...scope,
            stage: "Won",
            ...(dateFilter ? { closeDate: dateFilter } : {}),
          },
          select: {
            name: true,
            dealSize: true,
            currency: true,
            closeDate: true,
            productLine: true,
            customer: { select: { accountName: true } },
          },
        }),
      ]);
      const byStage: Record<string, { count: number; total: number }> = {};
      for (const o of pipeline) {
        byStage[o.stage] ??= { count: 0, total: 0 };
        byStage[o.stage].count += 1;
        byStage[o.stage].total += o.dealSize || 0;
      }
      return {
        pipelineByStage: byStage,
        wonDeals: won,
        wonTotal: won.reduce((s, o) => s + (o.dealSize || 0), 0),
        note: "金额可能混合多币种，请按 currency 字段区分。",
      };
    }

    case "list_expiring_licenses": {
      const days = Math.min(num(args.days) ?? 90, 365);
      const until = new Date();
      until.setDate(until.getDate() + days);
      return prisma.license.findMany({
        where: {
          endDate: { lte: until, gte: new Date() },
          status: { in: ["Active", "Expiring"] },
          customer: customerScopeWhere(user),
        },
        select: {
          id: true,
          productLine: true,
          seats: true,
          endDate: true,
          status: true,
          customer: { select: { id: true, accountName: true } },
        },
        orderBy: { endDate: "asc" },
      });
    }

    case "list_overdue_invoices": {
      return prisma.financeRecord.findMany({
        where: {
          recordType: "Invoice",
          status: { in: ["Pending", "Overdue"] },
          dueDate: { lt: new Date() },
          opportunity: opportunityScopeWhere(user),
        },
        select: {
          id: true,
          recordNo: true,
          amount: true,
          currency: true,
          dueDate: true,
          status: true,
          opportunity: {
            select: { id: true, name: true, customer: { select: { accountName: true } } },
          },
        },
        orderBy: { dueDate: "asc" },
      });
    }

    case "create_customer": {
      requireWrite(user);
      const accountName = str(args.accountName);
      if (!accountName) throw new Error("客户名称必填");
      const customer = await prisma.customer.create({
        data: {
          accountName,
          englishName: str(args.englishName) || null,
          region: str(args.region) || null,
          industry: str(args.industry) || null,
          notes: str(args.notes) || null,
          ownerUserId: user.id,
          ownerName: user.displayName || user.username,
        },
      });
      return { ok: true, customer };
    }

    case "update_customer": {
      requireWrite(user);
      const id = str(args.customerId);
      if (!id) throw new Error("缺少 customerId");
      await assertCustomerAccess(user, id);
      const customer = await prisma.customer.update({
        where: { id },
        data: {
          accountName: str(args.accountName),
          englishName: str(args.englishName),
          region: str(args.region),
          industry: str(args.industry),
          notes: str(args.notes),
          description: str(args.description),
        },
      });
      return { ok: true, customer };
    }

    case "create_contact": {
      requireWrite(user);
      const customerId = str(args.customerId);
      const contactName = str(args.name);
      if (!customerId || !contactName) throw new Error("customerId 与联系人姓名必填");
      await assertCustomerAccess(user, customerId);
      const contact = await prisma.contact.create({
        data: {
          customerId,
          name: contactName,
          title: str(args.title) || null,
          email: str(args.email) || null,
          phone: str(args.phone) || null,
        },
      });
      return { ok: true, contact };
    }

    case "create_opportunity": {
      requireWrite(user);
      const customerId = str(args.customerId);
      const oppName = str(args.name);
      if (!customerId || !oppName) throw new Error("customerId 与商机名称必填");
      const customer = await assertCustomerAccess(user, customerId);
      const opportunity = await prisma.opportunity.create({
        data: {
          customerId,
          name: oppName,
          stage: str(args.stage) || "Discovery",
          type: str(args.type) || "New Business",
          productLine: str(args.productLine) || null,
          dealSize: parseAmount(args.dealSize),
          currency: str(args.currency) || "CNY",
          closeDate: str(args.closeDate) ? new Date(str(args.closeDate)!) : null,
          nextStep: str(args.nextStep) || null,
          ownerName: customer.ownerName || user.displayName || user.username,
        },
      });
      return { ok: true, opportunity };
    }

    case "update_opportunity": {
      requireWrite(user);
      const id = str(args.opportunityId);
      if (!id) throw new Error("缺少 opportunityId");
      await assertOpportunityAccess(user, id);
      const opportunity = await prisma.opportunity.update({
        where: { id },
        data: {
          name: str(args.name),
          stage: str(args.stage),
          dealSize: args.dealSize !== undefined ? parseAmount(args.dealSize) : undefined,
          currency: str(args.currency),
          closeDate: str(args.closeDate) ? new Date(str(args.closeDate)!) : undefined,
          nextStep: str(args.nextStep),
        },
      });
      return { ok: true, opportunity };
    }

    case "create_finance_record": {
      requireWrite(user);
      const opportunityId = str(args.opportunityId);
      const recordType = str(args.recordType);
      if (!opportunityId || !recordType) throw new Error("opportunityId 与 recordType 必填");
      if (!["Invoice", "Payment", "VendorInvoice", "VendorPayment"].includes(recordType)) {
        throw new Error("无效的记录类型");
      }
      await assertOpportunityAccess(user, opportunityId);
      const record = await prisma.financeRecord.create({
        data: {
          opportunityId,
          recordType,
          amount: parseAmount(args.amount),
          currency: str(args.currency) || "CNY",
          recordNo: str(args.recordNo) || null,
          dueDate: str(args.dueDate) ? new Date(str(args.dueDate)!) : null,
          status: (FINANCE_STATUSES as readonly string[]).includes(str(args.status) || "")
            ? (str(args.status) as string)
            : "Pending",
          notes: str(args.notes) || null,
        },
      });
      return { ok: true, record };
    }

    case "update_finance_record": {
      requireWrite(user);
      const id = str(args.recordId);
      if (!id) throw new Error("缺少 recordId");
      const existing = await prisma.financeRecord.findUnique({
        where: { id },
        select: { id: true, opportunityId: true },
      });
      if (!existing) throw new Error("财务记录不存在");
      await assertOpportunityAccess(user, existing.opportunityId);
      const record = await prisma.financeRecord.update({
        where: { id },
        data: {
          amount: args.amount !== undefined ? parseAmount(args.amount) : undefined,
          currency: str(args.currency),
          recordNo: str(args.recordNo),
          dueDate: str(args.dueDate) ? new Date(str(args.dueDate)!) : undefined,
          status: (FINANCE_STATUSES as readonly string[]).includes(str(args.status) || "")
            ? str(args.status)
            : undefined,
          notes: str(args.notes),
        },
      });
      return { ok: true, record };
    }

    case "create_quote": {
      requireWrite(user);
      const opportunityId = str(args.opportunityId);
      const quoteName = str(args.name);
      if (!opportunityId || !quoteName) throw new Error("opportunityId 与报价名称必填");
      await assertOpportunityAccess(user, opportunityId);
      let version = num(args.version);
      if (version === undefined) {
        const latest = await prisma.quote.findFirst({
          where: { opportunityId },
          orderBy: { version: "desc" },
          select: { version: true },
        });
        version = (latest?.version ?? 0) + 1;
      }
      const quote = await prisma.quote.create({
        data: {
          opportunityId,
          name: quoteName,
          version,
          amount: parseAmount(args.amount),
          currency: str(args.currency) || "CNY",
          status: (QUOTE_STATUSES as readonly string[]).includes(str(args.status) || "")
            ? (str(args.status) as string)
            : "Sent",
          isFinal: args.isFinal === true,
        },
      });
      return { ok: true, quote };
    }

    case "update_quote": {
      requireWrite(user);
      const id = str(args.quoteId);
      if (!id) throw new Error("缺少 quoteId");
      const existing = await prisma.quote.findUnique({
        where: { id },
        select: { id: true, opportunityId: true },
      });
      if (!existing) throw new Error("报价记录不存在");
      await assertOpportunityAccess(user, existing.opportunityId);
      const quote = await prisma.quote.update({
        where: { id },
        data: {
          name: str(args.name),
          amount: args.amount !== undefined ? parseAmount(args.amount) : undefined,
          currency: str(args.currency),
          status: (QUOTE_STATUSES as readonly string[]).includes(str(args.status) || "")
            ? str(args.status)
            : undefined,
          isFinal: typeof args.isFinal === "boolean" ? args.isFinal : undefined,
        },
      });
      return { ok: true, quote };
    }

    case "attach_document": {
      requireWrite(user);
      const opportunityId = str(args.opportunityId);
      const fileToken = str(args.fileToken);
      const category = str(args.category);
      if (!opportunityId || !fileToken || !category) {
        throw new Error("opportunityId、fileToken、category 必填");
      }
      if (!DOCUMENT_CATEGORY_KEYS.includes(category as (typeof DOCUMENT_CATEGORY_KEYS)[number])) {
        throw new Error("无效文件分类");
      }
      await assertOpportunityAccess(user, opportunityId);
      const stored = await consumeAiTempFile(fileToken, opportunityId);
      if (!stored) {
        throw new Error("附件已过期或不存在，请让用户重新上传文件后再试");
      }
      const document = await prisma.document.create({
        data: {
          opportunityId,
          category,
          fileName: stored.fileName,
          storagePath: stored.storagePath,
          fileSize: stored.fileSize,
          mimeType: stored.mimeType,
          notes: str(args.notes) || null,
          version: num(args.version) ?? null,
        },
      });
      return { ok: true, document };
    }

    default:
      throw new Error(`未知工具: ${name}`);
  }
}
