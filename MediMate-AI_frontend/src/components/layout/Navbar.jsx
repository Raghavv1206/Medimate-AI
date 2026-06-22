import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Menu, X, Pill } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const FEATURES = [
  { label: 'Dose Tracking', desc: 'Smart daily medication reminders', icon: '💊', id: 'dose-tracking' },
  { label: 'WhatsApp Alerts', desc: 'Interactive Meta Dev Messaging', icon: '💬', id: 'whatsapp-alerts' },
  { label: 'AI Predictions', desc: 'Risk scoring & adherence forecasting', icon: '🧠', id: 'ai-predictions' },
  { label: 'Caretaker Portal', desc: 'Monitor patients remotely', icon: '👥', id: 'caretaker-portal' },
  { label: 'Escalation Pipeline', desc: 'Automated emergency escalation', icon: '🚨', id: 'escalation' },
  { label: 'Admin Dashboard', desc: 'System-wide analytics & control', icon: '⚙️', id: 'admin' },
];

export default function Navbar({ onSignIn }) {
  const [productsOpen, setProductsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProductsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleFeatureClick = (id) => {
    setProductsOpen(false);
    navigate('/', { state: { scrollTo: id } });
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const getDashboardLink = () => {
    if (!user) return null;
    if (user.role === 'admin') return '/admin';
    if (user.role === 'caretaker') return '/caretaker';
    return '/dashboard';
  };

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      background: scrolled ? 'rgba(5, 13, 26, 0.95)' : 'transparent',
      backdropFilter: scrolled ? 'blur(16px)' : 'none',
      borderBottom: scrolled ? '1px solid var(--border)' : 'none',
      transition: 'all 0.3s ease',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--cyan), var(--emerald))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Pill size={18} color="#050d1a" strokeWidth={2.5} />
          </div>
          <span className="font-syne" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            Medi<span style={{ color: 'var(--cyan)' }}>Mate</span>
            <span style={{ color: 'var(--emerald)', fontSize: 12, marginLeft: 3 }}>AI</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="hidden-mobile">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Home</Link>

          {/* Products Dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setProductsOpen(v => !v)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
                color: productsOpen ? 'var(--cyan)' : 'var(--text-secondary)',
                fontSize: 14, fontWeight: 500, transition: 'color 0.2s',
              }}
            >
              Products
              <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: productsOpen ? 'rotate(180deg)' : 'none' }} />
            </button>

            {productsOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 16px)', left: '50%',
                transform: 'translateX(-50%)',
                width: 480, borderRadius: 16,
                background: 'rgba(8, 20, 37, 0.98)',
                border: '1px solid var(--border)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
                padding: 16,
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
                animation: 'fadeInUp 0.15s ease',
              }}>
                {FEATURES.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleFeatureClick(f.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                      padding: '12px 14px', borderRadius: 10,
                      transition: 'background 0.15s',
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,255,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <span style={{ fontSize: 20 }}>{f.icon}</span>
                    <div>
                      <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{f.label}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{f.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link to="/about" className={`nav-link ${location.pathname === '/about' ? 'active' : ''}`}>About Us</Link>
          <Link to="/contact" className={`nav-link ${location.pathname === '/contact' ? 'active' : ''}`}>Contact Us</Link>
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} className="hidden-mobile">
          {user ? (
            <>
              <Link to={getDashboardLink()} style={{ textDecoration: 'none' }}>
                <button className="btn-outline" style={{ padding: '8px 18px', fontSize: 13 }}>Dashboard</button>
              </Link>
              <button
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: 13 }}
                onClick={logout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button onClick={onSignIn} className="btn-outline" style={{ padding: '8px 18px', fontSize: 13 }}>Sign In</button>
              <button onClick={onSignIn} className="btn-primary" style={{ padding: '8px 18px', fontSize: 13 }}>Get Started</button>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="show-mobile"
          onClick={() => setMobileOpen(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', display: 'none' }}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{
          background: 'rgba(5,13,26,0.98)', borderTop: '1px solid var(--border)',
          padding: '16px 24px 24px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Link to="/" className="nav-link" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }} onClick={() => setMobileOpen(false)}>Home</Link>
            <Link to="/about" className="nav-link" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }} onClick={() => setMobileOpen(false)}>About Us</Link>
            <Link to="/contact" className="nav-link" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }} onClick={() => setMobileOpen(false)}>Contact Us</Link>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {user ? (
                <>
                  <Link to={getDashboardLink()} onClick={() => setMobileOpen(false)} style={{ textDecoration: 'none' }}>
                    <button className="btn-outline" style={{ width: '100%' }}>Dashboard</button>
                  </Link>
                  <button className="btn-primary" style={{ width: '100%' }} onClick={() => { logout(); setMobileOpen(false); }}>Logout</button>
                </>
              ) : (
                <>
                  <button onClick={() => { onSignIn(); setMobileOpen(false); }} className="btn-outline" style={{ width: '100%' }}>Sign In</button>
                  <button onClick={() => { onSignIn(); setMobileOpen(false); }} className="btn-primary" style={{ width: '100%' }}>Get Started</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}
