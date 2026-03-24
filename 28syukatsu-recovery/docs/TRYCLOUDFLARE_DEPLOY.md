# 相談業界就活管理システム：Cloudflare Tunnel 部署指南（Windows）

## 1) 推荐架构说明
你的当前项目是本地 Web 应用，建议采用：

`Home PC (长期运行)`  
→ `Frontend (Vite, localhost:5173)`  
→ `cloudflared tunnel (trycloudflare)`  
→ `https://xxxxx.trycloudflare.com`  
→ `学校平板 / 手机 / 笔记本访问`

优点：
- 不需要公网 IP
- 不需要路由器端口转发
- 不需要购买域名
- 自动 HTTPS

---

## 2) 当前项目运行方式（已分析）

### 前端
- 框架：React + Vite
- 命令：`npm run dev`
- 端口：`5173`（开发环境）

### 后端
- 框架：Node.js + Express
- Core API：`npm run api:core`（端口 `8789`）
- Email API：`npm run api`（端口 `8787`）

---

## 3) 安装 cloudflared

### 方式 A（推荐，winget）
```powershell
winget install --id Cloudflare.cloudflared -e
```

### 方式 B（choco）
```powershell
choco install cloudflared
```

安装后验证：
```powershell
cloudflared --version
```

---

## 4) 一键启动方式（已提供）

已新增脚本：
- `run-trycloudflare.ps1`
- `run-trycloudflare.cmd`

在项目根目录运行：
```cmd
run-trycloudflare.cmd
```

脚本会自动：
1. 启动 Core API（8789）  
2. 启动 Email API（8787）  
3. 启动 Frontend（5173）  
4. 启动 Cloudflare Tunnel  
5. 在终端输出 `https://xxxxx.trycloudflare.com`

你把这个 URL 发给平板/手机，就能外网访问。

---

## 5) cloudflared 直接用法

如果你只想手动开 tunnel（不跑脚本）：
```powershell
cloudflared tunnel --url http://localhost:5173
```

如果你只跑前端（不带后端）：
```powershell
powershell -ExecutionPolicy Bypass -File .\run-trycloudflare.ps1 -FrontendOnly
```

---

## 6) 使用说明

1. 在家里 PC 打开命令行，进入项目目录  
2. 运行 `run-trycloudflare.cmd`  
3. 等待终端出现 `https://xxxxx.trycloudflare.com`  
4. 在学校平板浏览器打开该地址  
5. 结束时直接关闭该终端窗口（tunnel 即关闭）

注意：
- `trycloudflare` 是临时域名，每次重启可能变化
- 需要家里 PC 持续开机联网

---

## 7) 维护建议（务实版）

1. **安全**
   - 外网访问前，至少加一个登录口令页（Basic Auth 或应用内登录）
   - 不要在前端明文显示敏感账号信息（尤其邮件/密码）

2. **稳定**
   - 将 `run-trycloudflare.cmd` 做成桌面快捷方式
   - 若要长期运行，建议改成 Windows 任务计划 + 开机自启

3. **可观测**
   - 查看 `cloudflared.log`（脚本会写日志）
   - 若打不开，先检查 `5173/8787/8789` 是否监听

4. **后续升级**
   - 当前是 trycloudflare（临时）
   - 如果未来要固定地址/更高稳定性，再升级为绑定域名的 Named Tunnel

