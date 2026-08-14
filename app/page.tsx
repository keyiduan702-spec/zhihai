"use client";

import { useMemo, useState } from "react";

type View = "calendar" | "review" | "notes" | "search";

const nav: { id: View; label: string; icon: string }[] = [
  { id: "calendar", label: "月历", icon: "▦" },
  { id: "review", label: "今日复习", icon: "↻" },
  { id: "notes", label: "笔记", icon: "▤" },
  { id: "search", label: "搜索", icon: "⌕" },
];

const marked: Record<number, ("study" | "review")[]> = {
  2: ["study"], 4: ["review"], 6: ["study"], 7: ["study", "review"],
  9: ["study"], 11: ["review"], 12: ["study"], 14: ["study", "review"],
  16: ["study"], 18: ["review"], 20: ["study"], 21: ["study"],
  23: ["review"], 25: ["study"], 27: ["study", "review"], 29: ["study"], 30: ["review"],
};

const reviewItems = [
  { title: "React 状态管理", meta: "第 3 次复习 · 上次 8月7日", level: "模糊", due: "逾期 2 天", urgent: true },
  { title: "间隔重复与记忆曲线", meta: "第 2 次复习 · 上次 8月11日", level: "熟悉", due: "今日到期", urgent: false },
  { title: "TypeScript 泛型", meta: "第 1 次复习 · 上次 8月13日", level: "陌生", due: "今日到期", urgent: false },
];

