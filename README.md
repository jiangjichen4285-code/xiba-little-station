# 西八小站

Windows 上双击 `启动小站.bat`，会启动开发服务器并打开浏览器。首次启动会自动安装依赖。启动后不要关闭弹出的命令窗口；关闭它就会停止网站。

也可以在项目目录运行：

```bash
npm install
npm run dev
```

生产构建：`npm run build`

## 你画我猜（异步版）

此游戏用 Supabase 保存房间、作品、猜测和评价，让朋友能通过链接在不同设备、不同时间加入。部署之前需要一个 Supabase 项目：在 SQL Editor 执行 [`supabase/drawing-game.sql`](supabase/drawing-game.sql)，并把 Project URL 与 publishable key 设置为 GitHub Actions 的 `VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY` 仓库变量。代码也兼容旧版 anon key。请勿使用 secret 或 service-role key。

本地开发时复制 `.env.example` 为 `.env.local`，填入同一组配置。缺少配置时，游戏页会提示共享后端未连接。
