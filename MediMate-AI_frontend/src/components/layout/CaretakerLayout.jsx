import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, AlertTriangle, LogOut, Pill, Bell, Menu, X } from 'lucide-react';
import { useAuth, apiClient } from '@/context/AuthContext';

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/caretaker' },
  { label: 'Patients', icon: Users, to: '/caretaker/patients' },
  { label: 'Escalations', icon: AlertTriangle, to: '/caretaker/escalations' },
];

export default function CaretakerLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const displayName = user?.name || user?.full_name || 'Caretaker';
  const initial = displayName.charAt(0).toUpperCase();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null);

  const handleLogout = async () => { await logout(); navigate('/'); };

  const handleToggleNotif = async () => {
    const nextState = !notifOpen;
    setNotifOpen(nextState);
    if (nextState && notifications.some(n => !n.is_read)) {
      try {
        await apiClient.post('/escalation/logs/mark-read/');
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      } catch (err) {
        console.error('Failed to mark notifications as read:', err);
      }
    }
  };

  useEffect(() => {
    apiClient.get('/escalation/logs/')
      .then(res => {
        const logs = res.data?.logs || [];
        // Filter out resolved alerts. Keep both read and unread active alerts.
        setNotifications(logs.filter(l => l.dose_status !== 'taken' && l.dose_status !== 'skipped').slice(0, 8));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const Sidebar = ({ mobile = false }) => (
    <div style={{
      width: mobile ? '100%' : 240,
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      height: mobile ? 'auto' : '100vh',
      display: 'flex', flexDirection: 'column',
      padding: '0 12px',
      position: mobile ? 'static' : 'sticky',
      top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 12px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #a78bfa, var(--cyan))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Pill size={16} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-syne" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>MediMate <span style={{ color: '#a78bfa' }}>Care</span></div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Caretaker Portal</div>
          </div>
        </Link>
      </div>

      {/* User profile */}
      <div style={{ padding: '12px 12px', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #a78bfa, var(--cyan))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={displayName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{initial}</span>
            )}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
            <div style={{ fontSize: 11, color: '#a78bfa' }}>Caretaker</div>
          </div>
        </div>
      </div>

      {/* Nav section label */}
      <p style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 12px' }}>CARE PANEL</p>

      {/* Nav links */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ label, icon: Icon, to }) => {
          const active = location.pathname === to || (to !== '/caretaker' && location.pathname.startsWith(to));
          return (
            <Link key={to} to={to} className={`sidebar-item ${active ? 'active' : ''}`} style={active ? { borderLeft: '2px solid #a78bfa', color: '#a78bfa' } : {}} onClick={() => setMobileOpen(false)}>
              <Icon size={17} /> {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: '12px 0', borderTop: '1px solid var(--border)' }}>
        <button onClick={handleLogout} className="sidebar-item" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
          <LogOut size={17} /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Desktop sidebar */}
      <div style={{ flexShrink: 0 }} className="caretaker-sidebar">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(5,13,26,0.9)', backdropFilter: 'blur(8px)' }} onClick={() => setMobileOpen(false)}>
          <div style={{ width: 260, height: '100%', background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <div style={{ height: 56, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16, position: 'sticky', top: 0, background: 'rgba(5,13,26,0.9)', backdropFilter: 'blur(12px)', zIndex: 10 }}>
          <button onClick={() => setMobileOpen(true)} className="caretaker-mobile-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', display: 'none' }}>
            <Menu size={20} />
          </button>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600 }}>CARETAKER PORTAL</span>
          </div>

          {/* Notification bell with dropdown */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            {(() => {
              const unreadCount = notifications.filter(n => !n.is_read).length;
              return (
                <button onClick={handleToggleNotif} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', position: 'relative' }}>
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', padding: '0 3px' }}>{unreadCount}</span>
                  )}
                </button>
              );
            })()}

            {notifOpen && (
              <div style={{ position: 'absolute', top: 40, right: 0, width: 340, maxHeight: 420, overflowY: 'auto', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.5)', zIndex: 100, padding: '12px 0' }}>
                <div style={{ padding: '8px 16px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Escalation Alerts</span>
                  <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600 }}>{notifications.filter(n => !n.is_read).length} new</span>
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No pending escalations</div>
                ) : (
                  notifications.map((n, i) => (
                    <div key={n.id || i} style={{ padding: '10px 16px', borderBottom: i < notifications.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(167,139,250,0.06)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      onClick={() => { setNotifOpen(false); navigate('/caretaker/escalations'); }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <AlertTriangle size={13} color="#ef4444" />
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{n.patient_name || `Patient #${n.patient}`}</span>
                        {!n.is_read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', marginLeft: 'auto' }} />}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {n.medicine_name ? `${n.medicine_name} — ` : ''}{n.message_sent || ''}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                        {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                      </div>
                    </div>
                  ))
                )}
                {notifications.length > 0 && (
                  <div style={{ padding: '10px 16px', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                    <Link to="/caretaker/escalations" onClick={() => setNotifOpen(false)} style={{ fontSize: 12, color: '#a78bfa', textDecoration: 'none', fontWeight: 600 }}>View all escalations →</Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, padding: '32px 28px' }}>{children}</div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .caretaker-sidebar { display: none !important; }
          .caretaker-mobile-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
