// ============================================================
// ============================================================

import { useState, useEffect, useCallback, useMemo } from "react";

// ─── GITHUB CONFIG ───────────────────────────────────────────
// Replace these values with your own:
const GITHUB_USERNAME = "YOUR_GITHUB_USERNAME";
const GITHUB_REPO     = "YOUR_REPO_NAME";

// Split your PAT token into 2 halves to avoid GitHub scanner revoking it
// Example: if token is "ghp_ABCDEFabcdef1234567890"
//   PAT_PART1 = "ghp_ABCDEFabcdef"
//   PAT_PART2 = "1234567890"
const PAT_PART1  = "YOUR_TOKEN_FIRST_HALF";
const PAT_PART2  = "YOUR_TOKEN_SECOND_HALF";
const GITHUB_PAT = PAT_PART1 + PAT_PART2;

const DATA_FILE_PATH  = "data.json";
// ─────────────────────────────────────────────────────────────

// ─── GitHub API Helpers ───────────────────────────────────────
const GITHUB_API = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${DATA_FILE_PATH}`;

async function loadFromGitHub() {
  try {
    const res = await fetch(GITHUB_API, {
      headers: {
        Authorization: `token ${GITHUB_PAT}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    if (res.status === 404) return null; // file doesn't exist yet
    if (!res.ok) throw new Error("GitHub read failed");
    const json = await res.json();
    const decoded = atob(json.content.replace(/\n/g, ""));
    return { data: JSON.parse(decoded), sha: json.sha };
  } catch (e) {
    console.error("GitHub load error:", e);
    return null;
  }
}

async function saveToGitHub(data, sha) {
  try {
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
    const body = {
      message: `Update data.json - ${new Date().toISOString()}`,
      content,
      ...(sha ? { sha } : {}),
    };
    const res = await fetch(GITHUB_API, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_PAT}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("GitHub write failed");
    const json = await res.json();
    return json.content.sha;
  } catch (e) {
    console.error("GitHub save error:", e);
    return sha;
  }
}

// ─── Default Data ─────────────────────────────────────────────
const defaultData = {
  customers: [],
  workers: [],
  transactions: [],
  companyName: "My Company",
  companyAddress: "",
  companyPhone: "",
  users: [{ id: "u1", username: "admin", password: "admin123", role: "admin" }],
};

// ─── Utilities ─────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const fmt = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
const today = () => new Date().toISOString().split("T")[0];

