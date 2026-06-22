import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ArrowRight, Loader2, Pill } from 'lucide-react';
import { apiClient, useAuth } from '@/context/AuthContext';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    age: '',
    gender: 'male',
    blood_group: '',
    medical_conditions: '',
  });
  const [whatsappCC, setWhatsappCC] = useState('+91');
  const [whatsappLocal, setWhatsappLocal] = useState('');
  const [emergencyCC, setEmergencyCC] = useState('+91');
  const [emergencyLocal, setEmergencyLocal] = useState('');

  const getFullPhoneNumber = (cc, local) => {
    if (!local.trim()) return null;
    const cleanLocal = local.replace(/\D/g, '');
    return cc + cleanLocal;
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', transition: 'border-color 0.2s' };
  const labelStyle = { color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', display: 'block', marginBottom: 6 };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const payload = {
        age: parseInt(form.age) || null,
        gender: form.gender,
        blood_group: form.blood_group || null,
        medical_conditions: form.medical_conditions,
        emergency_contact: getFullPhoneNumber(emergencyCC, emergencyLocal),
        whatsapp_number: getFullPhoneNumber(whatsappCC, whatsappLocal),
      };
      await apiClient.post('/patients/onboarding/', payload);
      await refreshUser();
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || JSON.stringify(err.response?.data) || 'Onboarding failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 520, background: 'var(--bg-card)', borderRadius: 24, border: '1px solid var(--border)', boxShadow: '0 32px 64px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '32px 36px 0', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, var(--cyan), var(--emerald))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Pill size={28} color="#fff" />
          </div>
          <h1 className="font-syne" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Welcome to MediMate AI</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Let's set up your health profile to get started.</p>
          {/* Step indicator */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
            {[1, 2].map(s => (
              <div key={s} style={{ width: 60, height: 4, borderRadius: 2, background: s <= step ? 'var(--cyan)' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
            ))}
          </div>
        </div>

        <div style={{ padding: '28px 36px 36px' }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
              <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>
            </div>
          )}

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>AGE</label>
                  <input type="number" required value={form.age} onChange={set('age')} placeholder="e.g. 45" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>GENDER</label>
                  <select value={form.gender} onChange={set('gender')} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>BLOOD GROUP (optional)</label>
                <select value={form.blood_group} onChange={set('blood_group')} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select...</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>MEDICAL CONDITIONS</label>
                <textarea value={form.medical_conditions} onChange={set('medical_conditions')} placeholder="e.g. Type 2 Diabetes, Hypertension..." style={{ ...inputStyle, resize: 'vertical', minHeight: 80, fontFamily: 'Inter, sans-serif' }} />
              </div>
              <button onClick={() => setStep(2)} className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                Continue <ArrowRight size={16} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>WHATSAPP NUMBER (optional)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select 
                    value={whatsappCC} 
                    onChange={e => setWhatsappCC(e.target.value)} 
                    style={{ ...inputStyle, width: 110, cursor: 'pointer', padding: '12px 8px' }}
                  >
                    <option value="+91">🇮🇳 +91</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+61">🇦🇺 +61</option>
                    <option value="+86">🇨🇳 +86</option>
                    <option value="+971">🇦🇪 +971</option>
                    <option value="+33">🇫🇷 +33</option>
                    <option value="+49">🇩🇪 +49</option>
                    <option value="+65">🇸🇬 +65</option>
                  </select>
                  <input 
                    type="tel" 
                    value={whatsappLocal} 
                    onChange={e => setWhatsappLocal(e.target.value)} 
                    placeholder="Enter local number" 
                    style={{ ...inputStyle, flex: 1 }} 
                  />
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>Used to send interactive medicine reminders and AI health advice.</p>
              </div>
              <div>
                <label style={labelStyle}>EMERGENCY CONTACT (optional)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select 
                    value={emergencyCC} 
                    onChange={e => setEmergencyCC(e.target.value)} 
                    style={{ ...inputStyle, width: 110, cursor: 'pointer', padding: '12px 8px' }}
                  >
                    <option value="+91">🇮🇳 +91</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+61">🇦🇺 +61</option>
                    <option value="+86">🇨🇳 +86</option>
                    <option value="+971">🇦🇪 +971</option>
                    <option value="+33">🇫🇷 +33</option>
                    <option value="+49">🇩🇪 +49</option>
                    <option value="+65">🇸🇬 +65</option>
                  </select>
                  <input 
                    type="tel" 
                    value={emergencyLocal} 
                    onChange={e => setEmergencyLocal(e.target.value)} 
                    placeholder="Enter local number" 
                    style={{ ...inputStyle, flex: 1 }} 
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button onClick={() => setStep(1)} className="btn-outline" style={{ flex: 1, padding: '12px' }}>← Back</button>
                <button onClick={handleSubmit} disabled={loading} className="btn-primary" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Setting up...</> : <><Heart size={16} /> Complete Setup</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
