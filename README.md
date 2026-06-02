# Snap Roast Buddy

Snap Roast Buddy 是一个移动端相机式 AI 小票应用：拍照或导入照片后，后端分析图片、生成吐槽文案，前端把结果排成热敏纸小票，也可以生成黑白漫画贴纸。

当前默认入口是产品模式。打开 `/` 会直接进入 `frontend/index.html`。

## 当前版本

### 产品模式

- 真实手机摄像头取景，支持前后摄像头切换。
- 前置摄像头预览和保存方向已修正。
- 取景框保持竖屏 `3:4`；设置为横屏时，只在拍照输出前旋转为横向图片。
- 取景框内支持点击对焦反馈。
- 取景框内支持滑动倍率，当前为 `1x` 到 `3x`。
- 支持从设置页导入相册照片。
- 支持自动生成、小票、爆字、表情、漫画等模式。
- 生成后进入相册页，照片和小票同步横向滑动。
- 支持自定义删除确认弹窗。
- 照片、小票和漫画仅保存在当前手机浏览器的 IndexedDB 中；localStorage 作为兼容兜底。

### 测试与调试

- `frontend/index.html` 是移动端产品模式。
- `frontend/test.html` 是工程测试页，用于手动输入/上传图片并测试 AI 小票生成。
- 测试页每次步骤完成或失败会显示本次调用耗时。
- `frontend/debug.html` 是 Prompt、layout skills、SVG 预览调试面板。

## 生成流程

```txt
1. 获取照片
   - 产品模式：手机摄像头拍摄或从设置页导入
   - 测试页：上传图片或编辑图片描述

2. 图片分析
   - POST /api/analyze-image
   - 默认视觉模型：Pro/moonshotai/Kimi-K2.6

3. 排版选择
   - POST /api/classify-layout
   - 自动选择 receipt / big_text / pixel_expression

4. 文案生成
   - POST /api/roast
   - 默认文本模型：Pro/zai-org/GLM-4.7

5. 可选漫画
   - POST /api/generate-doodle
   - 默认图像编辑模型：Qwen/Qwen-Image-Edit-2509

6. 保存记录
   - 浏览器：IndexedDB 本地保存照片、小票内容和漫画
   - 浏览器不支持 IndexedDB 时：localStorage 兼容兜底
```

## 项目结构

```txt
frontend/
  index.html              # 移动端产品模式，默认入口
  test.html               # 工程测试页
  debug.html              # 调试面板
  styles.css
  src/app.ts              # 测试页交互
  src/product.ts          # 产品模式交互
  src/debug.ts            # 调试页交互
  dist/                   # 构建产物

api/
  _shared.mjs             # Vercel API 共享逻辑
  analyze-image.mjs
  classify-layout.mjs
  roast.mjs
  generate-doodle.mjs
  inline-image.mjs

backend/
  server.mjs              # 本地开发静态服务 + API 代理

packages/layout/
  src/                    # 小票布局、渲染和技能规则执行

config/layout-skills/
  *.md / *.json           # 可调整的排版规则

local-photos/             # 本地测试照片，已 gitignore
```

## 本地启动

```bash
npm install
npm run build:frontend
npm run dev
```

打开：

```txt
http://localhost:5173
```

常用页面：

```txt
http://localhost:5173/index.html
http://localhost:5173/test.html
http://localhost:5173/debug.html
```

## 环境变量

复制 `.env.example` 为 `.env`，填入服务端密钥：

```env
SILICONFLOW_API_KEY=YOUR_API_KEY
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1
SILICONFLOW_MODEL=Pro/zai-org/GLM-4.7
SILICONFLOW_VISION_MODEL=Pro/moonshotai/Kimi-K2.6
SILICONFLOW_IMAGE_EDIT_MODEL=Qwen/Qwen-Image-Edit-2509
```

## 本地相册数据

产品模式生成的记录只保存在用户当前手机浏览器中，不会上传到记录数据库。清理浏览器站点数据会同时清除本地相册。

核心字段：

```ts
type PhotoRecord = {
  id: string;
  originalImageUrl: string;
  createdAt: string;
  description?: string;
  layoutType: "receipt" | "big_text" | "expression" | "sketch";
  generationMode: "auto" | "receipt" | "big_text" | "expression";
  roastLevel: "gentle" | "normal" | "spicy" | "public_execution";
  sketchMode: "none" | "top" | "bottom" | "standalone";
  ticketHtml?: string;
  ticketText?: string;
  sketchImageUrl?: string;
  caption?: string;
};
```

## Vercel 部署

项目已经包含 `vercel.json`：

```txt
Build Command: npm run build:frontend
Output Directory: frontend
Install Command: npm install
```

Vercel Environment Variables 需要配置：

```env
SILICONFLOW_API_KEY=YOUR_API_KEY
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1
SILICONFLOW_MODEL=Pro/zai-org/GLM-4.7
SILICONFLOW_VISION_MODEL=Pro/moonshotai/Kimi-K2.6
SILICONFLOW_IMAGE_EDIT_MODEL=Qwen/Qwen-Image-Edit-2509
```

Vercel 根路径 `/` 直接使用 `frontend/index.html`。

## API

```txt
POST   /api/analyze-image
POST   /api/classify-layout
POST   /api/roast
POST   /api/generate-doodle
GET    /api/inline-image
GET    /api/debug/prompts
GET    /api/debug/skills
```

## 常用命令

```bash
npm run check
npm run build:frontend
npm run dev
npm run demo
```

## Git 忽略策略

已忽略：

```txt
.env
.env.local
.env.development
.env.production
.env.preview
.env.*.local
.vercel/
node_modules/
frontend/dist/
local-photos/
```

不要提交真实 API key 或本地测试照片。

## 后续硬件接入方向

- `POST /api/print`：接收 layout JSON 或 bitmap。
- ESC/POS 转换：把 `LayoutDocument` 转成热敏打印机位图数据。
- ESP32 通信：通过 HTTP、WebSocket、BLE 或串口转发打印任务。
- 打印队列：缓存失败任务，支持重试和状态回传。
