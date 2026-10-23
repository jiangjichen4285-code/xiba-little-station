# 西八小站

Windows 上双击 `启动小站.bat`，会启动开发服务器并打开浏览器。首次启动会自动安装依赖。启动后不要关闭弹出的命令窗口；关闭它就会停止网站。

也可以在项目目录运行：

```bash
npm install
npm run dev
```

生产构建：`npm run build`

## 你画我猜（异步版）

此游戏用 Supabase 保存八个人共用的画作广场、猜测和评价，不分房间，也不要求昵称。画好后从八位成员中选择作者。关键词从 100 个日常词、网络热词和成语中抽取。部署前在 Supabase SQL Editor 执行 [`supabase/drawing-game.sql`](supabase/drawing-game.sql)，并将 Project URL 与 publishable key 设置为 GitHub Actions 的 `VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY` 仓库变量。升级脚本会把旧房间画作迁入共用广场；无法匹配八位成员的旧昵称会显示为“作者待确认”。代码也兼容旧版 anon key。请勿使用 secret 或 service-role key。

本地开发时复制 `.env.example` 为 `.env.local`，填入同一组配置。缺少配置时，游戏页会提示共享后端未连接。
