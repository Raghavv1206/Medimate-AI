import { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Phone, 
  MessageSquare, 
  Loader2, 
  Search, 
  Clock, 
  Activity, 
  Calendar, 
  Info, 
  ArrowRight,
  Check
} from 'lucide-react';
import PatientLayout from '@/components/layout/PatientLayout';
import { apiClient } from '@/context/AuthContext';

export default function EscalationLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  // Advanced Filters
  const [statusFilter, setStatusFilter] = useState('all'); // all | unresolved | resolved
  const [channelFilter, setChannelFilter] = useState('all'); // all | whatsapp_primary | whatsapp_secondary | bot_call
  const [deliveryFilter, setDeliveryFilter] = useState('all'); // all | success | failed
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get('/escalation/logs/');
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Escalation fetch error:', err);
      setError('Failed to retrieve escalation logs. Please reload the page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadAndMark = async () => {
      await fetchLogs();
      try {
        await apiClient.post('/escalation/logs/mark-read/');
      } catch (err) {
        console.error('Failed to auto-mark logs as read:', err);
      }
    };
    loadAndMark();
  }, []);

  const handleTakeDose = async (doseLogId) => {
    if (actionLoading[doseLogId]) return;
    setActionLoading(prev => ({ ...prev, [doseLogId]: true }));
    try {
      await apiClient.post(`/doses/${doseLogId}/take/`);
      // Update all logs with this dose_log in local state
      setLogs(prevLogs => 
        prevLogs.map(log => 
          log.dose_log === doseLogId 
            ? { ...log, dose_status: 'taken' } 
            : log
        )
      );
    } catch (err) {
      console.error('Failed to mark dose as taken:', err);
      alert(err.response?.data?.error || 'Failed to mark the medication as taken.');
    } finally {
      setActionLoading(prev => ({ ...prev, [doseLogId]: false }));
    }
  };

  const getChannelDetails = (level) => {
    switch (level) {
      case 'whatsapp_primary':
        return { 
          label: 'WhatsApp (Primary Caretaker)', 
          icon: MessageSquare, 
          color: 'var(--emerald)', 
          bg: 'rgba(0, 255, 157, 0.08)',
          border: 'rgba(0, 255, 157, 0.2)'
        };
      case 'whatsapp_secondary':
        return { 
          label: 'WhatsApp (Secondary Caretaker)', 
          icon: MessageSquare, 
          color: 'var(--cyan)', 
          bg: 'rgba(0, 212, 255, 0.08)',
          border: 'rgba(0, 212, 255, 0.2)'
        };
      case 'bot_call':
        return { 
          label: 'Voice Call (IVR)', 
          icon: Phone, 
          color: 'var(--purple-light)', 
          bg: 'rgba(124, 58, 237, 0.08)',
          border: 'rgba(124, 58, 237, 0.2)'
        };
      default:
        return { 
          label: 'Unknown Alert Channel', 
          icon: AlertTriangle, 
          color: 'var(--text-muted)', 
          bg: 'rgba(255, 255, 255, 0.04)',
          border: 'rgba(255, 255, 255, 0.1)'
        };
    }
  };

  // Metrics calculations
  const totalCount = logs.length;
  const pendingCount = logs.filter(l => l.dose_status !== 'taken' && l.dose_status !== 'skipped').length;
  const successCount = logs.filter(l => l.success).length;
  const failedCount = logs.filter(l => !l.success).length;

  // Filtering Logic
  const filteredLogs = logs.filter(log => {
    // Action Status Filter
    const isResolved = log.dose_status === 'taken' || log.dose_status === 'skipped';
    if (statusFilter === 'unresolved' && isResolved) return false;
    if (statusFilter === 'resolved' && !isResolved) return false;

    // Channel Filter
    if (channelFilter !== 'all' && log.escalation_level !== channelFilter) return false;

    // Delivery Status Filter
    if (deliveryFilter === 'success' && !log.success) return false;
    if (deliveryFilter === 'failed' && log.success) return false;

    // Search Query (Medicine name, Recipient phone, or message body)
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const medName = (log.medicine_name || '').toLowerCase();
      const phone = (log.recipient_phone || '').toLowerCase();
      const msg = (log.message_sent || '').toLowerCase();
      if (!medName.includes(q) && !phone.includes(q) && !msg.includes(q)) {
        return false;
      }
    }

    return true;
  });

  return (
    <PatientLayout>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-syne" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Escalation & Caretaker Alerts</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Track notifications dispatched to caretakers when medications are missed or delayed.</p>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Escalations', value: totalCount, color: 'var(--cyan)', icon: Activity },
          { label: 'Action Required', value: pendingCount, color: pendingCount > 0 ? 'var(--amber)' : 'var(--emerald)', icon: Clock },
          { label: 'Dispatched successfully', value: successCount, color: 'var(--emerald)', icon: CheckCircle },
          { label: 'Delivery Failures', value: failedCount, color: failedCount > 0 ? '#ef4444' : 'var(--text-muted)', icon: AlertTriangle }
        ].map((item, idx) => {
          const IconComponent = item.icon;
          return (
            <div key={idx} className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ 
                width: 42, 
                height: 42, 
                borderRadius: 10, 
                background: 'rgba(255, 255, 255, 0.03)', 
                border: '1px solid var(--border)',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <IconComponent size={20} color={item.color} />
              </div>
              <div>
                <div className="font-syne" style={{ fontSize: 24, fontWeight: 800, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', marginTop: 2 }}>{item.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ padding: 20, marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by medicine, recipient phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 38px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none',
                transition: 'all 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--cyan)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Reset Filters */}
          {(statusFilter !== 'all' || channelFilter !== 'all' || deliveryFilter !== 'all' || searchQuery !== '') && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setChannelFilter('all');
                setDeliveryFilter('all');
                setSearchQuery('');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--cyan)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '8px 12px',
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Filter Groups */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, fontSize: 12 }}>
          {/* Status Filter */}
          <div>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600, marginRight: 8, textTransform: 'uppercase', fontSize: 10 }}>Action Status</span>
            <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.02)', borderRadius: 6, padding: 2, border: '1px solid var(--border)' }}>
              {[
                { val: 'all', label: 'All' },
                { val: 'unresolved', label: 'Action Required' },
                { val: 'resolved', label: 'Resolved' }
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setStatusFilter(opt.val)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 4,
                    border: 'none',
                    background: statusFilter === opt.val ? 'rgba(0, 212, 255, 0.15)' : 'transparent',
                    color: statusFilter === opt.val ? 'var(--cyan)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Delivery Status Filter */}
          <div>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600, marginRight: 8, textTransform: 'uppercase', fontSize: 10 }}>Delivery Status</span>
            <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.02)', borderRadius: 6, padding: 2, border: '1px solid var(--border)' }}>
              {[
                { val: 'all', label: 'All' },
                { val: 'success', label: 'Succeeded' },
                { val: 'failed', label: 'Failed' }
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setDeliveryFilter(opt.val)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 4,
                    border: 'none',
                    background: deliveryFilter === opt.val ? 'rgba(0, 212, 255, 0.15)' : 'transparent',
                    color: deliveryFilter === opt.val ? 'var(--cyan)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Channel Filter */}
          <div>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600, marginRight: 8, textTransform: 'uppercase', fontSize: 10 }}>Channel</span>
            <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.02)', borderRadius: 6, padding: 2, border: '1px solid var(--border)' }}>
              {[
                { val: 'all', label: 'All' },
                { val: 'whatsapp_primary', label: 'WhatsApp Primary' },
                { val: 'whatsapp_secondary', label: 'WhatsApp Secondary' },
                { val: 'bot_call', label: 'Voice Calls' }
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setChannelFilter(opt.val)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 4,
                    border: 'none',
                    background: channelFilter === opt.val ? 'rgba(0, 212, 255, 0.15)' : 'transparent',
                    color: channelFilter === opt.val ? 'var(--cyan)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main List */}
      {error && (
        <div className="glass-card" style={{ padding: 18, border: '1px solid rgba(239,68,68,0.2)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle color="#ef4444" size={20} />
          <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 250 }}>
          <Loader2 size={32} color="var(--cyan)" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
          <CheckCircle size={36} color="var(--emerald)" style={{ marginBottom: 12, opacity: 0.8 }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500 }}>
            {logs.length === 0 ? 'No escalation alerts logged. All doses taken on schedule!' : 'No escalation logs match your selected filter criteria.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredLogs.map((log) => {
            const channel = getChannelDetails(log.escalation_level);
            const Icon = channel.icon;
            
            const isTaken = log.dose_status === 'taken';
            const isSkipped = log.dose_status === 'skipped';
            const isResolved = isTaken || isSkipped;
            const isMissed = log.dose_status === 'missed';
            
            // Format time & date
            const alertTimeStr = log.created_at ? new Date(log.created_at).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }) : '—';

            const scheduleTimeFormatted = log.scheduled_time ? log.scheduled_time.slice(0, 5) : '';

            return (
              <div 
                key={log.id} 
                className="glass-card animate-fadeInUp" 
                style={{ 
                  padding: 22, 
                  border: `1px solid ${isResolved ? 'rgba(0,255,157,0.12)' : 'rgba(245,158,11,0.2)'}`,
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Visual indicator bar on the side */}
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 4,
                  background: isResolved ? 'var(--emerald)' : isMissed ? 'var(--danger)' : 'var(--amber)'
                }} />

                <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {/* Channel icon */}
                  <div style={{ 
                    width: 44, 
                    height: 44, 
                    borderRadius: 12, 
                    background: channel.bg, 
                    border: `1px solid ${channel.border}`,
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    flexShrink: 0 
                  }}>
                    <Icon size={22} color={channel.color} />
                  </div>

                  {/* Log Content */}
                  <div style={{ flex: 1, minWidth: 280 }}>
                    {/* Header Row: Channel Name, Alert Time, Action Status Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{channel.label}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {alertTimeStr}</span>
                      </div>
                      
                      {/* Action status pill badge */}
                      <span style={{ 
                        fontSize: 11, 
                        fontWeight: 700, 
                        padding: '3px 10px', 
                        borderRadius: 6, 
                        background: isTaken ? 'rgba(0,255,157,0.1)' : isSkipped ? 'rgba(124,58,237,0.1)' : isMissed ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                        color: isTaken ? 'var(--emerald)' : isSkipped ? 'var(--purple-light)' : isMissed ? '#ef4444' : 'var(--amber)',
                        border: `1px solid ${isTaken ? 'rgba(0,255,157,0.2)' : isSkipped ? 'rgba(124,58,237,0.2)' : isMissed ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`
                      }}>
                        {isTaken ? 'Resolved (Taken)' : isSkipped ? 'Skipped' : isMissed ? 'Missed (Action Required)' : 'Pending'}
                      </span>
                    </div>

                    {/* Metadata Row: Medicine name & dosage */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        {log.medicine_name} {log.medicine_dosage}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>·</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={13} color="var(--text-muted)" />
                        Scheduled for {scheduleTimeFormatted} on {log.scheduled_date}
                      </span>
                    </div>

                    {/* Notification content pre-box */}
                    <div style={{ marginBottom: 14 }}>
                      <pre style={{
                        fontSize: 12.5,
                        color: 'var(--text-secondary)',
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'inherit',
                        background: 'rgba(5, 13, 26, 0.4)',
                        padding: '12px 14px',
                        borderRadius: 8,
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        lineHeight: 1.5,
                        margin: 0
                      }}>{log.message_sent}</pre>
                    </div>

                    {/* Dispatch Delivery Status */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%', 
                          background: log.success ? 'var(--emerald)' : '#ef4444' 
                        }} />
                        <span style={{ fontSize: 12, color: log.success ? 'var(--text-secondary)' : '#f87171', fontWeight: 500 }}>
                          {log.success 
                            ? `Delivered to caretaker at ${log.recipient_phone}` 
                            : `Delivery failed: ${log.error_message || 'Simulated voice provider error or network issue'}`
                          }
                        </span>
                      </div>

                      {/* Take action button if not resolved */}
                      {!isResolved && (
                        <button
                          onClick={() => handleTakeDose(log.dose_log)}
                          disabled={actionLoading[log.dose_log]}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 14px',
                            borderRadius: 8,
                            border: '1px solid rgba(0,255,157,0.3)',
                            background: 'rgba(0,255,157,0.08)',
                            color: 'var(--emerald)',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => {
                            if (!actionLoading[log.dose_log]) {
                              e.currentTarget.style.background = 'rgba(0,255,157,0.18)';
                              e.currentTarget.style.boxShadow = '0 0 12px rgba(0,255,157,0.2)';
                            }
                          }}
                          onMouseLeave={e => {
                            if (!actionLoading[log.dose_log]) {
                              e.currentTarget.style.background = 'rgba(0,255,157,0.08)';
                              e.currentTarget.style.boxShadow = 'none';
                            }
                          }}
                        >
                          {actionLoading[log.dose_log] ? (
                            <>
                              <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                              Resolving...
                            </>
                          ) : (
                            <>
                              <Check size={13} />
                              Acknowledge & Mark as Taken
                            </>
                          )}
                        </button>
                      )}
                    </div>
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
