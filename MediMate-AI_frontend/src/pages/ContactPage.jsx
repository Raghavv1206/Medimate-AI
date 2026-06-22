import { useState } from 'react';
import { Mail, MessageCircle, Send, MapPin, Loader2 } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AuthModal from '@/components/shared/AuthModal';

export default function ContactPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Connect to: POST /api/contact/
    await new Promise(r => setTimeout(r, 1200));
    setSent(true);
    setLoading(false);
  };

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 10,
    background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', fontSize: 14, outline: 'none', transition: 'border-color 0.2s',
  };
  const labelStyle = { color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', display: 'block', marginBottom: 6 };

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <Navbar onSignIn={() => setAuthOpen(true)} />

      <section style={{ minHeight: '35vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 24px 60px', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(0,212,255,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 580, position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 999, padding: '5px 14px', marginBottom: 24 }}>
            <span style={{ color: 'var(--cyan)', fontSize: 12, fontWeight: 600 }}>GET IN TOUCH</span>
          </div>
          <h1 className="font-syne" style={{ fontSize: 'clamp(30px, 5vw, 52px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 20 }}>
            Let's <span className="gradient-text">Talk</span>
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)' }}>Have a question, want to partner with us, or need support? We're here.</p>
        </div>
      </section>

      <section style={{ padding: '40px 24px 100px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 40 }}>
          {/* Contact info */}
          <div>
            <h2 className="font-syne" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24 }}>Contact Information</h2>
            {[
              { icon: Mail, color: 'var(--cyan)', label: 'Email', value: 'hello@medimateai.com' },
              { icon: MessageCircle, color: '#25D366', label: 'WhatsApp', value: '+91 98765 43210' },
              { icon: MapPin, color: 'var(--emerald)', label: 'Location', value: 'New Delhi, India 🇮🇳' },
            ].map(({ icon: Icon, color, label, value }) => (
              <div key={label} style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={20} color={color} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{value}</div>
                </div>
              </div>
            ))}

            <div className="glass-card" style={{ padding: 20, marginTop: 8 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.6 }}>
                🕐 We typically respond within 24 hours. For urgent support related to patient safety features, mark your subject as <span style={{ color: 'var(--amber)' }}>[URGENT]</span>.
              </p>
            </div>
          </div>

          {/* Contact form */}
          <div className="glass-card" style={{ padding: 32 }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <h3 className="font-syne" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Message Sent!</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>We'll get back to you within 24 hours.</p>
                <button onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }} className="btn-outline" style={{ marginTop: 20 }}>Send another</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <h3 className="font-syne" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Send us a message</h3>
                <div><label style={labelStyle}>YOUR NAME</label><input type="text" required value={form.name} onChange={set('name')} placeholder="John Doe" style={inputStyle} onFocus={e => e.target.style.borderColor='var(--cyan)'} onBlur={e => e.target.style.borderColor='var(--border)'} /></div>
                <div><label style={labelStyle}>EMAIL</label><input type="email" required value={form.email} onChange={set('email')} placeholder="you@example.com" style={inputStyle} onFocus={e => e.target.style.borderColor='var(--cyan)'} onBlur={e => e.target.style.borderColor='var(--border)'} /></div>
                <div><label style={labelStyle}>SUBJECT</label><input type="text" required value={form.subject} onChange={set('subject')} placeholder="How can we help?" style={inputStyle} onFocus={e => e.target.style.borderColor='var(--cyan)'} onBlur={e => e.target.style.borderColor='var(--border)'} /></div>
                <div><label style={labelStyle}>MESSAGE</label><textarea required value={form.message} onChange={set('message')} placeholder="Tell us more..." rows={5} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'Inter, sans-serif' }} onFocus={e => e.target.style.borderColor='var(--cyan)'} onBlur={e => e.target.style.borderColor='var(--border)'} /></div>
                <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                  {loading ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <Footer />
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