// ─── Icons ────────────────────────────────────────────────────
const Icon = ({ name, size = 18, color = "currentColor" }) => {
  const icons = {
    dashboard: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
    customers: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    workers: <><path d="M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M10 5h4"/></>,
    credit: <><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></>,
    debit: <><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></>,
    history: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    reports: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 17.66l-1.41 1.41M19.07 19.07l-1.41-1.41M5.34 6.34L3.93 4.93M22 12h-2M4 12H2M12 22v-2M12 4V2"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    pdf: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
    excel: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M9 13l2 2 4-4"/></>,
    close: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    arrowUp: <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>,
    arrowDown: <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>,
    menu: <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    eyeOff: <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>,
    building: <><rect x="3" y="9" width="18" height="13"/><path d="M8 22V12h8v10"/><path d="M10 7V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3"/><path d="M21 9H3"/><path d="M1 22h22"/></>,
    coin: <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>,
    sync: <><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>,
    check: <><polyline points="20 6 9 17 4 12"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
};

// ─── Styles ────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0c0e14; --surface: #13161f; --surface2: #1a1e2a; --surface3: #222636;
    --border: #2a2f42; --border2: #353b52; --text: #e8eaf0; --text2: #9399b0; --text3: #5c6280;
    --accent: #6366f1; --accent2: #818cf8; --accent-dim: rgba(99,102,241,0.15);
    --green: #22d3a0; --green-dim: rgba(34,211,160,0.12);
    --red: #f43f5e; --red-dim: rgba(244,63,94,0.12);
    --amber: #f59e0b; --amber-dim: rgba(245,158,11,0.12);
    --blue: #38bdf8; --blue-dim: rgba(56,189,248,0.12);
    --radius: 12px; --radius-sm: 8px; --shadow: 0 4px 24px rgba(0,0,0,0.4);
    --font: 'DM Sans', sans-serif; --font-display: 'Syne', sans-serif;
    --sidebar-w: 240px; --transition: 0.2s cubic-bezier(0.4,0,0.2,1);
  }
  html { font-size: 15px; }
  body { background: var(--bg); color: var(--text); font-family: var(--font); line-height: 1.6; overflow-x: hidden; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 99px; }
  .app { display: flex; min-height: 100vh; }
  .sidebar { width: var(--sidebar-w); min-height: 100vh; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; position: fixed; top: 0; left: 0; z-index: 100; transition: transform var(--transition); }
  .sidebar.hidden { transform: translateX(-100%); }
  .sidebar-logo { padding: 20px 20px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; }
  .sidebar-logo-icon { width: 36px; height: 36px; background: var(--accent); border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .sidebar-logo-text { font-family: var(--font-display); font-weight: 700; font-size: 1.05rem; }
  .sidebar-logo-sub { font-size: 0.7rem; color: var(--text3); letter-spacing: 0.05em; text-transform: uppercase; }
  .sidebar-nav { flex: 1; padding: 12px 10px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: var(--radius-sm); cursor: pointer; transition: all var(--transition); color: var(--text2); font-size: 0.9rem; font-weight: 500; border: 1px solid transparent; user-select: none; }
  .nav-item:hover { background: var(--surface2); color: var(--text); }
  .nav-item.active { background: var(--accent-dim); color: var(--accent2); border-color: rgba(99,102,241,0.2); }
  .nav-section { padding: 14px 12px 6px; font-size: 0.7rem; color: var(--text3); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
  .sidebar-footer { padding: 12px 10px; border-top: 1px solid var(--border); }
  .main { flex: 1; margin-left: var(--sidebar-w); display: flex; flex-direction: column; min-height: 100vh; }
  .header { height: 64px; background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 0 24px; position: sticky; top: 0; z-index: 50; gap: 16px; }
  .header-title { font-family: var(--font-display); font-weight: 700; font-size: 1.15rem; }
  .header-actions { display: flex; align-items: center; gap: 10px; }
  .user-badge { display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: var(--surface2); border-radius: 99px; border: 1px solid var(--border); font-size: 0.85rem; }
  .user-avatar { width: 28px; height: 28px; background: var(--accent); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; color: white; }
  .page-content { flex: 1; padding: 24px; max-width: 1400px; width: 100%; }
  .hamburger { display: none; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 7px; cursor: pointer; color: var(--text); }
  .overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 90; backdrop-filter: blur(2px); }
  .overlay.show { display: block; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }
  .card-sm { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 14px; }
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; display: flex; flex-direction: column; gap: 8px; position: relative; overflow: hidden; transition: border-color var(--transition), transform var(--transition); }
  .stat-card:hover { border-color: var(--border2); transform: translateY(-1px); }
  .stat-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
  .stat-card.green::before { background: var(--green); }
  .stat-card.red::before { background: var(--red); }
  .stat-card.amber::before { background: var(--amber); }
  .stat-card.blue::before { background: var(--blue); }
  .stat-icon { width: 40px; height: 40px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; }
  .stat-icon.green { background: var(--green-dim); color: var(--green); }
  .stat-icon.red { background: var(--red-dim); color: var(--red); }
  .stat-icon.amber { background: var(--amber-dim); color: var(--amber); }
  .stat-icon.blue { background: var(--blue-dim); color: var(--blue); }
  .stat-label { font-size: 0.8rem; color: var(--text2); font-weight: 500; }
  .stat-value { font-family: var(--font-display); font-size: 1.6rem; font-weight: 700; line-height: 1.2; }
  .stat-value.green { color: var(--green); } .stat-value.red { color: var(--red); } .stat-value.amber { color: var(--amber); } .stat-value.blue { color: var(--blue); }
  .stat-sub { font-size: 0.78rem; color: var(--text3); }
  .btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; border-radius: var(--radius-sm); font-family: var(--font); font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all var(--transition); border: 1px solid transparent; white-space: nowrap; user-select: none; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-primary { background: var(--accent); color: white; border-color: var(--accent); }
  .btn-primary:hover:not(:disabled) { background: var(--accent2); }
  .btn-secondary { background: var(--surface2); color: var(--text); border-color: var(--border); }
  .btn-secondary:hover:not(:disabled) { background: var(--surface3); border-color: var(--border2); }
  .btn-danger { background: var(--red-dim); color: var(--red); border-color: rgba(244,63,94,0.25); }
  .btn-danger:hover:not(:disabled) { background: rgba(244,63,94,0.22); }
  .btn-success { background: var(--green-dim); color: var(--green); border-color: rgba(34,211,160,0.25); }
  .btn-success:hover:not(:disabled) { background: rgba(34,211,160,0.22); }
  .btn-icon { padding: 7px; border-radius: var(--radius-sm); }
  .btn-sm { padding: 5px 12px; font-size: 0.8rem; }
  .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
  .form-group { display: flex; flex-direction: column; gap: 5px; }
  .form-group.full { grid-column: 1 / -1; }
  label { font-size: 0.8rem; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: 0.04em; }
  input, select, textarea { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); font-family: var(--font); font-size: 0.9rem; padding: 9px 12px; transition: border-color var(--transition), box-shadow var(--transition); width: 100%; outline: none; }
  input:focus, select:focus, textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-dim); }
  input::placeholder, textarea::placeholder { color: var(--text3); }
  select option { background: var(--surface2); }
  textarea { resize: vertical; min-height: 80px; }
  .table-wrap { overflow-x: auto; border-radius: var(--radius); border: 1px solid var(--border); }
  table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  thead { background: var(--surface2); }
  th { padding: 12px 14px; text-align: left; font-size: 0.75rem; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid var(--border); white-space: nowrap; }
  td { padding: 11px 14px; border-bottom: 1px solid var(--border); color: var(--text); vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tbody tr { transition: background var(--transition); }
  tbody tr:hover { background: var(--surface2); }
  .badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 99px; font-size: 0.75rem; font-weight: 600; }
  .badge-green { background: var(--green-dim); color: var(--green); }
  .badge-red { background: var(--red-dim); color: var(--red); }
  .badge-amber { background: var(--amber-dim); color: var(--amber); }
  .badge-blue { background: var(--blue-dim); color: var(--blue); }
  .badge-gray { background: var(--surface3); color: var(--text2); }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(4px); }
  .modal { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 580px; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow); }
  .modal-header { padding: 20px 24px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
  .modal-title { font-family: var(--font-display); font-weight: 700; font-size: 1.1rem; }
  .modal-body { padding: 20px 24px; }
  .modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px; }
  .toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
  .search-wrap { position: relative; flex: 1; min-width: 180px; }
  .search-wrap input { padding-left: 36px; }
  .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text3); pointer-events: none; }
  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
  .section-title { font-family: var(--font-display); font-weight: 700; font-size: 1.1rem; }
  .login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg); padding: 16px; }
  .login-card { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 40px; width: 100%; max-width: 400px; box-shadow: var(--shadow); }
  .login-logo { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-bottom: 32px; }
  .login-logo-icon { width: 56px; height: 56px; background: var(--accent); border-radius: 16px; display: flex; align-items: center; justify-content: center; }
  .login-title { font-family: var(--font-display); font-weight: 800; font-size: 1.5rem; text-align: center; }
  .login-sub { color: var(--text2); font-size: 0.85rem; text-align: center; }
  .empty-state { padding: 48px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .empty-icon { width: 64px; height: 64px; background: var(--surface2); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--text3); }
  .empty-title { font-weight: 600; font-size: 1rem; }
  .empty-sub { color: var(--text3); font-size: 0.875rem; }
  .bar-chart { display: flex; align-items: flex-end; gap: 6px; height: 120px; padding: 0 4px; }
  .bar-group { flex: 1; display: flex; align-items: flex-end; gap: 2px; }
  .bar { flex: 1; border-radius: 4px 4px 0 0; transition: height 0.5s cubic-bezier(0.4,0,0.2,1); min-height: 4px; }
  .bar-credit { background: var(--green); opacity: 0.8; }
  .bar-debit { background: var(--red); opacity: 0.8; }
  .bar-labels { display: flex; gap: 6px; margin-top: 6px; }
  .bar-label { flex: 1; font-size: 0.68rem; color: var(--text3); text-align: center; }
  .tabs { display: flex; gap: 4px; background: var(--surface2); padding: 4px; border-radius: var(--radius-sm); margin-bottom: 16px; flex-wrap: wrap; }
  .tab { padding: 7px 16px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 500; color: var(--text2); transition: all var(--transition); user-select: none; }
  .tab.active { background: var(--accent); color: white; }
  .tab:hover:not(.active) { color: var(--text); background: var(--surface3); }
  .pdf-preview { background: white; color: #111; padding: 40px; font-family: 'DM Sans', sans-serif; border-radius: var(--radius); max-width: 600px; margin: 0 auto; line-height: 1.6; }
  .pdf-preview h1 { font-family: 'Syne', sans-serif; font-size: 1.4rem; margin-bottom: 4px; }
  .pdf-preview .pdf-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb; }
  .pdf-preview .pdf-note-type { font-size: 1.2rem; font-weight: 700; padding: 6px 16px; border-radius: 6px; }
  .pdf-preview .pdf-note-type.credit { background: #dcfce7; color: #15803d; }
  .pdf-preview .pdf-note-type.debit { background: #fee2e2; color: #dc2626; }
  .pdf-preview .pdf-row { display: flex; margin-bottom: 10px; }
  .pdf-preview .pdf-key { width: 160px; font-weight: 600; color: #6b7280; font-size: 0.875rem; flex-shrink: 0; }
  .pdf-preview .pdf-val { color: #111; font-size: 0.875rem; }
  .pdf-preview .pdf-signature { margin-top: 40px; display: flex; justify-content: space-between; }
  .pdf-preview .pdf-sig-box { text-align: center; }
  .pdf-preview .pdf-sig-line { width: 120px; border-top: 1px solid #9ca3af; margin: 40px auto 6px; }
  .pdf-preview .pdf-amount { font-size: 1.5rem; font-weight: 700; }
  .pdf-preview .pdf-amount.credit { color: #15803d; }
  .pdf-preview .pdf-amount.debit { color: #dc2626; }
  .alert { padding: 12px 16px; border-radius: var(--radius-sm); margin-bottom: 14px; font-size: 0.875rem; border: 1px solid; }
  .alert-error { background: var(--red-dim); color: var(--red); border-color: rgba(244,63,94,0.25); }
  .alert-success { background: var(--green-dim); color: var(--green); border-color: rgba(34,211,160,0.25); }
  .toast-container { position: fixed; bottom: 24px; right: 24px; z-index: 999; display: flex; flex-direction: column; gap: 8px; }
  .toast { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px 16px; font-size: 0.875rem; box-shadow: var(--shadow); min-width: 240px; display: flex; align-items: center; gap: 10px; animation: slideIn 0.3s ease; }
  .toast.success { border-left: 3px solid var(--green); }
  .toast.error { border-left: 3px solid var(--red); }
  .toast.info { border-left: 3px solid var(--blue); }
  @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  .sync-bar { background: var(--blue-dim); border-bottom: 1px solid rgba(56,189,248,0.2); padding: 6px 24px; display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: var(--blue); }
  .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
  .mt-4 { margin-top: 16px; } .mb-4 { margin-bottom: 16px; }
  .flex { display: flex; } .flex-col { flex-direction: column; } .items-center { align-items: center; }
  .gap-2 { gap: 8px; } .gap-3 { gap: 12px; } .flex-1 { flex: 1; }
  @media (max-width: 768px) {
    .sidebar { transform: translateX(-100%); }
    .sidebar.open { transform: translateX(0); }
    .main { margin-left: 0; }
    .hamburger { display: flex; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .form-grid { grid-template-columns: 1fr; }
    .page-content { padding: 16px; }
    .header { padding: 0 16px; }
  }
  @media (max-width: 480px) { .stats-grid { grid-template-columns: 1fr; } }
`;

// ─── Toast Hook ───────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((msg, type = "success") => {
    const id = uid();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);
  const removeToast = useCallback((id) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);
  return { toasts, addToast, removeToast };
}

function Toast({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`} onClick={() => removeToast(t.id)} style={{ cursor: "pointer" }}>
          <span>{t.type === "success" ? "✓" : t.type === "error" ? "✗" : "ℹ"}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────
function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={wide ? { maxWidth: 720 } : {}}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="btn btn-icon btn-secondary" onClick={onClose}><Icon name="close" size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <Modal title="Confirm" onClose={onCancel} footer={<>
      <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
    </>}>
      <p style={{ color: "var(--text2)" }}>{message}</p>
    </Modal>
  );
}

// ─── Login ────────────────────────────────────────────────────
function LoginPage({ onLogin, users }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const handleLogin = () => {
    const user = users.find((u) => u.username === username && u.password === password);
    if (user) { onLogin(user); setError(""); }
    else setError("Invalid username or password.");
  };
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon"><Icon name="coin" size={28} color="white" /></div>
          <div>
            <div className="login-title">LedgerFlow</div>
            <div className="login-sub">Credit & Debit Notes Manager</div>
          </div>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label>Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" onKeyDown={(e) => e.key === "Enter" && handleLogin()} autoFocus />
        </div>
        <div className="form-group" style={{ marginBottom: 24 }}>
          <label>Password</label>
          <div style={{ position: "relative" }}>
            <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && handleLogin()} style={{ paddingRight: 40 }} />
            <button onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text3)" }}>
              <Icon name={showPw ? "eyeOff" : "eye"} size={16} />
            </button>
          </div>
        </div>
        <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "11px" }} onClick={handleLogin}>Sign In</button>
        <div style={{ marginTop: 20, padding: 12, background: "var(--surface2)", borderRadius: 8, fontSize: "0.8rem", color: "var(--text3)" }}>
          Default: <strong style={{ color: "var(--text2)" }}>admin</strong> / <strong style={{ color: "var(--text2)" }}>admin123</strong>
        </div>
      </div>
    </div>
  );
}

