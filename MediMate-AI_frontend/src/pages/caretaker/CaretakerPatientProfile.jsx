import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, User, Heart, Shield, Phone, Mail, Droplets, Activity, AlertTriangle, Pill, Calendar, Brain, MessageSquare } from 'lucide-react';
import { apiClient } from '@/context/AuthContext';
import CaretakerLayout from '@/components/layout/CaretakerLayout';

const RISK_CONFIG = {
  low:      { color: 'var(--emerald)', bg: 'rgba(0,255,157,0.1)',  label: 'Low Risk' },
  medium:   { color: 'var(--amber)',   bg: 'rgba(245,158,11,0.1)', label: 'Medium Risk' },
  high:     { color: '#ef4444',        bg: 'rgba(239,68,68,0.1)',  label: 'High Risk' },
  critical: { color: '#ef4444',        bg: 'rgba(239,68,68,0.15)', label: 'Critical' },
};

export default function CaretakerPatientProfile() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
    setLoading(true);
    setError('');
    Promise.all([
      apiClient.get(`/patients/profiles/${patientId}/`),
      apiClient.get(`/ai/risk-score/?patient_id=${patientId}`).catch(() => ({ data: null })),
    ])
      .then(([pRes, rRes]) => {
        setPatient(pRes.data);
        setRiskData(rRes.data);
      })
      .catch(err => {
        console.error('Failed to load patient:', err);
        setError('Failed to load patient profile. The patient may not exist or you may not have access.');
      })
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) {
    return (
      <CaretakerLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <Loader2 size={32} color="var(--cyan)" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      </CaretakerLayout>
    );
  }

  if (error || !patient) {
    return (
      <CaretakerLayout>
        <button onClick={() => navigate('/caretaker/patients')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa', fontSize: 13, fontWeight: 600, marginBottom: 24, padding: 0 }}>
          <ArrowLeft size={16} /> Back to Patients
        </button>
        <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
          <AlertTriangle size={36} color="#ef4444" style={{ marginBottom: 12, opacity: 0.6 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{error || 'Patient not found.'}</p>
        </div>
      </CaretakerLayout>
    );
  }

  const patientName = patient.user_name || patient.user?.full_name || `Patient #${patient.id}`;
  const riskLevel = patient.risk_level || 'low';
  const risk = RISK_CONFIG[riskLevel] || RISK_CONFIG.low;
  
  // Robust parsing of medical conditions and allergies
  const conditionList = [
    ...(Array.isArray(patient.diseases) ? patient.diseases : (typeof patient.diseases === 'string' ? patient.diseases.split(',') : [])),
    ...(Array.isArray(patient.chronic_conditions) ? patient.chronic_conditions : (typeof patient.chronic_conditions === 'string' ? patient.chronic_conditions.split(',') : []))
  ].map(s => String(s).trim()).filter(Boolean);

  const allergyList = (Array.isArray(patient.allergies) ? patient.allergies : (typeof patient.allergies === 'string' ? patient.allergies.split(',') : [])).map(s => String(s).trim()).filter(Boolean);

  const email = patient.user?.email || '';
  const whatsapp = patient.user?.whatsapp_number || patient.whatsapp_number || '';
  const medications = patient.medications || patient.medicines || [];

  const riskScore = riskData?.risk_score ?? riskData?.score ?? patient.risk_score ?? null;

  // Robust parsing of risk factors from either array or object format
  const rawFactors = riskData?.risk_factors || riskData?.factors;
  let riskFactors = [];
  if (Array.isArray(rawFactors)) {
    riskFactors = rawFactors;
  } else if (rawFactors && typeof rawFactors === 'object') {
    const labels = {
      miss_rate_7d: '7-Day Miss Rate',
      slot_streak: 'Consecutive Missed Slots',
      active_medicines: 'Active Medicines',
      consecutive_missed_days: 'Consecutive Missed Days',
    };
    riskFactors = Object.entries(rawFactors).map(([key, val]) => {
      const label = labels[key] || key.replace(/_/g, ' ');
      return `${label}: ${typeof val === 'number' ? (key.includes('rate') ? `${val.toFixed(1)}%` : val) : val}`;
    });
  }

  const rawRecommendations = riskData?.recommendations || [];
  const riskRecommendations = Array.isArray(rawRecommendations) ? rawRecommendations : [];

  return (
    <CaretakerLayout>
      {/* Back button */}
      <button onClick={() => navigate('/caretaker/patients')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa', fontSize: 13, fontWeight: 600, marginBottom: 24, padding: 0, transition: 'opacity 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
        <ArrowLeft size={16} /> Back to Patients
      </button>

      {/* Profile header */}
      <div className="glass-card" style={{ padding: '28px 32px', marginBottom: 24, border: `1px solid ${risk.color}25` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: `linear-gradient(135deg, ${risk.color}30, #a78bfa30)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `2px solid ${risk.color}40` }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: risk.color }}>{patientName[0]}</span>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 className="font-syne" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{patientName}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {patient.age && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Age {patient.age}</span>}
              {patient.gender && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>· {patient.gender}</span>}
              {patient.blood_group && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>· {patient.blood_group}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, padding: '5px 16px', borderRadius: 20, background: risk.bg, color: risk.color }}>{risk.label}</span>
            <span style={{ fontSize: 11, color: patient.onboarding_done ? 'var(--emerald)' : 'var(--text-muted)', fontWeight: 600 }}>
              {patient.onboarding_done ? '✓ Onboarded' : '✗ Not Onboarded'}
            </span>
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* Contact Info */}
        <div className="glass-card" style={{ padding: '22px 26px' }}>
          <h3 className="font-syne" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={16} color="#a78bfa" /> Contact Information
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(167,139,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={14} color="#a78bfa" />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 1 }}>Email</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{email}</div>
                </div>
              </div>
            )}
            {whatsapp && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(52,211,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Phone size={14} color="#34d399" />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 1 }}>WhatsApp</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{whatsapp}</div>
                </div>
              </div>
            )}
            {patient.emergency_phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AlertTriangle size={14} color="#ef4444" />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 1 }}>Emergency Phone</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{patient.emergency_phone}</div>
                </div>
              </div>
            )}
            {!email && !whatsapp && !patient.emergency_phone && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No contact information available.</p>
            )}
          </div>
        </div>

        {/* Medical Info */}
        <div className="glass-card" style={{ padding: '22px 26px' }}>
          <h3 className="font-syne" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Heart size={16} color="#ef4444" /> Medical Information
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, fontWeight: 600 }}>Conditions</div>
              {conditionList.length > 0 ? (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {conditionList.map((c, i) => (
                    <span key={i} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, background: 'rgba(167,139,250,0.1)', color: '#a78bfa', fontWeight: 500 }}>{c}</span>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>None recorded</span>
              )}
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, fontWeight: 600 }}>Allergies</div>
              {allergyList.length > 0 ? (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {allergyList.map((a, i) => (
                    <span key={i} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, background: 'rgba(245,158,11,0.1)', color: 'var(--amber)', fontWeight: 500 }}>
                      <Shield size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />{a}
                    </span>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>None recorded</span>
              )}
            </div>
            {patient.blood_group && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Droplets size={14} color="#ef4444" />
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 1 }}>Blood Group</div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{patient.blood_group}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Risk Score & Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Risk Score', value: riskScore ?? '—', color: risk.color, icon: Brain },
          { label: 'Risk Level', value: risk.label, color: risk.color, icon: AlertTriangle },
          { label: 'Adherence', value: patient.adherence_score != null ? `${patient.adherence_score}%` : '—', color: 'var(--emerald)', icon: Activity },
          { label: 'Onboarding', value: patient.onboarding_done ? 'Complete' : 'Pending', color: patient.onboarding_done ? 'var(--cyan)' : 'var(--amber)', icon: Calendar },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon size={18} color={s.color} />
            </div>
            <div>
              <div className="font-syne" style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Risk Factors */}
      {riskFactors.length > 0 && (
        <div className="glass-card" style={{ padding: '22px 26px', marginBottom: 24 }}>
          <h3 className="font-syne" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} color="var(--amber)" /> Risk Factors
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {riskFactors.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.1)' }}>
                <span style={{ color: 'var(--amber)', fontSize: 14 }}>⚠</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{typeof f === 'string' ? f : f.description || f.factor || JSON.stringify(f)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {riskRecommendations.length > 0 && (
        <div className="glass-card" style={{ padding: '22px 26px', marginBottom: 24 }}>
          <h3 className="font-syne" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Brain size={16} color="var(--cyan)" /> AI Recommendations
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {riskRecommendations.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(0,255,157,0.04)', border: '1px solid rgba(0,255,157,0.08)' }}>
                <span style={{ color: 'var(--emerald)', fontSize: 14, marginTop: 1 }}>💡</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{typeof r === 'string' ? r : r.text || r.recommendation || JSON.stringify(r)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Medications */}
      {Array.isArray(medications) && medications.length > 0 && (
        <div className="glass-card" style={{ padding: '22px 26px', marginBottom: 24 }}>
          <h3 className="font-syne" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Pill size={16} color="#a78bfa" /> Medications
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {medications.map((med, i) => (
              <div key={med.id || i} style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.12)', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(167,139,250,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(167,139,250,0.06)'}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  💊 {med.medicine_name || med.name || `Medicine ${i + 1}`}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {med.dosage && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Dosage: {med.dosage}</span>}
                  {med.frequency && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Frequency: {med.frequency}</span>}
                  {med.time_of_day && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Time: {med.time_of_day}</span>}
                  {med.start_date && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Started: {new Date(med.start_date).toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Test Control Center */}
      <div className="glass-card" style={{ padding: '24px 28px', marginTop: 24 }}>
        <h3 className="font-syne" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageSquare size={16} color="#a78bfa" /> WhatsApp & Twilio Test Control Center
        </h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
          Directly execute live communication flows to test integration endpoints. If the patient has no previous dose logs, a dummy one will be auto-generated.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            disabled={testLoading !== null}
            onClick={() => handleTriggerTest('reminder')}
            style={{
              padding: '10px 18px', borderRadius: 10, border: 'none',
              background: 'rgba(0, 255, 157, 0.08)',
              border: '1px solid rgba(0, 255, 157, 0.2)',
              color: 'var(--emerald)', fontSize: 13, fontWeight: 600,
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
              padding: '10px 18px', borderRadius: 10, border: 'none',
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
              padding: '10px 18px', borderRadius: 10, border: 'none',
              background: 'rgba(167, 139, 250, 0.08)',
              border: '1px solid rgba(167, 139, 250, 0.2)',
              color: '#a78bfa', fontSize: 13, fontWeight: 600,
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

    </CaretakerLayout>
  );
}
