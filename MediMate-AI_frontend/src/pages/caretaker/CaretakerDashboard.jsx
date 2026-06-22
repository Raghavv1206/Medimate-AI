import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, AlertTriangle, Activity, Loader2 } from 'lucide-react';
import { useAuth, apiClient } from '@/context/AuthContext';
import CaretakerLayout from '@/components/layout/CaretakerLayout';

const RISK_CONFIG = {
  low:      { color: 'var(--emerald)', bg: 'rgba(0,255,157,0.1)', label: '🟢 Low' },
  medium:   { color: 'var(--amber)',   bg: 'rgba(245,158,11,0.1)', label: '🟡 Medium' },
  high:     { color: '#ef4444',        bg: 'rgba(239,68,68,0.1)', label: '🔴 High' },
  critical: { color: '#ef4444',        bg: 'rgba(239,68,68,0.15)', label: '🔴 Critical' },
};

export default function CaretakerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [pRes, eRes] = await Promise.all([
          apiClient.get('/patients/profiles/').catch(() => ({ data: [] })),
          apiClient.get('/escalation/logs/').catch(() => ({ data: { logs: [] } })),
        ]);
        setPatients(Array.isArray(pRes.data) ? pRes.data : []);
        setEscalations((eRes.data.logs || []).slice(0, 10));
      } catch (err) {
        console.error('Caretaker fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const atRisk = patients.filter(p => p.risk_level && p.risk_level !== 'low').length;
  const allGood = patients.filter(p => !p.risk_level || p.risk_level === 'low').length;

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
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-syne" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Patient Monitor</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>All your assigned patients in one view.</p>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Patients', value: patients.length, color: '#a78bfa', icon: Users },
          { label: 'At Risk', value: atRisk, color: 'var(--amber)', icon: AlertTriangle },
          { label: 'All Good', value: allGood, color: 'var(--emerald)', icon: Activity },
          { label: 'Escalations', value: escalations.length, color: '#ef4444', icon: AlertTriangle },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon size={18} color={s.color} />
            </div>
            <div>
              <div className="font-syne" style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Patient cards */}
      <h2 className="font-syne" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Assigned Patients</h2>
      {patients.length === 0 ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No patients assigned yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: 32 }}>
          {patients.map(p => {
            const riskLevel = p.risk_level || 'low';
            const risk = RISK_CONFIG[riskLevel] || RISK_CONFIG.low;
            const patientName = p.user_name || p.user?.full_name || `Patient #${p.id}`;
            const conditions = p.conditions || p.medical_conditions || '';
            const whatsapp = p.whatsapp_number || p.user?.whatsapp_number || '';
            return (
              <div key={p.id} className="glass-card" style={{ padding: 22, border: `1px solid ${risk.color}20`, transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }}
                onClick={() => navigate(`/caretaker/patient/${p.id}`)}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(167,139,250,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${risk.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: risk.color }}>{patientName[0]}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{patientName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Age {p.age || '—'} · {conditions || 'No conditions listed'}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: risk.bg, color: risk.color }}>{risk.label}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div className="font-syne" style={{ fontSize: 16, fontWeight: 800, color: 'var(--emerald)' }}>{p.risk_score || '—'}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Risk Score</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div className="font-syne" style={{ fontSize: 16, fontWeight: 800, color: 'var(--cyan)' }}>{p.onboarding_done ? '✓' : '—'}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Onboarded</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div className="font-syne" style={{ fontSize: 11, fontWeight: 600, color: whatsapp ? '#34d399' : 'var(--text-muted)', marginTop: 4 }}>
                      {whatsapp ? (whatsapp.length > 12 ? `${whatsapp.substring(0, 10)}...` : whatsapp) : '—'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>WhatsApp</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Escalations */}
      <h2 className="font-syne" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Live Escalation Feed</h2>
      {escalations.length === 0 ? (
        <div className="glass-card" style={{ padding: 30, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No escalations — all patients are doing great!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {escalations.map((e, i) => (
            <div key={e.id || i} className="glass-card" style={{ padding: '18px 22px', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={18} color="#ef4444" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{e.patient_name || `Patient #${e.patient}`}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.medicine_name || ''} · {e.created_at ? new Date(e.created_at).toLocaleString() : ''}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: '#f97316' }}>{e.escalation_type || 'Alert'}</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: e.resolved ? 'rgba(0,255,157,0.1)' : 'rgba(239,68,68,0.1)', color: e.resolved ? 'var(--emerald)' : '#ef4444' }}>{e.resolved ? 'resolved' : 'pending'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </CaretakerLayout>
  );
}
