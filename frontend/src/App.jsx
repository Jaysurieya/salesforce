import { useState, useRef, useEffect, useCallback } from 'react'

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────────────────── */
const AVAILABLE_MODELS = [
  { id: 'gpt-oss:120b',     label: 'GPT-OSS 120B' },
  { id: 'gemma3:27b',       label: 'Gemma 3 27B'  },
  { id: 'qwen3.5:397b',     label: 'Qwen 3.5 397B'},
  { id: 'mistral-large-3:675b', label: 'Mistral Large 3' },
  { id: 'deepseek-v3.1:671b', label: 'DeepSeek v3.1 671B' },
];
const DEFAULT_MODEL = AVAILABLE_MODELS[0].id;

const CAPABILITIES = [
  { icon: '👤', text: 'Fetch contacts, accounts, leads, opportunities & cases' },
  { icon: '✏️',  text: 'Create and update Salesforce records instantly'          },
  { icon: '📊', text: 'Analyze and summarize your CRM data'                     },
  { icon: '🔍', text: 'Search across your entire Salesforce org'                },
];

const QUICK_ACTIONS = [
  { label: 'Show All Contacts',        icon: '👥' },
  { label: 'List Open Opportunities',  icon: '💰' },
  { label: 'Fetch All Accounts',       icon: '🏢' },
  { label: 'Show New Leads',           icon: '🎯' },
  { label: 'List High Priority Cases', icon: '🎫' },
  { label: 'Create New Contact',       icon: '➕' },
  { label: 'Create New Lead',          icon: '⚡' },
];

const TOOL_LABELS = {
  getAccountRecords:     '🏢 Fetched Accounts',
  getContactRecords:     '👤 Fetched Contacts',
  getOpportunityRecords: '💰 Fetched Opportunities',
  getLeadRecords:        '🎯 Fetched Leads',
  getCaseRecords:        '🎫 Fetched Cases',
  createRecord:          '✅ Created Record',
  updateRecord:          '✏️  Updated Record',
};

/* ─────────────────────────────────────────────────────────────────────────────
   LOCAL STORAGE
───────────────────────────────────────────────────────────────────────────── */
const HISTORY_KEY = 'sf_chat_sessions';

function loadSessions() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}
function saveSessions(s) { localStorage.setItem(HISTORY_KEY, JSON.stringify(s)); }
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function groupByDay(sessions) {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yest  = today - 86400000;
  const groups = { Today: [], Yesterday: [], Older: [] };
  sessions.forEach(s => {
    if (s.createdAt >= today)      groups.Today.push(s);
    else if (s.createdAt >= yest)  groups.Yesterday.push(s);
    else                           groups.Older.push(s);
  });
  return groups;
}

