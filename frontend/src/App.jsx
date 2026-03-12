import { useState, useRef, useEffect, useCallback } from 'react'

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
    <div className="flex items-center gap-2 bg-white border border-gray-200 shadow-sm rounded-full px-3 py-1.5 shrink-0">
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass} ${status === 'checking' ? 'animate-[blinkDot_1.4s_ease-in-out_infinite]' : ''}`} />
      <span className="text-xs font-medium text-gray-700">{text}</span>
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
  'Create New Lead',
];

/* ── Main App ─────────────────────────────────────────────────── */
function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connStatus, setConnStatus] = useState('checking');
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const voiceErrorTimerRef = useRef(null);

  /* Auto-scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  /* Check backend/SF status on mount */
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/chat/status');
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

  // We use a ref-based callback so the recognition onresult always has access
  // to the latest handleSendMessage without re-creating the recognition instance.
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
        // Already started — ignore
        console.warn('Speech recognition start error:', err);
      }
    }
  }, [isListening]);

  const handleSendMessage = useCallback(async (e, directText = null) => {
    if (e) e.preventDefault();
    const textToSend = directText !== null ? directText : inputValue;
    if (!textToSend.trim()) return;

    // Stop listening if voice was used
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userMessage = {
      id: messages.length + 1,
      text: textToSend,
      sender: 'user',
      toolUsed: null
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          conversationHistory: messages.slice(-10)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get response');
      }

      const data = await response.json();

      const aiMessage = {
        id: updatedMessages.length + 1,
        text: data.data.text,
        sender: 'ai',
        toolUsed: data.data.toolUsed || null
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        id: updatedMessages.length + 1,
        text: `⚠️ ${error.message}. Please ensure the backend is running.`,
        sender: 'ai',
        toolUsed: null
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, messages, isListening]);

  // Keep the ref in sync so the speech recognition callback always uses the latest version
  useEffect(() => {
    handleSendRef.current = handleSendMessage;
  }, [handleSendMessage]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSendMessage(e);
    }
  };

  return (
    <div className="w-full h-[100dvh] sm:h-[92vh] sm:max-w-4xl m-auto flex flex-col bg-white sm:rounded-2xl sm:border border-gray-200 overflow-hidden shadow-xl sm:shadow-2xl sm:shadow-gray-300 z-10 relative">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-[var(--color-sf-light)] border-b border-gray-200 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="text-[var(--color-sf-blue)]">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
            </svg>
          </div>
          <h1 className="text-[1.1rem] font-bold text-gray-900 tracking-tight">Salesforce <span className="font-normal text-gray-600">AI Assistant</span></h1>
        </div>
        <StatusBar status={connStatus} />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto bg-white p-4 sm:p-6 flex flex-col scrollbar-thin scroll-smooth">

        {messages.length === 0 ? (
          /* Empty State / Welcome Screen */
          <div className="flex flex-col items-center justify-center py-6 sm:py-10 px-4 w-full max-w-2xl mx-auto flex-1 animate-[slideUp_0.4s_ease-out]">
            <div className="w-16 h-16 bg-[#0176D3]/10 text-[#0176D3] rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-[#0176D3]/20">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-8 text-center tracking-tight">Hello! I'm your Salesforce AI Assistant</h2>

            <div className="bg-white border border-gray-200 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] p-6 mb-10 w-full border-t-[5px] border-t-[#0176D3]">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.15em] mb-4 select-none">Assistant Capabilities</h3>
              <ul className="space-y-3.5">
                {[
                  'Fetch contacts, accounts, leads, opportunities or cases',
                  'Create new Salesforce records',
                  'Update existing Salesforce records',
                  'Analyze Salesforce data'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-700 text-[15px] font-medium">
                    <div className="bg-[#0176D3]/10 p-1 rounded-full text-[#0176D3] shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="w-full">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.1em] mb-4 text-center select-none">Quick Actions</h3>
              <div className="flex flex-wrap justify-center gap-2.5">
                {SUGGESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => { handleSendMessage(null, q); }}
                    className="text-sm font-medium bg-[#0176D3] text-white rounded-full px-5 py-2.5 transition-all shadow-sm border border-transparent hover:shadow-md hover:bg-[#014486] hover:-translate-y-[1px] active:scale-95"
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
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[0.7rem] font-bold shrink-0 bg-[#0176D3]/10 text-[#0176D3] border border-[#0176D3]/20 select-none">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
                      </svg>
                    </div>
                  )}

                  <div className={`flex flex-col gap-1.5 max-w-[85%] sm:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
                    <div className={`px-5 py-3.5 text-[15px] ${isUser ? 'bg-[#0176D3] text-white rounded-[20px_20px_4px_20px] shadow-sm' : 'bg-white text-gray-800 rounded-[20px_20px_20px_4px] border border-gray-100 shadow-sm shadow-gray-200/50'}`}>
                      {!isUser ? renderMarkdown(message.text) : message.text}
                    </div>
                    {message.toolUsed && (
                      <div className="text-[0.7rem] text-[#0176D3] bg-[#0176D3]/10 border border-[#0176D3]/20 rounded-full px-3 py-1 inline-flex items-center gap-1.5 font-medium mt-0.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {TOOL_LABELS[message.toolUsed] || message.toolUsed}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[0.7rem] font-bold shrink-0 bg-gray-100 text-gray-500 border border-gray-200 select-none">
                      You
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex items-end gap-3 animate-[slideUp_0.4s_ease-out] origin-bottom">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-[#0176D3]/10 text-[#0176D3] border border-[#0176D3]/20 select-none">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
                  </svg>
                </div>
                <div className="bg-white border border-gray-100 rounded-[20px_20px_20px_4px] shadow-sm shadow-gray-200/50">
                  <div className="flex items-center gap-1.5 px-5 py-4">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-[pulseDot_1.5s_infinite_ease-in-out_both]" style={{ animationDelay: '-0.32s' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-[pulseDot_1.5s_infinite_ease-in-out_both]" style={{ animationDelay: '-0.16s' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-[pulseDot_1.5s_infinite_ease-in-out_both]"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-2" />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 sm:p-5 bg-white border-t border-gray-100 shrink-0">
        <form className="max-w-3xl mx-auto flex gap-3 relative" onSubmit={handleSendMessage}>
          <input
            type="text"
            className={`flex-1 bg-gray-50 border border-gray-200 rounded-full pl-6 ${speechSupported ? 'pr-24' : 'pr-14'} py-3.5 text-gray-800 text-[15px] outline-none transition-all placeholder:text-gray-400 focus:border-[#0176D3] focus:bg-white focus:ring-[3px] focus:ring-[#0176D3]/15 disabled:opacity-50 disabled:bg-gray-100`}
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
            className="absolute right-2 top-[6px] bottom-[6px] aspect-square rounded-full bg-[#0176D3] text-white flex items-center justify-center transition-all hover:bg-[#014486] shadow-[0_2px_8px_rgba(1,118,211,0.3)] hover:shadow-[0_4px_12px_rgba(1,118,211,0.4)] disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none hover:not-disabled:scale-[1.03] active:not-disabled:scale-95 group"
            disabled={isLoading || !inputValue.trim()}
          >
            <svg className="w-5 h-5 translate-x-[-1px] translate-y-[1px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>

        {/* Voice Error Toast */}
        {voiceError && (
          <div className="max-w-3xl mx-auto mt-2 animate-[slideUp_0.3s_ease-out]">
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
        <div className="text-center mt-2.5">
          <span className="text-[11px] text-gray-400 font-medium tracking-wide">Salesforce AI Assistant can make mistakes. Verify important information.</span>
        </div>
      </div>
    </div>
  );
}

export default App;
