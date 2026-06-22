import { useState, useEffect } from 'react';
import { Activity, Clock, CheckCircle, XCircle, SkipForward, Plus, TrendingUp, AlertCircle, ChevronDown, ChevronUp, X, Loader2 } from 'lucide-react';
import PatientLayout from '@/components/layout/PatientLayout';
import { apiClient } from '@/context/AuthContext';
import { useAuth } from '@/context/AuthContext';

function AdherenceRing({ percentage }) {
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percentage / 100) * circumference;
  const color = percentage >= 80 ? 'var(--emerald)' : percentage >= 50 ? 'var(--amber)' : '#ef4444';
  return (
    <div style={{ position: 'relative', width: 140, height: 140 }}>
      <svg width="140" height="140" className="progress-ring">
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span className="font-syne" style={{ fontSize: 26, fontWeight: 800, color }}>{percentage}%</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>ADHERENCE</span>
      </div>
    </div>
  );
}

function SkipModal({ dose, onClose, onSkip }) {
  const [reason, setReason] = useState('');
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: 24, width: '100%', maxWidth: 360, animation: 'fadeInUp 0.2s ease' }}>
        <h4 className="font-syne" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Skip Dose</h4>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>Please provide a reason for skipping this dose.</p>
        <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Nausea, forgot, side effects..."
          style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13, resize: 'vertical', minHeight: 80, outline: 'none', fontFamily: 'Inter, sans-serif' }} />
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={onClose} className="btn-outline" style={{ flex: 1, padding: '10px' }}>Cancel</button>
          <button onClick={() => onSkip(reason)} className="btn-primary" style={{ flex: 1, padding: '10px', background: 'rgba(245,158,11,0.9)' }} disabled={!reason.trim()}>Skip Dose</button>
        </div>
      </div>
    </div>
  );
}

