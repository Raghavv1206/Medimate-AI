import { useState } from 'react';
import { X, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AuthModal({ onClose, initialError = '' }) {
  const [tab, setTab] = useState('login');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [form, setForm] = useState({ email: '', password: '', name: '', confirmPassword: '' });
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('patient');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const getDashboardPath = (role) => {
    if (role === 'admin') return '/admin';
    if (role === 'caretaker') return '/caretaker';
    return '/dashboard';
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login({ email: form.email, password: form.password });
      onClose();
      navigate(getDashboardPath(user.role));
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const user = await register({ name: form.name, email: form.email, password: form.password, role: selectedRole });
      onClose();
      navigate(getDashboardPath(user.role));
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    // Fetch the Google OAuth URL from the backend API, then redirect to Google
    const backendRoot = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, '');
    try {
      setLoading(true);
      const resp = await fetch(`${backendRoot}/auth/google/login/?role=${selectedRole}`, {
        headers: { 'Accept': 'application/json' },
      });
      const data = await resp.json();
      if (data.auth_url) {
        window.location.href = data.auth_url;
      } else {
        setError('Failed to get Google login URL.');
      }
    } catch (err) {
      setError('Could not connect to the server. Please try again.');
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 10,
    background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', fontSize: 14, outline: 'none',
    transition: 'border-color 0.2s',
  };
  const labelStyle = { color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', display: 'block', marginBottom: 6 };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: 'var(--bg-card)', borderRadius: 20,
        border: '1px solid var(--border)',
        boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
        overflow: 'hidden', animation: 'fadeInUp 0.2s ease',
      }}>
        <div style={{ padding: '28px 32px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 className="font-syne" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
              {tab === 'login' ? 'Welcome back' : tab === 'register' ? 'Create account' : 'Reset password'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
              {tab === 'login' ? 'Sign in to MediMate AI' : tab === 'register' ? 'Start your medication journey' : "We'll send you a reset link"}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {tab !== 'forgot' && (
          <div style={{ display: 'flex', padding: '20px 32px 0', borderBottom: '1px solid var(--border)', marginTop: 20 }}>
            {['login', 'register'].map(t => (
              <button key={t} onClick={() => { setTab(t); setError(''); }}
                style={{ flex: 1, padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, transition: 'all 0.2s', color: tab === t ? 'var(--cyan)' : 'var(--text-muted)', borderBottom: tab === t ? '2px solid var(--cyan)' : '2px solid transparent', marginBottom: -1 }}>
                {t === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>
        )}

        <div style={{ padding: '24px 32px 32px' }}>
          {tab !== 'forgot' && (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>I AM SIGNING IN / SIGNING UP AS:</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {['patient', 'caretaker'].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedRole(r)}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: selectedRole === r ? '2px solid var(--cyan)' : '1px solid var(--border)',
                        background: selectedRole === r ? 'rgba(0, 255, 157, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        color: selectedRole === r ? 'var(--cyan)' : 'var(--text-secondary)',
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        textTransform: 'capitalize',
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleGoogleLogin} style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>or continue with email</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
            </>
          )}

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
              <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>
            </div>
          )}

          {tab === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label style={labelStyle}>EMAIL</label><input type="email" required value={form.email} onChange={set('email')} placeholder="you@example.com" style={inputStyle} onFocus={e => e.target.style.borderColor='var(--cyan)'} onBlur={e => e.target.style.borderColor='var(--border)'} /></div>
              <div><label style={labelStyle}>PASSWORD</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass?'text':'password'} required value={form.password} onChange={set('password')} placeholder="••••••••" style={{ ...inputStyle, paddingRight: 44 }} onFocus={e => e.target.style.borderColor='var(--cyan)'} onBlur={e => e.target.style.borderColor='var(--border)'} />
                  <button type="button" onClick={() => setShowPass(v=>!v)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>{showPass?<EyeOff size={16}/>:<Eye size={16}/>}</button>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}><button type="button" onClick={() => setTab('forgot')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cyan)', fontSize: 12 }}>Forgot password?</button></div>
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          {tab === 'register' && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={labelStyle}>FULL NAME</label><input type="text" required value={form.name} onChange={set('name')} placeholder="John Doe" style={inputStyle} onFocus={e => e.target.style.borderColor='var(--cyan)'} onBlur={e => e.target.style.borderColor='var(--border)'} /></div>
              <div><label style={labelStyle}>EMAIL</label><input type="email" required value={form.email} onChange={set('email')} placeholder="you@example.com" style={inputStyle} onFocus={e => e.target.style.borderColor='var(--cyan)'} onBlur={e => e.target.style.borderColor='var(--border)'} /></div>
              <div><label style={labelStyle}>PASSWORD</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass?'text':'password'} required value={form.password} onChange={set('password')} placeholder="Min. 8 characters" style={{ ...inputStyle, paddingRight: 44 }} onFocus={e => e.target.style.borderColor='var(--cyan)'} onBlur={e => e.target.style.borderColor='var(--border)'} />
                  <button type="button" onClick={() => setShowPass(v=>!v)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>{showPass?<EyeOff size={16}/>:<Eye size={16}/>}</button>
                </div>
              </div>
              <div><label style={labelStyle}>CONFIRM PASSWORD</label><input type="password" required value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="••••••••" style={inputStyle} onFocus={e => e.target.style.borderColor='var(--cyan)'} onBlur={e => e.target.style.borderColor='var(--border)'} /></div>
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading && <Loader2 size={16} />}
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}

          {tab === 'forgot' && (
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>Enter your email and we'll send you a password reset link.</p>
              <form onSubmit={(e) => { e.preventDefault(); alert('Reset link sent to ' + form.email); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div><label style={labelStyle}>EMAIL</label><input type="email" required value={form.email} onChange={set('email')} placeholder="you@example.com" style={inputStyle} onFocus={e => e.target.style.borderColor='var(--cyan)'} onBlur={e => e.target.style.borderColor='var(--border)'} /></div>
                <button type="submit" className="btn-primary" style={{ width: '100%' }}>Send Reset Link</button>
                <button type="button" onClick={() => setTab('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cyan)', fontSize: 13 }}>← Back to login</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
