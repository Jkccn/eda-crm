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

浏览器打开：**http://localhost:3001**

### 生产构建（本地部署）

```powershell
npm run build
npm start
```

## v2.0 更新说明

### 主要变化

- **金额支持小数**：所有金额输入框（商机、报价、合同、下单、财务、供应商关系）支持两位小数，显示时保留小数；金额为 0 也能正确保存。
- **API 权限加固**：商机附属数据（报价、合同、财务记录、交付、验收、License、文件等）的所有接口都会校验当前用户对该商机/客户的归属权限，销售无法再通过 ID 访问他人数据。
- **AI 助手**：接入任意 OpenAI 兼容大模型（DeepSeek、通义千问、Kimi、OpenAI 等），可用自然语言查询数据、生成报告表格、录入更新数据（写操作会先确认）。
- **安全更新机制**：每次部署新版本时自动备份数据库后再执行迁移，数据不丢失（见下文）。

### AI 助手配置

1. 以管理员登录，进入「信息配置」（/admin/settings）
2. 在「AI 助手设置」中填写 API 地址、模型名称、API Key（例如 DeepSeek：`https://api.deepseek.com/v1` + `deepseek-chat`）
3. 保存后，admin / manager / sales 角色的左侧导航会出现「AI 助手」

也可通过环境变量提供默认值：`AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL`（数据库配置优先）。

### 更新机制（服务器部署不丢数据）

数据（`data/` 数据库 + `uploads/` 文件）与代码完全分离，部署新版本时：

1. 部署脚本打包时**排除** `data/`、`uploads/`、`.env`，不会覆盖服务器数据
2. 容器每次启动会先执行 `scripts/pre-migrate-backup.mjs`，把数据库备份到 `data/backups/`（自动保留最近 14 份）
3. 然后执行 `prisma migrate deploy` 增量迁移（只加表/加列，不清数据）
4. seed 脚本检测到已有数据时自动跳过，不会重置生产数据（除非显式设置 `SEED_FORCE=1`）

如需回滚：停止容器，将 `data/backups/` 中对应时间的备份复制回 `data/dev.db`，重启即可。
也可以在「数据备份」页面（/admin/data）随时手动导出完整备份 ZIP（数据库 + 上传文件）。

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
