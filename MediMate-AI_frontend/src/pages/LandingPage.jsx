import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Activity, Brain, Users, AlertTriangle, Settings, ChevronRight, Shield, Zap, Heart, Clock, MessageSquare } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AuthModal from '@/components/shared/AuthModal';

// ECG Animated line
function EcgLine() {
  return (
    <svg viewBox="0 0 800 80" style={{ width: '100%', height: 80, opacity: 0.3 }}>
      <path
        d="M0,40 L100,40 L120,40 L130,10 L140,70 L150,20 L160,60 L170,40 L280,40 L300,40 L310,5 L320,75 L330,15 L340,65 L350,40 L460,40 L480,40 L490,10 L500,70 L510,20 L520,60 L530,40 L640,40 L660,40 L670,5 L680,75 L690,15 L700,65 L710,40 L800,40"
        fill="none" stroke="var(--cyan)" strokeWidth="1.5"
        strokeDasharray="1200" strokeDashoffset="1200"
        style={{ animation: 'ecg-draw 3s linear infinite' }}
      />
      <style>{`@keyframes ecg-draw { 0% { stroke-dashoffset: 1200; } 100% { stroke-dashoffset: 0; } }`}</style>
    </svg>
  );
}

// Stat counter
function StatCounter({ value, label, suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0;
        const end = parseInt(value);
        const step = Math.ceil(end / 40);
        const timer = setInterval(() => {
          start += step;
          if (start >= end) { setCount(end); clearInterval(timer); }
          else setCount(start);
        }, 40);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);
  return (
    <div ref={ref} style={{ textAlign: 'center' }}>
      <div className="font-syne gradient-text" style={{ fontSize: 48, fontWeight: 800, lineHeight: 1 }}>{count}{suffix}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
    </div>
  );
}

const FEATURES = [
  {
    id: 'dose-tracking', icon: Activity, color: 'var(--cyan)',
    title: 'Dose Tracking', subtitle: 'Never miss a dose again',
    desc: 'Real-time medication tracking with smart reminders. Mark doses as taken, skip with reasons, and view your full adherence history with a beautiful calendar view.',
    bullets: ['Today\'s dose cards with one-tap actions', 'Adherence ring showing daily completion %', '7-day calendar with color-coded status', 'Dose history with advanced filtering'],
  },
  {
    id: 'whatsapp-alerts', icon: MessageSquare, color: 'var(--emerald)',
    title: 'WhatsApp Alerts', subtitle: 'Interactive Meta Dev Messaging',
    desc: 'Get interactive medication reminders directly on your WhatsApp using the official Meta Developer API. Reply with simple codes to manage your doses on the go.',
    bullets: ['AI-generated personalized reminder tips (Llama 3.3)', 'Reply "1" to mark dose as Taken instantly', 'Reply "2" to reschedule the reminder by 15 minutes', 'Reply "3" to skip dose and alert your caretaker'],
  },
  {
    id: 'ai-predictions', icon: Brain, color: 'var(--cyan)',
    title: 'AI Predictions', subtitle: 'Proactive risk intelligence',
    desc: 'Our 5-factor deterministic AI engine calculates your adherence risk score in real-time, predicting which future doses are at highest risk of being missed.',
    bullets: ['Risk score: Low → Medium → High → Critical', '7-day forward predictions per dose', 'Factor breakdown: miss rate, streaks, complexity', 'Contextual insights in plain language'],
  },
  {
    id: 'caretaker-portal', icon: Users, color: 'var(--purple-light)',
    title: 'Caretaker Portal', subtitle: 'Remote patient monitoring',
    desc: 'Caretakers get a dedicated dashboard to monitor all assigned patients, see real-time dose status, and receive escalation alerts when intervention is needed.',
    bullets: ['All patients on one screen', 'Risk level badges per patient', 'Live escalation feed', 'Today\'s dose status for each patient'],
  },
  {
    id: 'escalation', icon: AlertTriangle, color: 'var(--amber)',
    title: 'Escalation Pipeline', subtitle: 'Automated safety net',
    desc: 'A multi-tier automated escalation system that logs missed doses and notifies caretakers through the dashboard if a dose is missed for too long.',
    bullets: ['T+30 min: Interactive patient WhatsApp reminder', 'T+45 min: Caretaker WhatsApp notification dispatch', 'T+75 min: Fallback Twilio voice call reads alert details', 'Real-time dashboard alert feed & status tracking'],
  },
  {
    id: 'admin', icon: Settings, color: '#f472b6',
    title: 'Admin Panel', subtitle: 'System-wide command center',
    desc: 'Full administrative control with real-time statistics, user management, escalation logs, and platform health monitoring.',
    bullets: ['Total patients, schedules & doses today', 'User management with role filtering', 'Searchable escalation event log', 'Platform status and activity overview'],
  },
];

