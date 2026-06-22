import { useState, useEffect } from 'react';
import { Brain, TrendingUp, AlertTriangle, Info, Loader2 } from 'lucide-react';
import PatientLayout from '@/components/layout/PatientLayout';
import { apiClient } from '@/context/AuthContext';

const RISK_CONFIG = {
  onboarding: { label: 'Getting Started',  color: 'var(--text-muted)', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)', emoji: '📋' },
  low:        { label: 'Low Risk',         color: 'var(--emerald)',    bg: 'rgba(0,255,157,0.12)', border: 'rgba(0,255,157,0.3)', emoji: '🟢' },
  medium:     { label: 'Medium Risk',      color: 'var(--amber)',      bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', emoji: '🟡' },
  high:       { label: 'High Risk',        color: '#f97316',           bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)', emoji: '🟠' },
  critical:   { label: 'Critical Risk',    color: '#ef4444',           bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)', emoji: '🔴' },
};

function parseFactors(factorsObj) {
  if (!factorsObj || typeof factorsObj !== 'object') return [];
  const mapping = [
    { key: 'miss_rate_7d',           label: '7-Day Miss Rate',          normalize: v => v },
    { key: 'slot_streak',            label: 'Consecutive Missed Slots', normalize: v => Math.min(Math.round((v / 5) * 100), 100) },
    { key: 'active_medicines',       label: 'Medicine Complexity',      normalize: v => Math.min(Math.round((v / 6) * 100), 100) },
    { key: 'consecutive_missed_days', label: 'Consecutive Missed Days', normalize: v => Math.min(Math.round((v / 7) * 100), 100) },
  ];
  return mapping
    .filter(m => factorsObj[m.key] !== undefined)
    .map(m => ({
      label: m.label,
      value: m.normalize(factorsObj[m.key]),
    }));
}

function generateReason(riskLevel, medicineName) {
  const reasons = {
    low: `Your adherence pattern for ${medicineName} looks stable. Keep it up!`,
    medium: `Mild inconsistency detected for ${medicineName}. Try setting a fixed reminder.`,
    high: `Significant miss risk for ${medicineName}. Consider adjusting your schedule.`,
    critical: `Critical miss risk for ${medicineName}. Immediate attention recommended.`,
  };
  return reasons[riskLevel] || `AI analysis for ${medicineName} based on your recent patterns.`;
}

export default function AIPredictions() {
  const [riskData, setRiskData] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [riskRes, predRes, trendRes] = await Promise.all([
          apiClient.get('/ai/risk-score/').catch(() => ({ data: {} })),
          apiClient.get('/ai/predictions/').catch(() => ({ data: { predictions: [] } })),
          apiClient.get('/ai/adherence-trend/').catch(() => ({ data: { trend: [] } })),
        ]);
        setRiskData(riskRes.data);
        setPredictions(predRes.data.predictions || predRes.data || []);
        setTrend(trendRes.data.trend || trendRes.data || []);
      } catch (err) {
        console.error('AI fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const overallScore = riskData?.score ?? 0;
  const riskLevel = riskData?.level || (overallScore < 25 ? 'low' : overallScore < 50 ? 'medium' : overallScore < 75 ? 'high' : 'critical');
  const risk = RISK_CONFIG[riskLevel] || RISK_CONFIG.low;
  const factors = parseFactors(riskData?.factors);

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
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-syne" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>AI Predictions</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>5-factor risk engine analyzing your adherence patterns to predict future misses.</p>
      </div>

      {/* Overall risk score */}
      <div className="glass-card" style={{ padding: 28, marginBottom: 24, display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 100, height: 100, borderRadius: '50%', background: risk.bg, border: `3px solid ${risk.color}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span className="font-syne" style={{ fontSize: 28, fontWeight: 800, color: risk.color }}>{overallScore}</span>
            <span style={{ fontSize: 10, color: risk.color, fontWeight: 600 }}>/100</span>
          </div>
          <span style={{ padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: risk.bg, color: risk.color, border: `1px solid ${risk.border}` }}>{risk.emoji} {risk.label}</span>
        </div>

        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Brain size={18} color="var(--cyan)" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Risk Factor Breakdown</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {riskData?.has_sufficient_data && factors.length > 0 ? (
              factors.map((f, i) => {
                const fColor = f.value > 60 ? '#ef4444' : f.value > 35 ? 'var(--amber)' : 'var(--emerald)';
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: fColor }}>{f.value}/100</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${f.value}%`, background: fColor, borderRadius: 3, transition: 'width 1s ease' }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '12px 0' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
                  {riskData?.factors?.doses_logged ? 
                    `Keep logging! We need at least 3 doses (you have ${riskData.factors.doses_logged}) to analyze your patterns.` :
                    riskData?.factors?.has_dose_history ?
                    'Risk factors will appear after you have more dose history data.' :
                    'Add your medicines and start logging doses to see risk factors.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {riskData?.insight && (
          <div style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 12, padding: 16, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Info size={14} color="var(--cyan)" />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--cyan)' }}>
                {riskData.has_sufficient_data ? 'AI Insight' : 'Next Steps'}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{riskData.insight}</p>
            {riskData.has_sufficient_data && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, fontStyle: 'italic' }}>
                Based on {Math.round(riskData.factors?.miss_rate_7d || 0)}% miss rate from your recent adherence data
              </p>
            )}
          </div>
        )}
      </div>

      {/* Adherence Trend */}
      {trend.length > 0 && (
        <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
          <h3 className="font-syne" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Weekly Adherence Trend</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
            {trend.map((w, i) => {
              const pct = w.compliance_rate ?? 0;
              const hasData = w.has_data;
              const barColor = !hasData ? 'rgba(255,255,255,0.2)' : pct >= 80 ? 'var(--emerald)' : pct >= 50 ? 'var(--amber)' : '#ef4444';
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, color: barColor, fontWeight: 600 }}>{hasData ? Math.round(pct) + '%' : '—'}</span>
                  <div style={{ width: '100%', maxWidth: 40, height: `${hasData ? Math.max(pct, 5) : 20}%`, background: barColor, borderRadius: '4px 4px 0 0', transition: 'height 0.5s ease', opacity: hasData ? 1 : 0.5 }} />
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{w.week_label || `W${i + 1}`}</span>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>
            Showing adherence for weeks with logged doses. Weeks with "—" have no scheduled doses.
          </p>
        </div>
      )}

      {/* 7-Day Predictions */}
      <div>
        <h2 className="font-syne" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>7-Day Dose Predictions</h2>
        {predictions.length === 0 ? (
          <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Predictions will appear after you have enough dose history data.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {predictions.map((p, i) => {
              const pRisk = p.risk_level || (p.risk_percentage < 25 ? 'low' : p.risk_percentage < 50 ? 'medium' : p.risk_percentage < 75 ? 'high' : 'critical');
              const cfg = RISK_CONFIG[pRisk] || RISK_CONFIG.low;
              const score = p.risk_percentage ?? 0;
              const dayLabel = [p.day_name, p.date].filter(Boolean).join(' · ');
              const reason = generateReason(pRisk, p.medicine_name);
              return (
                <div key={i} className="glass-card" style={{ padding: 20, border: `1px solid ${cfg.border}`, cursor: 'pointer', transition: 'transform 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{p.medicine_name}{p.dosage ? ` (${p.dosage})` : ''}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{dayLabel}{p.scheduled_time ? ` · ${p.scheduled_time}` : ''}</div>
                    </div>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap' }}>
                      {cfg.emoji} {score}/100
                    </span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 10 }}>
                    <div style={{ height: '100%', width: `${score}%`, background: cfg.color, borderRadius: 2 }} />
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{reason}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PatientLayout>
  );
}
