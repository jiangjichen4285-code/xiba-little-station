# 西八小站

Windows 上双击 `启动小站.bat`，会启动开发服务器并打开浏览器。首次启动会自动安装依赖。启动后不要关闭弹出的命令窗口；关闭它就会停止网站。

也可以在项目目录运行：

```bash
npm install
npm run dev
```

生产构建：`npm run build`

## 你画我猜（异步版）

此游戏用 Supabase 保存八个人共用的画作广场、账户、猜测、留言和西八币，不分房间。进入游戏时选择八人之一作为当前身份。猜错记录会实名公开且可以继续猜；猜中揭晓作者并获得 10 枚西八币。部署前在 Supabase SQL Editor 执行 [`supabase/drawing-game.sql`](supabase/drawing-game.sql) 和 [`supabase/drawing-accounts-v2.sql`](supabase/drawing-accounts-v2.sql)，并将 Project URL 与 publishable key 设置为 GitHub Actions 的 `VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY` 仓库变量。升级脚本会把旧房间画作迁入共用广场；无法匹配八位成员的旧昵称会显示为“作者待确认”。代码也兼容旧版 anon key。请勿使用 secret 或 service-role key。

身份选择会关联固定账户资料，但目前没有密码或外部身份验证；任何访问者都能选择任一名字。若需要防止冒用，需要给八个账户分别增加 PIN 或其他登录验证。

本地开发时复制 `.env.example` 为 `.env.local`，填入同一组配置。缺少配置时，游戏页会提示共享后端未连接。
