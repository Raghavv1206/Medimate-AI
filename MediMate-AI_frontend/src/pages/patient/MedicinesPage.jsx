import { useState, useEffect } from 'react';
import { Plus, Pill, Clock, Trash2, ToggleLeft, ToggleRight, X, Loader2, Edit2 } from 'lucide-react';
import PatientLayout from '@/components/layout/PatientLayout';
import { apiClient } from '@/context/AuthContext';

function AddMedicineModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', dosage: '', instructions: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setError('');
  };
  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' };

  const validateForm = () => {
    const name = form.name?.trim();
    const dosage = form.dosage?.trim();
    if (!name || !dosage) {
      setError('Medicine name and dosage are required.');
      return false;
    }
    if (name.length > 100) {
      setError('Medicine name must be less than 100 characters.');
      return false;
    }
    if (dosage.length > 50) {
      setError('Dosage must be less than 50 characters.');
      return false;
    }
    if (form.instructions && form.instructions.length > 1000) {
      setError('Instructions must be less than 1000 characters.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      await apiClient.post('/medicines/list/', {
        name: form.name.trim(),
        dosage: form.dosage.trim(),
        instructions: form.instructions?.trim() || '',
      });
      onAdded();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.name?.[0] || 'Failed to add medicine');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: 28, width: '100%', maxWidth: 440, animation: 'fadeInUp 0.2s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 className="font-syne" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Add Medicine</h3>
          <button onClick={onClose} disabled={loading} style={{ background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', color: 'var(--text-muted)', opacity: loading ? 0.5 : 1 }}><X size={18} /></button>
        </div>
        {error && (
          <div style={{ background: 'rgba(255,67,54,0.1)', border: '1px solid rgba(255,67,54,0.3)', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, color: 'rgba(255,67,54,0.9)' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>MEDICINE NAME</label>
            <input required value={form.name} onChange={set('name')} placeholder="e.g. Metformin" maxLength={100} style={inputStyle} />
          </div>
          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>DOSAGE</label>
            <input required value={form.dosage} onChange={set('dosage')} placeholder="e.g. 500mg" maxLength={50} style={inputStyle} />
          </div>
          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>INSTRUCTIONS</label>
            <input value={form.instructions} onChange={set('instructions')} placeholder="e.g. Take with food" maxLength={1000} style={inputStyle} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: 8, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Adding...' : 'Add Medicine'}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditMedicineModal({ medicine, onClose, onUpdated }) {
  const [form, setForm] = useState({
    name: medicine?.name || '',
    dosage: medicine?.dosage || '',
    instructions: medicine?.instructions || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setError('');
  };
  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' };

  const validateForm = () => {
    const name = form.name?.trim();
    const dosage = form.dosage?.trim();
    const instructions = form.instructions?.trim() || '';
    
    const origName = medicine?.name?.trim() || '';
    const origDosage = medicine?.dosage?.trim() || '';
    const origInstructions = medicine?.instructions?.trim() || '';

    if (!name || !dosage) {
      setError('Medicine name and dosage are required.');
      return false;
    }
    if (name.length > 100) {
      setError('Medicine name must be less than 100 characters.');
      return false;
    }
    if (dosage.length > 50) {
      setError('Dosage must be less than 50 characters.');
      return false;
    }
    if (instructions.length > 1000) {
      setError('Instructions must be less than 1000 characters.');
      return false;
    }
    // Check if anything changed
    if (name === origName && dosage === origDosage && instructions === origInstructions) {
      setError('No changes made.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      await apiClient.patch(`/medicines/list/${medicine.id}/`, {
        name: form.name.trim(),
        dosage: form.dosage.trim(),
        instructions: form.instructions?.trim() || '',
      });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.name?.[0] || 'Failed to update medicine');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: 28, width: '100%', maxWidth: 440, animation: 'fadeInUp 0.2s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 className="font-syne" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Edit Medicine</h3>
          <button onClick={onClose} disabled={loading} style={{ background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', color: 'var(--text-muted)', opacity: loading ? 0.5 : 1 }}><X size={18} /></button>
        </div>
        {error && (
          <div style={{ background: 'rgba(255,67,54,0.1)', border: '1px solid rgba(255,67,54,0.3)', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, color: 'rgba(255,67,54,0.9)' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>MEDICINE NAME</label>
            <input required value={form.name} onChange={set('name')} placeholder="e.g. Metformin" maxLength={100} style={inputStyle} />
          </div>
          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>DOSAGE</label>
            <input required value={form.dosage} onChange={set('dosage')} placeholder="e.g. 500mg" maxLength={50} style={inputStyle} />
          </div>
          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>INSTRUCTIONS</label>
            <input value={form.instructions} onChange={set('instructions')} placeholder="e.g. Take with food" maxLength={1000} style={inputStyle} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: 8, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}


function AddScheduleModal({ medicines, onClose, onAdded }) {
  const [form, setForm] = useState({ medicine_id: '', scheduled_time: '08:00', start_date: new Date().toISOString().split('T')[0], end_date: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setError('');
  };
  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' };

  const validateForm = () => {
    if (!form.medicine_id) {
      setError('Please select a medicine.');
      return false;
    }
    if (!form.scheduled_time) {
      setError('Please select a time.');
      return false;
    }
    if (!form.start_date) {
      setError('Please select a start date.');
      return false;
    }
    // Check if end date is after start date
    if (form.end_date && form.end_date < form.start_date) {
      setError('End date must be after start date.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e, ignoreWarning = false) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      await apiClient.post('/medicines/schedules/', {
        medicine_id: parseInt(form.medicine_id),
        scheduled_time: form.scheduled_time,
        start_date: form.start_date,
        end_date: form.end_date || null,
        ignore_warning: ignoreWarning,
      });
      onAdded();
      onClose();
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.is_duplicate) {
        const proceed = window.confirm(
          `${err.response.data.warning}\n\nDo you still want to proceed with scheduling?`
        );
        if (proceed) {
          await handleSubmit(null, true);
          return;
        }
      }
      setError(
        err.response?.data?.detail ||
        err.response?.data?.warning ||
        err.response?.data?.scheduled_time?.[0] ||
        'Failed to add schedule'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: 28, width: '100%', maxWidth: 440, animation: 'fadeInUp 0.2s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 className="font-syne" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Add Schedule</h3>
          <button onClick={onClose} disabled={loading} style={{ background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', color: 'var(--text-muted)', opacity: loading ? 0.5 : 1 }}><X size={18} /></button>
        </div>
        {error && (
          <div style={{ background: 'rgba(255,67,54,0.1)', border: '1px solid rgba(255,67,54,0.3)', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, color: 'rgba(255,67,54,0.9)' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>MEDICINE</label>
            <select required value={form.medicine_id} onChange={set('medicine_id')} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">Select medicine...</option>
              {medicines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.dosage})</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>TIME</label>
            <input required type="time" value={form.scheduled_time} onChange={set('scheduled_time')} style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>START DATE</label>
              <input required type="date" value={form.start_date} onChange={set('start_date')} style={inputStyle} />
            </div>
            <div>
              <label style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>END DATE (optional)</label>
              <input type="date" value={form.end_date} onChange={set('end_date')} style={inputStyle} />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: 8, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Adding...' : 'Add Schedule'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMed, setShowAddMed] = useState(false);
  const [showAddSched, setShowAddSched] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [medRes, schedRes] = await Promise.all([
        apiClient.get('/medicines/list/').catch(() => ({ data: { results: [] } })),
        apiClient.get('/medicines/schedules/').catch(() => ({ data: { results: [] } })),
      ]);
      setMedicines(medRes.data.results || medRes.data || []);
      setSchedules(schedRes.data.results || schedRes.data || []);
    } catch (err) {
      console.error('Medicines fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDeleteMed = async (id) => {
    if (!confirm('Delete this medicine?')) return;
    try {
      await apiClient.delete(`/medicines/list/${id}/`);
      fetchData();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const handleToggleSchedule = async (id) => {
    try {
      await apiClient.post(`/medicines/schedules/${id}/toggle_active/`);
      fetchData();
    } catch (err) {
      alert('Failed to toggle');
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!confirm('Delete this schedule?')) return;
    try {
      await apiClient.delete(`/medicines/schedules/${id}/`);
      fetchData();
    } catch (err) {
      alert('Failed to delete');
    }
  };

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
        <h1 className="font-syne" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>My Medicines</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Manage your medications and daily schedules.</p>
      </div>

      {/* Medicines Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="font-syne" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Medicines</h2>
        <button onClick={() => setShowAddMed(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, padding: '7px 14px', color: 'var(--cyan)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={14} /> Add Medicine
        </button>
      </div>

      {medicines.length === 0 ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', marginBottom: 32 }}>
          <Pill size={28} color="var(--text-muted)" style={{ marginBottom: 10 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No medicines added yet. Click "Add Medicine" to start.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 14, marginBottom: 32 }}>
          {medicines.map(med => (
            <div key={med.id} className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,255,157,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 18 }}>💊</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', wordBreak: 'break-word' }}>{med.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{med.dosage}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 10 }}>
                  <button onClick={() => setEditingMedicine(med)} title="Edit medicine" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cyan)', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, transition: 'background 0.2s' }} onMouseEnter={(e) => e.target.style.background = 'rgba(0,212,255,0.1)'} onMouseLeave={(e) => e.target.style.background = 'none'}>
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDeleteMed(med.id)} title="Delete medicine" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = 'rgba(255,67,54,0.7)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {med.instructions && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>{med.instructions}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Schedules Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="font-syne" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Schedules</h2>
        <button onClick={() => setShowAddSched(true)} disabled={medicines.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,255,157,0.1)', border: '1px solid rgba(0,255,157,0.2)', borderRadius: 8, padding: '7px 14px', color: 'var(--emerald)', fontSize: 13, fontWeight: 600, cursor: medicines.length === 0 ? 'not-allowed' : 'pointer', opacity: medicines.length === 0 ? 0.5 : 1 }}>
          <Clock size={14} /> Add Schedule
        </button>
      </div>

      {schedules.length === 0 ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
          <Clock size={28} color="var(--text-muted)" style={{ marginBottom: 10 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No schedules set. Add a schedule to start getting reminders.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {schedules.map(sched => (
            <div key={sched.id} className="glass-card" style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', opacity: sched.is_active ? 1 : 0.5 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,255,157,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock size={18} color="var(--emerald)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{sched.medicine?.name || `Medicine #${sched.medicine}`}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Time: {sched.scheduled_time?.slice(0, 5)} · From: {sched.start_date} {sched.end_date ? `→ ${sched.end_date}` : '(ongoing)'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => handleToggleSchedule(sched.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: sched.is_active ? 'var(--emerald)' : 'var(--text-muted)' }}>
                  {sched.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                </button>
                <button onClick={() => handleDeleteSchedule(sched.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddMed && <AddMedicineModal onClose={() => setShowAddMed(false)} onAdded={fetchData} />}
      {showAddSched && <AddScheduleModal medicines={medicines} onClose={() => setShowAddSched(false)} onAdded={fetchData} />}
      {editingMedicine && <EditMedicineModal medicine={editingMedicine} onClose={() => setEditingMedicine(null)} onUpdated={fetchData} />}
    </PatientLayout>
  );
}
