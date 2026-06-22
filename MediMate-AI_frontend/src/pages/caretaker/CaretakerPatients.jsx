import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, AlertTriangle, Activity, Search, Loader2, Phone, Heart, Shield } from 'lucide-react';
import { apiClient } from '@/context/AuthContext';
import CaretakerLayout from '@/components/layout/CaretakerLayout';

const RISK_CONFIG = {
  low:      { color: 'var(--emerald)', bg: 'rgba(0,255,157,0.1)',  label: '🟢 Low' },
  medium:   { color: 'var(--amber)',   bg: 'rgba(245,158,11,0.1)', label: '🟡 Medium' },
  high:     { color: '#ef4444',        bg: 'rgba(239,68,68,0.1)',  label: '🔴 High' },
  critical: { color: '#ef4444',        bg: 'rgba(239,68,68,0.15)', label: '🔴 Critical' },
};

export default function CaretakerPatients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiClient.get('/patients/profiles/')
      .then(res => setPatients(Array.isArray(res.data) ? res.data : []))
      .catch(() => setPatients([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return patients;
    const q = search.toLowerCase();
    return patients.filter(p => {
      const name = (p.user_name || p.user?.full_name || '').toLowerCase();
      return name.includes(q);
    });
  }, [patients, search]);

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
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-syne" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>My Patients</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>View and manage all your assigned patients.</p>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Patients', value: patients.length, color: '#a78bfa', icon: Users },
          { label: 'At Risk', value: atRisk, color: 'var(--amber)', icon: AlertTriangle },
          { label: 'All Good', value: allGood, color: 'var(--emerald)', icon: Activity },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon size={18} color={s.color} />
            </div>
            <div>
              <div className="font-syne" style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ position: 'relative', maxWidth: 420 }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search patients by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 40px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = '#a78bfa'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
      </div>

      {/* Patient Grid */}
      {filtered.length === 0 ? (
        <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
          <Users size={36} color="var(--text-muted)" style={{ marginBottom: 12, opacity: 0.5 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{search ? 'No patients match your search.' : 'No patients assigned yet.'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filtered.map(p => {
            const riskLevel = p.risk_level || 'low';
            const risk = RISK_CONFIG[riskLevel] || RISK_CONFIG.low;
            const patientName = p.user_name || p.user?.full_name || `Patient #${p.id}`;
            const conditions = [p.diseases, p.chronic_conditions].filter(Boolean).join(', ') || p.conditions || p.medical_conditions || '';
            const allergies = p.allergies || '';
            const whatsapp = p.user?.whatsapp_number || p.whatsapp_number || '';

            return (
              <div key={p.id} className="glass-card" style={{ padding: 22, border: `1px solid ${risk.color}20`, transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }}
                onClick={() => navigate(`/caretaker/patient/${p.id}`)}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(167,139,250,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: `${risk.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: risk.color }}>{patientName[0]}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{patientName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {p.age ? `Age ${p.age}` : ''}{p.age && p.gender ? ' · ' : ''}{p.gender || ''}{p.blood_group ? ` · ${p.blood_group}` : ''}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: risk.bg, color: risk.color, whiteSpace: 'nowrap' }}>{risk.label}</span>
                </div>

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                  {conditions && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <Heart size={13} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{conditions}</span>
                    </div>
                  )}
                  {allergies && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <Shield size={13} color="var(--amber)" style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>Allergies: {allergies}</span>
                    </div>
                  )}
                  {whatsapp && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Phone size={13} color="#34d399" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{whatsapp}</span>
                    </div>
                  )}
                </div>

                {/* Bottom stats */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', borderTop: '1px solid var(--border)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div className="font-syne" style={{ fontSize: 15, fontWeight: 800, color: 'var(--emerald)' }}>{p.adherence_score != null ? `${p.adherence_score}%` : '—'}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Adherence</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div className="font-syne" style={{ fontSize: 15, fontWeight: 800, color: risk.color }}>{p.risk_score || '—'}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Risk Score</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div className="font-syne" style={{ fontSize: 15, fontWeight: 800, color: p.onboarding_done ? 'var(--cyan)' : 'var(--text-muted)' }}>{p.onboarding_done ? '✓' : '✗'}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Onboarded</div>
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
