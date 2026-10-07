import React, { useState, useEffect, useMemo } from 'react';
import './styles.css';
import { STR } from './content.js';
import {
  getNotifPermission,
  requestNotifPermission,
  syncDeadlineNotifications,
  checkWebDueNotifications,
} from './notifications.js';
import {
  getPosition,
  mapsLink,
  smsUri,
  whatsappUri,
  cleanPhone,
} from './location.js';

function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  }, [key, value]);
  return [value, setValue];
}

/* ---------- date helpers (local-time safe) ---------- */
function parseDate(s) {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addMonths(d, n) {
  const c = new Date(d.getTime());
  c.setMonth(c.getMonth() + n);
  return c;
}
function daysUntil(dateStr) {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((parseDate(dateStr) - t) / 86400000);
}
function fmtLong(dateStr, lang) {
  try {
    return parseDate(dateStr).toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return dateStr; }
}

/* ---------- FX rate cache (offline fallback) ---------- */
const FX_CACHE_KEY = 'bienvenue-fx-cache';
function loadFxCache() {
  try {
    const raw = localStorage.getItem(FX_CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (!c || !c.rates || !c.rates.CAD) return null;
    return c;
  } catch { return null; }
}
function saveFxCache(rates, date) {
  try { localStorage.setItem(FX_CACHE_KEY, JSON.stringify({ rates, date })); } catch { /* ignore */ }
}

const VIEWS = ['home', 'checklist', 'dossier', 'timeline', 'scams', 'resources', 'money', 'housing'];
/* PageHead numeral per view (1-based display) */
const PAGE_INDEX = { checklist: 1, dossier: 2, timeline: 3, scams: 4, resources: 5, money: 6, housing: 7 };

const DOSSIER_DEFAULT = { docs: {}, arrivalDate: '', custom: [] };

export default function App() {
  const [lang, setLang] = useLocalStorage('bienvenue-lang', 'fr');
  const [view, setView] = useState('home');
  const [checked, setChecked] = useLocalStorage('bienvenue-checklist', {});
  const [dossier, setDossier] = useLocalStorage('bienvenue-dossier', DOSSIER_DEFAULT);
  const [sosOpen, setSosOpen] = useState(false);

  const t = STR[lang] || STR.fr;

  useEffect(() => {
    document.documentElement.lang = t.meta.lang;
    document.title = lang === 'fr'
      ? 'Bienvenue — Guide d’arrivée à Montréal'
      : 'Bienvenue — Montréal arrival guide';
  }, [lang, t]);

  const toggleItem = (id) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const { done, total } = useMemo(() => {
    let d = 0, n = 0;
    for (const s of t.checklist.sections) {
      for (const item of s.items) {
        n += 1;
        if (checked[item.id]) d += 1;
      }
    }
    return { done: d, total: n };
  }, [t, checked]);

  const pct = total ? Math.round((done / total) * 100) : 0;

  const resetChecklist = () => {
    if (window.confirm(t.checklist.resetConfirm)) setChecked({});
  };

  const go = (v) => {
    setView(v);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <div className="brand" onClick={() => go('home')} role="button" tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && go('home')}>
            <img className="brand-mark" src="/bb24-logo.png" alt="BB24" />
            <div>
              <div className="brand-name">{t.brand}</div>
              <div className="brand-tag">{t.tagline}</div>
            </div>
          </div>
          <div className="header-actions">
            <button className="sos-btn" onClick={() => setSosOpen(true)}>
              {t.emergency.button}
            </button>
            <div className="lang-toggle" aria-label="Language / Langue">
              {['fr', 'en'].map((l) => (
                <button key={l} className={lang === l ? 'active' : ''} onClick={() => setLang(l)}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <nav className="nav">
        <div className="nav-inner">
          {VIEWS.map((v) => (
            v !== 'home' && (
              <button key={v} className={'nav-btn' + (view === v ? ' active' : '')} onClick={() => go(v)}>
                {t.nav[v]}
              </button>
            )
          ))}
        </div>
      </nav>

      <main className="main">
        {view === 'home' && <HomeView t={t} go={go} dossier={dossier} />}
        {view === 'checklist' && (
          <ChecklistView t={t} checked={checked} toggleItem={toggleItem}
            done={done} total={total} pct={pct} resetChecklist={resetChecklist} />
        )}
        {view === 'dossier' && (
          <DossierView t={t} lang={lang} dossier={dossier} setDossier={setDossier} />
        )}
        {view === 'timeline' && <TimelineView t={t} />}
        {view === 'scams' && <ScamsView t={t} />}
        {view === 'resources' && <ResourcesView t={t} />}
        {view === 'money' && <MoneyView t={t} lang={lang} />}
        {view === 'housing' && <HousingView t={t} />}
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="footer-name">{t.brand}</span>
            <span className="footer-tag">{t.tagline}</span>
          </div>
          <nav className="footer-nav" aria-label="Sections">
            {VIEWS.map((v) => (
              v !== 'home' && <button key={v} onClick={() => go(v)}>{t.nav[v]}</button>
            ))}
          </nav>
          <p className="disc">{t.footer.disclaimer}</p>
          <div className="sig">{t.footer.signature}</div>
        </div>
      </footer>

      {sosOpen && <EmergencyOverlay t={t} onClose={() => setSosOpen(false)} />}
    </>
  );
}

function PageHead({ index, title, sub }) {
  return (
    <div className="page-head">
      <span className="page-index">{String(index + 1).padStart(2, '0')}</span>
      <h1 className="section-title">{title}</h1>
      <p className="section-sub">{sub}</p>
    </div>
  );
}

function HomeView({ t, go, dossier }) {
  const docsDone = t.dossier.docs.filter((d) => (dossier.docs[d.id] || {}).status === 'done').length;
  const stats = [
    { n: t.checklist.sections.reduce((a, s) => a + s.items.length, 0), label: t.nav.checklist },
    { n: `${docsDone}/${t.dossier.docs.length}`, label: t.nav.dossier },
    { n: t.resources.groups.reduce((a, g) => a + g.items.length, 0), label: t.nav.resources },
    { n: t.scams.items.length, label: t.nav.scams },
  ];
  return (
    <>
      <div className="hero">
        <p className="kicker">{t.tagline}</p>
        <h1>{t.home.title}</h1>
        <p className="lede">{t.home.intro}</p>
        <div className="cta-row">
          <button className="btn btn-primary" onClick={() => go('checklist')}>
            {t.home.cards[0].title} <span aria-hidden="true">→</span>
          </button>
          <button className="btn btn-ghost" onClick={() => go('timeline')}>
            {t.home.cards[1].title}
          </button>
        </div>
        <div className="stat-row">
          {stats.map((s) => (
            <div className="stat" key={s.label}>
              <span className="stat-num">{s.n}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card-grid">
        {t.home.cards.map((c, i) => (
          <button key={c.view} className="card" onClick={() => go(c.view)}>
            <span className="card-index">{String(i + 1).padStart(2, '0')}</span>
            <h3>{c.title}</h3>
            <p>{c.desc}</p>
            <span className="card-arrow" aria-hidden="true">→</span>
          </button>
        ))}
      </div>
      <p className="note">{t.home.note}</p>
    </>
  );
}

function ChecklistView({ t, checked, toggleItem, done, total, pct, resetChecklist }) {
  return (
    <>
      <PageHead index={PAGE_INDEX.checklist - 1} title={t.checklist.title} sub={t.checklist.subtitle} />

      <div className="progress-wrap">
        <div className="progress-label">
          <span>{t.checklist.progress(done, total)}</span>
          <span>{pct}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        {done > 0 && (
          <button className="reset-btn" onClick={resetChecklist}>{t.checklist.reset}</button>
        )}
      </div>

      {t.checklist.sections.map((s) => {
        const sDone = s.items.filter((i) => checked[i.id]).length;
        return (
          <div key={s.id} className="check-section">
            <h2>{s.title} <span className="check-count">{sDone}/{s.items.length}</span></h2>
            {s.items.map((item) => (
              <label key={item.id} className={'check-item' + (checked[item.id] ? ' done' : '')}>
                <input
                  type="checkbox"
                  checked={!!checked[item.id]}
                  onChange={() => toggleItem(item.id)}
                />
                <div>
                  <div className="t">{item.title}</div>
                  <div className="d">{item.desc}</div>
                </div>
              </label>
            ))}
          </div>
        );
      })}
    </>
  );
}

/* ================= Dossier: documents + deadlines ================= */

function CountdownChip({ t, dateStr }) {
  const n = daysUntil(dateStr);
  const text = n < 0 ? t.dossier.overdue(-n) : t.dossier.inDays(n);
  const cls = n < 0 ? 'chip overdue' : n <= 14 ? 'chip soon' : 'chip';
  return <span className={cls}>{text}</span>;
}

function DossierView({ t, lang, dossier, setDossier }) {
  const d = t.dossier;
  const [newLabel, setNewLabel] = useState('');
  const [newDate, setNewDate] = useState('');
  const [notifState, setNotifState] = useState('unknown'); // granted | denied | prompt | unsupported

  useEffect(() => {
    let alive = true;
    getNotifPermission().then((s) => { if (alive) setNotifState(s); });
    return () => { alive = false; };
  }, []);

  const ensurePermission = async () => {
    const cur = await getNotifPermission();
    if (cur === 'granted') { setNotifState('granted'); return true; }
    if (cur === 'denied' || cur === 'unsupported') { setNotifState(cur); return false; }
    const ok = await requestNotifPermission();
    const next = await getNotifPermission();
    setNotifState(next);
    return ok && next === 'granted';
  };

  const customRemind = (c) => c.remind !== false;
  const ramqRemind = dossier.ramqRemind !== false;

  const getDoc = (id) => ({ status: 'todo', date: '', note: '', ...(dossier.docs[id] || {}) });
  const setDoc = (id, patch) =>
    setDossier((prev) => ({
      ...prev,
      docs: { ...prev.docs, [id]: { ...getDoc(id), ...patch } },
    }));

  const doneCount = d.docs.filter((doc) => getDoc(doc.id).status === 'done').length;
  const totalDocs = d.docs.length;
  const docPct = totalDocs ? Math.round((doneCount / totalDocs) * 100) : 0;

  const ramqDateStr = dossier.arrivalDate ? toISODate(addMonths(parseDate(dossier.arrivalDate), 3)) : '';

  const sortedCustom = [...(dossier.custom || [])].sort((a, b) => a.date.localeCompare(b.date));

  const addCustom = () => {
    if (!newLabel.trim() || !newDate) return;
    setDossier((prev) => ({
      ...prev,
      custom: [...(prev.custom || []), { id: `c${Date.now()}`, label: newLabel.trim(), date: newDate, remind: true }],
    }));
    setNewLabel('');
    setNewDate('');
    // First deadline with reminders on → ask for permission (best-effort, never blocking)
    ensurePermission();
  };

  const removeCustom = (id) => {
    if (window.confirm(d.removeConfirm)) {
      setDossier((prev) => ({ ...prev, custom: (prev.custom || []).filter((c) => c.id !== id) }));
    }
  };

  const toggleCustomRemind = async (c) => {
    const on = customRemind(c);
    if (!on) {
      const ok = await ensurePermission();
      if (!ok) return; // stays off; status line explains why
    }
    setDossier((prev) => ({
      ...prev,
      custom: (prev.custom || []).map((x) => (x.id === c.id ? { ...x, remind: !on } : x)),
    }));
  };

  const toggleRamqRemind = async () => {
    if (!ramqRemind) {
      const ok = await ensurePermission();
      if (!ok) return;
    }
    setDossier((prev) => ({ ...prev, ramqRemind: !ramqRemind }));
  };

  /* Keep scheduled notifications in sync with deadlines (native) +
     fire due alerts while the page is open (web fallback). */
  const syncItems = useMemo(() => {
    const items = [];
    if (ramqDateStr && ramqRemind) items.push({ id: 'ramq', label: d.ramqTitle, date: ramqDateStr });
    for (const c of sortedCustom) {
      if (customRemind(c) && c.date) items.push({ id: c.id, label: c.label, date: c.date });
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ramqDateStr, ramqRemind, sortedCustom, d.ramqTitle]);

  const syncSig = useMemo(() => JSON.stringify({ lang, items: syncItems }), [lang, syncItems]);

  useEffect(() => {
    const { items } = JSON.parse(syncSig);
    const fmt = (s) => fmtLong(s, lang);
    syncDeadlineNotifications({ items, strings: d, fmtDate: fmt });
    const webItems = items.map((it) => ({ ...it, daysUntil: daysUntil(it.date) }));
    const runWeb = () => checkWebDueNotifications({ items: webItems, strings: d, fmtDate: fmt });
    runWeb();
    const onVis = () => { if (document.visibilityState === 'visible') runWeb(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncSig]);

  const statuses = [
    ['todo', d.statusTodo],
    ['progress', d.statusProgress],
    ['done', d.statusDone],
  ];

  return (
    <>
      <PageHead index={PAGE_INDEX.dossier - 1} title={d.title} sub={d.subtitle} />

      <div className="progress-wrap">
        <div className="progress-label">
          <span>{d.progress(doneCount, totalDocs)}</span>
          <span>{docPct}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${docPct}%` }} />
        </div>
      </div>

      <h2 className="subhead">{d.docsTitle}</h2>
      <p className="section-sub" style={{ marginBottom: 18 }}>{d.docsSub}</p>

      {d.docs.map((doc) => {
        const st = getDoc(doc.id);
        return (
          <div key={doc.id} className={'doc-card' + (st.status === 'done' ? ' done' : st.status === 'progress' ? ' progress' : '')}>
            <h3 className="doc-name">{doc.full}</h3>
            <p className="doc-desc">{doc.desc}</p>
            <div className="seg" role="group" aria-label={doc.full}>
              {statuses.map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  className={st.status === val ? `on-${val}` : ''}
                  onClick={() => setDoc(doc.id, { status: val })}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="doc-fields">
              <label className="field">
                {d.dateLabel}
                <input
                  type="date"
                  value={st.date}
                  onChange={(e) => setDoc(doc.id, { date: e.target.value })}
                />
              </label>
              <label className="field">
                {d.noteLabel}
                <input
                  type="text"
                  value={st.note}
                  placeholder={d.notePlaceholder}
                  onChange={(e) => setDoc(doc.id, { note: e.target.value })}
                />
              </label>
            </div>
            {doc.url ? (
              <div className="doc-where">
                <a className="res-link" href={doc.url} target="_blank" rel="noopener noreferrer">
                  {d.whereLabel} ↗
                </a>
              </div>
            ) : null}
          </div>
        );
      })}

      <div className="deadlines">
        <h2>{d.deadlinesTitle}</h2>
        <p>{d.deadlinesSub}</p>
        {notifState !== 'unknown' ? (
          <p className={'notif-status' + (notifState === 'denied' ? ' denied' : notifState === 'granted' ? ' on' : '')}>
            {notifState === 'granted' ? d.notifOn
              : notifState === 'denied' ? d.notifDenied
              : notifState === 'unsupported' ? d.notifUnsupported
              : `${d.notifPrompt} ${d.notifWhy}`}
          </p>
        ) : null}

        <label className="field" style={{ maxWidth: 320 }}>
          {d.arrivalLabel}
          <input
            type="date"
            value={dossier.arrivalDate || ''}
            onChange={(e) => setDossier((prev) => ({ ...prev, arrivalDate: e.target.value }))}
          />
        </label>

        {ramqDateStr ? (
          <div className="deadline-row computed">
            <div>
              <div className="dl-label">{d.ramqTitle}</div>
              <div className="dl-date">{fmtLong(ramqDateStr, lang)}</div>
              <p className="dl-note">{d.ramqNote}</p>
              <button type="button" role="switch" aria-checked={ramqRemind} className="remind" onClick={toggleRamqRemind}>
                <span className={'switch' + (ramqRemind ? ' on' : '')} aria-hidden="true"><span className="knob" /></span>
                <span>{d.remindLabel}</span>
              </button>
            </div>
            <CountdownChip t={t} dateStr={ramqDateStr} />
          </div>
        ) : null}

        <h3 className="subhead" style={{ marginTop: 28 }}>{d.customTitle}</h3>
        {sortedCustom.length === 0 && <p className="muted-line">{d.emptyCustom}</p>}
        {sortedCustom.map((c) => (
          <div key={c.id} className="deadline-row">
            <div>
              <div className="dl-label">{c.label}</div>
              <div className="dl-date">{fmtLong(c.date, lang)}</div>
              <button type="button" role="switch" aria-checked={customRemind(c)} className="remind" onClick={() => toggleCustomRemind(c)}>
                <span className={'switch' + (customRemind(c) ? ' on' : '')} aria-hidden="true"><span className="knob" /></span>
                <span>{d.remindLabel}</span>
              </button>
            </div>
            <div className="dl-side">
              <CountdownChip t={t} dateStr={c.date} />
              <button className="dl-del" onClick={() => removeCustom(c.id)} aria-label={c.label}>×</button>
            </div>
          </div>
        ))}

        <div className="add-row">
          <label className="field">
            <input
              type="text"
              placeholder={d.addPlaceholder}
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              aria-label={d.customTitle}
            />
          </label>
          <label className="field">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              aria-label={d.dateLabel}
            />
          </label>
          <button className="btn btn-primary btn-sm" onClick={addCustom}>{d.addButton}</button>
        </div>
      </div>
    </>
  );
}

function TimelineView({ t }) {
  return (
    <>
      <PageHead index={PAGE_INDEX.timeline - 1} title={t.timeline.title} sub={t.timeline.subtitle} />
      <div className="timeline">
      {t.timeline.phases.map((p, i) => (
        <div key={i} className="phase">
          <span className="phase-range">{p.range}</span>
          <h3>{p.title}</h3>
          <p>{p.desc}</p>
          <ul>
            {p.items.map((item, j) => <li key={j}>{item}</li>)}
          </ul>
        </div>
      ))}
      </div>
    </>
  );
}

function ScamsView({ t }) {
  return (
    <>
      <PageHead index={PAGE_INDEX.scams - 1} title={t.scams.title} sub={t.scams.subtitle} />
      {t.scams.items.map((s, i) => (
        <div key={i} className="scam">
          <h3>⚠️ {s.title}</h3>
          <p>{s.how}</p>
          <p><span className="lbl">{t.scams.redFlag} : </span>{s.flag}</p>
          <p><span className="ok-lbl">{t.scams.whatToDo} : </span><span className="ok">{s.action}</span></p>
        </div>
      ))}
    </>
  );
}

function ResourcesView({ t }) {
  return (
    <>
      <PageHead index={PAGE_INDEX.resources - 1} title={t.resources.title} sub={t.resources.subtitle} />
      {t.resources.groups.map((g, i) => (
        <div key={i} className="res-group">
          <h2>{g.name}</h2>
          {g.items.map((r, j) => (
            <div key={j} className="res-item">
              <div>
                <div className="n">{r.name}</div>
                <div className="d">{r.desc}</div>
              </div>
              <a className="res-link" href={r.url} target="_blank" rel="noopener noreferrer">
                {t.resources.visit} ↗
              </a>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

/* ================= Money: live FX comparator ================= */

function CompareSection({ t, lang }) {
  const c = t.money.compare;
  const [amount, setAmount] = useState('500');
  const [cur, setCur] = useState('USD');
  const [fx, setFx] = useState(null); // { rates, updated, cached } | { error: true }

  useEffect(() => {
    let alive = true;
    const cached = loadFxCache();
    const apply = (rates, updated, isCached) => {
      if (alive) setFx({ rates, updated, cached: isCached });
    };
    fetch('https://open.er-api.com/v6/latest/USD')
      .then((r) => { if (!r.ok) throw new Error('fx'); return r.json(); })
      .then((d) => {
        if (d.result !== 'success' || !d.rates || !d.rates.CAD) throw new Error('fx');
        saveFxCache(d.rates, d.time_last_update_utc);
        apply(d.rates, d.time_last_update_utc, false);
      })
      .catch(() =>
        fetch('https://api.frankfurter.app/latest?from=USD')
          .then((r) => r.json())
          .then((d) => {
            if (!d.rates || !d.rates.CAD) throw new Error('fx');
            saveFxCache(d.rates, d.date);
            apply(d.rates, d.date, false);
          })
          .catch(() => {
            if (cached) apply(cached.rates, cached.date, true);
            else if (alive) setFx({ error: true });
          })
      );
    return () => { alive = false; };
  }, []);

  const amt = parseFloat(String(amount).replace(',', '.'));
  const rateToCAD = fx && fx.rates && fx.rates[cur] ? fx.rates.CAD / fx.rates[cur] : null;
  const fmtCAD = (v) => new Intl.NumberFormat(lang === 'fr' ? 'fr-CA' : 'en-CA', {
    style: 'currency', currency: 'CAD', maximumFractionDigits: 2,
  }).format(v);

  const allPartners = t.money.sections.flatMap((s) => s.partners || []);
  const provInfo = (p) => {
    if (p.slot === 'money-bank') return { name: c.bankName, url: '', badge: '' };
    const found = allPartners.find((x) => x.slot === p.slot) || {};
    return { name: found.name || p.slot, url: found.url || '', badge: t.money.partnerBadge };
  };

  const fmtUpdated = (u) => {
    try {
      return new Date(u).toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', {
        day: 'numeric', month: 'long', year: 'numeric',
      });
    } catch { return u; }
  };

  return (
    <section className="fx-box" aria-label={c.title}>
      <h2>{c.title}</h2>
      <p>{c.subtitle}</p>

      <div className="fx-controls">
        <label className="field">
          {c.amountLabel}
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="field">
          {c.fromLabel}
          <select value={cur} onChange={(e) => setCur(e.target.value)}>
            {c.currencies.map((cc) => (
              <option key={cc.code} value={cc.code}>{cc.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="fx-rate">
        {rateToCAD ? (
          <>
            <span>{c.liveRateLabel} :</span>
            <strong>1 {cur} = {rateToCAD.toFixed(4)} CAD</strong>
            {fx.cached
              ? <span className="fx-stale">{c.cachedNote}</span>
              : <span className="fx-updated">{c.updatedOn(fmtUpdated(fx.updated))}</span>}
          </>
        ) : (
          <span className="fx-stale">{fx && fx.error ? c.offline : c.noRate}</span>
        )}
      </div>

      {rateToCAD && amt > 0 ? c.providers.map((p) => {
        const info = provInfo(p);
        const received = amt * rateToCAD * (1 - p.fee);
        return (
          <div key={p.slot} className="fx-prov" data-affiliate-slot={p.slot === 'money-bank' ? undefined : p.slot}>
            <div>
              <span className="fx-prov-name">
                {info.name}
                {info.badge ? <span className="partner-badge">{info.badge}</span> : null}
              </span>
              <span className="fx-fee">{p.feeNote}</span>
              {info.url ? (
                <a className="fx-check" href={info.url} target="_blank" rel="noopener noreferrer sponsored">
                  {c.checkLive} ↗
                </a>
              ) : (
                <span className="fx-fee">{c.bankNote}</span>
              )}
            </div>
            <div className="fx-amount">
              <span className="recv-label">{c.youReceive}</span>
              <span className="recv">{fmtCAD(received)}</span>
            </div>
          </div>
        );
      }) : null}

      <p className="fx-disclaimer">{c.disclaimer}</p>
    </section>
  );
}

function MoneyView({ t, lang }) {
  return (
    <>
      <PageHead index={PAGE_INDEX.money - 1} title={t.money.title} sub={t.money.subtitle} />
      <CompareSection t={t} lang={lang} />
      {t.money.sections.map((s, i) => (
        <div key={i} className="guide-section">
          <h2>{s.title}</h2>
          {s.body && <p>{s.body}</p>}
          {s.list && (
            <ul>{s.list.map((li, j) => <li key={j}>{li}</li>)}</ul>
          )}
          {s.partners && s.partners.map((p) => (
            <div key={p.slot} className="partner-card" data-affiliate-slot={p.slot}>
              <div>
                <span className="partner-badge">{t.money.partnerBadge}</span>
                <div className="n">{p.name}</div>
                <div className="d">{p.desc}</div>
              </div>
              <a className="res-link" href={p.url} target="_blank" rel="noopener noreferrer sponsored">
                {t.resources.visit} ↗
              </a>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

function HousingView({ t }) {
  return (
    <>
      <PageHead index={PAGE_INDEX.housing - 1} title={t.housing.title} sub={t.housing.subtitle} />
      {t.housing.sections.map((s, i) => (
        <div key={i} className="guide-section">
          <h2>{s.title}</h2>
          {s.body && <p>{s.body}</p>}
          {s.list && (
            <ul>{s.list.map((li, j) => <li key={j}>{li}</li>)}</ul>
          )}
        </div>
      ))}
    </>
  );
}

/* ================= Emergency overlay ================= */

const CONTACT_KEY = 'bienvenue-emergency-contact';

function loadContact() {
  try {
    const raw = localStorage.getItem(CONTACT_KEY);
    const c = raw ? JSON.parse(raw) : null;
    if (c && typeof c === 'object') {
      return { name: String(c.name || ''), phone: String(c.phone || '') };
    }
  } catch {
    /* ignore */
  }
  return { name: '', phone: '' };
}

function LocationShare({ s, notPolice }) {
  const [status, setStatus] = useState('idle'); // idle | locating | ready | error
  const [pos, setPos] = useState(null);
  const [errKey, setErrKey] = useState(null);
  const [contact, setContact] = useState(loadContact);
  const [editing, setEditing] = useState(!loadContact().phone);
  const [draftName, setDraftName] = useState(contact.name);
  const [draftPhone, setDraftPhone] = useState(contact.phone);
  const [savedTick, setSavedTick] = useState(false);

  const find = async () => {
    setStatus('locating');
    setErrKey(null);
    try {
      const p = await getPosition();
      setPos(p);
      setStatus('ready');
    } catch (err) {
      setErrKey(err && err.message === 'denied' ? 'denied' : err && err.message === 'timeout' ? 'timeout' : 'error');
      setStatus('error');
    }
  };

  const saveContact = () => {
    const c = { name: draftName.trim(), phone: draftPhone.trim() };
    try {
      localStorage.setItem(CONTACT_KEY, JSON.stringify(c));
    } catch {
      /* ignore */
    }
    setContact(c);
    setEditing(false);
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 2500);
  };

  const deleteContact = () => {
    try {
      localStorage.removeItem(CONTACT_KEY);
    } catch {
      /* ignore */
    }
    setContact({ name: '', phone: '' });
    setDraftName('');
    setDraftPhone('');
    setEditing(true);
  };

  const link = pos ? mapsLink(pos.lat, pos.lng) : '';
  const text = pos ? s.shareText.replace('{link}', link) : '';
  const phone = cleanPhone(contact.phone);
  const smsHref = smsUri(phone || '', text);
  const waHref = whatsappUri(text);

  return (
    <section className="sos-share" aria-label={s.kicker}>
      <p className="sos-notpolice">{notPolice}</p>
      <p className="kicker">{s.kicker}</p>
      <h3>{s.title}</h3>
      <p className="sos-sub">{s.desc}</p>

      {status === 'idle' || status === 'locating' || status === 'error' ? (
        <button className="share-find" onClick={find} disabled={status === 'locating'}>
          {status === 'locating' ? s.locating : s.findBtn}
        </button>
      ) : null}
      {status === 'error' && (
        <p className="share-err" role="alert">
          {errKey === 'denied' ? s.locDenied : errKey === 'timeout' ? s.locTimeout : s.locError}
        </p>
      )}

      {status === 'ready' && pos && (
        <div className="share-ready">
          <p className="share-coords">
            <span className="lbl">{s.yourPos} : </span>
            {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
          </p>
          <a className="share-maps" href={link} target="_blank" rel="noopener noreferrer">
            {s.openMaps} ↗
          </a>
          <div className="share-btns">
            <a className="share-btn sms" href={smsHref}>{s.smsBtn}</a>
            <a className="share-btn wa" href={waHref} target="_blank" rel="noopener noreferrer">{s.waBtn}</a>
          </div>
        </div>
      )}

      <div className="share-contact">
        <h4>{s.contactTitle}</h4>
        <p className="sos-sub">{s.contactDesc}</p>
        {editing ? (
          <div className="share-form">
            <label className="field">
              {s.nameLabel}
              <input
                type="text"
                value={draftName}
                onChange={(ev) => setDraftName(ev.target.value)}
                placeholder={s.namePh}
                autoComplete="off"
              />
            </label>
            <label className="field">
              {s.phoneLabel}
              <input
                type="tel"
                value={draftPhone}
                onChange={(ev) => setDraftPhone(ev.target.value)}
                placeholder={s.phonePh}
                autoComplete="off"
              />
            </label>
            <button className="share-save" onClick={saveContact}>{s.saveBtn}</button>
          </div>
        ) : (
          <div className="share-contact-saved">
            <div>
              <strong>{contact.name || phone}</strong>
              {contact.name && phone ? <span className="sos-sub"> · {phone}</span> : null}
            </div>
            <div className="share-contact-actions">
              <button onClick={() => { setDraftName(contact.name); setDraftPhone(contact.phone); setEditing(true); }}>
                {s.editBtn}
              </button>
              <button onClick={deleteContact}>{s.deleteBtn}</button>
            </div>
          </div>
        )}
        {savedTick && <p className="share-saved">{s.savedMsg}</p>}
      </div>

      <p className="share-privacy">{s.privacy}</p>
    </section>
  );
}

function EmergencyOverlay({ t, onClose }) {
  const e = t.emergency;
  useEffect(() => {
    const onKey = (ev) => { if (ev.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="sos-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={e.title}>
      <div className="sos-panel" onClick={(ev) => ev.stopPropagation()}>
        <div className="sos-head">
          <div>
            <p className="kicker">{e.button}</p>
            <h2>{e.title}</h2>
            <p className="sos-sub">{e.subtitle}</p>
          </div>
          <button className="sos-close" onClick={onClose} aria-label={e.close}>×</button>
        </div>
        {e.numbers.map((n) => (
          <a key={n.id} className="sos-item" href={`tel:${n.tel}`}>
            <span className="sos-num">{n.display}</span>
            <span className="sos-meta">
              <span className="sos-name">{n.name}</span>
              <span className="sos-desc">{n.desc}</span>
            </span>
            <span className="sos-call">{e.call} →</span>
          </a>
        ))}
        <LocationShare s={e.share} notPolice={e.notPolice} />
        <p className="sos-note">{e.note}</p>
      </div>
    </div>
  );
}
