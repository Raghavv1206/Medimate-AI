import { Link } from 'react-router-dom';
import { Pill, X, Globe, Share2, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border)',
      padding: '48px 24px 24px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 40, marginBottom: 40 }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--cyan), var(--emerald))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Pill size={16} color="#050d1a" strokeWidth={2.5} />
              </div>
              <span className="font-syne" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                Medi<span style={{ color: 'var(--cyan)' }}>Mate</span> <span style={{ color: 'var(--emerald)' }}>AI</span>
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>
              Intelligent medication adherence powered by AI. Keeping patients safe, caretakers informed.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              {[X, Globe, Share2].map((Icon, i) => (
                <a key={i} href="#" style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--cyan)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Product</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Dose Tracking', 'WhatsApp Alerts', 'AI Predictions', 'Escalation Logs', 'Caretaker Portal'].map(item => (
                <Link key={item} to="/" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >{item}</Link>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Company</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[['About Us', '/about'], ['Contact', '/contact'], ['Privacy Policy', '#'], ['Terms of Use', '#']].map(([label, href]) => (
                <Link key={label} to={href} style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >{label}</Link>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Contact</h4>
            <a href="mailto:hello@medimateai.com" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>
              <Mail size={14} />
              hello@medimateai.com
            </a>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>© 2025 MediMate AI. Built for healthcare innovation.</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Made with 💙 for better medication adherence</p>
        </div>
      </div>
    </footer>
  );
}