export default function Home() {
  const today = new Date();
  const [view, setView] = useState<View>("calendar");
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => today);
  const [query, setQuery] = useState("");
  const [done, setDone] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const title = nav.find((item) => item.id === view)?.label;
  const calendarDays = useMemo(() => {
    const leadingDays = (visibleMonth.getDay() + 6) % 7;
    const dayCount = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
    return [...Array(leadingDays).fill(null), ...Array.from({ length: dayCount }, (_, i) => i + 1)];
  }, [visibleMonth]);
  const selectedWeekday = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][selectedDate.getDay()];
  const isToday = selectedDate.toDateString() === today.toDateString();
  const changeMonth = (offset: number) => {
    const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
    setVisibleMonth(nextMonth);
    setSelectedDate(nextMonth);
  };
  const goToToday = () => {
    const now = new Date();
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
  };
  const searchResults = useMemo(() => {
    const all = ["React 状态管理", "间隔重复与记忆曲线", "TypeScript 泛型", "CSS Grid 响应式布局"];
    return query ? all.filter((item) => item.toLowerCase().includes(query.toLowerCase())) : all.slice(0, 3);
  }, [query]);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">知</span><div><strong>知海</strong><small>知识如海，日日有迹</small></div></div>
        <nav aria-label="主导航">
          {nav.map((item) => (
            <button key={item.id} className={view === item.id ? "nav-item active" : "nav-item"} onClick={() => setView(item.id)}>
              <span>{item.icon}</span>{item.label}{item.id === "review" && <em>3</em>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="avatar">少</div><div><strong>少年游</strong><small>连续学习 18 天</small></div>
          <button className="more-button" aria-label="更多设置" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>···</button>
          {menuOpen && <><button className="menu-dismiss" aria-label="关闭个人菜单" onClick={() => setMenuOpen(false)} /><div className="profile-menu" role="menu">
            <button role="menuitem" onClick={() => setMenuOpen(false)}>微信提醒设置<span>›</span></button>
          </div></>}
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div><p>2026年8月14日 · 星期五</p><h1>{title}</h1></div>
          <button className="primary" onClick={() => setShowAdd(true)}><span>＋</span> 添加学习记录</button>
        </header>

        {view === "calendar" && (
          <div className="calendar-layout">
            <section className="card calendar-card">
              <div className="calendar-head"><div><button aria-label="上个月" onClick={() => changeMonth(-1)}>‹</button><h2>{visibleMonth.getFullYear()}年 {visibleMonth.getMonth() + 1}月</h2><button aria-label="下个月" onClick={() => changeMonth(1)}>›</button></div><button className="today" onClick={goToToday}>今天</button></div>
              <div className="week-row">{["一", "二", "三", "四", "五", "六", "日"].map((d) => <span key={d}>{d}</span>)}</div>
              <div className="days-grid">
                {calendarDays.map((day, i) => day ? (
                  <button key={i} className={`day ${day === selectedDate.getDate() ? "selected" : ""} ${day === today.getDate() && visibleMonth.getMonth() === today.getMonth() && visibleMonth.getFullYear() === today.getFullYear() ? "current" : ""}`} onClick={() => setSelectedDate(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day))}>
                    <span>{day}</span><div className="dots">{visibleMonth.getFullYear() === 2026 && visibleMonth.getMonth() === 7 && marked[day]?.map((kind) => <i key={kind} className={kind} />)}</div>
                  </button>
                ) : <span className="day empty" key={i} />)}
              </div>
              <div className="legend"><span><i className="study" />学习记录</span><span><i className="review" />复习任务</span><span className="hint">点选日期查看详情</span></div>
            </section>

            <aside className="details card">
              <div className="date-block"><div><strong>{selectedDate.getDate()}</strong><span>{selectedDate.getMonth() + 1}月<br />{selectedWeekday}</span></div>{isToday && <em>今天</em>}</div>
              <div className="stats"><div><strong>2</strong><span>学习记录</span></div><div><strong>3</strong><span>复习任务</span></div></div>
              <section className="detail-section"><div className="section-title"><h3><i className="study" />今日学习</h3><button>查看全部</button></div>
                <article className="study-item"><div className="item-head"><strong>TypeScript 泛型</strong><span className="tag green">熟悉</span></div><p>理解泛型约束、条件类型与常用工具类型的实现方式。</p><div className="item-foot"><span>▤ 2 篇笔记</span><span>下一次复习：明天</span></div></article>
                <article className="study-item compact"><div className="item-head"><strong>CSS Grid 响应式布局</strong><span className="tag blue">掌握</span></div><div className="item-foot"><span>▤ 1 篇笔记</span><span>下一次复习：8月21日</span></div></article>
              </section>
              <section className="detail-section"><div className="section-title"><h3><i className="review" />待复习</h3><button onClick={() => setView("review")}>查看全部</button></div>
                <article className="review-mini"><div><strong>React 状态管理</strong><span>上次复习：8月7日</span></div><span className="overdue">逾期 2 天</span></article>
                <article className="review-mini"><div><strong>间隔重复与记忆曲线</strong><span>上次复习：8月11日</span></div><span className="due">今日到期</span></article>
              </section>
            </aside>
          </div>
        )}

        {view === "review" && <div className="content-card card"><div className="content-heading"><div><span className="eyebrow">TODAY'S REVIEW</span><h2>让记忆，在恰好的时间重逢</h2><p>3 项待复习，其中 1 项已逾期。完成后重新评估掌握程度。</p></div><div className="progress-ring"><strong>{done.length}</strong><span>/ 3</span></div></div><div className="review-list">{reviewItems.map((item, i) => <article key={item.title} className={done.includes(item.title) ? "review-row completed" : "review-row"}><div className="index">0{i + 1}</div><div className="review-copy"><strong>{item.title}</strong><span>{item.meta}</span></div><span className="tag amber">{item.level}</span><span className={item.urgent ? "overdue" : "due"}>{item.due}</span><button onClick={() => setDone((d) => d.includes(item.title) ? d.filter(x => x !== item.title) : [...d, item.title])}>{done.includes(item.title) ? "已完成 ✓" : "开始复习 →"}</button></article>)}</div></div>}

        {view === "notes" && <div className="notes-layout"><section className="card note-list"><div className="panel-title"><div><span className="eyebrow">KNOWLEDGE BASE</span><h2>我的笔记</h2></div><span>12 篇</span></div>{["TypeScript 泛型", "React 状态管理", "间隔重复与记忆曲线", "CSS Grid 响应式布局"].map((n, i) => <button className={i === 0 ? "note-row active" : "note-row"} key={n}><span className="file-icon">MD</span><div><strong>{n}</strong><small>更新于 {i + 10} 日 · v{i + 2}</small></div><span>›</span></button>)}</section><article className="card markdown"><div className="markdown-top"><div><strong>TypeScript 泛型.md</strong><span>最新版 · v3</span></div><button>历史版本</button></div><span className="crumb">学习笔记 / 前端工程 / TypeScript</span><h1>TypeScript 泛型</h1><p>泛型允许我们在定义函数、接口或类时，不预先指定具体的类型，而在使用时再确定类型。</p><h2>泛型约束</h2><pre><code>{`function getLength<T extends { length: number }>(arg: T) {\n  return arg.length;\n}`}</code></pre><blockquote>关键点：约束保留了类型信息，同时保证属性安全。</blockquote></article></div>}

        {view === "search" && <div className="content-card card search-view"><span className="eyebrow">SEARCH YOUR OCEAN</span><h2>找回曾经学过的每一片知识</h2><div className="search-box"><span>⌕</span><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索主题、内容、文件名或 Markdown 正文…" /><kbd>Enter</kbd></div><p className="result-count">{query ? `找到 ${searchResults.length} 条与“${query}”相关的内容` : "最近访问"}</p>{searchResults.map((r, i) => <article className="search-result" key={r}><span className="file-icon">MD</span><div><strong>{r}</strong><p>{i === 0 ? "泛型约束可以让类型参数具备必要的结构，同时保留完整的类型推导能力…" : "学习记录与 Markdown 笔记中的相关内容摘要，点击可直接打开并定位。"}</p><small>2026年8月{14 - i}日 · notes/{r}.md</small></div><span className="tag green">熟悉</span></article>)}</div>}
      </section>

      {showAdd && <div className="modal-backdrop" onMouseDown={() => setShowAdd(false)}><form className="modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); setShowAdd(false); }}><button type="button" className="close" onClick={() => setShowAdd(false)}>×</button><span className="eyebrow">NEW LEARNING</span><h2>记录今天学到的知识</h2><label>学习主题<input required placeholder="例如：TypeScript 泛型" /></label><label>具体内容<textarea required placeholder="简要记录今天学习的内容…" /></label><label>掌握程度<div className="level-options">{["陌生", "模糊", "熟悉", "掌握"].map((x) => <button type="button" key={x}>{x}</button>)}</div></label><button className="primary submit">保存并生成复习计划</button></form></div>}
    </main>
  );
}
