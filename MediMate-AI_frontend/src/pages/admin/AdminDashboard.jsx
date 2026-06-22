import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Activity, AlertTriangle, MessageSquare, TrendingUp, CheckCircle, Loader2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { apiClient } from '@/context/AuthContext';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersPage, setUsersPage] = useState(1);
  const [usersMeta, setUsersMeta] = useState({});
  const [roleFilter, setRoleFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, escRes] = await Promise.all([
          apiClient.get('/admin/stats/').catch(() => ({ data: {} })),
          apiClient.get('/escalation/logs/').catch(() => ({ data: { logs: [] } })),
        ]);
        setStats(statsRes.data);
        setEscalations((escRes.data.logs || []).slice(0, 5));
      } catch (err) {
        console.error('Admin fetch error:', err);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const params = { page: usersPage };
        if (roleFilter) params.role = roleFilter;
        if (searchQuery) params.search = searchQuery;
        const { data } = await apiClient.get('/admin/users/', { params });
        setUsers(data.users || []);
        setUsersMeta({ total: data.total_count, pages: data.total_pages, current: data.current_page, hasNext: data.has_next, hasPrev: data.has_previous });
      } catch (err) {
        console.error('Users fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [usersPage, roleFilter, searchQuery]);

  const STAT_CARDS = stats ? [
    { label: 'Total Patients', value: stats.total_patients || 0, sub: `${stats.total_users || 0} total users`, color: 'var(--cyan)', icon: Users },
    { label: 'Active Schedules', value: stats.total_schedules || 0, sub: 'Across all patients', color: 'var(--emerald)', icon: Activity },
    { label: 'Total Doses', value: stats.total_doses || 0, sub: `${stats.compliance_rate || 0}% compliance`, color: '#a78bfa', icon: CheckCircle },
    { label: 'Escalations', value: stats.total_escalations || 0, sub: `${stats.risk_breakdown?.high || 0} high risk`, color: '#ef4444', icon: AlertTriangle },
  ] : [];

  return (
    <AdminLayout>
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-syne" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>System Overview</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Platform-wide statistics and health monitoring.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {STAT_CARDS.map(({ label, value, sub, color, icon: Icon }) => (
          <div key={label} className="glass-card" style={{ padding: '22px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={20} color={color} />
              </div>
              <TrendingUp size={14} color="var(--text-muted)" />
            </div>
            <div className="font-syne" style={{ fontSize: 32, fontWeight: 800, color }}>{value.toLocaleString()}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Risk Breakdown */}
      {stats?.risk_breakdown && (
        <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Risk Level Distribution</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Low', value: stats.risk_breakdown.low, color: 'var(--emerald)' },
              { label: 'Medium', value: stats.risk_breakdown.medium, color: 'var(--amber)' },
              { label: 'High', value: stats.risk_breakdown.high, color: '#f97316' },
              { label: 'Critical', value: stats.risk_breakdown.critical, color: '#ef4444' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, background: `${r.color}10`, border: `1px solid ${r.color}30` }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: r.color }}>{r.value}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        {/* Users table */}
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Users</h2>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{usersMeta.total || 0} total</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px' }}>
                <Search size={12} color="var(--text-muted)" />
                <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setUsersPage(1); }} placeholder="Search..." style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 12, width: '100%' }} />
              </div>
              <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setUsersPage(1); }} style={{ padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 12, outline: 'none' }}>
                <option value="">All roles</option>
                <option value="patient">Patient</option>
                <option value="caretaker">Caretaker</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <table className="data-table">
            <thead><tr><th>Name</th><th>Role</th><th>Status</th></tr></thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No users found</td></tr>
              ) : users.map(u => (
                <tr key={u.id}
                    onClick={() => u.role === 'patient' && navigate(`/admin/patient/${u.id}`)}
                    style={{ cursor: u.role === 'patient' ? 'pointer' : 'default', transition: 'background 0.2s' }}
                    onMouseEnter={e => u.role === 'patient' && (e.currentTarget.style.background = 'rgba(0,212,255,0.04)')}
                    onMouseLeave={e => u.role === 'patient' && (e.currentTarget.style.background = 'transparent')}>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{u.full_name || u.username}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: u.role === 'admin' ? 'rgba(244,114,182,0.12)' : u.role === 'caretaker' ? 'rgba(167,139,250,0.12)' : 'rgba(0,212,255,0.1)', color: u.role === 'admin' ? '#f472b6' : u.role === 'caretaker' ? 'var(--purple-light)' : 'var(--cyan)' }}>{u.role}</span>
                  </td>
                  <td>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: u.is_active ? 'var(--emerald)' : 'var(--text-muted)', display: 'inline-block', marginRight: 6 }} />
                    <span style={{ fontSize: 12, color: u.is_active ? 'var(--emerald)' : 'var(--text-muted)' }}>{u.is_active ? 'active' : 'inactive'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {usersMeta.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: 12, borderTop: '1px solid var(--border)' }}>
              <button disabled={!usersMeta.hasPrev} onClick={() => setUsersPage(p => p - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: usersMeta.hasPrev ? 'var(--cyan)' : 'var(--text-muted)' }}><ChevronLeft size={16} /></button>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {usersMeta.current} of {usersMeta.pages}</span>
              <button disabled={!usersMeta.hasNext} onClick={() => setUsersPage(p => p + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: usersMeta.hasNext ? 'var(--cyan)' : 'var(--text-muted)' }}><ChevronRight size={16} /></button>
            </div>
          )}
        </div>

        {/* Escalations */}
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Recent Escalations</h2>
          </div>
          <table className="data-table">
            <thead><tr><th>Patient</th><th>Type</th><th>Status</th></tr></thead>
            <tbody>
              {escalations.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No escalations</td></tr>
              ) : escalations.map((e, i) => (
                <tr key={e.id || i}
                    onClick={() => e.patient && navigate(`/admin/patient/${e.patient}`)}
                    style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,212,255,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{e.patient_name || `Patient #${e.patient}`}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.medicine_name || ''} · {e.created_at ? new Date(e.created_at).toLocaleTimeString() : ''}</div>
                  </td>
                  <td><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{e.escalation_type || e.type || 'Alert'}</span></td>
                  <td>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: e.resolved ? 'rgba(0,255,157,0.1)' : 'rgba(239,68,68,0.1)', color: e.resolved ? 'var(--emerald)' : '#ef4444' }}>{e.resolved ? 'resolved' : 'pending'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
