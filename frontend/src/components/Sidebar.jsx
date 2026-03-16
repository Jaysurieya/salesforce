import React, { useState } from 'react';

export default function Sidebar({
  chats,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onRenameChat
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const handleEditStart = (e, chat) => {
    e.stopPropagation();
    setEditingId(chat._id);
    setEditTitle(chat.title);
  };

  const handleEditSave = (e, id) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameChat(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleEditCancel = (e) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (window.confirm('Delete this chat?')) {
      onDeleteChat(id);
    }
  };

  return (
    <div className="w-[280px] bg-[#fdfdfd] flex flex-col border-r border-slate-200 shrink-0 h-full shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
      {/* New Chat Button */}
      <div className="p-5">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 sf-gradient text-white py-2.5 px-4 rounded-xl font-medium sf-gradient-hover transition-all duration-300 shadow-md shadow-blue-500/20 active:scale-[0.98]"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-1.5 scrollbar-thin">
        <div className="px-2 mb-3 mt-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          Recent 
        </div>
        {chats.map(chat => (
          <div
            key={chat._id}
            onClick={() => onSelectChat(chat._id)}
            className={`group flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
              activeChatId === chat._id
                ? 'bg-blue-50/80 text-[#0176D3] shadow-sm ring-1 ring-blue-100'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {editingId === chat._id ? (
              <div className="flex items-center w-full gap-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleEditSave(e, chat._id);
                    if (e.key === 'Escape') handleEditCancel(e);
                  }}
                  className="flex-1 min-w-0 bg-white border border-[#0176D3] rounded px-2 py-1 text-sm outline-none"
                  autoFocus
                />
                  <button onClick={(e) => handleEditSave(e, chat._id)} className="text-emerald-500 hover:text-emerald-600 transition-colors bg-white shadow-sm rounded">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                </button>
                  <button onClick={handleEditCancel} className="text-rose-400 hover:text-rose-500 transition-colors bg-white shadow-sm rounded">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 overflow-hidden">
                  <svg className="w-4 h-4 shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <span className="truncate text-sm font-medium">
                    {chat.title}
                  </span>
                </div>
                
                {/* Actions (visible on hover) */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleEditStart(e, chat)}
                    className="p-1.5 text-slate-400 hover:text-[#0176D3] rounded-md hover:bg-white hover:shadow-sm transition-all"
                  >
                    <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, chat._id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-md hover:bg-white hover:shadow-sm transition-all"
                  >
                    <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {chats.length === 0 && (
          <div className="text-sm text-slate-400 px-3 py-4 text-center">No previous chats</div>
        )}
      </div>
    </div>
  );
}
