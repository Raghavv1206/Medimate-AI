import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, Calendar, Filter, Loader2, CheckCircle2, Clock,
  XCircle, Pill, User, MessageCircle, ShieldAlert, TrendingUp
} from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { apiClient } from '@/context/AuthContext';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', icon: Clock },
  resolved: { label: 'Resolved', color: 'var(--emerald)', bg: 'rgba(0,255,157,0.1)', border: 'rgba(0,255,157,0.25)', icon: CheckCircle2 },
};

export default function AdminEscalations() {
  const [logs, setLogs] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [hoveredCard, setHoveredCard] = useState(null);

  const fetchEscalations = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFilter) params.date = dateFilter;
      const { data } = await apiClient.get('/escalation/logs/', { params });
      setLogs(data.logs || []);
      setCount(data.count || (data.logs || []).length);
    } catch (err) {
      console.error('Failed to fetch escalation logs:', err);
      setLogs([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    fetchEscalations();
  }, [fetchEscalations]);

  const filteredLogs = statusFilter === 'all'
    ? logs
    : statusFilter === 'resolved'
      ? logs.filter((l) => l.resolved)
      : logs.filter((l) => !l.resolved);

  const pendingCount = logs.filter((l) => !l.resolved).length;
  const resolvedCount = logs.filter((l) => l.resolved).length;

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getEscalationTypeIcon = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('miss')) return XCircle;
    if (t.includes('risk')) return ShieldAlert;
    if (t.includes('adherence')) return TrendingUp;
    return AlertTriangle;
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={20} color="#ef4444" />
          </div>
          <div>
            <h1 className="font-syne" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>Escalation Logs</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Monitor and review all patient escalation alerts</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div className="glass-card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,212,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={18} color="var(--cyan)" />
            </div>
            <div>
              <div className="font-syne" style={{ fontSize: 28, fontWeight: 800, color: 'var(--cyan)' }}>{count}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Escalations</div>
            </div>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} color="#ef4444" />
            </div>
            <div>
              <div className="font-syne" style={{ fontSize: 28, fontWeight: 800, color: '#ef4444' }}>{pendingCount}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pending</div>
            </div>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,255,157,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={18} color="var(--emerald)" />
            </div>
            <div>
              <div className="font-syne" style={{ fontSize: 28, fontWeight: 800, color: 'var(--emerald)' }}>{resolvedCount}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Resolved</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
            <Calendar size={16} color="var(--text-muted)" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', colorScheme: 'dark' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
            <Filter size={16} color="var(--text-muted)" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}
            >
              Clear Date
            </button>
          )}
          <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            Showing {filteredLogs.length} of {count} escalations
          </span>
        </div>
      </div>

      {/* Escalation List */}
      {loading ? (
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 }}>
          <Loader2 size={24} color="#ef4444" style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading escalation logs...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 }}>
          <AlertTriangle size={40} color="var(--text-muted)" strokeWidth={1} />
          <span style={{ fontSize: 16, color: 'var(--text-secondary)', fontWeight: 500 }}>No escalations found</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Adjust your filters or check back later</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredLogs.map((log, idx) => {
            const status = log.resolved ? STATUS_CONFIG.resolved : STATUS_CONFIG.pending;
            const TypeIcon = getEscalationTypeIcon(log.escalation_type);
            const isHovered = hoveredCard === log.id;
            return (
              <div
                key={log.id || idx}
                className="glass-card"
                onMouseEnter={() => setHoveredCard(log.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  padding: '20px 24px',
                  transition: 'all 0.2s',
                  borderColor: isHovered ? status.border : undefined,
                  transform: isHovered ? 'translateY(-1px)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 14, flex: 1, minWidth: 250 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: `${status.color}15`, border: `1px solid ${status.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <TypeIcon size={20} color={status.color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{log.patient_name || `Patient #${log.patient}`}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 6,
                          background: status.bg, color: status.color, display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}>
                          <status.icon size={10} />
                          {status.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 8 }}>
                        {log.medicine_name && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--cyan)' }}>
                            <Pill size={12} /> {log.medicine_name}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--purple-light)' }}>
                          <ShieldAlert size={12} /> {log.escalation_type || 'Alert'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                          <Calendar size={12} /> {formatTimestamp(log.created_at)}
                        </div>
                      </div>
                      {log.message && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <MessageCircle size={14} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
                          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{log.message}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        select option { background: var(--bg-secondary); color: var(--text-primary); }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.6); cursor: pointer; }
      `}</style>
    </AdminLayout>
  );
}