/* ─────────────────────────────────────────────────────────────────────────────
   MARKDOWN RENDERER
───────────────────────────────────────────────────────────────────────────── */
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const out = [];
  let buf = [];

  const flush = k => {
    if (!buf.length) return;
    out.push(
      <ul key={`ul-${k}`} className="my-2 pl-5 list-disc space-y-1">
        {buf.map((t, i) => <li key={i} className="leading-relaxed">{inline(t)}</li>)}
      </ul>
    );
    buf = [];
  };

  lines.forEach((line, i) => {
    const t = line.trim();
    if (/^#{1,3}\s+/.test(t)) {
      flush(i);
      out.push(<p key={i} className="font-semibold text-gray-800 my-2">{inline(t.replace(/^#{1,3}\s+/, ''))}</p>);
    } else if (/^[-*•]\s+/.test(t)) {
      buf.push(t.replace(/^[-*•]\s+/, ''));
    } else {
      flush(i);
      if (t) out.push(<p key={i} className="leading-relaxed mb-2 last:mb-0">{inline(t)}</p>);
    }
  });
  flush('end');
  return out.length ? out : <p className="leading-relaxed">{text}</p>;
}

function inline(text) {
  if (!text) return '';
  const parts = [];
  const re = /(\*\*(.+?)\*\*)|(\*(.+?)\*)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<strong key={m.index} className="font-semibold">{m[2]}</strong>);
    else       parts.push(<em     key={m.index} className="italic">{m[4]}</em>);
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

/* ─────────────────────────────────────────────────────────────────────────────
   SIDEBAR
───────────────────────────────────────────────────────────────────────────── */
function Sidebar({ sessions, currentId, onSelect, onNew, onDelete, open, onClose, user, onLogout }) {
  const groups = groupByDay(sessions);

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={onClose} />}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-30 lg:z-auto
        flex flex-col w-[260px] shrink-0 h-full
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
        style={{ background: 'linear-gradient(180deg, #0b1f3a 0%, #0d2648 50%, #0a1b35 100%)' }}
      >
        {/* Logo area */}
        <div className="px-4 pt-5 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#0176D3] flex items-center justify-center shadow-md">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
              </svg>
            </div>
            <span className="text-white font-semibold text-sm tracking-wide">Salesforce AI</span>
          </div>

          <button
            onClick={onNew}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
              bg-[#0176D3] hover:bg-[#0260b0] text-white text-sm font-medium
              shadow-[0_4px_14px_rgba(1,118,211,0.4)] hover:shadow-[0_4px_20px_rgba(1,118,211,0.5)]
              transition-all duration-200 active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            New Chat
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1 scrollbar-thin">
          {sessions.length === 0 && (
            <div className="text-center py-10 px-4">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
              </div>
              <p className="text-xs text-white/30 leading-relaxed">No conversations yet.<br/>Start a new chat above.</p>
            </div>
          )}

          {['Today', 'Yesterday', 'Older'].map(group => {
            const items = groups[group];
            if (!items.length) return null;
            return (
              <div key={group}>
                <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-3 py-2">{group}</p>
                {items.map(s => (
                  <div
                    key={s.id}
                    onClick={() => onSelect(s.id)}
                    className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer
                      transition-all duration-150 mb-0.5
                      ${s.id === currentId
                        ? 'bg-[#0176D3]/20 border border-[#0176D3]/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                        : 'hover:bg-white/6 border border-transparent'
                      }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[11px]
                      ${s.id === currentId ? 'bg-[#0176D3]/30' : 'bg-white/8'}`}>
                      💬
                    </div>
                    <span className={`flex-1 text-xs truncate leading-snug
                      ${s.id === currentId ? 'text-white font-medium' : 'text-white/55 group-hover:text-white/75'}`}>
                      {s.title}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); onDelete(s.id); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-white/25
                        hover:text-rose-400 transition-all shrink-0 rounded"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Bottom user info + sign out */}
        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0176D3] to-[#014486]
              flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md select-none">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white/85 truncate">{user?.name || 'User'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-[10px] text-white/35 truncate">{user?.email || ''}</p>
                <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider
                  ${user?.role === 'admin' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                  {user?.role || 'user'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium
              text-white/50 hover:text-rose-400 hover:bg-white/5
              transition-all duration-150 group"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   HEADER
───────────────────────────────────────────────────────────────────────────── */
function Header({ connStatus, selectedModel, onModelChange, onSidebarToggle, user, onLogout }) {
  return (
    <header className="flex items-center justify-between px-5 py-3.5 bg-white
      border-b border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] shrink-0 z-10">

      <div className="flex items-center gap-3">
        <button
          onClick={onSidebarToggle}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600
            transition-colors -ml-1"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0176D3] flex items-center justify-center shadow-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-gray-900 leading-none">Salesforce</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-[11px] text-gray-400 font-medium leading-none">AI Assistant</p>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tight
                ${user?.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                {user?.role === 'admin' ? 'Admin' : 'User'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Model selector */}
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200
          rounded-xl px-3 py-2 shadow-sm hover:border-[#0176D3]/40 transition-colors">
          <svg className="w-3.5 h-3.5 text-[#0176D3] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
          <select
            value={selectedModel}
            onChange={e => onModelChange(e.target.value)}
            className="text-xs font-medium text-gray-700 bg-transparent outline-none cursor-pointer
              appearance-none pr-4"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%239ca3af' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0 center',
            }}
          >
            {AVAILABLE_MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
          border shadow-sm
          ${connStatus === 'connected'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : connStatus === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-600'
              : 'bg-amber-50 border-amber-200 text-amber-600'
          }`}>
          <span className={`w-2 h-2 rounded-full ${
            connStatus === 'connected' ? 'bg-emerald-500' :
            connStatus === 'error'     ? 'bg-rose-500'    : 'bg-amber-400 animate-pulse'
          }`}/>
          {connStatus === 'connected' ? 'Connected' : connStatus === 'error' ? 'Offline' : 'Connecting…'}
        </div>

        {/* Admin link */}
        {user?.role === 'admin' && (
          <a href="/admin"
            className="text-xs font-semibold px-3 py-2 rounded-xl bg-amber-50 border border-amber-200
              text-amber-700 hover:bg-amber-100 transition-colors">
            🔑 Admin
          </a>
        )}

      </div>
    </header>

  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   WELCOME SCREEN
───────────────────────────────────────────────────────────────────────────── */
function WelcomeScreen({ onSend }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-10 overflow-y-auto">
      <div className="w-full max-w-3xl mx-auto animate-[slideUp_0.5s_ease-out]">

        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-semibold text-gray-900 mb-8 tracking-tight">
            Ask a question
          </h2>
        </div>

        {/* Suggestion Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {QUICK_ACTIONS.map((q) => (
            <button
              key={q.label}
              onClick={() => onSend(null, q.label)}
              className="flex flex-col items-start gap-1 p-5 rounded-2xl bg-white border border-gray-100
                text-left transition-all duration-200 group
                hover:border-[#0176D3] hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]
                active:scale-[0.98] shadow-sm relative overflow-hidden"
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xl">{q.icon}</span>
                <span className="text-sm font-bold text-gray-800 group-hover:text-[#0176D3] transition-colors">
                  {q.label}
                </span>
              </div>
              <p className="text-[12px] text-gray-400 group-hover:text-gray-500 transition-colors">
                Run this Salesforce action instantly
              </p>
              
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                <svg className="w-4 h-4 text-[#0176D3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Capabilities Footer */}
        <div className="mt-12 pt-8 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {CAPABILITIES.map((c, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-2 px-2">
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-lg shadow-sm border border-gray-100/50">
                {c.icon}
              </div>
              <p className="text-[11px] font-semibold text-gray-400 leading-snug">
                {c.text.split(',')[0]}...
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   TYPING INDICATOR
───────────────────────────────────────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 animate-[slideUp_0.3s_ease-out]">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0176D3] to-[#014486]
        flex items-center justify-center shrink-0 shadow-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
        </svg>
      </div>
      <div className="bg-white border border-gray-100 rounded-[18px_18px_18px_4px]
        shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-5 py-3.5">
        <div className="flex items-center gap-1.5">
          {['-0.32s', '-0.16s', '0s'].map((d, i) => (
            <span key={i}
              className="w-2 h-2 bg-gray-300 rounded-full animate-[pulseDot_1.4s_ease-in-out_infinite]"
              style={{ animationDelay: d }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN APP
───────────────────────────────────────────────────────────────────────────── */
export default function App() {
  /* State */
  const [messages,        setMessages]        = useState([]);
  const [inputValue,      setInputValue]      = useState('');
  const [isLoading,       setIsLoading]       = useState(false);
  const [connStatus,      setConnStatus]      = useState('checking');
  const [selectedModel,   setSelectedModel]   = useState(() =>
    localStorage.getItem('sf_selected_model') || DEFAULT_MODEL
  );
  const [sessions,        setSessions]        = useState(loadSessions);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [selectedFile,    setSelectedFile]    = useState(null);
  const [filePreview,     setFilePreview]     = useState(null);
  const fileInputRef     = useRef(null);
  const authUser = JSON.parse(localStorage.getItem('sf_user') || '{}');
  const authToken = localStorage.getItem('sf_token') || '';

  const handleLogout = useCallback(() => {
    localStorage.removeItem('sf_token');
    localStorage.removeItem('sf_user');
    window.location.href = '/login';
  }, []);
  const [isListening,     setIsListening]     = useState(false);
  const [isVoiceEnabled,  setIsVoiceEnabled]  = useState(() => localStorage.getItem('sf_voice_enabled') === 'true');
  const [isSpeaking,      setIsSpeaking]      = useState(false);
  const [voiceError,      setVoiceError]      = useState('');

  const messagesEndRef   = useRef(null);
  const recognitionRef   = useRef(null);
  const voiceTimerRef    = useRef(null);
  const handleSendRef    = useRef(null);
  const inputRef         = useRef(null);

  /* Persist model */
  useEffect(() => { localStorage.setItem('sf_selected_model', selectedModel); }, [selectedModel]);

  /* Auto-scroll */
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  /* Status polling */
  useEffect(() => {
    const check = async () => {
      try {
        const url = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const res = await fetch(`${url}/api/chat/status`);
        if (!res.ok) throw new Error();
        const d = await res.json();
        setConnStatus(d.salesforce?.connected ? 'connected' : 'error');
      } catch { setConnStatus('error'); }
    };
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, []);

  /* ── Session helpers ── */
  const saveToSession = useCallback((sid, msgs, model) => {
    setSessions(prev => {
      const up = prev.map(s => {
        if (s.id !== sid) return s;
        const title = msgs.find(m => m.sender === 'user')?.text?.slice(0, 42) || s.title;
        return { ...s, title, model, messages: msgs };
      });
      saveSessions(up);
      return up;
    });
  }, []);

  const selectSession = useCallback(id => {
    const s = sessions.find(x => x.id === id);
    if (!s) return;
    setCurrentSessionId(id);
    setMessages(s.messages || []);
    if (s.model) setSelectedModel(s.model);
    setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [sessions]);

  const newSession = useCallback(() => {
    const id = genId();
    const s = { id, title: 'New Chat', model: selectedModel, messages: [], createdAt: Date.now() };
    setSessions(prev => { const u = [s, ...prev]; saveSessions(u); return u; });
    setCurrentSessionId(id);
    setMessages([]);
    setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [selectedModel]);

  const deleteSession = useCallback(id => {
    setSessions(prev => { const u = prev.filter(s => s.id !== id); saveSessions(u); return u; });
    if (currentSessionId === id) { setCurrentSessionId(null); setMessages([]); }
  }, [currentSessionId]);

  /* ── Speech ── */
  const speechSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!isVoiceEnabled) {
      localStorage.setItem('sf_voice_enabled', 'false');
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
    } else {
      localStorage.setItem('sf_voice_enabled', 'true');
    }
  }, [isVoiceEnabled]);

  const speak = useCallback((text) => {
    if (!isVoiceEnabled || !window.speechSynthesis) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Create a new utterance
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'en-US';
    msg.rate = 1.1;
    msg.pitch = 1.0;

    msg.onstart = () => setIsSpeaking(true);
    msg.onend   = () => setIsSpeaking(false);
    msg.onerror = () => setIsSpeaking(false);
    
    // Find a nice voice if available
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => (v.name.includes('Google') || v.name.includes('Natural')) && v.lang.startsWith('en')) || voices[0];
    if (voice) msg.voice = voice;

    window.speechSynthesis.speak(msg);
  }, [isVoiceEnabled]);

  useEffect(() => {
    if (!speechSupported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    r.lang = 'en-US'; r.interimResults = false; r.continuous = false;
    r.onresult = e => {
      const t = e.results[0][0].transcript.trim();
      if (t && handleSendRef.current) handleSendRef.current(null, t);
    };
    r.onerror = e => {
      setIsListening(false);
      const msgs = {
        'not-allowed': '🎤 Microphone access denied.',
        'no-speech':   '🔇 No speech detected.',
        'audio-capture': '🎤 No microphone found.',
      };
      const msg = msgs[e.error] || `⚠️ Voice error: ${e.error}`;
      if (msg) {
        setVoiceError(msg);
        clearTimeout(voiceTimerRef.current);
        voiceTimerRef.current = setTimeout(() => setVoiceError(''), 4000);
      }
    };
    r.onend = () => setIsListening(false);
    recognitionRef.current = r;
    return () => { r.abort(); clearTimeout(voiceTimerRef.current); window.speechSynthesis?.cancel(); };
  }, []); // eslint-disable-line

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) { recognitionRef.current.stop(); setIsListening(false); }
    else {
      setVoiceError(''); clearTimeout(voiceTimerRef.current);
      try { recognitionRef.current.start(); setIsListening(true); }
      catch (e) { console.warn(e); }
    }
  }, [isListening]);

  /* ── Send ── */
  const handleSendMessage = useCallback(async (e, directText = null) => {
    if (e) e.preventDefault();
    const text = directText !== null ? directText : inputValue;
    if (!text.trim()) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop(); setIsListening(false);
    }

    // Reset file state
    setSelectedFile(null);
    setFilePreview(null);

    let sid = currentSessionId;
    if (!sid) {
      sid = genId();
      const s = {
        id: sid,
        title: text.slice(0, 42) + (text.length > 42 ? '…' : ''),
        model: selectedModel, messages: [], createdAt: Date.now()
      };
      setSessions(prev => { const u = [s, ...prev]; saveSessions(u); return u; });
      setCurrentSessionId(sid);
    }

    const userMsg = { 
      id: messages.length + 1, 
      text, 
      sender: 'user', 
      toolUsed: null,
      attachment: selectedFile ? {
        name: selectedFile.name,
        type: selectedFile.type.startsWith('image/') ? 'image' : 'file',
        url: filePreview?.url
      } : null
    };
    const withUser = [...messages, userMsg];
    setMessages(withUser); setInputValue(''); setIsLoading(true);

    // Reset file state
    setSelectedFile(null);
    setFilePreview(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ message: text, model: selectedModel, conversationHistory: messages.slice(-10) })
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Failed'); }
      const data = await res.json();
      const aiMsg = { id: withUser.length + 1, text: data.data.text, sender: 'ai', toolUsed: data.data.toolUsed || null };
      const final = [...withUser, aiMsg];
      setMessages(final); 
      saveToSession(sid, final, selectedModel);
      
      // Trigger voice output
      speak(data.data.text);
    } catch (err) {
      const errMsg = { id: withUser.length + 1, text: `⚠️ ${err.message}. Please ensure the backend is running.`, sender: 'ai', toolUsed: null };
      const final = [...withUser, errMsg];
      setMessages(final); saveToSession(sid, final, selectedModel);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, messages, isListening, currentSessionId, selectedModel, saveToSession]);

  useEffect(() => { handleSendRef.current = handleSendMessage; }, [handleSendMessage]);

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <div className="w-full h-full flex bg-white overflow-hidden">

      <Sidebar
          sessions={sessions}
          currentId={currentSessionId}
          onSelect={selectSession}
          onNew={newSession}
          onDelete={deleteSession}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          user={authUser}
          onLogout={handleLogout}
        />

      {/* Right panel */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white">
        <Header
          connStatus={connStatus}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          onSidebarToggle={() => setSidebarOpen(o => !o)}
          user={authUser}
          onLogout={handleLogout}
        />

        {/* Messages / Welcome */}
        <div className="flex-1 overflow-y-auto flex flex-col bg-[#fafbfc] scrollbar-thin">
          {messages.length === 0 ? (
            <WelcomeScreen onSend={handleSendMessage} />
          ) : (
            <div className="flex-1 px-5 py-6 space-y-6 max-w-4xl w-full mx-auto">
              {messages.map(msg => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-3 animate-[slideUp_0.35s_ease-out]
                      ${isUser ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    {isUser ? (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0176D3] to-[#014486]
                        flex items-center justify-center text-white font-bold text-[11px] shrink-0 shadow-sm select-none">
                        You
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0176D3] to-[#014486]
                        flex items-center justify-center shrink-0 shadow-sm">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
                          <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                        </svg>
                      </div>
                    )}

                    <div className={`flex flex-col gap-1.5 max-w-[78%]
                      ${isUser ? 'items-end' : 'items-start'}`}>

                      {/* Bubble with Attachment */}
                      <div className={`px-5 py-3.5 text-[15px] rounded-2xl leading-relaxed
                        ${isUser
                          ? 'bg-[#0176D3] text-white rounded-br-sm shadow-[0_4px_16px_rgba(1,118,211,0.3)]'
                          : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)]'
                        }`}>
                        {msg.attachment && (
                          <div className="mb-3 overflow-hidden rounded-xl border border-white/20 bg-black/5 p-1">
                            {msg.attachment.type === 'image' ? (
                              <img src={msg.attachment.url} alt="Attachment" className="max-h-60 w-full object-cover rounded-lg" />
                            ) : (
                              <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-200">
                                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[12px] font-bold truncate">{msg.attachment.name}</p>
                                  <p className="text-[10px] opacity-60">File Attachment</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {isUser ? msg.text : renderMarkdown(msg.text)}
                      </div>

                      {/* Tool badge */}
                      {msg.toolUsed && (
                        <div className="flex items-center gap-1.5 text-[11px] font-medium
                          text-[#0176D3] bg-[#0176D3]/8 border border-[#0176D3]/20
                          rounded-full px-3 py-1 mt-0.5">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round"
                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          </svg>
                          {TOOL_LABELS[msg.toolUsed] || msg.toolUsed}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isLoading && <TypingIndicator />}
              <div ref={messagesEndRef} className="h-1" />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="px-4 sm:px-6 py-4 bg-white border-t border-gray-100
          shadow-[0_-4px_20px_rgba(0,0,0,0.04)] shrink-0">

          {/* File Preview Chip */}
          {filePreview && (
            <div className="max-w-3xl mx-auto mb-3 animate-[slideUp_0.2s_ease-out]">
              <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2 pr-3">
                {filePreview.type === 'image' ? (
                  <img src={filePreview.url} alt="Preview" className="w-10 h-10 rounded-lg object-cover shadow-sm" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-[11px] font-bold text-gray-900 truncate">{selectedFile.name}</p>
                  <p className="text-[9px] text-gray-400 uppercase font-bold tracking-tight">Ready to upload</p>
                </div>
                <button 
                  onClick={() => { setSelectedFile(null); setFilePreview(null); }}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {voiceError && (
            <div className="max-w-4xl mx-auto mb-3 animate-[slideUp_0.3s_ease-out]">
              <div className="flex items-center gap-2 bg-red-50 border border-red-200
                rounded-xl px-4 py-2.5 text-sm text-red-600">
                <span className="flex-1">{voiceError}</span>
                <button onClick={() => setVoiceError('')}
                  className="text-red-400 hover:text-red-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto">
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;
                setSelectedFile(file);
                if (file.type.startsWith('image/')) {
                  const url = URL.createObjectURL(file);
                  setFilePreview({ type: 'image', url });
                } else {
                  setFilePreview({ type: 'file', url: null });
                }
              }}
            />
            <div className="flex items-center gap-3 bg-white border border-gray-200
              rounded-full px-4 py-2 shadow-[0_2px_24px_rgba(0,0,0,0.05)]
              focus-within:border-gray-300 transition-all duration-200">
              
              {/* Plus button */}
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>

              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSendMessage(e); }}
                placeholder={isListening ? 'Listening…' : 'Ask anything'}
                disabled={isLoading}
                className="flex-1 bg-transparent text-gray-800 text-[16px] py-3 outline-none
                  placeholder:text-gray-400 disabled:opacity-50"
              />

              {/* Speaker Toggle / Stop Button */}
              <button 
                type="button" 
                onClick={() => {
                  if (isSpeaking) {
                    window.speechSynthesis.cancel();
                    setIsSpeaking(false);
                  } else {
                    setIsVoiceEnabled(!isVoiceEnabled);
                  }
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border
                  ${isSpeaking 
                    ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse' 
                    : isVoiceEnabled 
                      ? 'bg-blue-50 text-blue-600 border-blue-200' 
                      : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'
                  }`}
                title={isSpeaking ? 'Stop Speaking' : isVoiceEnabled ? 'Disable Voice Output' : 'Enable Voice Output'}
              >
                {isSpeaking ? (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : isVoiceEnabled ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6H4.51c-.88 0-1.704.506-1.938 1.354A9.01 9.01 0 002.25 12c0 .83.112 1.633.322 2.396C2.806 15.244 3.63 15.75 4.51 15.75H6.75l4.72 4.72a.75.75 0 001.28-.53V3.06a.75.75 0 00-1.28-.53L6.75 7.25z" />
                  </svg>
                )}
              </button>

              {/* Voice/Mic */}
              {speechSupported && (
                <button type="button" onClick={toggleListening} disabled={isLoading}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all border
                    ${isListening
                      ? 'bg-red-500 text-white border-red-500 animate-pulse'
                      : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                    } disabled:opacity-40`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2"/>
                  </svg>
                  <span className="text-[11px] font-bold tracking-tight">Voice</span>
                </button>
              )}

              {/* Send */}
              {inputValue.trim() && (
                <button type="submit"
                  disabled={isLoading}
                  className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center
                    transition-all hover:bg-gray-800 disabled:bg-gray-200 active:scale-90">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                  </svg>
                </button>
              )}
            </div>
          </form>

          <p className="text-center text-[11px] text-gray-400 mt-4 font-medium tracking-tight">
            By messaging Salesforce AI, you agree to our <span className="underline cursor-pointer">Terms</span> and have read our <span className="underline cursor-pointer">Privacy Policy</span>. See <span className="underline cursor-pointer">Cookie Preferences</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
