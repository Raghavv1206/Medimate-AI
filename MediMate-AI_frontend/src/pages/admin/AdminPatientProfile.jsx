import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Mail, Phone, Calendar, Heart, Droplets, Activity,
  AlertTriangle, Shield, CheckCircle2, XCircle, Loader2, Brain,
  Pill, Thermometer, Stethoscope, BadgeCheck, TrendingUp, FileWarning, MessageSquare
} from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { apiClient } from '@/context/AuthContext';

const RISK_CONFIG = {
  low: { color: 'var(--emerald)', bg: 'rgba(0,255,157,0.12)', border: 'rgba(0,255,157,0.3)', label: 'Low Risk' },
  medium: { color: 'var(--amber)', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', label: 'Medium Risk' },
  high: { color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)', label: 'High Risk' },
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)', label: 'Critical Risk' },
};

export default function AdminPatientProfile() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testLoading, setTestLoading] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const handleTriggerTest = async (type) => {
    setTestLoading(type);
    setTestResult(null);
    let endpoint = '';
    if (type === 'reminder') endpoint = '/whatsapp/send-reminder/';
    else if (type === 'escalation') endpoint = '/whatsapp/trigger-escalation/';
    else if (type === 'voice') endpoint = '/whatsapp/trigger-voice/';

    try {
      const { data } = await apiClient.post(endpoint, { patient_id: patientId });
      if (data.success || data.success === undefined) {
        setTestResult({
          type: 'success',
          text: data.message || `Test ${type} triggered successfully!`,
        });
      } else {
        setTestResult({
          type: 'error',
          text: data.message || `Test ${type} failed.`,
        });
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || err.response?.data?.detail || `Failed to trigger test ${type}.`;
      setTestResult({
        type: 'error',
        text: msg,
      });
    } finally {
      setTestLoading(null);
    }
  };


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [patientRes, riskRes] = await Promise.all([
          apiClient.get(`/patients/profiles/${patientId}/`),
          apiClient.get(`/ai/risk-score/?patient_id=${patientId}`).catch(() => ({ data: null })),
        ]);
        setPatient(patientRes.data);
        setRiskData(riskRes.data);
      } catch (err) {
        console.error('Failed to fetch patient:', err);
        setError('Failed to load patient profile. The patient may not exist or you may not have permission.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [patientId]);

  const getRiskConfig = (level) => {
    const l = (level || '').toLowerCase();
    return RISK_CONFIG[l] || RISK_CONFIG.low;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const renderInfoItem = (icon, label, value, color) => {
    const Icon = icon;
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color || 'var(--cyan)'}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={16} color={color || 'var(--cyan)'} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{value || '—'}</div>
        </div>
      </div>
    );
  };

  const renderTagList = (items, color) => {
    if (!items || (Array.isArray(items) && items.length === 0)) {
      return <span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>None reported</span>;
    }
    const list = Array.isArray(items) ? items : typeof items === 'string' ? items.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (list.length === 0) return <span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>None reported</span>;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {list.map((item, i) => (
          <span key={i} style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 8, background: `${color}15`, color, border: `1px solid ${color}30` }}>
            {item}
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
          <Loader2 size={36} color="var(--cyan)" style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: 15 }}>Loading patient profile...</span>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileWarning size={28} color="#ef4444" />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>Profile Not Found</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 400 }}>{error}</p>
          <button
            onClick={() => navigate('/admin/users')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--cyan)', cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: 'inherit' }}
          >
            <ArrowLeft size={16} /> Back to User Management
          </button>
        </div>
      </AdminLayout>
    );
  }

  const riskLevel = riskData?.level || patient?.risk_level || 'low';
  const riskConf = getRiskConfig(riskLevel);
  const adherenceScore = patient?.adherence_score ?? riskData?.score ?? null;
  const onboardingDone = patient?.onboarding_done;

  return (
    <AdminLayout>
      {/* Back Button */}
      <button
        onClick={() => navigate('/admin/users')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 500, marginBottom: 24, fontFamily: 'inherit', transition: 'all 0.2s' }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)'; e.currentTarget.style.color = 'var(--cyan)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
      >
        <ArrowLeft size={15} /> Back to User Management
      </button>

      {/* Patient Header Card */}
      <div className="glass-card" style={{ padding: '28px 32px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        {/* Decorative gradient */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: 200, height: 200, background: `radial-gradient(circle at top right, ${riskConf.color}10, transparent 70%)`, pointerEvents: 'none' }} />

        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: `linear-gradient(135deg, var(--cyan)40, var(--purple-light)40)`, border: '2px solid rgba(0,212,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="font-syne" style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
              {(patient?.user?.full_name || patient?.user?.username || '?')[0].toUpperCase()}
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <h1 className="font-syne" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              {patient?.user?.full_name || patient?.user?.username || 'Unknown Patient'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Mail size={13} /> {patient?.user?.email || '—'}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>ID: {patientId}</span>
            </div>
          </div>
          {/* Risk badge */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ padding: '8px 20px', borderRadius: 12, background: riskConf.bg, border: `1px solid ${riskConf.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Shield size={16} color={riskConf.color} />
              <span style={{ fontSize: 14, fontWeight: 700, color: riskConf.color }}>{riskConf.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: onboardingDone ? 'var(--emerald)' : 'var(--amber)', display: 'inline-block' }} />
              <span style={{ fontSize: 12, color: onboardingDone ? 'var(--emerald)' : 'var(--amber)' }}>
                {onboardingDone ? 'Onboarded' : 'Pending Onboarding'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* Personal Information */}
        <div className="glass-card" style={{ padding: '24px 28px' }}>
          <h3 className="font-syne" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={18} color="var(--cyan)" /> Personal Information
          </h3>
          {renderInfoItem(User, 'Full Name', patient?.user?.full_name || patient?.user?.username, 'var(--cyan)')}
          {renderInfoItem(Mail, 'Email', patient?.user?.email, 'var(--purple-light)')}
          {renderInfoItem(Calendar, 'Age', patient?.age ? `${patient.age} years` : null, 'var(--amber)')}
          {renderInfoItem(Heart, 'Gender', patient?.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : null, '#f472b6')}
          {renderInfoItem(Droplets, 'Blood Group', patient?.blood_group, '#ef4444')}
          {renderInfoItem(Phone, 'WhatsApp', patient?.user?.whatsapp_number, 'var(--emerald)')}
          {renderInfoItem(Phone, 'Emergency Phone', patient?.emergency_phone, '#f97316')}
        </div>

        {/* Medical Information */}
        <div className="glass-card" style={{ padding: '24px 28px' }}>
          <h3 className="font-syne" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Stethoscope size={18} color="var(--emerald)" /> Medical Information
          </h3>

          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Thermometer size={14} color="var(--amber)" />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Diseases</span>
            </div>
            {renderTagList(patient?.diseases, 'var(--amber)')}
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <AlertTriangle size={14} color="#ef4444" />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Allergies</span>
            </div>
            {renderTagList(patient?.allergies, '#ef4444')}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Activity size={14} color="var(--purple-light)" />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Chronic Conditions</span>
            </div>
            {renderTagList(patient?.chronic_conditions, 'var(--purple-light)')}
          </div>
        </div>
      </div>

      {/* Scores Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* Adherence Score */}
        <div className="glass-card" style={{ padding: '24px 28px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={16} color="var(--emerald)" /> Adherence Score
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ position: 'relative', width: 90, height: 90 }}>
              <svg width="90" height="90" viewBox="0 0 90 90" className="progress-ring">
                <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                <circle
                  cx="45" cy="45" r="38" fill="none"
                  stroke={adherenceScore !== null && adherenceScore >= 70 ? 'var(--emerald)' : adherenceScore !== null && adherenceScore >= 40 ? 'var(--amber)' : '#ef4444'}
                  strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${((adherenceScore || 0) / 100) * 238.76} 238.76`}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="font-syne" style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {adherenceScore !== null ? `${Math.round(adherenceScore)}%` : '—'}
                </span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                {adherenceScore !== null
                  ? adherenceScore >= 80 ? 'Excellent' : adherenceScore >= 60 ? 'Good' : adherenceScore >= 40 ? 'Fair' : 'Needs Attention'
                  : 'No Data'
                }
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Medication adherence rate based on confirmed doses vs scheduled doses.
              </p>
            </div>
          </div>
        </div>

        {/* Risk Score */}
        <div className="glass-card" style={{ padding: '24px 28px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Brain size={16} color="var(--purple-light)" /> AI Risk Assessment
          </h3>
          {riskData ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ padding: '10px 20px', borderRadius: 12, background: riskConf.bg, border: `1px solid ${riskConf.border}` }}>
                  <span className="font-syne" style={{ fontSize: 28, fontWeight: 800, color: riskConf.color }}>{riskData.score ?? '—'}</span>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: riskConf.color }}>{riskConf.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Risk Score</div>
                </div>
              </div>
              {riskData.insight && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', marginBottom: 12 }}>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    <Brain size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} color="var(--purple-light)" />
                    {riskData.insight}
                  </p>
                </div>
              )}
              {riskData.factors && Object.keys(riskData.factors).length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Contributing Factors</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {Object.entries(riskData.factors).map(([key, val]) => (
                      <span key={key} style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: 'var(--purple-light)' }}>
                        {key}: {typeof val === 'number' ? val.toFixed(1) : String(val)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0' }}>
              <Brain size={24} color="var(--text-muted)" strokeWidth={1} />
              <div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 2 }}>No AI risk data available</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Risk assessment has not been generated for this patient yet.</div>
              </div>
            </div>
          )}
        </div>

        {/* Onboarding Status */}
        <div className="glass-card" style={{ padding: '24px 28px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BadgeCheck size={16} color="var(--cyan)" /> Onboarding Status
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: onboardingDone ? 'rgba(0,255,157,0.1)' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${onboardingDone ? 'rgba(0,255,157,0.25)' : 'rgba(245,158,11,0.25)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {onboardingDone ? <CheckCircle2 size={28} color="var(--emerald)" /> : <XCircle size={28} color="var(--amber)" />}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: onboardingDone ? 'var(--emerald)' : 'var(--amber)' }}>
                {onboardingDone ? 'Completed' : 'Incomplete'}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {onboardingDone
                  ? 'Patient has completed the onboarding process and profile setup.'
                  : 'Patient has not yet completed onboarding. Medical profile may be incomplete.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Test Control Center */}
      <div className="glass-card" style={{ padding: '24px 28px', marginTop: 24 }}>
        <h3 className="font-syne" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageSquare size={18} color="var(--cyan)" /> WhatsApp & Twilio Test Control Center
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          Directly execute live communication flows to test integration endpoints. If the patient has no previous dose logs, a dummy one will be auto-generated.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            disabled={testLoading !== null}
            onClick={() => handleTriggerTest('reminder')}
            style={{
              padding: '12px 20px', borderRadius: 10, border: 'none',
              background: 'rgba(0, 212, 255, 0.08)',
              border: '1px solid rgba(0, 212, 255, 0.2)',
              color: 'var(--cyan)', fontSize: 13, fontWeight: 600,
              cursor: testLoading !== null ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.2s',
            }}
          >
            {testLoading === 'reminder' && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            Send Patient Test Reminder
          </button>

          <button
            disabled={testLoading !== null}
            onClick={() => handleTriggerTest('escalation')}
            style={{
              padding: '12px 20px', borderRadius: 10, border: 'none',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              color: 'var(--amber)', fontSize: 13, fontWeight: 600,
              cursor: testLoading !== null ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.2s',
            }}
          >
            {testLoading === 'escalation' && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            Trigger Caretaker Alert (WhatsApp)
          </button>

          <button
            disabled={testLoading !== null}
            onClick={() => handleTriggerTest('voice')}
            style={{
              padding: '12px 20px', borderRadius: 10, border: 'none',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444', fontSize: 13, fontWeight: 600,
              cursor: testLoading !== null ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.2s',
            }}
          >
            {testLoading === 'voice' && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            Trigger Twilio Voice Call (Caretaker)
          </button>
        </div>

        {testResult && (
          <div style={{
            marginTop: 16, padding: '12px 16px', borderRadius: 8,
            background: testResult.type === 'success' ? 'rgba(0, 255, 157, 0.06)' : 'rgba(239, 68, 68, 0.06)',
            border: `1px solid ${testResult.type === 'success' ? 'rgba(0, 255, 157, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
            color: testResult.type === 'success' ? 'var(--emerald)' : '#ef4444',
            fontSize: 13, fontWeight: 500,
          }}>
            {testResult.text}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </AdminLayout>
  );
}
