<div align="right"><a href="./README.md">English</a> | 简体中文</div>

<div align="center">

<img src="./public/favicon.svg" width="56" height="56" alt="CITY Avatar">

# CITY Avatar · 《小城日常》风格头像工坊

上传任意人物、宠物或生物照片，通过 Cloudflare Workers AI 一键风格化为 ***CITY THE ANIMATION*** 官网角色同款头像。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Deploy](https://github.com/chius-n/city-avatar/actions/workflows/deploy.yml/badge.svg)](https://github.com/chius-n/city-avatar/actions/workflows/deploy.yml)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-f38020?logo=cloudflare&logoColor=white)
![Workers AI](https://img.shields.io/badge/Workers%20AI-FLUX.2-f38020?logo=cloudflare&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript&logoColor=white)

[在线体验](https://avatar.city.chius.dev) · [CITY 人物关系图](https://social.city.chius.dev) · [问题反馈](https://github.com/chius-n/city-avatar/issues) · [Awesome CITY](https://github.com/chius-n/awesome-citytheanimation)

</div>

> 上传自拍、人像、猫咪或其他任意生物照片，一键重绘为京都动画 [`city-the-animation.com/character/`](https://city-the-animation.com/character/) 角色卡风格的明快扁平赛璐珞头像。
>
> 在线访问：**https://avatar.city.chius.dev**

![CITY 风格转换效果示例](./docs/screenshot-showcase.webp)

![CITY Avatar 制作台界面](./docs/screenshot-studio.webp)

## 功能亮点

- **任意照片风格化**：支持点击选择、拖拽上传与剪贴板直接粘贴（`Ctrl+V` / `Cmd+V`），并内置「橘猫」「人像」两款示例一键体验。
- **主体感知保护**：区分 **自动识别**、**人物** 与 **宠物 / 生物** 三种模式；在保留人物发型与穿搭神韵的同时，防止动物照片在风格迁移时出现人脸特征串扰。
- **官方 C-I-T-Y 星光与晴空底色**：提供标志性的四色五角星底色（**暖黄 `#f7b647`**、**樱粉 `#f09cb4`**、**嫩绿 `#99cb77`**、**珊瑚 `#ee847d`**）以及 **夏日晴空**、**夕阳云海**，并支持 **官网角色风**、**绘本水彩**、**漫画网点** 风格与多种神态微调。
- **滑动对比与画布精修**：生成后可切换 **滑动对比** 查看原图与成图差异，支持 **圆角 / 圆形 / 方形** 裁切、画布拖拽缩放、`CITY` 装饰画框与签名气泡叠加，一键导出 `1024×1024` PNG、WebP 或复制到剪贴板。
- **本地相册 & 三语界面**：生成作品自动存入浏览器 IndexedDB（右侧滑出式 `作品集`），界面语言源自 [《CITY THE ANIMATION》官方网站](https://city-the-animation.com/) 美学适配，支持 **中文 / EN / 日本語** 即时切换。

## 工作原理

```text
浏览器前端 (React + Vite)
  ├── 压缩上传图片至 <=768px JPEG，并生成 180px 本地缩略图
  ├── 完成 Cloudflare Turnstile 安全校验（按需交互）
  ├── POST /api/stylize ──▶ Cloudflare Worker
  │                           ├── 同源 Origin/Fetch-Site 校验 + 图片魔数校验
  │                           ├── 边缘突发限流（STYLE_BURST_LIMITER）
  │                           ├── Turnstile 服务端 Siteverify 校验
  │                           ├── SQLite Durable Object（QuotaGuard）：
  │                           │   单 IP 并发锁、每日点数配额与全站 Neurons 熔断
  │                           └── 调用 Workers AI FLUX.2 多图参考推理
  │                               (flux-2-klein-4b / flux-2-klein-9b / flux-2-dev)
  └── 1024×1024 HTML5 Canvas 实时裁切画框、前后对比滑块与 IndexedDB 本地历史
```

无需外部数据库：所有前端图片预处理、画布修饰和历史存档均在浏览器本地完成，Cloudflare Worker 负责多层安全拦截、基于 SQLite Durable Object 的额度记账与 `env.AI` 推理。

## 额度与滥用防护

为防止机器人刷量、跨站盗用接口以及超出 Cloudflare 免费 Workers AI 每日额度，`/api/stylize` 内置了五层防护：

- **Cloudflare Turnstile 人机验证**：使用 Managed 模式组件并在服务端调用 `siteverify` 严格核验 `action` 与生产域名。
- **同源与文件校验**：拦截跨站直接调用的 `POST` 请求（校验 `Origin` 与 `Sec-Fetch-Site`），并验证 PNG / JPEG / WebP 二进制文件头魔数，限制单图 4 MiB、请求体 6 MiB。
- **边缘突发限流**：Workers `ratelimits` 绑定（`STYLE_BURST_LIMITER`，单 IP 每 60 秒最多 4 次请求）在边缘直接拦截高频爆破请求。
- **分级每日点数与全站熔断（`QuotaGuard`）**：基于 SQLite Durable Object 实现单 IP 并发锁（同时仅允许 1 个进行中任务）、按模型加权计费的每日 **12 点 / IP** 配额（`4B` 耗 1 点、`Dev` 耗 4 点、`9B` 耗 5 点；上游失败自动退点）以及全站每日 **8,500 Neurons** 自动熔断（UTC 00:00 重置）。
- **紧急维护开关**：通过 Worker 环境变量 `GENERATION_ENABLED="false"` 可立即暂停生成接口而不影响前端访问与本地相册导出。

## 本地开发与部署

需要 Node.js 22+ 与已开通 Workers AI 和 Durable Objects 的 Cloudflare 账号。

```bash
npm install
npx wrangler secret put TURNSTILE_SECRET
npm run dev        # 启动 Vite + Cloudflare Workers 本地开发服务
npm run cf-typegen # 重新生成 Worker 绑定类型定义
npm run typecheck  # 执行严格 TypeScript 检查
npm run build      # 类型检查并构建 Worker 与前端产物
npm run deploy     # 构建并部署至 Cloudflare Workers
```

推送至 `main` 分支也会自动触发 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)，在 GitHub Actions 中自动生成绑定类型、构建并部署至 Cloudflare Workers（需在仓库配置 `CLOUDFLARE_API_TOKEN` 与 `CLOUDFLARE_ACCOUNT_ID` 两个 Secrets；`TURNSTILE_SECRET` 则保存在 Cloudflare Worker Secret 中）。

## 参考与致谢

- **视觉风格参考**：[《CITY THE ANIMATION》官方网站](https://city-the-animation.com/)（`city-the-animation.com/character/`）。
- **精选资料清单**：[`chius-n/awesome-citytheanimation`](https://github.com/chius-n/awesome-citytheanimation)。
- **姊妹项目**：[`chius-n/city-social-map`](https://github.com/chius-n/city-social-map)（[`social.city.chius.dev`](https://social.city.chius.dev)）。
- **AI 模型支持**：Cloudflare Workers AI（`@cf/black-forest-labs/flux-2-klein-4b`、`flux-2-klein-9b`、`flux-2-dev`）。

## 📄 许可证

本仓库软件源代码采用 [MIT 许可证](LICENSE) 开源。

本项目为非官方粉丝创作工具。原作《CITY》及《CITY THE ANIMATION》角色设定、视觉版权归 © あらゐけいいち・講談社／CITY THE ANIMATION 製作委員会所有。

---

<div align="center">
  <sub>Crafted with ❤️ by <a href="https://chius.cc">Chius</a> · Powered by Cloudflare & GitHub</sub>
</div>
