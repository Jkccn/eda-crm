# EDA CRM

面向 EDA/CAD 软件代理商的轻量 CRM，**以客户为主线**管理销售机会，并在每个销售机会下按分类检索阶段文件（报价单、合同、发货单、发票、License、验收单等）。

## 技术栈

- **前端**：Next.js 16、React 19、Tailwind CSS 4
- **后端**：Next.js API Routes
- **数据库**：SQLite（Prisma ORM，单文件本地部署）
- **文件存储**：本地 `uploads/` 目录

## 快速开始

### 环境要求

- Node.js 18+
- npm

### 安装与运行

```powershell
cd C:\Users\Jack\Documents\GitHub\eda-crm

# 安装依赖（会自动 prisma generate）
npm install

# 初始化数据库并写入示例数据
npm run db:migrate
npm run db:seed

# 开发模式
npm run dev
```

浏览器打开：**http://localhost:3000**

### 生产构建（本地部署）

```powershell
npm run build
npm start
```

## 使用路径

1. **客户** — 首页列出所有客户
2. 进入客户 → 查看该客户下所有**销售机会**
3. 进入销售机会 → **阶段文件**区按分类筛选、上传、下载

### 文件分类

| 分类 | 说明 |
|------|------|
| 报价单 | 多版本报价 PDF/Excel |
| 合同 | 签署合同 |
| 采购单 | 客户 PO |
| 发货/交付 | 发货单、交付记录 |
| 发票 | 开票文件 |
| License | License 文件 |
| 验收单 | 验收确认 |
| 其他 | 其余附件 |

## 项目结构

```
eda-crm/
├── prisma/           # 数据模型与迁移
├── src/
│   ├── app/          # 页面与 API
│   ├── components/   # UI 组件
│   └── lib/          # 工具、常量、存储
├── uploads/          # 上传文件（本地）
├── TASKS.md          # 分阶段任务清单
└── README.md
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建 |
| `npm run db:migrate` | 数据库迁移 |
| `npm run db:seed` | 填充示例数据 |
| `npm run db:reset` | 重置数据库 |

## 与 Notion CRM 的关系

本仓库是根据 Notion 工作区 CRM 设计方案重写的**独立系统**，不依赖 Notion API。后续 Phase 5 可添加从 Notion 导入历史数据的迁移脚本。

## 许可证

Private — 内部使用