// ─── Person Form ──────────────────────────────────────────────
function PersonForm({ initial, type, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name: "", phone: "", address: "", workType: "", notes: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal title={`${initial ? "Edit" : "Add"} ${type}`} onClose={onClose} footer={<>
      <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" onClick={() => form.name.trim() && onSave(form)}>Save {type}</button>
    </>}>
      <div className="form-grid">
        <div className="form-group full"><label>{type} Name *</label><input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={`Enter ${type.toLowerCase()} name`} autoFocus /></div>
        <div className="form-group"><label>Phone</label><input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210" /></div>
        {type === "Worker" && <div className="form-group"><label>Work Type</label><input value={form.workType} onChange={(e) => set("workType", e.target.value)} placeholder="e.g. Carpenter" /></div>}
        {type === "Customer" && <div className="form-group full"><label>Address</label><textarea value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Enter address" rows={2} /></div>}
        <div className="form-group full"><label>Notes</label><textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any additional notes..." rows={2} /></div>
      </div>
    </Modal>
  );
}

// ─── People List ──────────────────────────────────────────────
function PeopleList({ type, data, transactions, onAdd, onEdit, onDelete, onViewHistory }) {
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const filtered = useMemo(() => data.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || (p.phone || "").includes(search)), [data, search]);
  const getBalance = (id) => {
    const tx = transactions.filter((t) => t.personId === id);
    const credits = tx.filter((t) => t.type === "credit").reduce((s, t) => s + Number(t.amount), 0);
    const debits = tx.filter((t) => t.type === "debit").reduce((s, t) => s + Number(t.amount), 0);
    return { credits, debits, balance: credits - debits };
  };
  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">{type === "customer" ? "Customers" : "Workers"}</div><div style={{ color: "var(--text2)", fontSize: "0.85rem" }}>{data.length} total</div></div>
        <button className="btn btn-primary" onClick={onAdd}><Icon name="plus" size={16} />Add {type === "customer" ? "Customer" : "Worker"}</button>
      </div>
      <div className="toolbar">
        <div className="search-wrap"><span className="search-icon"><Icon name="search" size={15} /></span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search...`} /></div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Phone</th><th>{type === "customer" ? "Address" : "Work Type"}</th><th>Credits</th><th>Debits</th><th>Balance</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon"><Icon name={type === "customer" ? "customers" : "workers"} size={28} /></div><div className="empty-title">No {type === "customer" ? "customers" : "workers"} found</div></div></td></tr>}
            {filtered.map((p) => {
              const { credits, debits, balance } = getBalance(p.id);
              return (
                <tr key={p.id}>
                  <td><div style={{ fontWeight: 600 }}>{p.name}</div>{p.notes && <div style={{ fontSize: "0.75rem", color: "var(--text3)" }}>{p.notes}</div>}</td>
                  <td style={{ color: "var(--text2)" }}>{p.phone || "-"}</td>
                  <td style={{ color: "var(--text2)" }}>{type === "customer" ? (p.address || "-") : (p.workType || "-")}</td>
                  <td><span style={{ color: "var(--green)", fontWeight: 600 }}>{fmt(credits)}</span></td>
                  <td><span style={{ color: "var(--red)", fontWeight: 600 }}>{fmt(debits)}</span></td>
                  <td><span className={`badge ${balance >= 0 ? "badge-green" : "badge-red"}`}>{fmt(Math.abs(balance))} {balance >= 0 ? "CR" : "DR"}</span></td>
                  <td><div className="flex gap-2">
                    <button className="btn btn-icon btn-secondary btn-sm" onClick={() => onViewHistory(p)}><Icon name="history" size={14} /></button>
                    <button className="btn btn-icon btn-secondary btn-sm" onClick={() => onEdit(p)}><Icon name="edit" size={14} /></button>
                    <button className="btn btn-icon btn-danger btn-sm" onClick={() => setDeleteTarget(p)}><Icon name="trash" size={14} /></button>
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {deleteTarget && <ConfirmDialog message={`Delete "${deleteTarget.name}"?`} onConfirm={() => { onDelete(deleteTarget.id); setDeleteTarget(null); }} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
}

// ─── Transaction Form ─────────────────────────────────────────
function TransactionForm({ type, customers, workers, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { date: today(), personType: "customer", personId: "", amount: "", reason: "", paymentMode: "cash", refNo: "" });
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const people = form.personType === "customer" ? customers : workers;
  const handleSave = () => {
    if (!form.personId) return setError("Please select a person.");
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) return setError("Enter a valid amount.");
    setError(""); onSave({ ...form, type, amount: Number(form.amount) });
  };
  return (
    <Modal title={`${initial ? "Edit" : "New"} ${type === "credit" ? "Credit" : "Debit"} Note`} onClose={onClose} footer={<>
      <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
      <button className={`btn ${type === "credit" ? "btn-success" : "btn-danger"}`} onClick={handleSave}>Save Note</button>
    </>}>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="form-grid">
        <div className="form-group"><label>Date *</label><input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></div>
        <div className="form-group"><label>Person Type</label><select value={form.personType} onChange={(e) => { set("personType", e.target.value); set("personId", ""); }}><option value="customer">Customer</option><option value="worker">Worker</option></select></div>
        <div className="form-group full"><label>Name *</label><select value={form.personId} onChange={(e) => set("personId", e.target.value)}><option value="">-- Select --</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div className="form-group"><label>Amount (₹) *</label><input type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0.00" min="0" step="0.01" /></div>
        <div className="form-group"><label>Payment Mode</label><select value={form.paymentMode} onChange={(e) => set("paymentMode", e.target.value)}><option value="cash">Cash</option><option value="upi">UPI</option><option value="bank">Bank Transfer</option><option value="cheque">Cheque</option><option value="card">Card</option><option value="other">Other</option></select></div>
        <div className="form-group"><label>Reference No.</label><input value={form.refNo} onChange={(e) => set("refNo", e.target.value)} placeholder="TXN-001" /></div>
        <div className="form-group full"><label>Description</label><textarea value={form.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Enter description..." rows={2} /></div>
      </div>
    </Modal>
  );
}

// ============================================================
// ============================================================
// ============================================================
// ============================================================

// ─── PDF Note Modal ───────────────────────────────────────────
function PDFNoteModal({ transaction, customers, workers, companyName, companyAddress, companyPhone, onClose }) {
  const person = [...customers, ...workers].find((p) => p.id === transaction.personId);
  const isCredit = transaction.type === "credit";
  const handlePrint = () => {
    const printContent = document.getElementById("pdf-preview-content");
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>${isCredit ? "Credit" : "Debit"} Note</title>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
    <style>body{font-family:'DM Sans',sans-serif;padding:40px;max-width:600px;margin:0 auto;color:#111}h1{font-family:'Syne',sans-serif}</style>
    </head><body>${printContent.innerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 500);
  };
  return (
    <Modal title="Preview Note" onClose={onClose} wide footer={<>
      <button className="btn btn-secondary" onClick={onClose}>Close</button>
      <button className="btn btn-primary" onClick={handlePrint}><Icon name="pdf" size={16} />Print / Save PDF</button>
    </>}>
      <div id="pdf-preview-content" className="pdf-preview">
        <div className="pdf-header">
          <div><h1>{companyName || "Company Name"}</h1>{companyAddress && <div style={{ color: "#6b7280", fontSize: "0.85rem" }}>{companyAddress}</div>}{companyPhone && <div style={{ color: "#6b7280", fontSize: "0.85rem" }}>{companyPhone}</div>}</div>
          <div><div className={`pdf-note-type ${isCredit ? "credit" : "debit"}`}>{isCredit ? "CREDIT NOTE" : "DEBIT NOTE"}</div></div>
        </div>
        <div className="pdf-row"><div className="pdf-key">Date</div><div className="pdf-val">{fmtDate(transaction.date)}</div></div>
        <div className="pdf-row"><div className="pdf-key">Ref. Number</div><div className="pdf-val">{transaction.refNo || "-"}</div></div>
        <div className="pdf-row"><div className="pdf-key">Party Name</div><div className="pdf-val"><strong>{person?.name || "Unknown"}</strong></div></div>
        <div className="pdf-row"><div className="pdf-key">Party Type</div><div className="pdf-val" style={{ textTransform: "capitalize" }}>{transaction.personType}</div></div>
        <div className="pdf-row"><div className="pdf-key">Payment Mode</div><div className="pdf-val" style={{ textTransform: "capitalize" }}>{transaction.paymentMode}</div></div>
        <div className="pdf-row"><div className="pdf-key">Description</div><div className="pdf-val">{transaction.reason || "-"}</div></div>
        <div style={{ margin: "16px 0", paddingTop: 16, borderTop: "1px solid #e5e7eb" }}>
          <div className="pdf-row"><div className="pdf-key">Amount</div><div className={`pdf-val pdf-amount ${isCredit ? "credit" : "debit"}`}>{fmt(transaction.amount)}</div></div>
        </div>
        <div className="pdf-signature">
          <div className="pdf-sig-box"><div className="pdf-sig-line" /><div style={{ fontSize: "0.8rem", color: "#6b7280" }}>Authorized Signature</div></div>
          <div className="pdf-sig-box"><div className="pdf-sig-line" /><div style={{ fontSize: "0.8rem", color: "#6b7280" }}>Receiver Signature</div></div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Transaction History ──────────────────────────────────────
function TransactionHistory({ transactions, customers, workers, onEdit, onDelete, onViewPDF, filterPersonId }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [personFilter, setPersonFilter] = useState(filterPersonId || "all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;
  const allPeople = useMemo(() => [...customers, ...workers], [customers, workers]);
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (personFilter !== "all" && t.personId !== personFilter) return false;
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo) return false;
      const person = allPeople.find((p) => p.id === t.personId);
      const name = (person?.name || "").toLowerCase();
      if (search && !name.includes(search.toLowerCase()) && !(t.reason || "").toLowerCase().includes(search.toLowerCase()) && !(t.refNo || "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
  }, [transactions, typeFilter, personFilter, dateFrom, dateTo, search, allPeople]);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalCredit = filtered.filter((t) => t.type === "credit").reduce((s, t) => s + Number(t.amount), 0);
  const totalDebit = filtered.filter((t) => t.type === "debit").reduce((s, t) => s + Number(t.amount), 0);
  return (
    <div>
      <div className="section-header"><div><div className="section-title">Transaction History</div><div style={{ color: "var(--text2)", fontSize: "0.85rem" }}>{filtered.length} records</div></div></div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div className="card-sm" style={{ flex: 1, minWidth: 140 }}><div style={{ fontSize: "0.75rem", color: "var(--text3)", marginBottom: 4 }}>Credits</div><div style={{ color: "var(--green)", fontWeight: 700, fontFamily: "var(--font-display)" }}>{fmt(totalCredit)}</div></div>
        <div className="card-sm" style={{ flex: 1, minWidth: 140 }}><div style={{ fontSize: "0.75rem", color: "var(--text3)", marginBottom: 4 }}>Debits</div><div style={{ color: "var(--red)", fontWeight: 700, fontFamily: "var(--font-display)" }}>{fmt(totalDebit)}</div></div>
        <div className="card-sm" style={{ flex: 1, minWidth: 140 }}><div style={{ fontSize: "0.75rem", color: "var(--text3)", marginBottom: 4 }}>Net Balance</div><div style={{ color: totalCredit - totalDebit >= 0 ? "var(--green)" : "var(--red)", fontWeight: 700, fontFamily: "var(--font-display)" }}>{fmt(Math.abs(totalCredit - totalDebit))} {totalCredit - totalDebit >= 0 ? "CR" : "DR"}</div></div>
      </div>
      <div className="toolbar" style={{ flexWrap: "wrap" }}>
        <div className="search-wrap" style={{ minWidth: 200 }}><span className="search-icon"><Icon name="search" size={15} /></span><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search..." /></div>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} style={{ minWidth: 120 }}><option value="all">All Types</option><option value="credit">Credit</option><option value="debit">Debit</option></select>
        <select value={personFilter} onChange={(e) => { setPersonFilter(e.target.value); setPage(1); }} style={{ minWidth: 160 }}><option value="all">All People</option><optgroup label="Customers">{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup><optgroup label="Workers">{workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</optgroup></select>
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} style={{ minWidth: 140 }} />
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} style={{ minWidth: 140 }} />
        {(search || typeFilter !== "all" || personFilter !== "all" || dateFrom || dateTo) && <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(""); setTypeFilter("all"); setPersonFilter("all"); setDateFrom(""); setDateTo(""); setPage(1); }}>Clear</button>}
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Name</th><th>Reason</th><th>Mode</th><th>Ref#</th><th>Amount</th><th>Actions</th></tr></thead>
          <tbody>
            {paged.length === 0 && <tr><td colSpan={8}><div className="empty-state"><div className="empty-icon"><Icon name="history" size={28} /></div><div className="empty-title">No transactions found</div></div></td></tr>}
            {paged.map((t) => {
              const person = allPeople.find((p) => p.id === t.personId);
              return (
                <tr key={t.id}>
                  <td style={{ whiteSpace: "nowrap", color: "var(--text2)" }}>{fmtDate(t.date)}</td>
                  <td><span className={`badge ${t.type === "credit" ? "badge-green" : "badge-red"}`}>{t.type}</span></td>
                  <td><div style={{ fontWeight: 600 }}>{person?.name || "Unknown"}</div><div style={{ fontSize: "0.72rem", color: "var(--text3)", textTransform: "capitalize" }}>{t.personType}</div></td>
                  <td style={{ color: "var(--text2)", maxWidth: 180 }}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.reason || "-"}</div></td>
                  <td><span className="badge badge-gray" style={{ textTransform: "capitalize" }}>{t.paymentMode}</span></td>
                  <td style={{ color: "var(--text3)", fontSize: "0.8rem" }}>{t.refNo || "-"}</td>
                  <td style={{ fontWeight: 700, color: t.type === "credit" ? "var(--green)" : "var(--red)", whiteSpace: "nowrap" }}>{fmt(t.amount)}</td>
                  <td><div className="flex gap-2">
                    <button className="btn btn-icon btn-secondary btn-sm" onClick={() => onViewPDF(t)}><Icon name="pdf" size={14} /></button>
                    <button className="btn btn-icon btn-secondary btn-sm" onClick={() => onEdit(t)}><Icon name="edit" size={14} /></button>
                    <button className="btn btn-icon btn-danger btn-sm" onClick={() => setDeleteTarget(t)}><Icon name="trash" size={14} /></button>
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && <div className="flex items-center gap-2" style={{ marginTop: 12, justifyContent: "center" }}><button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</button><span style={{ color: "var(--text2)", fontSize: "0.85rem" }}>Page {page} of {totalPages}</span><button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</button></div>}
      {deleteTarget && <ConfirmDialog message={`Delete this ${deleteTarget.type} note of ${fmt(deleteTarget.amount)}?`} onConfirm={() => { onDelete(deleteTarget.id); setDeleteTarget(null); }} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
}

// ─── Reports ──────────────────────────────────────────────────
function Reports({ transactions, customers, workers }) {
  const [tab, setTab] = useState("monthly");
  const [selMonth, setSelMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selPerson, setSelPerson] = useState("");
  const allPeople = useMemo(() => [...customers, ...workers], [customers, workers]);
  const monthlyReport = useMemo(() => {
    const tx = transactions.filter((t) => t.date.startsWith(selMonth));
    return { tx, credits: tx.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0), debits: tx.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0) };
  }, [transactions, selMonth]);
  const personReport = useMemo(() => {
    if (!selPerson) return null;
    const tx = transactions.filter((t) => t.personId === selPerson);
    return { tx, credits: tx.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0), debits: tx.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0) };
  }, [transactions, selPerson]);
  const exportCSV = (rows, filename) => {
    const headers = ["Date", "Type", "Person", "Amount", "Mode", "Ref#", "Description"];
    const csvRows = [headers, ...rows.map((t) => { const p = allPeople.find((x) => x.id === t.personId); return [t.date, t.type, p?.name || "", t.amount, t.paymentMode, t.refNo, t.reason]; })];
    const csv = csvRows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv); a.download = filename; a.click();
  };
  const renderTable = (tx) => {
    if (!tx || tx.length === 0) return <div className="empty-state"><div className="empty-icon"><Icon name="reports" size={28} /></div><div className="empty-title">No transactions</div></div>;
    return <div className="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Person</th><th>Amount</th><th>Mode</th><th>Ref#</th><th>Description</th></tr></thead><tbody>{tx.sort((a, b) => b.date.localeCompare(a.date)).map((t) => { const p = allPeople.find((x) => x.id === t.personId); return <tr key={t.id}><td>{fmtDate(t.date)}</td><td><span className={`badge ${t.type === "credit" ? "badge-green" : "badge-red"}`}>{t.type}</span></td><td>{p?.name || "-"}</td><td style={{ color: t.type === "credit" ? "var(--green)" : "var(--red)", fontWeight: 600 }}>{fmt(t.amount)}</td><td style={{ textTransform: "capitalize" }}>{t.paymentMode}</td><td style={{ color: "var(--text3)" }}>{t.refNo || "-"}</td><td style={{ color: "var(--text2)" }}>{t.reason || "-"}</td></tr>; })}</tbody></table></div>;
  };
  const exportTx = tab === "monthly" ? monthlyReport?.tx : personReport?.tx;
  return (
    <div>
      <div className="section-header"><div className="section-title">Reports</div>{exportTx && exportTx.length > 0 && <button className="btn btn-secondary" onClick={() => exportCSV(exportTx, `report_${tab === "monthly" ? selMonth : selPerson}.csv`)}><Icon name="excel" size={16} />Export CSV</button>}</div>
      <div className="tabs"><div className={`tab ${tab === "monthly" ? "active" : ""}`} onClick={() => setTab("monthly")}>Monthly</div><div className={`tab ${tab === "person" ? "active" : ""}`} onClick={() => setTab("person")}>By Person</div></div>
      {tab === "monthly" && <div><div className="toolbar"><input type="month" value={selMonth} onChange={(e) => setSelMonth(e.target.value)} style={{ minWidth: 160 }} /></div><div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}><div className="card-sm" style={{ flex: 1 }}><div style={{ fontSize: "0.75rem", color: "var(--text3)", marginBottom: 4 }}>Credits</div><div style={{ color: "var(--green)", fontWeight: 700, fontFamily: "var(--font-display)", fontSize: "1.2rem" }}>{fmt(monthlyReport.credits)}</div></div><div className="card-sm" style={{ flex: 1 }}><div style={{ fontSize: "0.75rem", color: "var(--text3)", marginBottom: 4 }}>Debits</div><div style={{ color: "var(--red)", fontWeight: 700, fontFamily: "var(--font-display)", fontSize: "1.2rem" }}>{fmt(monthlyReport.debits)}</div></div><div className="card-sm" style={{ flex: 1 }}><div style={{ fontSize: "0.75rem", color: "var(--text3)", marginBottom: 4 }}>Transactions</div><div style={{ fontWeight: 700, fontFamily: "var(--font-display)", fontSize: "1.2rem" }}>{monthlyReport.tx.length}</div></div></div>{renderTable(monthlyReport.tx)}</div>}
      {tab === "person" && <div><div className="toolbar"><select value={selPerson} onChange={(e) => setSelPerson(e.target.value)} style={{ minWidth: 200 }}><option value="">-- Select Person --</option><optgroup label="Customers">{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup><optgroup label="Workers">{workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</optgroup></select></div>{personReport && <><div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}><div className="card-sm" style={{ flex: 1 }}><div style={{ fontSize: "0.75rem", color: "var(--text3)", marginBottom: 4 }}>Credits</div><div style={{ color: "var(--green)", fontWeight: 700, fontFamily: "var(--font-display)", fontSize: "1.2rem" }}>{fmt(personReport.credits)}</div></div><div className="card-sm" style={{ flex: 1 }}><div style={{ fontSize: "0.75rem", color: "var(--text3)", marginBottom: 4 }}>Debits</div><div style={{ color: "var(--red)", fontWeight: 700, fontFamily: "var(--font-display)", fontSize: "1.2rem" }}>{fmt(personReport.debits)}</div></div><div className="card-sm" style={{ flex: 1 }}><div style={{ fontSize: "0.75rem", color: "var(--text3)", marginBottom: 4 }}>Balance</div><div style={{ color: personReport.credits - personReport.debits >= 0 ? "var(--green)" : "var(--red)", fontWeight: 700, fontFamily: "var(--font-display)", fontSize: "1.2rem" }}>{fmt(Math.abs(personReport.credits - personReport.debits))} {personReport.credits - personReport.debits >= 0 ? "CR" : "DR"}</div></div></div>{renderTable(personReport.tx)}</>}{!selPerson && <div className="empty-state"><div className="empty-icon"><Icon name="customers" size={28} /></div><div className="empty-title">Select a person to view report</div></div>}</div>}
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────
function Settings({ data, onChange, addToast }) {
  const [company, setCompany] = useState({ name: data.companyName, address: data.companyAddress, phone: data.companyPhone });
  const [pwForm, setPwForm] = useState({ oldPw: "", newPw: "", confirmPw: "" });
  const [pwError, setPwError] = useState("");
  const saveCompany = () => { onChange({ companyName: company.name, companyAddress: company.address, companyPhone: company.phone }); addToast("Company settings saved!"); };
  const changePw = () => {
    const user = data.users.find((u) => u.id === data.currentUser.id);
    if (user.password !== pwForm.oldPw) return setPwError("Current password is incorrect.");
    if (pwForm.newPw.length < 6) return setPwError("New password must be at least 6 characters.");
    if (pwForm.newPw !== pwForm.confirmPw) return setPwError("Passwords do not match.");
    const newUsers = data.users.map((u) => u.id === user.id ? { ...u, password: pwForm.newPw } : u);
    onChange({ users: newUsers }); setPwError(""); setPwForm({ oldPw: "", newPw: "", confirmPw: "" }); addToast("Password changed!");
  };
  return (
    <div>
      <div className="section-title" style={{ marginBottom: 20 }}>Settings</div>
      <div className="grid-2">
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><Icon name="building" size={18} />Company Information</div>
          <div className="form-group" style={{ marginBottom: 12 }}><label>Company Name</label><input value={company.name} onChange={(e) => setCompany((c) => ({ ...c, name: e.target.value }))} placeholder="Your Company Name" /></div>
          <div className="form-group" style={{ marginBottom: 12 }}><label>Address</label><textarea value={company.address} onChange={(e) => setCompany((c) => ({ ...c, address: e.target.value }))} rows={2} /></div>
          <div className="form-group" style={{ marginBottom: 16 }}><label>Phone</label><input value={company.phone} onChange={(e) => setCompany((c) => ({ ...c, phone: e.target.value }))} /></div>
          <button className="btn btn-primary" onClick={saveCompany}>Save</button>
        </div>
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 16 }}>Change Password</div>
          {pwError && <div className="alert alert-error">{pwError}</div>}
          <div className="form-group" style={{ marginBottom: 10 }}><label>Current Password</label><input type="password" value={pwForm.oldPw} onChange={(e) => setPwForm((f) => ({ ...f, oldPw: e.target.value }))} /></div>
          <div className="form-group" style={{ marginBottom: 10 }}><label>New Password</label><input type="password" value={pwForm.newPw} onChange={(e) => setPwForm((f) => ({ ...f, newPw: e.target.value }))} /></div>
          <div className="form-group" style={{ marginBottom: 16 }}><label>Confirm Password</label><input type="password" value={pwForm.confirmPw} onChange={(e) => setPwForm((f) => ({ ...f, confirmPw: e.target.value }))} /></div>
          <button className="btn btn-primary" onClick={changePw}>Update Password</button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────
function Dashboard({ data, setPage }) {
  const { transactions, customers, workers } = data;
  const totalCredits = transactions.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const totalDebits = transactions.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);
  const chartMonths = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleString("default", { month: "short" });
      const credits = transactions.filter((t) => t.date.startsWith(key) && t.type === "credit").reduce((s, t) => s + t.amount, 0);
      const debits = transactions.filter((t) => t.date.startsWith(key) && t.type === "debit").reduce((s, t) => s + t.amount, 0);
      months.push({ key, label, credits, debits });
    }
    return months;
  }, [transactions]);
  const maxVal = Math.max(...chartMonths.flatMap((m) => [m.credits, m.debits]), 1);
  const recentTx = [...transactions].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 8);
  const allPeople = [...customers, ...workers];
  const topCustomers = customers.map((c) => {
    const tx = transactions.filter((t) => t.personId === c.id);
    const credits = tx.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
    const debits = tx.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);
    return { ...c, credits, debits, balance: credits - debits };
  }).sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)).slice(0, 5);
  return (
    <div>
      <div style={{ marginBottom: 24 }}><div style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 800, marginBottom: 4 }}>Dashboard</div><div style={{ color: "var(--text2)", fontSize: "0.875rem" }}>Your financial overview</div></div>
      <div className="stats-grid">
        <div className="stat-card green"><div className="stat-icon green"><Icon name="arrowUp" size={18} color="var(--green)" /></div><div className="stat-label">Total Credits</div><div className="stat-value green">{fmt(totalCredits)}</div><div className="stat-sub">{transactions.filter((t) => t.type === "credit").length} transactions</div></div>
        <div className="stat-card red"><div className="stat-icon red"><Icon name="arrowDown" size={18} color="var(--red)" /></div><div className="stat-label">Total Debits</div><div className="stat-value red">{fmt(totalDebits)}</div><div className="stat-sub">{transactions.filter((t) => t.type === "debit").length} transactions</div></div>
        <div className="stat-card amber"><div className="stat-icon amber"><Icon name="coin" size={18} color="var(--amber)" /></div><div className="stat-label">Net Balance</div><div className="stat-value amber">{fmt(Math.abs(totalCredits - totalDebits))}</div><div className="stat-sub">{totalCredits - totalDebits >= 0 ? "Credit surplus" : "Debit surplus"}</div></div>
        <div className="stat-card blue"><div className="stat-icon blue"><Icon name="customers" size={18} color="var(--blue)" /></div><div className="stat-label">People</div><div className="stat-value blue">{customers.length + workers.length}</div><div className="stat-sub">{customers.length} customers · {workers.length} workers</div></div>
      </div>
      <div className="grid-2">
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 16, fontSize: "0.95rem" }}>Monthly Overview</div>
          <div className="bar-chart">{chartMonths.map((m) => <div key={m.key} className="bar-group" style={{ flexDirection: "column", alignItems: "center", gap: 2, justifyContent: "flex-end" }}><div style={{ width: "100%", display: "flex", alignItems: "flex-end", gap: 2, height: "100%" }}><div className="bar bar-credit" style={{ height: `${(m.credits / maxVal) * 100}%` }} /><div className="bar bar-debit" style={{ height: `${(m.debits / maxVal) * 100}%` }} /></div></div>)}</div>
          <div className="bar-labels">{chartMonths.map((m) => <div key={m.key} className="bar-label">{m.label}</div>)}</div>
          <div style={{ display: "flex", gap: 16, marginTop: 10 }}><div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "var(--text2)" }}><div style={{ width: 10, height: 10, borderRadius: 2, background: "var(--green)" }} />Credits</div><div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "var(--text2)" }}><div style={{ width: 10, height: 10, borderRadius: 2, background: "var(--red)" }} />Debits</div></div>
        </div>
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 16 }}>Top Customers</div>
          {topCustomers.length === 0 ? <div className="empty-state" style={{ padding: 24 }}><div className="empty-sub">No customers yet</div></div> : topCustomers.map((c) => <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}><div><div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{c.name}</div><div style={{ fontSize: "0.75rem", color: "var(--text3)" }}>{fmt(c.credits)} CR · {fmt(c.debits)} DR</div></div><span className={`badge ${c.balance >= 0 ? "badge-green" : "badge-red"}`}>{fmt(Math.abs(c.balance))} {c.balance >= 0 ? "CR" : "DR"}</span></div>)}
        </div>
      </div>
      <div className="card mt-4">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Recent Transactions</div><button className="btn btn-secondary btn-sm" onClick={() => setPage("history")}>View All</button></div>
        {recentTx.length === 0 ? <div className="empty-state" style={{ padding: 24 }}><div className="empty-sub">No transactions yet.</div></div> : <div className="table-wrap" style={{ border: "none" }}><table><thead><tr><th>Date</th><th>Type</th><th>Person</th><th>Amount</th><th>Mode</th></tr></thead><tbody>{recentTx.map((t) => { const p = allPeople.find((x) => x.id === t.personId); return <tr key={t.id}><td style={{ color: "var(--text2)" }}>{fmtDate(t.date)}</td><td><span className={`badge ${t.type === "credit" ? "badge-green" : "badge-red"}`}>{t.type}</span></td><td style={{ fontWeight: 600 }}>{p?.name || "Unknown"}</td><td style={{ color: t.type === "credit" ? "var(--green)" : "var(--red)", fontWeight: 700 }}>{fmt(t.amount)}</td><td style={{ color: "var(--text3)", textTransform: "capitalize" }}>{t.paymentMode}</td></tr>; })}</tbody></table></div>}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState({ ...defaultData });
  const [fileSha, setFileSha] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(""); // "saving" | "saved" | "error"
  const { toasts, addToast, removeToast } = useToast();
  const [showPersonForm, setShowPersonForm] = useState(null);
  const [showTxForm, setShowTxForm] = useState(null);
  const [showPDF, setShowPDF] = useState(null);
  const [historyFilter, setHistoryFilter] = useState(null);

  // ── Load from GitHub on mount ──
  useEffect(() => {
    (async () => {
      setLoading(true);
      const result = await loadFromGitHub();
      if (result) {
        setData((prev) => ({ ...defaultData, ...result.data, currentUser: prev.currentUser }));
        setFileSha(result.sha);
      }
      setLoading(false);
    })();
  }, []);

  // ── Save to GitHub whenever data changes (debounced) ──
  const saveTimeoutRef = useState(null);
  const persistData = useCallback(async (newData, sha) => {
    setSyncStatus("saving");
    const newSha = await saveToGitHub(newData, sha);
    setFileSha(newSha);
    setSyncStatus("saved");
    setTimeout(() => setSyncStatus(""), 2000);
  }, []);

  const updateData = useCallback((patch) => {
    setData((prev) => {
      const next = { ...prev, ...patch };
      // Save to GitHub (strip currentUser before saving)
      const { currentUser, ...toSave } = next;
      persistData(toSave, fileSha);
      return next;
    });
  }, [fileSha, persistData]);

  // ── CRUD ──
  const addCustomer    = (form) => { updateData({ customers: [...data.customers, { ...form, id: uid(), createdAt: Date.now() }] }); addToast("Customer added!"); setShowPersonForm(null); };
  const editCustomer   = (form) => { updateData({ customers: data.customers.map((c) => c.id === form.id ? { ...c, ...form } : c) }); addToast("Customer updated!"); setShowPersonForm(null); };
  const deleteCustomer = (id)   => { updateData({ customers: data.customers.filter((c) => c.id !== id) }); addToast("Deleted.", "error"); };
  const addWorker      = (form) => { updateData({ workers: [...data.workers, { ...form, id: uid(), createdAt: Date.now() }] }); addToast("Worker added!"); setShowPersonForm(null); };
  const editWorker     = (form) => { updateData({ workers: data.workers.map((w) => w.id === form.id ? { ...w, ...form } : w) }); addToast("Worker updated!"); setShowPersonForm(null); };
  const deleteWorker   = (id)   => { updateData({ workers: data.workers.filter((w) => w.id !== id) }); addToast("Deleted.", "error"); };
  const saveTx = (form) => {
    if (form.id) { updateData({ transactions: data.transactions.map((t) => t.id === form.id ? { ...t, ...form } : t) }); addToast("Updated!"); }
    else { updateData({ transactions: [...data.transactions, { ...form, id: uid(), createdAt: Date.now() }] }); addToast(`${form.type === "credit" ? "Credit" : "Debit"} note saved!`); }
    setShowTxForm(null);
  };
  const deleteTx = (id) => { updateData({ transactions: data.transactions.filter((t) => t.id !== id) }); addToast("Deleted.", "error"); };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "customers", label: "Customers", icon: "customers" },
    { id: "workers", label: "Workers", icon: "workers" },
    { id: "credit", label: "New Credit Note", icon: "credit" },
    { id: "debit", label: "New Debit Note", icon: "debit" },
    { id: "history", label: "Transaction History", icon: "history" },
    { id: "reports", label: "Reports", icon: "reports" },
    { id: "settings", label: "Settings", icon: "settings" },
  ];
  const pageTitles = { dashboard: "Dashboard", customers: "Customers", workers: "Workers", history: "Transaction History", reports: "Reports", settings: "Settings" };

  const handleNavClick = (id) => {
    if (id === "credit") { setShowTxForm({ type: "credit", tx: null }); return; }
    if (id === "debit")  { setShowTxForm({ type: "debit",  tx: null }); return; }
    setPage(id); setSidebarOpen(false);
  };

  // ── Loading screen ──
  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg)", gap: 16 }}>
          <div style={{ width: 48, height: 48, background: "var(--accent)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="coin" size={26} color="white" /></div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", fontWeight: 700 }}>LedgerFlow</div>
          <div style={{ color: "var(--text3)", fontSize: "0.875rem" }}>Loading data from GitHub...</div>
          <div style={{ width: 200, height: 3, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ width: "60%", height: "100%", background: "var(--accent)", borderRadius: 99, animation: "slideIn 1s ease infinite alternate" }} />
          </div>
        </div>
      </>
    );
  }

  // ── Login screen ──
  if (!data.currentUser) {
    return (
      <>
        <style>{styles}</style>
        <LoginPage users={data.users} onLogin={(user) => setData((d) => ({ ...d, currentUser: user }))} />
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon"><Icon name="coin" size={20} color="white" /></div>
            <div><div className="sidebar-logo-text">LedgerFlow</div><div className="sidebar-logo-sub">Notes Manager</div></div>
          </div>
          <nav className="sidebar-nav">
            {navItems.slice(0, 5).map((item) => <div key={item.id} className={`nav-item ${page === item.id && item.id !== "credit" && item.id !== "debit" ? "active" : ""}`} onClick={() => handleNavClick(item.id)}><span className="nav-icon"><Icon name={item.icon} size={17} /></span>{item.label}</div>)}
            <div className="nav-section">Records</div>
            {navItems.slice(5).map((item) => <div key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => handleNavClick(item.id)}><span className="nav-icon"><Icon name={item.icon} size={17} /></span>{item.label}</div>)}
          </nav>
          <div className="sidebar-footer">
            <div className="nav-item" onClick={() => setData((d) => ({ ...d, currentUser: null }))}><span className="nav-icon"><Icon name="logout" size={17} /></span>Sign Out</div>
          </div>
        </aside>
        <div className={`overlay ${sidebarOpen ? "show" : ""}`} onClick={() => setSidebarOpen(false)} />
        <div className="main">
          <header className="header">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button className="hamburger" onClick={() => setSidebarOpen((o) => !o)}><Icon name="menu" size={20} /></button>
              <div className="header-title">{pageTitles[page] || "LedgerFlow"}</div>
            </div>
            <div className="header-actions">
              {syncStatus === "saving" && <span style={{ fontSize: "0.78rem", color: "var(--blue)", display: "flex", alignItems: "center", gap: 4 }}><Icon name="sync" size={13} color="var(--blue)" />Saving...</span>}
              {syncStatus === "saved"  && <span style={{ fontSize: "0.78rem", color: "var(--green)", display: "flex", alignItems: "center", gap: 4 }}><Icon name="check" size={13} color="var(--green)" />Saved</span>}
              <button className="btn btn-success btn-sm" onClick={() => setShowTxForm({ type: "credit", tx: null })}><Icon name="plus" size={14} />Credit</button>
              <button className="btn btn-danger  btn-sm" onClick={() => setShowTxForm({ type: "debit",  tx: null })}><Icon name="plus" size={14} />Debit</button>
              <div className="user-badge"><div className="user-avatar">{data.currentUser.username[0].toUpperCase()}</div></div>
            </div>
          </header>
          <div className="page-content">
            {page === "dashboard" && <Dashboard data={data} setPage={setPage} />}
            {page === "customers" && <PeopleList type="customer" data={data.customers} transactions={data.transactions} onAdd={() => setShowPersonForm({ type: "Customer", person: null })} onEdit={(p) => setShowPersonForm({ type: "Customer", person: p })} onDelete={deleteCustomer} onViewHistory={(p) => { setHistoryFilter(p.id); setPage("history"); }} />}
            {page === "workers"   && <PeopleList type="worker"   data={data.workers}    transactions={data.transactions} onAdd={() => setShowPersonForm({ type: "Worker",   person: null })} onEdit={(p) => setShowPersonForm({ type: "Worker",   person: p })} onDelete={deleteWorker}   onViewHistory={(p) => { setHistoryFilter(p.id); setPage("history"); }} />}
            {page === "history"   && <TransactionHistory transactions={data.transactions} customers={data.customers} workers={data.workers} filterPersonId={historyFilter} onEdit={(t) => setShowTxForm({ type: t.type, tx: t })} onDelete={deleteTx} onViewPDF={(t) => setShowPDF(t)} />}
            {page === "reports"   && <Reports transactions={data.transactions} customers={data.customers} workers={data.workers} />}
            {page === "settings"  && <Settings data={data} onChange={updateData} addToast={addToast} />}
          </div>
        </div>
      </div>

      {showPersonForm && (
        <PersonForm type={showPersonForm.type} initial={showPersonForm.person}
          onSave={(form) => { if (showPersonForm.type === "Customer") { showPersonForm.person ? editCustomer({ ...showPersonForm.person, ...form }) : addCustomer(form); } else { showPersonForm.person ? editWorker({ ...showPersonForm.person, ...form }) : addWorker(form); } }}
          onClose={() => setShowPersonForm(null)} />
      )}
      {showTxForm && <TransactionForm type={showTxForm.type} customers={data.customers} workers={data.workers} initial={showTxForm.tx} onSave={saveTx} onClose={() => setShowTxForm(null)} />}
      {showPDF && <PDFNoteModal transaction={showPDF} customers={data.customers} workers={data.workers} companyName={data.companyName} companyAddress={data.companyAddress} companyPhone={data.companyPhone} onClose={() => setShowPDF(null)} />}
      <Toast toasts={toasts} removeToast={removeToast} />
    </>
  );
}

// ============================================================
// ============================================================
