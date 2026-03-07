import { useState, useRef, useEffect } from 'react'
import './App.css'

/* ── Simple inline markdown renderer ──────────────────────────── */
function renderMarkdown(text) {
  if (!text) return null;

  // Split into paragraphs/blocks by double newline OR single newline
  const lines = text.split('\n');
  const elements = [];
  let listBuffer = [];

  const flushList = (key) => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={`ul-${key}`} className="md-list">
          {listBuffer.map((item, i) => (
            <li key={i}>{inlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    // Bullet list items: "- text" or "* text" or "• text"
    if (/^[-*•]\s+/.test(trimmed)) {
      listBuffer.push(trimmed.replace(/^[-*•]\s+/, ''));
    } else {
      flushList(i);
      if (trimmed === '') {
        // skip blank lines between list and paragraph
      } else {
        elements.push(
          <p key={i} className="md-para">{inlineMarkdown(trimmed)}</p>
        );
      }
    }
  });
  flushList('end');

  return elements.length > 0 ? elements : <p className="md-para">{text}</p>;
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
    if (match[1]) parts.push(<strong key={match.index}>{match[2]}</strong>);
    else if (match[3]) parts.push(<em key={match.index}>{match[4]}</em>);
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

/* ── Status dot ───────────────────────────────────────────────── */
function StatusBar({ status }) {
  const labels = {
    checking: { dot: 'dot-checking', text: 'Connecting…' },
    connected: { dot: 'dot-connected', text: 'Connected' },
    error: { dot: 'dot-error', text: 'Offline' }
  };
  const { dot, text } = labels[status] || labels.checking;
  return (
    <div className="status-bar">
      <span className={`status-dot ${dot}`} />
      <span className="status-label">{text}</span>
      <span className="status-model">llama3.3 · Salesforce</span>
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
  'Show all contacts',
  'List open opportunities',
  'Fetch all accounts',
  'Show new leads',
  'List high priority cases',
  'Create a new lead',
];

/* ── Main App ─────────────────────────────────────────────────── */
function App() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your **Salesforce AI assistant**.\n\nAsk me to:\n- Fetch contacts, accounts, leads, opportunities or cases\n- Create new records\n- Update existing records\n\nHow can I help you today?",
      sender: 'ai',
      toolUsed: null
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connStatus, setConnStatus] = useState('checking');
  const messagesEndRef = useRef(null);

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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      text: inputValue,
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
          message: inputValue,
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
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSendMessage(e);
    }
  };

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <div className="header-icon">⚡</div>
        <div className="header-text">
          <h1>Salesforce AI Assistant</h1>
          <span className="header-subtitle">Powered by Ollama Cloud · llama3.3</span>
        </div>
        <StatusBar status={connStatus} />
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.sender === 'user' ? 'message-user' : 'message-ai'}`}
          >
            {message.sender === 'ai' && (
              <div className="avatar avatar-ai">SF</div>
            )}
            <div className="message-body">
              <div className="message-content">
                {message.sender === 'ai'
                  ? renderMarkdown(message.text)
                  : message.text}
              </div>
              {message.toolUsed && (
                <div className="tool-badge">
                  🔧 {TOOL_LABELS[message.toolUsed] || message.toolUsed}
                </div>
              )}
            </div>
            {message.sender === 'user' && (
              <div className="avatar avatar-user">You</div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="message message-ai">
            <div className="avatar avatar-ai">SF</div>
            <div className="message-body">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion chips */}
      <div className="suggestions">
        {SUGGESTIONS.map(q => (
          <button key={q} className="suggestion-chip" onClick={() => setInputValue(q)}>
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          className="chat-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about Salesforce data…"
          disabled={isLoading}
        />
        <button type="submit" className="send-button" disabled={isLoading || !inputValue.trim()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
    </div>
  );
}

export default App;
