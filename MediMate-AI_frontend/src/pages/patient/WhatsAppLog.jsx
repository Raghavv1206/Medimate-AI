import { useState, useEffect } from 'react';
import { MessageSquare, CheckCircle, AlertCircle, Loader2, Calendar } from 'lucide-react';
import PatientLayout from '@/components/layout/PatientLayout';
import { apiClient } from '@/context/AuthContext';

export default function WhatsAppLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) {
    return (
      <PatientLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <Loader2 size={32} color="var(--cyan)" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      </PatientLayout>
    );
  }

  return (
    <PatientLayout>
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-syne" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>WhatsApp Reminders</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>View your WhatsApp reminders and interactions history.</p>
      </div>

      {error && (
        <div className="glass-card" style={{ padding: 20, border: '1px solid rgba(239,68,68,0.2)', marginBottom: 20 }}>
          <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>
        </div>
      )}

      {logs.length === 0 ? (
        <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
          <MessageSquare size={36} color="var(--text-muted)" style={{ marginBottom: 12, opacity: 0.5 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No reminders sent yet. They will appear here when triggered.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {logs.map((log, i) => {
            const isSuccess = log.status === 'sent';
            return (
              <div key={log.id || i} className="glass-card" style={{ padding: 22, border: `1px solid ${isSuccess ? 'rgba(0,255,157,0.15)' : 'rgba(239,68,68,0.2)'}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: isSuccess ? 'rgba(0,255,157,0.08)' : 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isSuccess ? <CheckCircle size={20} color="var(--emerald)" /> : <AlertCircle size={20} color="#ef4444" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {log.medicine_name ? `Medication Reminder: ${log.medicine_name}` : 'WhatsApp Alert'}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: isSuccess ? 'rgba(0,255,157,0.1)' : 'rgba(239,68,68,0.1)', color: isSuccess ? 'var(--emerald)' : '#ef4444', textTransform: 'capitalize' }}>
                        {log.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                      <Calendar size={13} /> {new Date(log.created_at).toLocaleString()}
                    </div>
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
    </PatientLayout>
  );
}