export default function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authError, setAuthError] = useState('');
  const location = useLocation();

  useEffect(() => {
    if (location.state?.scrollTo) {
      const el = document.getElementById(location.state.scrollTo);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const err = params.get('error');
    if (err) {
      let friendlyMessage = 'Google authentication failed. Please try again.';
      if (err === 'access_denied') {
        friendlyMessage = 'Google authentication was cancelled.';
      } else if (err === 'token_exchange_failed') {
        friendlyMessage = 'Failed to exchange token with Google.';
      } else if (err === 'userinfo_fetch_failed') {
        friendlyMessage = 'Failed to fetch user profile information from Google.';
      }
      setAuthError(friendlyMessage);
      setAuthOpen(true);
      
      // Clean up the URL search parameter in browser history so it does not persist on reload
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location]);

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <Navbar onSignIn={() => setAuthOpen(true)} />

      {/* ─── HERO ─── */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '100px 24px 60px', position: 'relative', overflow: 'hidden' }}>
        {/* Background grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(0,212,255,0.06) 0%, transparent 70%), linear-gradient(rgba(0,212,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.04) 1px, transparent 1px)', backgroundSize: 'cover, 60px 60px, 60px 60px', pointerEvents: 'none' }} />

        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: '20%', left: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,255,157,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: 780 }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)', borderRadius: 999, padding: '6px 16px', marginBottom: 32 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)', animation: 'pulse-glow 2s infinite' }} />
            <span style={{ color: 'var(--cyan)', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em' }}>INTELLIGENT MEDICATION ADHERENCE</span>
          </div>

          <h1 className="font-syne" style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 24 }}>
            Medication Adherence<br />
            <span className="gradient-text">Powered by AI</span>
          </h1>

          <p style={{ fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 580, margin: '0 auto 40px' }}>
            MediMate AI tracks your medications, predicts adherence risks, and alerts caretakers about critical status changes — all in one intelligent platform.
          </p>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ fontSize: 15, padding: '13px 32px', display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setAuthOpen(true)}>
              Get Started Free <ChevronRight size={16} />
            </button>
            <button className="btn-outline" style={{ fontSize: 15, padding: '13px 32px' }} onClick={() => {
              document.getElementById('dose-tracking')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              See Features
            </button>
          </div>
        </div>

        {/* ECG Line at bottom of hero */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <EcgLine />
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section style={{ padding: '80px 24px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 40 }}>
          <StatCounter value="69" suffix="+" label="Features Built" />
          <StatCounter value="9" label="Core Modules" />
          <StatCounter value="95" suffix="%" label="Adherence Accuracy" />
          <StatCounter value="30" suffix="d" label="Auto Log Generation" />
        </div>
      </section>

      {/* ─── WHY MEDIMATE ─── */}
      <section style={{ padding: '100px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{ color: 'var(--cyan)', fontSize: 12, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>Why MediMate AI?</p>
          <h2 className="font-syne" style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, marginBottom: 20 }}>A New Standard in<br /><span className="gradient-text">Medication Management</span></h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, maxWidth: 520, margin: '0 auto' }}>Built for patients, caretakers, and healthcare administrators — a complete ecosystem for medication adherence.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {[
            { icon: Zap, color: 'var(--cyan)', title: 'Real-time Tracking', desc: 'Every dose logged instantly with timestamp, status, and skip reasons captured automatically.' },
            { icon: Brain, color: 'var(--emerald)', title: 'Predictive AI Engine', desc: '5-factor risk scoring system that predicts which doses you are most likely to miss before it happens.' },
            { icon: Shield, color: 'var(--purple-light)', title: 'Escalation Safety Net', desc: 'Automatic multi-tier dashboard warnings and caretaker alerts when doses are missed.' },
            { icon: Heart, color: '#f472b6', title: 'Caretaker Integration', desc: 'Caretakers get real-time visibility into patient adherence and receive proactive alerts.' },
            { icon: Clock, color: 'var(--amber)', title: 'Smart Scheduling', desc: 'Flexible medicine schedules with automatic 30-day dose log generation and rescheduling support.' },
            { icon: Activity, color: 'var(--cyan)', title: 'Interactive Analytics', desc: 'Analyze your weekly progress with real-time compliance metrics and compliance streaks.' },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="glass-card" style={{ padding: 28, transition: 'transform 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Icon size={22} color={color} />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{title}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES (scrollable targets) ─── */}
      <section style={{ padding: '40px 24px 100px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{ color: 'var(--cyan)', fontSize: 12, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>Platform Features</p>
          <h2 className="font-syne" style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700 }}>Everything You Need,<br /><span className="gradient-text">Nothing You Don't</span></h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 80 }}>
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            const isEven = i % 2 === 0;
            return (
              <div key={feature.id} id={feature.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 48, alignItems: 'center', scrollMarginTop: 80 }}>
                <div style={{ order: isEven ? 0 : 1 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${feature.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={18} color={feature.color} />
                    </div>
                    <span style={{ color: feature.color, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{feature.subtitle}</span>
                  </div>
                  <h3 className="font-syne" style={{ fontSize: 32, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>{feature.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>{feature.desc}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {feature.bullets.map(b => (
                      <div key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: feature.color, marginTop: 7, flexShrink: 0 }} />
                        <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feature visual */}
                <div style={{ order: isEven ? 1 : 0 }}>
                  <div className="glass-card" style={{ padding: 32, minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 50%, ${feature.color}08, transparent 70%)`, pointerEvents: 'none' }} />
                    <div style={{ textAlign: 'center', position: 'relative' }}>
                      <div style={{ width: 80, height: 80, borderRadius: 20, background: `${feature.color}18`, border: `1px solid ${feature.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }} className="float-anim">
                        <Icon size={36} color={feature.color} />
                      </div>
                      <p className="font-syne" style={{ color: feature.color, fontSize: 14, fontWeight: 700 }}>{feature.title}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>{feature.subtitle}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── CTA BAND ─── */}
      <section style={{ padding: '80px 24px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 className="font-syne" style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, marginBottom: 20 }}>
            Ready to Take Control of<br /><span className="gradient-text">Your Medication?</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 36 }}>Join MediMate AI and never miss a dose again. Your health, intelligently managed.</p>
          <button className="btn-primary" style={{ fontSize: 16, padding: '14px 40px' }} onClick={() => setAuthOpen(true)}>
            Start for Free
          </button>
        </div>
      </section>

      <Footer />

      {authOpen && (
        <AuthModal 
          onClose={() => { setAuthOpen(false); setAuthError(''); }} 
          initialError={authError} 
        />
      )}
    </div>
  );
}
