interface Env {
  DB: D1Database;
}

type UserRow = { username: string; password_salt: string; password_hash: string; iterations: number };
type SessionRow = { username: string };

const encoder = new TextEncoder();
const SESSION_COOKIE = "zhihai_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

async function sha256(value: string): Promise<string> {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

async function derivePassword(password: string, saltHex: string, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(saltHex), iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

function cookieValue(request: Request, name: string): string | null {
  const cookies = request.headers.get("Cookie") ?? "";
  for (const part of cookies.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}

function html(body: string, status = 200, headers: HeadersInit = {}): Response {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", ...headers } });
}

function redirect(location: string, cookie?: string): Response {
  const headers = new Headers({ Location: location, "Cache-Control": "no-store" });
  if (cookie) headers.set("Set-Cookie", cookie);
  return new Response(null, { status: 303, headers });
}

async function currentUser(request: Request, env: Env): Promise<string | null> {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(
    "SELECT username FROM sessions WHERE token_hash = ?1 AND expires_at > ?2",
  ).bind(tokenHash, Date.now()).first<SessionRow>();
  return row?.username ?? null;
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const form = await request.formData();
  const username = String(form.get("username") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const now = Date.now();

  const attempt = await env.DB.prepare(
    "SELECT attempts, locked_until FROM login_attempts WHERE ip = ?1",
  ).bind(ip).first<{ attempts: number; locked_until: number }>();
  if (attempt && attempt.locked_until > now) return html(loginPage("尝试次数过多，请稍后再试。", username), 429);

  const user = await env.DB.prepare(
    "SELECT username, password_salt, password_hash, iterations FROM users WHERE username = ?1",
  ).bind(username).first<UserRow>();

  const fallbackSalt = "00000000000000000000000000000000";
  const supplied = await derivePassword(password, user?.password_salt ?? fallbackSalt, user?.iterations ?? 210000);
  const expected = user ? hexToBytes(user.password_hash) : new Uint8Array(32);
  const valid = crypto.subtle.timingSafeEqual(supplied, expected) && Boolean(user);

  if (!valid) {
    const attempts = (attempt?.attempts ?? 0) + 1;
    const lockedUntil = attempts >= 5 ? now + 15 * 60 * 1000 : 0;
    await env.DB.prepare(
      "INSERT INTO login_attempts (ip, attempts, locked_until, updated_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(ip) DO UPDATE SET attempts = ?2, locked_until = ?3, updated_at = ?4",
    ).bind(ip, attempts >= 5 ? 0 : attempts, lockedUntil, now).run();
    return html(loginPage("账号或密码不正确。", username), 401);
  }

  await env.DB.prepare("DELETE FROM login_attempts WHERE ip = ?1").bind(ip).run();
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const token = bytesToHex(tokenBytes);
  await env.DB.prepare(
    "INSERT INTO sessions (token_hash, username, expires_at, created_at) VALUES (?1, ?2, ?3, ?4)",
  ).bind(await sha256(token), username, now + SESSION_SECONDS * 1000, now).run();
  return redirect("/", `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`);
}

async function handleLogout(request: Request, env: Env): Promise<Response> {
  const token = cookieValue(request, SESSION_COOKIE);
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?1").bind(await sha256(token)).run();
  return redirect("/login", `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
}

const styles = `
:root{--navy:#183b50;--muted:#6f8795;--blue:#197aa5;--green:#62b79c;--orange:#eaa25b;--line:#dce9eb}*{box-sizing:border-box}body{margin:0;background:#eaf5f7;color:var(--navy);font-family:"Microsoft YaHei","PingFang SC",Arial,sans-serif}.shell{min-height:100vh;display:flex;background:radial-gradient(circle at 92% 8%,rgba(129,206,211,.34),transparent 28%),linear-gradient(135deg,#edf8f9,#e7f2f4)}button,input{font:inherit}.side{width:228px;padding:34px 18px 24px;background:rgba(244,251,251,.86);border-right:1px solid #cfe1e3;display:flex;flex-direction:column;position:fixed;inset:0 auto 0 0}.brand{display:flex;align-items:center;gap:12px;padding:0 10px 38px}.mark{width:43px;height:43px;display:grid;place-items:center;border-radius:14px 14px 14px 3px;background:var(--navy);color:#fff;font-family:serif;font-size:23px}.brand div,.profile div{display:flex;flex-direction:column}.brand strong{font-family:serif;font-size:24px;letter-spacing:.12em}.brand small,.profile small{color:#8ca0aa;font-size:11px;margin-top:3px}.nav button{width:100%;height:48px;border:0;background:transparent;color:#66808f;border-radius:13px;display:flex;align-items:center;gap:13px;padding:0 16px;margin:4px 0;cursor:pointer}.nav button.active,.nav button:hover{background:#d8ecef;color:#176e8f;font-weight:700}.nav b{font-size:20px}.nav em{margin-left:auto;background:#e99554;color:#fff;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:10px;font-style:normal}.profile{margin-top:auto;display:flex;align-items:center;gap:9px;border-top:1px solid var(--line);padding:20px 7px 0;position:relative}.avatar{width:35px;height:35px;border-radius:50%;display:grid!important;place-items:center;background:#c9e4e5;color:#276578;font-weight:700}.profile strong{font-size:12px}.profile .more{margin-left:auto;border:0;background:none;color:#78909b;cursor:pointer}.menu{position:absolute;left:4px;bottom:52px;width:190px;padding:7px;background:#fff;border:1px solid var(--line);border-radius:13px;box-shadow:0 16px 40px rgba(25,62,77,.18);display:none}.menu.open{display:block}.menu button,.menu form{width:100%;margin:0}.menu button{border:0;background:transparent;border-radius:8px;padding:10px 11px;color:#476572;font-size:11px;text-align:left;cursor:pointer}.menu button:hover{background:#edf6f6}.menu .logout{color:#bd604f;border-top:1px solid #e5eeee}.main{margin-left:228px;width:calc(100% - 228px);padding:31px 38px}.top{display:flex;align-items:center;justify-content:space-between;margin-bottom:25px}.top p{margin:0 0 5px;color:#8499a4;font-size:12px}.top h1{margin:0;font-family:serif;font-size:27px}.primary{border:0;background:linear-gradient(135deg,#1d789c,#19647f);color:#fff;border-radius:12px;padding:12px 19px;box-shadow:0 9px 20px rgba(25,104,136,.18);cursor:pointer}.layout{display:grid;grid-template-columns:minmax(520px,1.62fr) minmax(340px,.88fr);gap:20px}.card{background:rgba(251,254,254,.9);border:1px solid #d3e6e7;border-radius:20px;box-shadow:0 14px 35px rgba(47,91,104,.07);padding:25px}.cal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px}.cal-head h2{font-family:serif;font-size:19px;margin:0}.week,.days{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}.week span{text-align:center;color:#8ba0aa;font-size:11px;padding:8px}.day{min-height:75px;border:1px solid transparent;background:transparent;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#3e5967;cursor:pointer}.day:hover{background:#fff;border-color:#d8e8e9}.day.selected{background:#176e8f;color:#fff;box-shadow:0 9px 21px rgba(26,111,143,.2)}.dots{height:5px;display:flex;gap:4px}.dots i,.legend i{width:6px;height:6px;border-radius:50%}.green{background:var(--green)}.orange{background:var(--orange)}.legend{display:flex;gap:20px;border-top:1px solid var(--line);margin-top:17px;padding-top:17px;color:#78909b;font-size:11px}.legend span{display:flex;align-items:center;gap:7px}.date{display:flex;justify-content:space-between;align-items:center;padding-bottom:19px;border-bottom:1px solid var(--line)}.date strong{font-family:serif;font-size:46px}.date span{font-size:11px;color:#7b929d}.stats{display:grid;grid-template-columns:1fr 1fr;background:#edf6f6;border-radius:12px;margin:18px 0}.stats div{display:flex;align-items:baseline;gap:7px;padding:14px 18px}.stats div+div{border-left:1px solid #d4e5e6}.stats strong{font-size:22px}.stats span{font-size:10px;color:#8298a2}.section h3{font-size:12px;margin:20px 0 10px}.item{border:1px solid var(--line);border-radius:13px;padding:13px;margin-bottom:8px;background:#fff}.item strong{font-size:12px}.item p{font-size:11px;color:#708894;line-height:1.55}.item footer{display:flex;justify-content:space-between;color:#8aa0aa;font-size:9px}.login-page{min-height:100vh;display:grid;grid-template-columns:1.15fr .85fr;background:linear-gradient(135deg,#e5f3f5,#f8fbfb)}.login-art{padding:8vw;display:flex;flex-direction:column;justify-content:center;background:radial-gradient(circle at 30% 25%,rgba(87,177,190,.24),transparent 30%)}.login-art .mark{width:56px;height:56px;font-size:30px}.login-art h1{font:50px serif;margin:25px 0 12px}.login-art p{color:#66818d;line-height:1.8}.login-card-wrap{display:grid;place-items:center;padding:25px}.login-card{width:min(420px,100%);background:rgba(255,255,255,.9);border:1px solid #d4e6e7;border-radius:24px;padding:42px;box-shadow:0 25px 70px rgba(38,88,104,.13)}.login-card h2{font:28px serif;margin:0 0 8px}.login-card>p{color:#7a919b;font-size:12px;margin:0 0 28px}.login-card label{display:block;font-size:11px;font-weight:700;margin:16px 0}.login-card input{display:block;width:100%;margin-top:8px;padding:13px;border:1px solid #d3e3e4;border-radius:10px;outline:0}.login-card input:focus{border-color:#4e9caf;box-shadow:0 0 0 3px rgba(78,156,175,.1)}.login-card .primary{width:100%;margin-top:10px}.error{background:#fbeae5;color:#b65d49;padding:10px 12px;border-radius:9px;font-size:11px}.secure{display:block;text-align:center;color:#91a3aa;font-size:9px;margin-top:20px}@media(max-width:900px){.layout{grid-template-columns:1fr}.login-page{grid-template-columns:1fr}.login-art{display:none}}@media(max-width:650px){.side{position:static;width:100%;height:auto}.shell{display:block}.brand,.profile{display:none}.side{padding:8px}.nav{display:flex}.nav button{justify-content:center;font-size:10px}.main{margin:0;width:100%;padding:20px 14px}.day{min-height:52px}.top .primary{padding:11px;font-size:0}.top .primary:first-letter{font-size:20px}.card{padding:17px}}
`;

function loginPage(error = "", username = ""): string {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>登录｜知海</title><style>${styles}</style></head><body><main class="login-page"><section class="login-art"><span class="mark">知</span><h1>知海</h1><p>在知识的海洋里，记录学习，按时重逢。<br>让每一次回顾，都发生在即将遗忘之前。</p></section><section class="login-card-wrap"><form class="login-card" method="post" action="/api/login"><h2>欢迎回来</h2><p>登录你的私人知识海域</p>${error ? `<div class="error">${error}</div>` : ""}<label>账号<input name="username" autocomplete="username" value="${username.replace(/[&<>"]/g, "")}" required autofocus></label><label>密码<input name="password" type="password" autocomplete="current-password" required></label><button class="primary" type="submit">进入知海</button><span class="secure">🔒 账号与会话均由服务器安全验证</span></form></section></main></body></html>`;
}

function dashboardPage(username: string): string {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const blanks = "<span></span>".repeat(5);
  const marked = new Set([2,4,6,7,9,11,12,14,16,18,20,21,23,25,27,29,30]);
  const dayHtml = days.map((day) => `<button class="day${day === 14 ? " selected" : ""}" data-day="${day}"><span>${day}</span><span class="dots">${marked.has(day) ? `<i class="green"></i>${day % 2 === 0 ? '<i class="orange"></i>' : ""}` : ""}</span></button>`).join("");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>知海｜学习月历</title><style>${styles}</style></head><body><main class="shell"><aside class="side"><div class="brand"><span class="mark">知</span><div><strong>知海</strong><small>知识如海，日日有迹</small></div></div><nav class="nav"><button class="active"><b>▦</b>月历</button><button><b>↻</b>今日复习<em>3</em></button><button><b>▤</b>笔记</button><button><b>⌕</b>搜索</button></nav><div class="profile"><div class="avatar">少</div><div><strong>少年游</strong><small>${username} · 已安全登录</small></div><button class="more" aria-label="个人菜单">···</button><div class="menu"><button>账号设置</button><button>修改密码</button><button>微信提醒设置</button><form method="post" action="/api/logout"><button class="logout" type="submit">退出登录</button></form></div></div></aside><section class="main"><header class="top"><div><p>2026年8月14日 · 星期五</p><h1>月历</h1></div><button class="primary">＋ 添加学习记录</button></header><div class="layout"><section class="card"><div class="cal-head"><h2>‹　2026年 8月　›</h2><button>今天</button></div><div class="week">${["一","二","三","四","五","六","日"].map((d) => `<span>${d}</span>`).join("")}</div><div class="days">${blanks}${dayHtml}</div><div class="legend"><span><i class="green"></i>学习记录</span><span><i class="orange"></i>复习任务</span></div></section><aside class="card"><div class="date"><strong id="selected">14</strong><span>八月<br>星期五</span></div><div class="stats"><div><strong>2</strong><span>学习记录</span></div><div><strong>3</strong><span>复习任务</span></div></div><section class="section"><h3>● 今日学习</h3><article class="item"><strong>TypeScript 泛型</strong><p>理解泛型约束、条件类型与常用工具类型的实现方式。</p><footer><span>▤ 2 篇笔记</span><span>下一次复习：明天</span></footer></article><article class="item"><strong>CSS Grid 响应式布局</strong><p>掌握 · 下一次复习：8月21日</p></article><h3>● 待复习</h3><article class="item"><strong>React 状态管理</strong><p>上次复习：8月7日 · 逾期 2 天</p></article></section></aside></div></section></main><script>const menu=document.querySelector('.menu');document.querySelector('.more').onclick=()=>menu.classList.toggle('open');document.addEventListener('click',e=>{if(!e.target.closest('.profile'))menu.classList.remove('open')});document.querySelectorAll('.day').forEach(b=>b.onclick=()=>{document.querySelectorAll('.day').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');document.querySelector('#selected').textContent=b.dataset.day});</script></body></html>`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/health") return Response.json({ ok: true });
      if (request.method === "POST" && url.pathname === "/api/login") return handleLogin(request, env);
      if (request.method === "POST" && url.pathname === "/api/logout") return handleLogout(request, env);
      const username = await currentUser(request, env);
      if (!username) return url.pathname === "/login" ? html(loginPage()) : redirect("/login");
      if (url.pathname === "/login") return redirect("/");
      return html(dashboardPage(username));
    } catch (error) {
      console.error(JSON.stringify({ event: "request_failed", message: error instanceof Error ? error.message : "unknown" }));
      return html("<h1>服务暂时不可用</h1><p>请稍后重试。</p>", 500);
    }
  },
} satisfies ExportedHandler<Env>;
