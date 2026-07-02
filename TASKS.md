# EDA CRM — 开发任务拆分



基于 Notion CRM 设计方案，按阶段逐步实现可本地部署的独立系统。



## Phase 0 — 基础骨架 ✅



- [x] 新建仓库 `eda-crm`

- [x] Next.js + Tailwind + Prisma SQLite

- [x] 精简数据模型：Customer / Opportunity / Quote / Document

- [x] 客户列表 → 客户详情 → 销售机会详情

- [x] 销售机会阶段文件上传、分类筛选、下载、删除

- [x] 示例种子数据



## Phase 1 — 销售机会深化 ✅



- [x] 商机阶段看板（Kanban）

- [x] 商机内联编辑（阶段、金额、下一步）

- [x] 报价记录 CRUD + 与文件分类联动

- [x] 全局搜索（客户名、商机名）



## Phase 2 — 合同与执行 ✅



- [x] Contract 实体（合同/PO 元数据）

- [x] Vendor Booking（原厂下单）

- [x] Delivery（交付记录）

- [x] Acceptance（验收记录）

- [x] 执行阶段文件自动建议分类



## Phase 3 — 财务与 License ✅



- [x] Finance Record（开票/回款）

- [x] License Lifecycle（续费雷达）

- [x] Renewal Tasks + 到期预警定时任务

- [x] 续费商机自动创建建议



## Phase 4 — 活动与知识 ✅



- [x] Technical Support Cases

- [x] Sales Activities（Next Action + Due Date + Overdue）

- [x] Contacts 管理 UI

- [x] Vendors 管理 UI



## Phase 5 — 管理与部署 ✅



- [x] Management Dashboard（Pipeline、AR、续费）

- [x] 简单登录与角色权限（RBAC）

- [x] Docker 一键部署

- [x] Notion 历史数据迁移脚本



## 设计约束（全程遵守）



1. **客户为主线**：首页 = 客户列表，不从商机反查客户

2. **商机为中心**：所有阶段文件挂在 Opportunity 下

3. **文件统一入口**：不在业务表散落 file 字段

4. **字段精简**：主界面只展示核心字段，高级字段放「更多」或后续版本

