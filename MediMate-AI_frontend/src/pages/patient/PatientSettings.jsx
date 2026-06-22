import { useState, useEffect } from 'react';
import { User, Heart, Phone, Shield, Save, Loader2, CheckCircle, AlertCircle, Droplets, Activity } from 'lucide-react';
import PatientLayout from '@/components/layout/PatientLayout';
import { apiClient, useAuth } from '@/context/AuthContext';

const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' }
];
const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  fontSize: 13,
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const inputFocusStyle = {
  borderColor: 'var(--cyan)',
  boxShadow: '0 0 0 3px rgba(0,212,255,0.1)',
};

const readOnlyStyle = {
  ...inputStyle,
  background: 'rgba(255,255,255,0.02)',
  color: 'var(--text-muted)',
  cursor: 'not-allowed',
};

const selectStyle = {
  ...inputStyle,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: 32,
};

function FormField({ label, children, hint }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>{label}</label>
      {children}
      {hint && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{hint}</span>}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, color, description }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${color}15`,
          border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={color} />
        </div>
        <div>
          <h3 className="font-syne" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h3>
          {description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{description}</p>}
        </div>
      </div>
    </div>
  );
}

function Toast({ message, type, onClose }) {
  const isSuccess = type === 'success';
  const bg = isSuccess ? 'rgba(0,255,157,0.12)' : 'rgba(239,68,68,0.12)';
  const border = isSuccess ? 'rgba(0,255,157,0.3)' : 'rgba(239,68,68,0.3)';
  const color = isSuccess ? 'var(--emerald)' : '#ef4444';
  const Icon = isSuccess ? CheckCircle : AlertCircle;

  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 1000,
      padding: '14px 20px', borderRadius: 12,
      background: bg, border: `1px solid ${border}`,
      display: 'flex', alignItems: 'center', gap: 10,
      animation: 'fadeInUp 0.3s ease',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    }}>
      <Icon size={16} color={color} />
      <span style={{ fontSize: 13, fontWeight: 600, color }}>{message}</span>
    </div>
  );
}

function arrayToString(arr) {
  if (!arr) return '';
  if (typeof arr === 'string') return arr;
  if (Array.isArray(arr)) return arr.join(', ');
  return '';
}

function stringToArray(str) {
  if (!str || !str.trim()) return [];
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

export default function PatientSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [focusedField, setFocusedField] = useState(null);

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    age: '',
    gender: '',
    blood_group: '',
    diseases: '',
    allergies: '',
    chronic_conditions: '',
  });
  const [whatsappCC, setWhatsappCC] = useState('+91');
  const [whatsappLocal, setWhatsappLocal] = useState('');
  const [emergencyCC, setEmergencyCC] = useState('+91');
  const [emergencyLocal, setEmergencyLocal] = useState('');

  const parsePhoneNumber = (phoneStr) => {
    if (!phoneStr) return { cc: '+91', local: '' };
    const clean = phoneStr.trim();
    
    // Check against known country codes in our dropdown
    const knownCCs = ['+971', '+91', '+44', '+61', '+86', '+33', '+49', '+65', '+1'];
    for (const cc of knownCCs) {
      if (clean.startsWith(cc)) {
        return { cc, local: clean.substring(cc.length).trim() };
      }
    }
    
    // Fallback regex matching
    const match = clean.match(/^(\+\d{1,3})(.*)$/);
    if (match) {
      const potentialCC = match[1];
      for (const cc of knownCCs) {
        if (potentialCC.startsWith(cc)) {
          return { cc, local: clean.substring(cc.length).trim() };
        }
      }
      return { cc: match[1], local: match[2].trim() };
    }
    if (clean.startsWith('91') && clean.length === 12) {
      return { cc: '+91', local: clean.substring(2) };
    }
    if (clean.length === 10 && /^\d+$/.test(clean)) {
      return { cc: '+91', local: clean };
    }
    return { cc: '+91', local: clean };
  };

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/patients/me/');
        const data = res.data;
        setProfile(data);
        setForm({
          age: data.age ?? '',
          gender: data.gender || '',
          blood_group: data.blood_group || '',
          diseases: arrayToString(data.diseases),
          allergies: arrayToString(data.allergies),
          chronic_conditions: arrayToString(data.chronic_conditions),
        });
        const waParsed = parsePhoneNumber(data.user?.whatsapp_number || '');
        setWhatsappCC(waParsed.cc);
        setWhatsappLocal(waParsed.local);
        const emParsed = parsePhoneNumber(data.emergency_phone || '');
        setEmergencyCC(emParsed.cc);
        setEmergencyLocal(emParsed.local);
      } catch (err) {
        console.error('Failed to load profile:', err);
        setToast({ message: 'Failed to load profile data', type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const getFullPhoneNumber = (cc, local) => {
    if (!local.trim()) return '';
    const cleanLocal = local.replace(/\D/g, '');
    return cc + cleanLocal;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Validate required fields
      if (form.age && (parseInt(form.age, 10) < 1 || parseInt(form.age, 10) > 150)) {
        setToast({ message: 'Age must be between 1 and 150', type: 'error' });
        setSaving(false);
        return;
      }

      const payload = {
        age: form.age ? parseInt(form.age, 10) : null,
        gender: form.gender || '',
        blood_group: form.blood_group || '',
        diseases: stringToArray(form.diseases),
        allergies: stringToArray(form.allergies),
        chronic_conditions: stringToArray(form.chronic_conditions),
        emergency_phone: getFullPhoneNumber(emergencyCC, emergencyLocal),
      };

      const fullWhatsApp = getFullPhoneNumber(whatsappCC, whatsappLocal);
      if (fullWhatsApp) {
        payload.whatsapp_number = fullWhatsApp;
      } else {
        payload.whatsapp_number = '';
      }

      const res = await apiClient.patch('/patients/me/', payload);
      setProfile(res.data);
      setToast({ message: 'Profile updated successfully!', type: 'success' });
    } catch (err) {
      // Enhanced error handling
      let errorMessage = 'Failed to update profile. Please try again.';
      
      if (err.response?.data) {
        const errorData = err.response.data;
        
        // Handle field-specific errors
        if (typeof errorData === 'object' && !Array.isArray(errorData)) {
          const fieldErrors = Object.entries(errorData)
            .filter(([_, value]) => typeof value === 'string' || Array.isArray(value))
            .map(([field, value]) => {
              const msg = Array.isArray(value) ? value[0] : value;
              return msg || field;
            });
          
          if (fieldErrors.length > 0) {
            errorMessage = fieldErrors[0];
          }
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData?.detail) {
          errorMessage = errorData.detail;
        } else if (errorData?.error) {
          errorMessage = errorData.error;
        }
      }
      
      console.error('Profile update error:', err);
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const getInputProps = (field) => ({
    style: focusedField === field ? { ...inputStyle, ...inputFocusStyle } : inputStyle,
    onFocus: () => setFocusedField(field),
    onBlur: () => setFocusedField(null),
  });

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
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Page Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 className="font-syne" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Settings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Manage your profile information and preferences.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24, maxWidth: 960 }}>

        {/* Personal Information */}
        <div className="glass-card" style={{ padding: 28 }}>
          <SectionHeader icon={User} title="Personal Information" color="var(--cyan)" description="Your basic identity details" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <FormField label="Full Name">
              <input
                type="text"
                value={profile?.user?.full_name || user?.name || ''}
                readOnly
                style={readOnlyStyle}
              />
            </FormField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormField label="Age">
                <input
                  type="number"
                  value={form.age}
                  onChange={e => handleChange('age', e.target.value)}
                  placeholder="Enter age"
                  min="1"
                  max="150"
                  {...getInputProps('age')}
                />
              </FormField>
              <FormField label="Gender">
                <select
                  value={form.gender}
                  onChange={e => handleChange('gender', e.target.value)}
                  style={focusedField === 'gender' ? { ...selectStyle, ...inputFocusStyle } : selectStyle}
                  onFocus={() => setFocusedField('gender')}
                  onBlur={() => setFocusedField(null)}
                >
                  <option value="">Select gender</option>
                  {GENDER_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </FormField>
            </div>
          </div>
        </div>

        {/* Medical Information */}
        <div className="glass-card" style={{ padding: 28 }}>
          <SectionHeader icon={Heart} title="Medical Information" color="#ef4444" description="Health details for AI analysis" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <FormField label="Blood Group">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {BLOOD_GROUP_OPTIONS.map(bg => {
                  const selected = form.blood_group === bg;
                  return (
                    <button
                      key={bg}
                      onClick={() => handleChange('blood_group', selected ? '' : bg)}
                      style={{
                        padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.2s',
                        background: selected ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${selected ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
                        color: selected ? '#ef4444' : 'var(--text-secondary)',
                      }}
                    >
                      <Droplets size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                      {bg}
                    </button>
                  );
                })}
              </div>
            </FormField>
            <FormField label="Diseases" hint="Comma-separated, e.g. Diabetes, Hypertension">
              <input
                type="text"
                value={form.diseases}
                onChange={e => handleChange('diseases', e.target.value)}
                placeholder="e.g. Diabetes, Asthma"
                {...getInputProps('diseases')}
              />
            </FormField>
            <FormField label="Allergies" hint="Comma-separated, e.g. Penicillin, Peanuts">
              <input
                type="text"
                value={form.allergies}
                onChange={e => handleChange('allergies', e.target.value)}
                placeholder="e.g. Penicillin, Dust"
                {...getInputProps('allergies')}
              />
            </FormField>
            <FormField label="Chronic Conditions" hint="Comma-separated, e.g. COPD, Heart Disease">
              <input
                type="text"
                value={form.chronic_conditions}
                onChange={e => handleChange('chronic_conditions', e.target.value)}
                placeholder="e.g. Arthritis, Thyroid"
                {...getInputProps('chronic_conditions')}
              />
            </FormField>
          </div>
        </div>

        {/* Contact Information */}
        <div className="glass-card" style={{ padding: 28 }}>
          <SectionHeader icon={Phone} title="Contact Information" color="var(--emerald)" description="Communication and emergency contacts" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            <FormField label="WhatsApp Number" hint="Used for medication reminders">
              <div style={{ display: 'flex', gap: 8 }}>
                <select 
                  value={whatsappCC} 
                  onChange={e => setWhatsappCC(e.target.value)} 
                  style={{ ...selectStyle, width: 110, flexShrink: 0, paddingRight: 24 }}
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
                  style={inputStyle}
                  onFocus={() => setFocusedField('whatsapp_number')}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
            </FormField>

            <FormField label="Emergency Phone" hint="Contacted during critical escalations">
              <div style={{ display: 'flex', gap: 8 }}>
                <select 
                  value={emergencyCC} 
                  onChange={e => setEmergencyCC(e.target.value)} 
                  style={{ ...selectStyle, width: 110, flexShrink: 0, paddingRight: 24 }}
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
                  style={inputStyle}
                  onFocus={() => setFocusedField('emergency_phone')}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
            </FormField>
          </div>
        </div>

        {/* Account Information */}
        <div className="glass-card" style={{ padding: 28 }}>
          <SectionHeader icon={Shield} title="Account Information" color="var(--purple-light)" description="Your account details" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <FormField label="Email Address">
              <input
                type="email"
                value={profile?.user?.email || ''}
                readOnly
                style={readOnlyStyle}
              />
            </FormField>
            <FormField label="Role">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: 'rgba(124,58,237,0.12)',
                  border: '1px solid rgba(124,58,237,0.3)',
                  color: 'var(--purple-light)',
                  textTransform: 'capitalize',
                }}>
                  {profile?.user?.role || 'Patient'}
                </span>
              </div>
            </FormField>
            {profile?.adherence_score != null && (
              <FormField label="Adherence Score">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    flex: 1, height: 8, borderRadius: 4,
                    background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${profile.adherence_score}%`,
                      background: profile.adherence_score >= 80 ? 'var(--emerald)' : profile.adherence_score >= 50 ? 'var(--amber)' : '#ef4444',
                      borderRadius: 4,
                      transition: 'width 1s ease',
                    }} />
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: profile.adherence_score >= 80 ? 'var(--emerald)' : profile.adherence_score >= 50 ? 'var(--amber)' : '#ef4444',
                  }}>
                    {profile.adherence_score}%
                  </span>
                </div>
              </FormField>
            )}
            {profile?.risk_level && (
              <FormField label="Risk Level">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Activity size={14} color={
                    { low: 'var(--emerald)', medium: 'var(--amber)', high: '#f97316', critical: '#ef4444' }[profile.risk_level] || 'var(--text-muted)'
                  } />
                  <span style={{
                    fontSize: 13, fontWeight: 600,
                    color: { low: 'var(--emerald)', medium: 'var(--amber)', high: '#f97316', critical: '#ef4444' }[profile.risk_level] || 'var(--text-muted)',
                    textTransform: 'capitalize',
                  }}>
                    {profile.risk_level}
                  </span>
                </div>
              </FormField>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end', maxWidth: 960 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '14px 36px', borderRadius: 12, border: 'none',
            background: saving ? 'rgba(0,212,255,0.3)' : 'linear-gradient(135deg, var(--cyan), var(--emerald))',
            color: '#050d1a', fontSize: 14, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'all 0.3s',
            boxShadow: saving ? 'none' : '0 4px 20px rgba(0,212,255,0.3)',
          }}
          onMouseEnter={e => { if (!saving) e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
        >
          {saving ? (
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Save size={16} />
          )}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </PatientLayout>
  );
}
