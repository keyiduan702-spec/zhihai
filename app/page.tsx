"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

type View = "calendar" | "review" | "notes" | "search";
type Note = { id: number; title: string; content: string; createdAt: string; updatedAt: string };

const nav: { id: View; label: string; icon: string }[] = [
  { id: "calendar", label: "月历", icon: "▦" },
  { id: "review", label: "今日复习", icon: "↻" },
  { id: "notes", label: "笔记", icon: "▤" },
  { id: "search", label: "搜索", icon: "⌕" },
];

const marked: Record<number, ("study" | "review")[]> = {};

const reviewItems: { title: string; meta: string; level: string; due: string; urgent: boolean }[] = [];

export default function Home() {
  const today = new Date();
  const [view, setView] = useState<View>("calendar");
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => today);
  const [query, setQuery] = useState("");
  const [done, setDone] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [noteStatus, setNoteStatus] = useState("正在读取笔记…");

  const title = nav.find((item) => item.id === view)?.label;
  const activeNote = notes.find((note) => note.id === activeNoteId) ?? null;
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
  useEffect(() => {
    fetch("/api/notes")
      .then((response) => response.json())
      .then((data: { notes?: Note[]; error?: string }) => {
        if (!data.notes) throw new Error(data.error ?? "读取笔记失败");
        setNotes(data.notes);
        setNoteStatus(data.notes.length ? "" : "暂无笔记");
        if (data.notes[0]) {
          setActiveNoteId(data.notes[0].id);
          setDraftTitle(data.notes[0].title);
          setDraftContent(data.notes[0].content);
        }
      })
      .catch((error: Error) => setNoteStatus(error.message));
  }, []);
  const openNote = (note: Note) => {
    setActiveNoteId(note.id);
    setDraftTitle(note.title);
    setDraftContent(note.content);
  };
  const createNote = async (event: FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/notes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: newNoteTitle, content: newNoteContent }) });
    const data = await response.json() as { note?: Note; error?: string };
    if (!data.note) return setNoteStatus(data.error ?? "新建笔记失败");
    setNotes((current) => [data.note!, ...current]);
    openNote(data.note);
    setNewNoteTitle("");
    setNewNoteContent("");
    setShowNoteForm(false);
    setNoteStatus("");
  };
  const importNotes = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const supported = files.filter((file) => /\.(md|txt)$/i.test(file.name));
    const imported: Note[] = [];

    for (const file of supported) {
      const content = await file.text();
      const title = file.name.replace(/\.(md|txt)$/i, "");
      const response = await fetch("/api/notes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, content }) });
      const data = await response.json() as { note?: Note; error?: string };
      if (data.note) imported.push(data.note);
    }

    if (imported.length) {
      setNotes((current) => [...imported.reverse(), ...current]);
      openNote(imported[0]);
    }
    const skipped = files.length - supported.length;
    setNoteStatus(`${imported.length} 篇已导入${skipped ? `，${skipped} 个不支持的文件已跳过` : ""}`);
    event.target.value = "";
  };
  const saveNote = async () => {
    if (!activeNote) return;
    const response = await fetch("/api/notes", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: activeNote.id, title: draftTitle, content: draftContent }) });
    const data = await response.json() as { note?: Note; error?: string };
    if (!data.note) return setNoteStatus(data.error ?? "保存失败");
    setNotes((current) => current.map((note) => note.id === data.note!.id ? data.note! : note));
    setNoteStatus("已保存");
  };
  const deleteNote = async (note: Note) => {
    await fetch("/api/notes", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: note.id }) });
    const remaining = notes.filter((item) => item.id !== note.id);
    setNotes(remaining);
    if (activeNoteId === note.id) {
      const next = remaining[0] ?? null;
      setActiveNoteId(next?.id ?? null);
      setDraftTitle(next?.title ?? "");
      setDraftContent(next?.content ?? "");
    }
    setNoteStatus(remaining.length ? "" : "暂无笔记");
  };
  const clearNotes = async () => {
    if (!window.confirm("确定删除全部笔记吗？")) return;
    await fetch("/api/notes", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ all: true }) });
    setNotes([]);
    setActiveNoteId(null);
    setDraftTitle("");
    setDraftContent("");
    setNoteStatus("暂无笔记");
  };
  const searchResults = useMemo(() => {
    const all: string[] = [];
    return query ? all.filter((item) => item.toLowerCase().includes(query.toLowerCase())) : all.slice(0, 3);
  }, [query]);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">知</span><div><strong>知海</strong><small>知识如海，日日有迹</small></div></div>
        <nav aria-label="主导航">
          {nav.map((item) => (
            <button key={item.id} className={view === item.id ? "nav-item active" : "nav-item"} onClick={() => setView(item.id)}>
              <span>{item.icon}</span>{item.label}{item.id === "review" && reviewItems.length > 0 && <em>{reviewItems.length}</em>}
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
              <div className="stats"><div><strong>0</strong><span>学习记录</span></div><div><strong>0</strong><span>复习任务</span></div></div>
              <section className="detail-section"><div className="section-title"><h3><i className="study" />今日学习</h3><button>查看全部</button></div>
                <div className="notes-empty">暂无学习记录</div>
              </section>
              <section className="detail-section"><div className="section-title"><h3><i className="review" />待复习</h3><button onClick={() => setView("review")}>查看全部</button></div>
                <div className="notes-empty">暂无复习任务</div>
              </section>
            </aside>
          </div>
        )}

        {view === "review" && <div className="content-card card"><div className="content-heading"><div><span className="eyebrow">TODAY'S REVIEW</span><h2>让记忆，在恰好的时间重逢</h2><p>暂无待复习内容。添加学习记录后，这里会生成复习任务。</p></div><div className="progress-ring"><strong>{done.length}</strong><span>/ {reviewItems.length}</span></div></div><div className="review-list">{reviewItems.length > 0 ? reviewItems.map((item, i) => <article key={item.title} className={done.includes(item.title) ? "review-row completed" : "review-row"}><div className="index">0{i + 1}</div><div className="review-copy"><strong>{item.title}</strong><span>{item.meta}</span></div><span className="tag amber">{item.level}</span><span className={item.urgent ? "overdue" : "due"}>{item.due}</span><button onClick={() => setDone((d) => d.includes(item.title) ? d.filter(x => x !== item.title) : [...d, item.title])}>{done.includes(item.title) ? "已完成 ✓" : "开始复习 →"}</button></article>) : <div className="notes-empty">暂无复习任务</div>}</div></div>}

        {view === "notes" && <div className="notes-layout"><section className="card note-list"><div className="panel-title"><div><span className="eyebrow">KNOWLEDGE BASE</span><h2>我的笔记</h2></div><div className="panel-actions"><span>{notes.length} 篇</span><button className="note-add" onClick={() => setShowNoteForm(true)}>新增</button><label className="note-import">导入文件<input type="file" accept=".md,.txt,text/markdown,text/plain" multiple onChange={importNotes} /></label>{notes.length > 0 && <button onClick={clearNotes}>清空全部</button>}</div></div>{notes.length > 0 ? notes.map((note) => <div className={note.id === activeNoteId ? "note-row active" : "note-row"} key={note.id}><button className="note-open" onClick={() => openNote(note)}><span className="file-icon">MD</span><span><strong>{note.title}</strong><small>{new Date(note.updatedAt).toLocaleString("zh-CN")}</small></span><span>›</span></button><button className="note-delete" aria-label={`删除 ${note.title}`} onClick={() => deleteNote(note)}>删除</button></div>) : <div className="notes-empty">{noteStatus}</div>}</section>{activeNote ? <article className="card markdown note-editor"><div className="markdown-top"><div><strong>{activeNote.title}.md</strong><span>{noteStatus || "内容自动保存在本地 D1 数据库"}</span></div><button onClick={saveNote}>保存</button></div><span className="crumb">学习笔记 / 本地知识库</span><label>标题<input className="note-title-editor" value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} /></label><label>正文<textarea className="note-content-editor" value={draftContent} onChange={(event) => setDraftContent(event.target.value)} placeholder="输入 Markdown 或普通文字…" /></label></article> : <section className="card note-empty-detail"><strong>暂无笔记</strong><span>点击“新增”或“导入文件”创建第一篇笔记。</span></section>}</div>}

        {view === "search" && <div className="content-card card search-view"><span className="eyebrow">SEARCH YOUR OCEAN</span><h2>找回曾经学过的每一片知识</h2><div className="search-box"><span>⌕</span><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索主题、内容、文件名或 Markdown 正文…" /><kbd>Enter</kbd></div><p className="result-count">{query ? `找到 ${searchResults.length} 条与“${query}”相关的内容` : "暂无笔记"}</p>{searchResults.map((r, i) => <article className="search-result" key={r}><span className="file-icon">MD</span><div><strong>{r}</strong><p>{i === 0 ? "相关笔记内容摘要。" : "学习记录与 Markdown 笔记中的相关内容摘要。"}</p><small>notes/{r}.md</small></div><span className="tag green">熟悉</span></article>)}</div>}
      </section>

      {showAdd && <div className="modal-backdrop" onMouseDown={() => setShowAdd(false)}><form className="modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); setShowAdd(false); }}><button type="button" className="close" onClick={() => setShowAdd(false)}>×</button><span className="eyebrow">NEW LEARNING</span><h2>记录今天学到的知识</h2><label>学习主题<input required placeholder="例如：TypeScript 泛型" /></label><label>具体内容<textarea required placeholder="简要记录今天学习的内容…" /></label><label>掌握程度<div className="level-options">{["陌生", "模糊", "熟悉", "掌握"].map((x) => <button type="button" key={x}>{x}</button>)}</div></label><button className="primary submit">保存并生成复习计划</button></form></div>}
      {showNoteForm && <div className="modal-backdrop"><form className="modal" onSubmit={createNote}><button type="button" className="close" onClick={() => setShowNoteForm(false)}>×</button><span className="eyebrow">NEW NOTE</span><h2>新建笔记</h2><label>标题<input required value={newNoteTitle} onChange={(event) => setNewNoteTitle(event.target.value)} placeholder="输入笔记标题" /></label><label>正文<textarea value={newNoteContent} onChange={(event) => setNewNoteContent(event.target.value)} placeholder="输入 Markdown 或普通文字…" /></label><button className="primary submit">保存笔记</button></form></div>}
    </main>
  );
}
