import { useState, useRef, useEffect, useCallback } from 'react'

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────────────────── */
const AVAILABLE_MODELS = [
  { id: 'gpt-oss:120b-cloud',  label: 'GPT-OSS 120B' },
  { id: 'gemma3:27b-cloud',    label: 'Gemma 3 27B'  },
  { id: 'llama3.3:70b-cloud',  label: 'Llama 3.3 70B'},
  { id: 'mistral:cloud',       label: 'Mistral'      },
  { id: 'qwen2.5:72b-cloud',   label: 'Qwen 2.5 72B' },
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
function Sidebar({ sessions, currentId, onSelect, onNew, onDelete, open, onClose }) {
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

        {/* Bottom user info */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-default">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0176D3] to-[#014486]
              flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md">
              SF
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/80 truncate">Salesforce User</p>
              <p className="text-[10px] text-white/30 truncate">AI Assistant</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   HEADER
───────────────────────────────────────────────────────────────────────────── */
function Header({ connStatus, selectedModel, onModelChange, onSidebarToggle }) {
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
            <p className="text-[11px] text-gray-400 font-medium leading-none mt-0.5">AI Assistant</p>
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

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0176D3] to-[#014486]
          flex items-center justify-center text-white font-bold text-xs shadow-sm cursor-default select-none">
          SF
        </div>
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
      <div className="w-full max-w-2xl mx-auto animate-[slideUp_0.5s_ease-out]">

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0176D3] to-[#014486]
            flex items-center justify-center mx-auto mb-5
            shadow-[0_8px_32px_rgba(1,118,211,0.35)]">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
              <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
            Hello! I'm your Salesforce AI
          </h2>
          <p className="text-gray-400 text-sm font-medium">
            Ask me anything about your CRM data, records, or analytics.
          </p>
        </div>

        {/* Capabilities */}
        <div className="bg-white rounded-2xl border border-gray-100
          shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-6 mb-6">
          <p className="text-[11px] font-bold text-gray-300 uppercase tracking-[0.15em] mb-4">
            What I can do
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CAPABILITIES.map((c, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50
                hover:bg-blue-50/60 transition-colors group">
                <span className="text-lg shrink-0 mt-0.5">{c.icon}</span>
                <span className="text-sm text-gray-600 group-hover:text-gray-800 leading-snug transition-colors">
                  {c.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <p className="text-[11px] font-bold text-gray-300 uppercase tracking-[0.15em] mb-3 text-center">
            Quick Actions
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {QUICK_ACTIONS.map(q => (
              <button
                key={q.label}
                onClick={() => onSend(null, q.label)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium
                  bg-white border border-gray-200 text-gray-700
                  hover:border-[#0176D3] hover:text-[#0176D3] hover:bg-blue-50/50
                  hover:shadow-[0_2px_12px_rgba(1,118,211,0.12)]
                  transition-all duration-200 active:scale-95 shadow-sm"
              >
                <span>{q.icon}</span>
                {q.label}
              </button>
            ))}
          </div>
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
  const [isListening,     setIsListening]     = useState(false);
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
    return () => { r.abort(); clearTimeout(voiceTimerRef.current); };
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

    const userMsg = { id: messages.length + 1, text, sender: 'user', toolUsed: null };
    const withUser = [...messages, userMsg];
    setMessages(withUser); setInputValue(''); setIsLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, model: selectedModel, conversationHistory: messages.slice(-10) })
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Failed'); }
      const data = await res.json();
      const aiMsg = { id: withUser.length + 1, text: data.data.text, sender: 'ai', toolUsed: data.data.toolUsed || null };
      const final = [...withUser, aiMsg];
      setMessages(final); saveToSession(sid, final, selectedModel);
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
      />

      {/* Right panel */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white">
        <Header
          connStatus={connStatus}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          onSidebarToggle={() => setSidebarOpen(o => !o)}
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

                      {/* Bubble */}
                      <div className={`px-5 py-3.5 text-[15px] rounded-2xl leading-relaxed
                        ${isUser
                          ? 'bg-[#0176D3] text-white rounded-br-sm shadow-[0_4px_16px_rgba(1,118,211,0.3)]'
                          : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)]'
                        }`}>
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

          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 bg-white border border-gray-200
              rounded-2xl px-4 py-2.5 shadow-[0_2px_16px_rgba(0,0,0,0.07)]
              focus-within:border-[#0176D3] focus-within:shadow-[0_2px_20px_rgba(1,118,211,0.15)]
              transition-all duration-200">

              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSendMessage(e); }}
                placeholder={isListening ? '🎤 Listening…' : 'Ask about Salesforce data…'}
                disabled={isLoading}
                className="flex-1 bg-transparent text-gray-800 text-[15px] outline-none
                  placeholder:text-gray-400 disabled:opacity-50"
              />

              {/* Mic */}
              {speechSupported && (
                <button type="button" onClick={toggleListening} disabled={isLoading}
                  title={isListening ? 'Stop' : 'Voice input'}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all
                    ${isListening
                      ? 'bg-red-500 text-white shadow-[0_0_0_3px_rgba(239,68,68,0.2)] animate-[micPulse_1.4s_ease-in-out_infinite]'
                      : 'text-gray-400 hover:text-[#0176D3] hover:bg-blue-50'
                    } disabled:opacity-40`}>
                  {isListening
                    ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                    : <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2"/>
                        <line x1="12" y1="19" x2="12" y2="23"/>
                        <line x1="8" y1="23" x2="16" y2="23"/>
                      </svg>
                  }
                </button>
              )}

              {/* Send */}
              <button type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="w-9 h-9 rounded-xl bg-[#0176D3] text-white flex items-center justify-center
                  transition-all shadow-[0_2px_8px_rgba(1,118,211,0.35)]
                  hover:bg-[#014486] hover:shadow-[0_4px_16px_rgba(1,118,211,0.45)]
                  disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none
                  active:scale-95">
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
              </button>
            </div>
          </form>

          <p className="text-center text-[11px] text-gray-400 mt-2.5 font-medium tracking-wide">
            Salesforce AI Assistant can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
