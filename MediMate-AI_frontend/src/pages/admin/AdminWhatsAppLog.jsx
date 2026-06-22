import { useState, useEffect, useMemo } from 'react';
import { MessageSquare, CheckCircle, AlertCircle, Loader2, Calendar, Search } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { apiClient } from '@/context/AuthContext';

export default function AdminWhatsAppLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await apiClient.get('/whatsapp/interactions/');
        setLogs(data.interactions || []);
      } catch (err) {
        console.error('WhatsApp Log fetch error:', err);
        setError('Failed to load message history. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter(log => {
      const pName = (log.patient_name || '').toLowerCase();
      const pNumber = (log.whatsapp_number || '').toLowerCase();
      const mName = (log.medicine_name || '').toLowerCase();
      return pName.includes(q) || pNumber.includes(q) || mName.includes(q);
    });
  }, [logs, search]);

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <Loader2 size={32} color="var(--cyan)" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-syne" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>WhatsApp Interaction Logs</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Monitor WhatsApp reminder interactions across the platform.</p>
      </div>

      {error && (
        <div className="glass-card" style={{ padding: 20, border: '1px solid rgba(239,68,68,0.2)', marginBottom: 20 }}>
          <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>
        </div>
      )}

      {/* Search Bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ position: 'relative', maxWidth: 420 }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by patient, number or medicine..."
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
            onFocus={e => e.target.style.borderColor = 'var(--cyan)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
          <MessageSquare size={36} color="var(--text-muted)" style={{ marginBottom: 12, opacity: 0.5 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {search ? 'No logs match your search criteria.' : 'No WhatsApp interactions logged in the system.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredLogs.map((log, i) => {
            const isSuccess = log.status === 'sent';
            return (
              <div key={log.id || i} className="glass-card" style={{ padding: 22, border: `1px solid ${isSuccess ? 'rgba(0,255,157,0.15)' : 'rgba(239,68,68,0.2)'}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: isSuccess ? 'rgba(0,255,157,0.08)' : 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isSuccess ? <CheckCircle size={20} color="var(--emerald)" /> : <AlertCircle size={20} color="#ef4444" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {log.patient_name || 'System'} ({log.whatsapp_number})
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <Calendar size={13} /> {new Date(log.created_at).toLocaleString()}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: isSuccess ? 'rgba(0,255,157,0.1)' : 'rgba(239,68,68,0.1)', color: isSuccess ? 'var(--emerald)' : '#ef4444', textTransform: 'capitalize' }}>
                        {log.status}
                      </span>
                    </div>
                    
                    {log.medicine_name && (
                      <div style={{ fontSize: 12, color: 'var(--cyan)', fontWeight: 600, marginBottom: 8 }}>
                        💊 Medicine: {log.medicine_name} {log.scheduled_time ? `scheduled for ${log.scheduled_time}` : ''}
                      </div>
                    )}

                    <pre style={{
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'inherit',
                      background: 'rgba(255,255,255,0.02)',
                      padding: 14,
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      lineHeight: 1.5,
                      margin: 0
                    }}>{log.message_sent}</pre>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
