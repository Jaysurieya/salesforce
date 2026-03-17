import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm]     = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      return setError('Passwords do not match.');
    }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      localStorage.setItem('sf_token', data.token);
      localStorage.setItem('sf_user',  JSON.stringify(data.user));
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#0b1f3a] via-[#0d2648] to-[#0a1b35] px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#0176D3] flex items-center justify-center mx-auto mb-4
            shadow-[0_8px_32px_rgba(1,118,211,0.45)]">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="white">
              <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
          <p className="text-white/40 text-sm">Join Salesforce AI Assistant</p>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.35)] p-8">

          {error && (
            <div className="mb-5 flex items-center gap-2.5 bg-red-50 border border-red-200
              rounded-xl px-4 py-3 text-sm text-red-600 animate-[slideUp_0.3s_ease-out]">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Full name',        name: 'name',     type: 'text',     ph: 'John Doe',        ac: 'name' },
              { label: 'Email address',    name: 'email',    type: 'email',    ph: 'you@example.com', ac: 'email' },
              { label: 'Password',         name: 'password', type: 'password', ph: '••••••••',         ac: 'new-password' },
              { label: 'Confirm password', name: 'confirm',  type: 'password', ph: '••••••••',         ac: 'new-password' },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{f.label}</label>
                <input
                  type={f.type} name={f.name} autoComplete={f.ac}
                  value={form[f.name]} onChange={handleChange} required
                  placeholder={f.ph}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800
                    text-sm outline-none transition-all placeholder:text-gray-400
                    focus:border-[#0176D3] focus:bg-white focus:ring-3 focus:ring-[#0176D3]/15"
                />
              </div>
            ))}

            <button
              type="submit" disabled={loading}
              className="w-full mt-1 py-3.5 rounded-xl bg-[#0176D3] text-white font-semibold text-sm
                shadow-[0_4px_16px_rgba(1,118,211,0.4)]
                hover:bg-[#014486] hover:shadow-[0_6px_20px_rgba(1,118,211,0.5)]
                disabled:bg-gray-300 disabled:shadow-none
                transition-all duration-200 active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                    <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Creating account…
                </span>
              ) : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-[#0176D3] font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          Salesforce AI Assistant · Secured with JWT
        </p>
      </div>
    </div>
  );
}
