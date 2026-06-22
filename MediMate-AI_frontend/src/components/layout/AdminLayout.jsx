import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, AlertTriangle, MessageSquare, LogOut, Pill, Bell, Menu } from 'lucide-react';
import { useAuth, apiClient } from '@/context/AuthContext';

const NAV = [
  { label: 'Overview', icon: LayoutDashboard, to: '/admin' },
  { label: 'User Management', icon: Users, to: '/admin/users' },
  { label: 'Escalation Log', icon: AlertTriangle, to: '/admin/escalations' },
  { label: 'WhatsApp Log', icon: MessageSquare, to: '/admin/whatsapp' },
];

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const displayName = user?.name || user?.full_name || 'Admin';
  const initial = displayName.charAt(0).toUpperCase();
  const [mobile, setMobile] = useState(false);
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

  const Sidebar = () => (
    <div style={{ width: 240, background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)', height: '100vh', display: 'flex', flexDirection: 'column', padding: '0 12px', position: 'sticky', top: 0 }}>
      <div style={{ padding: '20px 12px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #f472b6, var(--purple-light))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Pill size={16} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-syne" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>MediMate <span style={{ color: '#f472b6' }}>Admin</span></div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>System Console</div>
          </div>
        </Link>
      </div>

      <div style={{ padding: '12px 12px', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #f472b6, var(--purple-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={displayName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{initial}</span>
            )}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
            <div style={{ fontSize: 11, color: '#f472b6' }}>Administrator</div>
          </div>
        </div>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 12px' }}>ADMIN PANEL</p>
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ label, icon: Icon, to }) => {
          const active = location.pathname === to || (to !== '/admin' && location.pathname.startsWith(to));
          return (
            <Link key={to} to={to} className={`sidebar-item ${active ? 'active' : ''}`} style={active ? { borderLeft: '2px solid #f472b6', color: '#f472b6' } : {}}>
              <Icon size={17} /> {label}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '12px 0', borderTop: '1px solid var(--border)' }}>
        <button onClick={handleLogout} className="sidebar-item" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
          <LogOut size={17} /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div style={{ flexShrink: 0 }} className="admin-sidebar">
        <Sidebar />
      </div>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 56, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16, position: 'sticky', top: 0, background: 'rgba(5,13,26,0.9)', backdropFilter: 'blur(12px)', zIndex: 10 }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12, color: '#f472b6', fontWeight: 600 }}>ADMIN CONSOLE</span>
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
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>System Escalations</span>
                  <span style={{ fontSize: 11, color: '#f472b6', fontWeight: 600 }}>{notifications.filter(n => !n.is_read).length} new</span>
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No pending escalations</div>
                ) : (
                  notifications.map((n, i) => (
                    <div key={n.id || i} style={{ padding: '10px 16px', borderBottom: i < notifications.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,114,182,0.06)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      onClick={() => { setNotifOpen(false); navigate('/admin/escalations'); }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <AlertTriangle size={13} color="#ef4444" />
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{n.patient_name || `Patient #${n.patient}`}</span>
                        {!n.is_read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f472b6', marginLeft: 'auto' }} />}
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
                    <Link to="/admin/escalations" onClick={() => setNotifOpen(false)} style={{ fontSize: 12, color: '#f472b6', textDecoration: 'none', fontWeight: 600 }}>View all escalations →</Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div style={{ flex: 1, padding: '32px 28px' }}>{children}</div>
      </div>
      <style>{`@media (max-width: 768px) { .admin-sidebar { display: none !important; } }`}</style>
    </div>
  );
}
