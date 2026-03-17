import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function AdminDashboard() {
  const navigate  = useNavigate();
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [deleting, setDeleting] = useState(null);

  const token    = localStorage.getItem('sf_token');
  const me       = JSON.parse(localStorage.getItem('sf_user') || '{}');

  useEffect(() => {
    if (!token || me.role !== 'admin') { navigate('/'); return; }
    fetchUsers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUsers = async () => {
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${API}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not fetch users');
      setUsers(data.users);
    } catch (err) { setError(err.message); }
    finally       { setLoading(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this user?')) return;
    setDeleting(id);
    try {
      const res  = await fetch(`${API}/api/admin/user/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(prev => prev.filter(u => u._id !== id));
    } catch (err) { alert(err.message); }
    finally       { setDeleting(null); }
  };

  const logout = () => {
    localStorage.removeItem('sf_token');
    localStorage.removeItem('sf_user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen w-full bg-[#fafbfc]">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0176D3] flex items-center justify-center shadow-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-gray-900 leading-none">Salesforce AI</h1>
              <p className="text-[11px] text-[#0176D3] font-semibold leading-none mt-0.5">Admin Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')}
              className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100">
              ← Back to Chat
            </button>
            <button onClick={logout}
              className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 text-gray-600
                hover:border-red-300 hover:text-red-500 transition-all">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Users', value: users.length, icon: '👥', color: 'bg-blue-50 border-blue-100' },
            { label: 'Admins',      value: users.filter(u => u.role === 'admin').length, icon: '🔑', color: 'bg-amber-50 border-amber-100' },
            { label: 'Regular Users', value: users.filter(u => u.role === 'user').length, icon: '👤', color: 'bg-emerald-50 border-emerald-100' },
          ].map(s => (
            <div key={s.label} className={`${s.color} border rounded-2xl p-5 flex items-center gap-4 bg-white shadow-sm`}>
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className="text-2xl font-bold text-gray-900">{loading ? '—' : s.value}</p>
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-800">All Users</h2>
            <button onClick={fetchUsers}
              className="text-xs font-medium text-[#0176D3] hover:underline">
              Refresh
            </button>
          </div>

          {error && (
            <div className="m-6 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{error}</div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <svg className="w-7 h-7 animate-spin text-[#0176D3]" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2"/>
                <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Name', 'Email', 'Role', 'Joined', 'Action'].map(h => (
                      <th key={h} className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map(u => (
                    <tr key={u._id} className="hover:bg-gray-50/60 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0176D3] to-[#014486]
                            flex items-center justify-center text-white font-bold text-xs shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-800">{u.name}</span>
                          {u._id === me.id && (
                            <span className="text-[10px] font-semibold bg-[#0176D3]/10 text-[#0176D3] px-2 py-0.5 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold
                          ${u.role === 'admin'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'}`}>
                          {u.role === 'admin' ? '🔑 Admin' : '👤 User'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-xs">{formatDate(u.createdAt)}</td>
                      <td className="px-6 py-4">
                        {u._id !== me.id ? (
                          <button
                            onClick={() => handleDelete(u._id)}
                            disabled={deleting === u._id}
                            className="opacity-0 group-hover:opacity-100 text-xs font-semibold
                              text-rose-500 hover:text-rose-700 hover:bg-rose-50
                              px-3 py-1.5 rounded-lg transition-all border border-transparent
                              hover:border-rose-200 disabled:opacity-40"
                          >
                            {deleting === u._id ? 'Deleting…' : 'Delete'}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && !loading && (
                    <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-400 text-sm">No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
