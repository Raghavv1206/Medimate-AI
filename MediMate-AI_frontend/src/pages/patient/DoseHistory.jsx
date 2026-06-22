import { useState, useEffect } from 'react';
import { Filter, CheckCircle, XCircle, SkipForward, Clock, Search, Loader2 } from 'lucide-react';
import PatientLayout from '@/components/layout/PatientLayout';
import { apiClient } from '@/context/AuthContext';

const STATUS_CONFIG = {
  taken:   { label: 'Taken',   color: 'var(--emerald)', bg: 'rgba(0,255,157,0.12)', icon: CheckCircle },
  missed:  { label: 'Missed',  color: '#ef4444',        bg: 'rgba(239,68,68,0.12)', icon: XCircle },
  skipped: { label: 'Skipped', color: 'var(--amber)',   bg: 'rgba(245,158,11,0.12)', icon: SkipForward },
  pending: { label: 'Pending', color: 'var(--cyan)',     bg: 'rgba(0,212,255,0.08)', icon: Clock },
  rescheduled: { label: 'Rescheduled', color: 'var(--cyan)', bg: 'rgba(0,212,255,0.08)', icon: Clock },
};

export default function DoseHistory() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [doses, setDoses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const params = {};
        if (dateFrom) params.start_date = dateFrom;
        if (dateTo) params.end_date = dateTo;
        if (filter !== 'all') params.status = filter;
        // Default: backend returns last 7 days if no params
        if (!dateFrom && !dateTo) {
          const d = new Date();
          d.setDate(d.getDate() - 30);
          params.start_date = d.toISOString().split('T')[0];
          params.end_date = new Date().toISOString().split('T')[0];
        }
        const { data } = await apiClient.get('/doses/history/', { params });
        setDoses(data.doses || []);
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [dateFrom, dateTo, filter]);

  // Client-side search filter for medicine name
  const filtered = doses.filter(d => {
    if (search && !((d.medicine_name || '').toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const inputStyle = { padding: '9px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' };

  return (
    <PatientLayout>
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-syne" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Dose History</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>View and filter your complete medication history.</p>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 14px', flex: 1, minWidth: 200 }}>
            <Search size={14} color="var(--text-muted)" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search medicine..." style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 13, width: '100%' }} />
          </div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />

          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'taken', 'missed', 'skipped'].map(s => (
              <button key={s} onClick={() => setFilter(s)} style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                background: filter === s ? (s === 'all' ? 'var(--cyan)' : STATUS_CONFIG[s]?.bg || 'var(--cyan)') : 'rgba(255,255,255,0.04)',
                border: filter === s ? `1px solid ${s === 'all' ? 'var(--cyan)' : STATUS_CONFIG[s]?.color || 'var(--cyan)'}` : '1px solid var(--border)',
                color: filter === s ? (s === 'all' ? '#050d1a' : STATUS_CONFIG[s]?.color || '#050d1a') : 'var(--text-muted)',
              }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={28} color="var(--cyan)" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Date</th>
                <th>Scheduled Time</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No records found.</td></tr>
              ) : (
                filtered.map(dose => {
                  const cfg = STATUS_CONFIG[dose.status] || STATUS_CONFIG.pending;
                  const Icon = cfg?.icon || Clock;
                  return (
                    <tr key={dose.id}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{dose.medicine_name} {dose.medicine_dosage}</td>
                      <td>{dose.scheduled_date}</td>
                      <td className="font-mono">{dose.scheduled_time?.slice(0, 5)}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: cfg?.bg, color: cfg?.color }}>
                          <Icon size={12} /> {cfg?.label}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>{dose.skip_reason || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 12 }}>{filtered.length} records found</p>
    </PatientLayout>
  );
}