function DoseCard({ dose, onTake, onSkip }) {
  const statusConfig = {
    taken:    { label: 'Taken',    bg: 'rgba(0,255,157,0.12)', border: 'rgba(0,255,157,0.35)', color: 'var(--emerald)', icon: CheckCircle },
    missed:   { label: 'Missed',   bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', color: '#ef4444', icon: XCircle },
    pending:  { label: 'Due Soon', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', color: 'var(--amber)', icon: Clock },
    upcoming: { label: 'Upcoming', bg: 'rgba(0,212,255,0.08)', border: 'rgba(0,212,255,0.25)', color: 'var(--cyan)', icon: Clock },
    skipped:  { label: 'Skipped',  bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.3)', color: 'var(--purple-light)', icon: SkipForward },
    rescheduled: { label: 'Rescheduled', bg: 'rgba(0,212,255,0.08)', border: 'rgba(0,212,255,0.25)', color: 'var(--cyan)', icon: Clock },
  };
  const cfg = statusConfig[dose.status] || statusConfig.pending;
  const Icon = cfg.icon;
  const canAct = dose.status === 'pending' || dose.status === 'missed';
  const timeStr = dose.scheduled_time ? dose.scheduled_time.slice(0, 5) : '';

  return (
    <div style={{
      borderRadius: 12, border: `1px solid ${cfg.border}`,
      background: cfg.bg, padding: '14px 16px',
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={15} color={cfg.color} />
          <span className="font-mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{timeStr}</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, background: `${cfg.border}`, padding: '2px 8px', borderRadius: 6 }}>{cfg.label}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{dose.medicine_name} {dose.medicine_dosage}</div>
      {dose.medicine_instructions && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{dose.medicine_instructions}</p>}
      {dose.taken_at && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>Taken at {new Date(dose.taken_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>}
      {canAct && (
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={() => onTake(dose.id)} style={{
            flex: 1, padding: '7px', borderRadius: 8, border: '1px solid rgba(0,255,157,0.3)',
            background: 'rgba(0,255,157,0.1)', color: 'var(--emerald)', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,255,157,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,255,157,0.1)'; }}>
            ✓ Taken
          </button>
          <button onClick={() => onSkip(dose.id)} style={{
            flex: 1, padding: '7px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)',
            background: 'rgba(245,158,11,0.1)', color: 'var(--amber)', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.1)'; }}>
            Skip
          </button>
        </div>
      )}
    </div>
  );
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const [doses, setDoses] = useState([]);
  const [summary, setSummary] = useState({ total: 0, taken: 0, missed: 0, pending: 0 });
  const [adherenceData, setAdherenceData] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [skipTarget, setSkipTarget] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [todayRes, summaryRes] = await Promise.all([
        apiClient.get('/doses/today/').catch(() => ({ data: { doses: [], summary: {} } })),
        apiClient.get('/doses/summary/?days=7').catch(() => ({ data: {} })),
      ]);

      setDoses(todayRes.data.doses || []);
      setSummary(todayRes.data.summary || { total: 0, taken: 0, missed: 0, pending: 0, skipped: 0 });
      setAdherenceData(summaryRes.data);

      // Get risk score (non-blocking)
      apiClient.get('/ai/risk-score/').then(r => setRiskData(r.data)).catch(() => {});
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const handleTake = async (doseId) => {
    try {
      await apiClient.post(`/doses/${doseId}/take/`);
      setDoses(prev => prev.map(d => d.id === doseId ? { ...d, status: 'taken', taken_at: new Date().toISOString() } : d));
      setSummary(prev => ({ ...prev, taken: prev.taken + 1, pending: Math.max(0, prev.pending - 1) }));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to mark dose as taken');
    }
  };

  const handleSkip = async (doseId, reason) => {
    try {
      await apiClient.post(`/doses/${doseId}/skip/`, { reason });
      setDoses(prev => prev.map(d => d.id === doseId ? { ...d, status: 'skipped', skip_reason: reason } : d));
      setSummary(prev => ({ ...prev, skipped: (prev.skipped || 0) + 1, pending: Math.max(0, prev.pending - 1) }));
      setSkipTarget(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to skip dose');
    }
  };

  const totalDoses = summary.total || 0;
  const takenDoses = summary.taken || 0;
  const missedDoses = summary.missed || 0;
  const pendingDoses = (summary.pending || 0) + (summary.rescheduled || 0);
  const adherence = adherenceData?.adherence_percentage ?? (totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 100);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Group doses by medicine
  const medGroups = {};
  doses.forEach(d => {
    const key = d.medicine || d.medicine_name;
    if (!medGroups[key]) medGroups[key] = { name: d.medicine_name, dosage: d.medicine_dosage, doses: [] };
    medGroups[key].doses.push(d);
  });

  const riskLevel = riskData?.level || 'low';
  const riskScore = riskData?.score ?? '—';
  const riskColor = { onboarding: 'var(--text-muted)', low: 'var(--emerald)', medium: 'var(--amber)', high: '#f97316', critical: '#ef4444' }[riskLevel] || 'var(--text-muted)';
  const riskEmoji = { onboarding: '📋', low: '🟢', medium: '🟡', high: '🟠', critical: '🔴' }[riskLevel] || '⚪';

  if (loading) {
    return (
      <PatientLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
          <Loader2 size={32} color="var(--cyan)" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      </PatientLayout>
    );
  }

  return (
    <PatientLayout>
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 4 }}>{today}</p>
        <h1 className="font-syne" style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
          <span className="gradient-text">{user?.name?.split(' ')[0] || 'there'}</span> 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Here's your medication overview for today.</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Today', value: totalDoses, color: 'var(--cyan)', icon: '💊' },
          { label: 'Taken', value: takenDoses, color: 'var(--emerald)', icon: '✅' },
          { label: 'Missed', value: missedDoses, color: '#ef4444', icon: '❌' },
          { label: 'Remaining', value: pendingDoses, color: 'var(--amber)', icon: '⏳' },
        ].map(stat => (
          <div key={stat.label} className="glass-card" style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 24 }}>{stat.icon}</span>
            <div>
              <div className="font-syne" style={{ fontSize: 26, fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main content: adherence ring + stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, marginBottom: 32, alignItems: 'start' }}>
        <div className="glass-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, minWidth: 200 }}>
          <AdherenceRing percentage={adherence} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>Weekly Adherence</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>{takenDoses} of {totalDoses} doses taken today</p>
          </div>
          <div style={{ width: '100%', padding: '12px', borderRadius: 10, background: adherence >= 80 ? 'rgba(0,255,157,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${adherence >= 80 ? 'rgba(0,255,157,0.2)' : 'rgba(245,158,11,0.2)'}`, textAlign: 'center' }}>
            <span style={{ fontSize: 12, color: adherence >= 80 ? 'var(--emerald)' : 'var(--amber)', fontWeight: 600 }}>
              {adherence >= 80 ? '🌟 Great work!' : adherence >= 50 ? '⚡ Keep going!' : '⚠️ Needs attention'}
            </span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <TrendingUp size={18} color="var(--cyan)" />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Quick Stats</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: 16, borderRadius: 10, background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.1)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>WEEKLY RATE</div>
              <div className="font-syne" style={{ fontSize: 22, fontWeight: 800, color: 'var(--cyan)' }}>{adherence}%</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>7 day average</div>
            </div>
            <div style={{ padding: 16, borderRadius: 10, background: 'rgba(0,255,157,0.05)', border: '1px solid rgba(0,255,157,0.1)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>TOTAL DOSES (7d)</div>
              <div className="font-syne" style={{ fontSize: 22, fontWeight: 800, color: 'var(--emerald)' }}>{adherenceData?.total_doses || totalDoses}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{adherenceData?.taken || takenDoses} taken</div>
            </div>
            <div style={{ padding: 16, borderRadius: 10, background: `${riskColor}10`, border: `1px solid ${riskColor}20` }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>RISK LEVEL</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: riskColor }}>{riskEmoji} {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>AI score: {riskScore}/100</div>
            </div>
            <div style={{ padding: 16, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>MEDICINES</div>
              <div className="font-syne" style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{Object.keys(medGroups).length}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>active today</div>
            </div>
          </div>
        </div>
      </div>

      {/* Dose cards */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="font-syne" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Today's Medications</h2>
        </div>

        {doses.length === 0 ? (
          <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No medications scheduled for today. Add medicines from the Medicines page.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {doses.map(dose => (
              <DoseCard
                key={dose.id}
                dose={dose}
                onTake={handleTake}
                onSkip={(id) => setSkipTarget(id)}
              />
            ))}
          </div>
        )}
      </div>

      {skipTarget && <SkipModal dose={skipTarget} onClose={() => setSkipTarget(null)} onSkip={(r) => handleSkip(skipTarget, r)} />}
    </PatientLayout>
  );
}
