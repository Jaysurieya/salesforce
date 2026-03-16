import { useState, useRef, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar';

/* ── Simple inline markdown renderer ──────────────────────────── */
function renderMarkdown(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let listBuffer = [];

  const flushList = (key) => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={`ul-${key}`} className="my-2 pl-[22px] list-disc">
          {listBuffer.map((item, i) => (
            <li key={i} className="mb-1.5 leading-[1.65]">{inlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    if (/^[-*•]\s+/.test(trimmed)) {
      listBuffer.push(trimmed.replace(/^[-*•]\s+/, ''));
    } else {
      flushList(i);
      if (trimmed === '') {
        // skip blank line
      } else {
        elements.push(
          <p key={i} className="mb-3 last:mb-0 leading-[1.65]">{inlineMarkdown(trimmed)}</p>
        );
      }
    }
  });
  flushList('end');

  return elements.length > 0 ? elements : <p className="mb-3 last:mb-0 leading-[1.65]">{text}</p>;
}

/* Convert **bold** and *italic* inline */
function inlineMarkdown(text) {
  if (!text) return '';
  const parts = [];
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)/g;
  let last = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1]) parts.push(<strong key={match.index} className="font-semibold">{match[2]}</strong>);
    else if (match[3]) parts.push(<em key={match.index} className="italic opaicty-80">{match[4]}</em>);
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

/* ── Status dot ───────────────────────────────────────────────── */
function StatusBar({ status }) {
  const labels = {
    checking: { dotClass: 'bg-amber-400', text: 'Connecting…' },
    connected: { dotClass: 'bg-emerald-500', text: 'Connected' },
    error: { dotClass: 'bg-rose-500', text: 'Offline' }
  };
  const { dotClass, text } = labels[status] || labels.checking;
  return (
      <div className="flex items-center gap-2.5 bg-white border border-slate-200 shadow-sm rounded-full px-3.5 py-1.5 shrink-0 transition-all">
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass} ${status === 'checking' ? 'animate-[blinkDot_1.4s_ease-in-out_infinite]' : ''} shadow-[0_0_8px_rgba(0,0,0,0.1)]`} />
      <span className="text-[13px] font-semibold text-slate-600 tracking-wide">{text}</span>
    </div>
  );
}

/* ── Tool labels ──────────────────────────────────────────────── */
const TOOL_LABELS = {
  getAccountRecords: '🏢 Fetched Accounts',
  getContactRecords: '👤 Fetched Contacts',
  getOpportunityRecords: '💰 Fetched Opportunities',
  getLeadRecords: '🎯 Fetched Leads',
  getCaseRecords: '🎫 Fetched Cases',
  createRecord: '✅ Created Record',
  updateRecord: '✏️  Updated Record',
};

const SUGGESTIONS = [
  'Show All Contacts',
  'List Open Opportunities',
  'Fetch All Accounts',
  'Show New Leads',
  'List High Priority Cases',
  'Create New Contact',
  'Create New Lead'
];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/* ── Main App ─────────────────────────────────────────────────── */
function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connStatus, setConnStatus] = useState('checking');
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const voiceErrorTimerRef = useRef(null);

  /* Auto-scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  /* Load Chats */
  const fetchChats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/chat`);
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    } catch (e) {
      console.error('Failed to load chats');
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  /* Check backend/SF status on mount */
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/api/chat/status`);
        if (!res.ok) throw new Error('Status check failed');
        const data = await res.json();
        setConnStatus(data.salesforce?.connected ? 'connected' : 'error');
      } catch {
        setConnStatus('error');
      }
    };
    checkStatus();
    // Re-check every 30 seconds
    const interval = setInterval(checkStatus, 30_000);
    return () => clearInterval(interval);
  }, []);

  /* ── Speech Recognition setup ──────────────────────────────── */
  const speechSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const handleSendRef = useRef(null);

  useEffect(() => {
    if (!speechSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.trim() && handleSendRef.current) {
        handleSendRef.current(null, transcript.trim());
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      const errorMessages = {
        'not-allowed': '🎤 Microphone access denied. Please allow microphone permission.',
        'no-speech': '🔇 No speech detected. Please try again.',
        'audio-capture': '🎤 No microphone found. Please connect a microphone.',
        'network': '🌐 Network error. Please check your connection.',
        'aborted': '',  // user-initiated, no error needed
      };
      const msg = errorMessages[event.error] || `⚠️ Speech recognition error: ${event.error}`;
      if (msg) {
        setVoiceError(msg);
        clearTimeout(voiceErrorTimerRef.current);
        voiceErrorTimerRef.current = setTimeout(() => setVoiceError(''), 4000);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      clearTimeout(voiceErrorTimerRef.current);
    };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setVoiceError('');
      clearTimeout(voiceErrorTimerRef.current);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Speech recognition start error:', err);
      }
    }
  }, [isListening]);

  const handleSendMessage = useCallback(async (e, directText = null) => {
    if (e) e.preventDefault();
    const textToSend = directText !== null ? directText : inputValue;
    if (!textToSend.trim()) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userMessage = {
      id: Date.now(), // Generate unique id based on timestamp
      text: textToSend,
      sender: 'user',
      toolUsed: null
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          conversationHistory: messages.slice(-10),
          model: selectedModel || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get response');
      }

      const data = await response.json();

      const aiMessage = {
        id: Date.now() + 1, // Generate unique id based on timestamp
        text: data.data.text,
        sender: 'ai',
        toolUsed: data.data.toolUsed || null
      };

      setMessages(prev => [...prev, aiMessage]);

      // Save to MongoDB Let's handle chat creation/updating
      let chatIdToUse = activeChatId;
      if (!chatIdToUse) {
        // Create a new chat
        const createRes = await fetch(`${API_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: textToSend.slice(0, 30) + (textToSend.length > 30 ? '...' : '') })
        });
        const newChat = await createRes.json();
        chatIdToUse = newChat._id;
        setActiveChatId(chatIdToUse);
      }
      
      // Save messages
      await fetch(`${API_URL}/api/chat/${chatIdToUse}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: textToSend },
            { role: 'assistant', content: data.data.text, toolUsed: data.data.toolUsed || null }
          ]
        })
      });

      // Refresh chats if a new chat was created or first message set its title
      if (!activeChatId) {
        fetchChats();
      }

    } catch (error) {
      console.error('Error:', error);
      const isCustomError = error.message.includes('not available') || error.message.includes('AI service unavailable');
      const errorSuffix = isCustomError ? '' : ' Please ensure the backend is running.';

      const errorMessage = {
        id: Date.now() + 1, // Generate unique id based on timestamp
        text: `⚠️ ${error.message}${errorSuffix}`,
        sender: 'ai',
        toolUsed: null
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, messages, isListening, selectedModel, activeChatId]);

  useEffect(() => {
    handleSendRef.current = handleSendMessage;
  }, [handleSendMessage]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSendMessage(e);
    }
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
  };

  const handleSelectChat = async (id) => {
    setActiveChatId(id);
    try {
      const res = await fetch(`${API_URL}/api/chat/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages.map((m, i) => ({
          id: m._id || `${Date.now()}-${i}`,
          text: m.content,
          sender: m.role === 'assistant' ? 'ai' : m.role,
          toolUsed: m.toolUsed
        })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteChat = async (id) => {
    try {
      await fetch(`${API_URL}/api/chat/${id}`, { method: 'DELETE' });
      setChats(prev => prev.filter(c => c._id !== id));
      if (activeChatId === id) {
        handleNewChat();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenameChat = async (id, newTitle) => {
    try {
      const res = await fetch(`${API_URL}/api/chat/${id}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
      if (res.ok) {
        setChats(prev => prev.map(c => c._id === id ? { ...c, title: newTitle } : c));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full h-[100dvh] flex bg-[#f8fafc] z-10 relative">
      {/* Sidebar - hidden on very small screens, integrated into main layout flex container */}
      {isSidebarOpen && (
        <Sidebar
          chats={chats}
          activeChatId={activeChatId}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
        />
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Header - Glassmorphism */}
        <div className="flex items-center justify-between px-6 py-4 glass-panel shrink-0 select-none z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="mr-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-2 rounded-xl transition-all active:scale-95">
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="text-[var(--color-sf-blue)]">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
              </svg>
            </div>
            <h1 className="text-[1.15rem] font-bold text-slate-800 tracking-tight hidden sm:block">Salesforce <span className="font-medium text-slate-500">AI Assistant</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none text-slate-700 shadow-sm focus:border-[#0176D3] focus:ring-2 focus:ring-[#0176D3]/20 transition-all cursor-pointer font-medium hover:border-slate-300"
              disabled={isLoading}
              title="Select AI Model"
            >
              <option value="">Default Model</option>
              <option value="gpt-oss:120b-cloud">gpt-oss:120b-cloud</option>
              <option value="gpt-oss:70b-cloud">gpt-oss:70b-cloud</option>
              <option value="gpt-oss:7b-cloud">gpt-oss:7b-cloud</option>
            </select>
            <StatusBar status={connStatus} />
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 overflow-y-auto bg-transparent p-4 sm:p-6 flex flex-col scrollbar-thin scroll-smooth relative">
          <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
            {messages.length === 0 ? (
              /* Empty State / Welcome Screen */
              <div className="flex flex-col items-center justify-center py-6 sm:py-10 px-4 w-full h-full flex-1 animate-[slideUp_0.4s_ease-out]">
                <div className="w-[72px] h-[72px] bg-gradient-to-br from-blue-50 to-[#0176D3]/10 text-[#0176D3] rounded-2xl flex items-center justify-center mb-8 shadow-elegant border border-white/60">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
                  </svg>
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 mb-10 text-center tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">Hello! I'm your Salesforce AI Assistant</h2>

                <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-elegant p-7 mb-10 w-full relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#0176D3] to-indigo-400"></div>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-5 select-none">Assistant Capabilities</h3>
                  <ul className="space-y-3.5">
                    {[
                      'Fetch contacts, accounts, leads, opportunities or cases',
                      'Create new Salesforce records',
                      'Update existing Salesforce records',
                      'Analyze Salesforce data'
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3.5 text-slate-700 text-[15px] font-medium leading-relaxed">
                        <div className="bg-blue-50 p-1.5 rounded-full text-[#0176D3] shrink-0 mt-0.5 shadow-sm">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="w-full">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-5 text-center select-none">Quick Actions</h3>
                  <div className="flex flex-wrap justify-center gap-3">
                    {SUGGESTIONS.map(q => (
                      <button
                        key={q}
                        onClick={() => { handleSendMessage(null, q); }}
                        className="text-[13px] font-semibold bg-white text-slate-700 rounded-full px-5 py-2.5 transition-all shadow-sm border border-slate-200 hover:shadow-md hover:border-[#0176D3]/30 hover:text-[#0176D3] hover:-translate-y-[2px] active:scale-95"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Chat Messages */
              <div className="flex flex-col gap-6">
                {messages.map((message) => {
                  const isUser = message.sender === 'user';
                  return (
                    <div
                      key={message.id}
                      className={`flex items-end gap-3 animate-[slideUp_0.4s_ease-out] origin-bottom ${isUser ? 'flex-row-reverse' : ''}`}
                    >
                      {!isUser && (
                        <div className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-[0.7rem] font-bold shrink-0 bg-white text-[#0176D3] border border-slate-200 select-none shadow-sm">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
                          </svg>
                        </div>
                      )}

                      <div className={`flex flex-col gap-1.5 max-w-[85%] sm:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
                        <div className={`px-5 py-3.5 text-[15px] ${isUser ? 'sf-gradient text-white rounded-[20px_20px_4px_20px] shadow-message font-medium' : 'bg-white text-slate-800 rounded-[20px_20px_20px_4px] border border-slate-200 shadow-message'}`}>
                          {!isUser ? renderMarkdown(message.text) : message.text}
                        </div>
                        {message.toolUsed && (
                          <div className="text-[0.65rem] text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-3 py-1 inline-flex items-center gap-1.5 font-bold uppercase tracking-wide mt-1 shadow-sm">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {TOOL_LABELS[message.toolUsed] || message.toolUsed}
                          </div>
                        )}
                      </div>

                      {isUser && (
                        <div className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-[0.85rem] font-bold shrink-0 bg-slate-800 text-white border-2 border-white select-none shadow-sm">
                          U
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Typing indicator */}
                {isLoading && (
                  <div className="flex items-end gap-3 animate-[slideUp_0.4s_ease-out] origin-bottom">
                    <div className="w-[38px] h-[38px] rounded-full flex items-center justify-center shrink-0 bg-white text-[#0176D3] border border-slate-200 select-none shadow-sm">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
                      </svg>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-[20px_20px_20px_4px] shadow-message">
                      <div className="flex items-center gap-1.5 px-5 py-4">
                        <span className="w-2.5 h-2.5 bg-slate-300 rounded-full animate-[pulseDot_1.5s_infinite_ease-in-out_both]" style={{ animationDelay: '-0.32s' }}></span>
                        <span className="w-2.5 h-2.5 bg-slate-300 rounded-full animate-[pulseDot_1.5s_infinite_ease-in-out_both]" style={{ animationDelay: '-0.16s' }}></span>
                        <span className="w-2.5 h-2.5 bg-slate-300 rounded-full animate-[pulseDot_1.5s_infinite_ease-in-out_both]"></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-2" />
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 sm:p-5 bg-white/70 backdrop-blur-md border-t border-slate-200 shrink-0 select-none z-10 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
          <form className="max-w-4xl mx-auto flex gap-3 relative" onSubmit={handleSendMessage}>
            <input
              type="text"
              className={`flex-1 bg-white border-2 border-slate-200 rounded-2xl pl-6 ${speechSupported ? 'pr-24' : 'pr-14'} py-4 text-slate-800 font-medium text-[15px] outline-none transition-all placeholder:text-slate-400 focus:border-[#0176D3] focus:ring-[4px] focus:ring-[#0176D3]/10 disabled:opacity-50 disabled:bg-slate-50 shadow-sm`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? 'Listening…' : 'Ask about Salesforce data…'}
              disabled={isLoading}
            />

            {/* Microphone Button */}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`absolute right-12 top-[6px] bottom-[6px] aspect-square rounded-full flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-red-500 text-white shadow-[0_2px_8px_rgba(239,68,68,0.4)] animate-[micPulse_1.5s_ease-in-out_infinite] hover:bg-red-600'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
                disabled={isLoading}
                title={isListening ? 'Stop listening' : 'Start voice input'}
              >
                {isListening ? (
                  /* Stop icon */
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  /* Microphone icon */
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                )}
              </button>
            )}

            {/* Send Button */}
            <button
              type="submit"
              className="absolute right-2 top-[8px] bottom-[8px] aspect-square rounded-[12px] sf-gradient text-white flex items-center justify-center transition-all sf-gradient-hover shadow-md shadow-blue-500/30 disabled:opacity-50 disabled:shadow-none hover:not-disabled:scale-[1.05] active:not-disabled:scale-95 group"
              disabled={isLoading || !inputValue.trim()}
            >
              <svg className="w-5 h-5 translate-x-[-1px] translate-y-[1px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>

          {/* Voice Error Toast */}
          {voiceError && (
            <div className="max-w-4xl mx-auto mt-2 animate-[slideUp_0.3s_ease-out]">
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">
                <span className="flex-1">{voiceError}</span>
                <button
                  type="button"
                  onClick={() => setVoiceError('')}
                  className="text-red-400 hover:text-red-600 transition-colors shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          <div className="text-center mt-3">
            <span className="text-[11px] text-slate-400 font-semibold tracking-wide uppercase">Salesforce AI Assistant can make mistakes. Verify important information.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
