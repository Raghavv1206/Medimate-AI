import { useState } from 'react';
import { Heart, Shield, Zap, Users } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AuthModal from '@/components/shared/AuthModal';

export default function AboutPage() {
  const [authOpen, setAuthOpen] = useState(false);

  const VALUES = [
    { icon: Heart, color: '#f472b6', title: 'Patient-First', desc: 'Every feature we build starts with the question: does this make the patient\'s life easier and safer?' },
    { icon: Shield, color: 'var(--emerald)', title: 'Clinical Safety', desc: 'We treat medication data with the same rigor as clinical records — no hard deletes, full audit trails.' },
    { icon: Zap, color: 'var(--cyan)', title: 'Intelligent Automation', desc: 'We automate the burden of adherence management so patients focus on living, not tracking.' },
    { icon: Users, color: '#a78bfa', title: 'Caretaker Inclusive', desc: 'Family and professional caretakers are first-class stakeholders in our platform design.' },
  ];

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <Navbar onSignIn={() => setAuthOpen(true)} />

      {/* Hero */}
      <section style={{ minHeight: '45vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(0,212,255,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 680, position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,255,157,0.1)', border: '1px solid rgba(0,255,157,0.25)', borderRadius: 999, padding: '5px 14px', marginBottom: 24 }}>
            <span style={{ color: 'var(--emerald)', fontSize: 12, fontWeight: 600 }}>OUR STORY</span>
          </div>
          <h1 className="font-syne" style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 20 }}>
            Built to Keep People<br /><span className="gradient-text">Safe & Healthy</span>
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            MediMate AI was born from a simple frustration — medication non-adherence is one of healthcare's most preventable problems, yet it kills thousands every year. We built the platform we wished existed.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section style={{ padding: '80px 24px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
          <div className="glass-card" style={{ padding: 32 }}>
            <p style={{ color: 'var(--cyan)', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>OUR MISSION</p>
            <h2 className="font-syne" style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>Eliminate Preventable Non-Adherence</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.7 }}>
              50% of patients with chronic illnesses don't take their medications as prescribed. MediMate AI uses intelligent automation, AI predictions, and human-centered design to solve this at scale.
            </p>
          </div>
          <div className="glass-card" style={{ padding: 32 }}>
            <p style={{ color: 'var(--emerald)', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>OUR VISION</p>
            <h2 className="font-syne" style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>A World Where No Dose is Forgotten</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.7 }}>
              We envision a healthcare future where intelligent systems proactively support patients, keep caretakers informed, and alert clinicians before problems become crises.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section style={{ padding: '0 24px 100px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 className="font-syne" style={{ fontSize: 32, fontWeight: 700 }}>Our <span className="gradient-text">Core Values</span></h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          {VALUES.map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="glass-card" style={{ padding: 28, textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Icon size={24} color={color} />
              </div>
              <h3 className="font-syne" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>{title}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '80px 24px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 40, textAlign: 'center' }}>
          {[['69+', 'Features Built'], ['9', 'Core Modules'], ['3', 'User Roles'], ['7-Day', 'AI Forecast']].map(([v, l]) => (
            <div key={l}>
              <div className="font-syne gradient-text" style={{ fontSize: 44, fontWeight: 800 }}>{v}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
