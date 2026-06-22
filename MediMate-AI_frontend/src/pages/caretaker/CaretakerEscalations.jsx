import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Loader2, Filter, Calendar, MessageSquare, Clock } from 'lucide-react';
import { apiClient } from '@/context/AuthContext';
import CaretakerLayout from '@/components/layout/CaretakerLayout';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
];

export default function CaretakerEscalations() {
  const [escalations, setEscalations] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    apiClient.get('/escalation/logs/')
      .then(res => {
        setEscalations(res.data?.logs || []);
        setTotalCount(res.data?.count || 0);
      })
      .catch(() => { setEscalations([]); setTotalCount(0); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = escalations;

    if (statusFilter === 'pending') {
      result = result.filter(e => !e.resolved);
    } else if (statusFilter === 'resolved') {
      result = result.filter(e => e.resolved);
    }

    if (dateFilter) {
      result = result.filter(e => {
        if (!e.created_at) return false;
        return e.created_at.startsWith(dateFilter);
      });
    }

    return result;
  }, [escalations, statusFilter, dateFilter]);

  const pendingCount = escalations.filter(e => !e.resolved).length;
  const resolvedCount = escalations.filter(e => e.resolved).length;

  if (loading) {
    return (
      <CaretakerLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <Loader2 size={32} color="var(--cyan)" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      </CaretakerLayout>
    );
  }

  return (
    <CaretakerLayout>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-syne" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Escalation Logs</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Track and review escalation alerts for your patients.</p>
      </div>

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: totalCount, color: '#a78bfa' },
          { label: 'Pending', value: pendingCount, color: '#ef4444' },
          { label: 'Resolved', value: resolvedCount, color: 'var(--emerald)' },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 12, minWidth: 140 }}>
            <div className="font-syne" style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={14} color="var(--text-muted)" />
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Filters:</span>
        </div>

        {/* Status filter */}
        <div style={{ display: 'flex', gap: 4 }}>
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: statusFilter === opt.value ? '1px solid #a78bfa' : '1px solid var(--border)',
                background: statusFilter === opt.value ? 'rgba(167,139,250,0.15)' : 'var(--bg-secondary)',
                color: statusFilter === opt.value ? '#a78bfa' : 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Date filter */}
        <div style={{ position: 'relative' }}>
          <Calendar size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            style={{
              padding: '6px 12px 6px 32px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text-primary)',
              fontSize: 12,
              outline: 'none',
              cursor: 'pointer',
            }}
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              style={{ marginLeft: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Escalation cards */}
      {filtered.length === 0 ? (
        <div className="glass-card" style={{ padding: 56, textAlign: 'center' }}>
          <AlertTriangle size={40} color="var(--text-muted)" style={{ marginBottom: 14, opacity: 0.4 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 15, fontWeight: 500, marginBottom: 4 }}>No escalations found</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            {statusFilter !== 'all' || dateFilter ? 'Try adjusting your filters.' : 'All patients are doing well — no alerts to show.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((e, i) => {
            const isPending = !e.resolved;
            return (
              <div key={e.id || i} className="glass-card" style={{
                padding: '20px 24px',
                border: `1px solid ${isPending ? 'rgba(239,68,68,0.25)' : 'rgba(0,255,157,0.15)'}`,
                transition: 'transform 0.15s',
              }}
                onMouseEnter={ev => ev.currentTarget.style.transform = 'translateX(3px)'}
                onMouseLeave={ev => ev.currentTarget.style.transform = 'none'}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                  {/* Icon */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: isPending ? 'rgba(239,68,68,0.12)' : 'rgba(0,255,157,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <AlertTriangle size={18} color={isPending ? '#ef4444' : 'var(--emerald)'} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{e.patient_name || `Patient #${e.patient}`}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                        background: isPending ? 'rgba(239,68,68,0.1)' : 'rgba(0,255,157,0.1)',
                        color: isPending ? '#ef4444' : 'var(--emerald)',
                      }}>
                        {isPending ? 'Pending' : 'Resolved'}
                      </span>
                    </div>

                    {e.medicine_name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600 }}>💊 {e.medicine_name}</span>
                      </div>
                    )}

                    {e.escalation_type && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 500 }}>Type: {e.escalation_type}</span>
                      </div>
                    )}

                    {e.message && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 6 }}>
                        <MessageSquare size={13} color="var(--text-muted)" style={{ marginTop: 1, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{e.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <Clock size={13} color="var(--text-muted)" />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {e.created_at ? new Date(e.created_at).toLocaleString() : '—'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CaretakerLayout>
  );
}
