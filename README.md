# 知海

> 知识如海，日日有迹。

知海是一款融合知识管理、智能复习与个人成长记录的学习平台。它以月历呈现学习轨迹，根据掌握程度组织复习任务，帮助用户在即将遗忘之前重新遇见知识。

## 核心功能

- **学习月历**：按日期查看学习记录与复习任务，清晰回顾每日进度。
- **今日复习**：集中展示到期和逾期内容，可随时标记完成状态。
- **Markdown 笔记**：统一管理学习笔记、版本与知识分类。
- **全文搜索**：按主题、正文和文件名快速找回学过的内容。
- **学习记录**：记录学习主题、具体内容和掌握程度，并生成后续复习计划。
- **账号登录**：本地服务端验证账号、密码与登录会话。

## 界面预览

![知海学习平台](public/og.png)

## 本地运行

环境要求：Node.js `>=22.13.0`。

```bash
npm install
npm run local:auth
```

启动后访问 [http://localhost:8787](http://localhost:8787)。

登录账号和密码由本地 Worker 环境配置提供，不应提交到 GitHub。项目中的 `wrangler.local.jsonc` 用于本地运行配置。

如需启动前端开发模式：

```bash
npm run dev
```

## 常用命令

```bash
npm run dev       # 启动前端开发环境
npm run local:auth # 启动带真实登录验证的本地服务
npm run build     # 构建生产版本
npm test          # 构建并运行测试
npm run lint      # 检查代码规范
```

## 技术栈

- React 19
- TypeScript
- vinext / Vite
- Cloudflare Workers
- Drizzle ORM

## 项目状态

当前版本提供知海产品的主要交互界面与本地账号登录能力，适合在本机运行、演示和继续迭代。
