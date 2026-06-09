import { useState, useEffect, lazy, Suspense } from 'react';
import { 
  Heart, BookOpen, Briefcase, DollarSign, Building2, TrendingUp, Target, 
  Calendar, FileText, MessageSquare, LayoutDashboard, ChevronRight, 
  ArrowRight, Check, Zap, Users, Globe, Menu, X, Sparkles, Smartphone
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

const pillars = [
  { icon: Heart, label: 'Health', color: 'text-health', bg: 'bg-health/10 border-health/20', desc: 'Track fitness, weight, sleep & workouts' },
  { icon: BookOpen, label: 'Knowledge', color: 'text-knowledge', bg: 'bg-knowledge/10 border-knowledge/20', desc: 'Skills, books, courses & learning' },
  { icon: Briefcase, label: 'Career', color: 'text-career', bg: 'bg-career/10 border-career/20', desc: 'Goals, opportunities & growth' },
  { icon: DollarSign, label: 'Wealth', color: 'text-wealth', bg: 'bg-wealth/10 border-wealth/20', desc: 'Net worth, investments & savings' },
  { icon: Building2, label: 'Business', color: 'text-business', bg: 'bg-business/10 border-business/20', desc: 'Revenue, clients & operations' },
];

const problems = [
  { icon: FileText, text: 'Scattered notes in Notion, Google Docs, WhatsApp' },
  { icon: Target, text: 'Goals forgotten in Excel sheets' },
  { icon: MessageSquare, text: 'Reminders lost in chat apps' },
  { icon: Globe, text: '6+ apps just to track your life' },
];

const features = [
  { icon: LayoutDashboard, label: 'Dashboard', desc: 'Command center for your entire life' },
  { icon: Calendar, label: 'Planner', desc: 'Tasks, habits & weekly goals' },
  { icon: Heart, label: 'Health', desc: 'Weight, workouts, sleep & more' },
  { icon: BookOpen, label: 'Knowledge', desc: 'Skills, books & learning tracker' },
  { icon: Briefcase, label: 'Career', desc: 'Jobs, portfolio & opportunities' },
  { icon: DollarSign, label: 'Wealth', desc: 'Net worth & investments' },
  { icon: Building2, label: 'Business', desc: 'Multi-business management' },
  { icon: Zap, label: 'Guide', desc: 'AI-powered life advisor' },
];

const audiences = [
  { icon: BookOpen, label: 'Students', desc: 'Track skills, habits, and future goals' },
  { icon: Briefcase, label: 'Employees', desc: 'Grow career, manage wealth' },
  { icon: Users, label: 'Freelancers', desc: 'Clients, income, and skills' },
  { icon: Building2, label: 'Business Owners', desc: 'Multi-business operations' },
  { icon: TrendingUp, label: 'Investors', desc: 'Net worth and portfolio tracking' },
];

const roadmap = [
  { label: 'Mobile App', status: 'coming', icon: Smartphone },
  { label: 'Advanced Guide AI', status: 'coming', icon: Zap },
  { label: 'Business CRM', status: 'coming', icon: Users },
  { label: 'Team Workspace', status: 'coming', icon: LayoutDashboard },
  { label: 'AI Forecasting', status: 'coming', icon: TrendingUp },
];


export default function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Detect scroll for navbar styling
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#for-who', label: 'For Who' },
    { href: '#roadmap', label: 'Roadmap' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-body)] text-[var(--text-primary)]">
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'border-b border-[var(--border)] bg-[var(--bg-body)]/90 backdrop-blur-xl' : 'bg-transparent'
      }`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--text-primary)] flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-[var(--bg-body)]" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-lg tracking-tight text-[var(--text-primary)]">Climb</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              <a 
                key={link.href} 
                href={link.href} 
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button onClick={onLogin} className="btn-ghost text-sm">Login</button>
            <button onClick={onGetStarted} className="btn-primary text-sm">Get Started</button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 pt-16 bg-[var(--bg-body)] animate-fade-in md:hidden">
          <div className="flex flex-col p-6 space-y-4">
            {navLinks.map(link => (
              <a 
                key={link.href} 
                href={link.href} 
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 text-base text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border-b border-[var(--border)]"
              >
                {link.label}
              </a>
            ))}
            <div className="flex flex-col gap-3 pt-4">
              <button onClick={onLogin} className="btn-secondary w-full py-3">Login</button>
              <button onClick={onGetStarted} className="btn-primary w-full py-3">Get Started</button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="pt-40 pb-32 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-[var(--bg-secondary)] to-transparent opacity-40 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[var(--text-primary)] opacity-[0.02] blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] text-xs text-[var(--text-secondary)] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-health animate-pulse" />
            Your Personal Operating System
          </div>
          <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight mb-6 text-[var(--text-primary)]">
            One Place To Climb<br />
            <span className="text-[var(--text-secondary)]">In Life, Career,</span><br />
            <span className="text-[var(--text-secondary)]">Wealth & Business.</span>
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
            Track goals, manage money, improve health, grow your career, and build businesses from one powerful dashboard.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button onClick={onGetStarted} className="btn-primary flex items-center gap-2 px-7 py-3.5 text-base">
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={onLogin} className="btn-secondary flex items-center gap-2 px-7 py-3.5 text-base">
              Login
            </button>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 px-6 border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="section-header mb-3">The Problem</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--text-primary)]">Your life is scattered across<br />too many places.</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {problems.map(({ icon: Icon, text }) => (
              <div key={text} className="card p-5 text-center">
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-5 h-5 text-[var(--text-muted)]" />
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-24 px-6 border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="section-header mb-3">The Solution</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--text-primary)]">5 Pillars. One Command Center.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {pillars.map(({ icon: Icon, label, color, bg, desc }) => (
              <div key={label} className={`card border p-5 text-center ${bg} transition-all hover:-translate-y-0.5 duration-200`}>
                <Icon className={`w-8 h-8 ${color} mx-auto mb-3`} />
                <h3 className="font-semibold text-sm mb-1 text-[var(--text-primary)]">{label}</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-24 px-6 border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="section-header mb-3">Dashboard</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--text-primary)]">Your life at a glance.</h2>
          </div>
          <div className="card p-8 border-[var(--border)]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Climb Score</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">—</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">More data needed</p>
              </div>
              <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Net Worth</p>
                <p className="text-2xl font-bold text-wealth">₹0</p>
                <p className="text-xs text-health mt-1">Track assets</p>
              </div>
              <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Today's Tasks</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">0/0</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Add your first</p>
              </div>
              <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Active Goals</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">0</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Set your goals</p>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {pillars.map(({ icon: Icon, label, color, bg }) => (
                <div key={label} className={`rounded-xl p-3 border ${bg} text-center`}>
                  <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
                  <p className="text-xs font-medium text-[var(--text-primary)]">{label}</p>
                  <p className="text-xs text-[var(--text-secondary)]">—</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="section-header mb-3">Features</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--text-primary)]">Everything you need to climb.</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="card-hover p-5">
                <Icon className="w-6 h-6 text-[var(--text-secondary)] mb-3" />
                <h3 className="font-semibold text-sm mb-1 text-[var(--text-primary)]">{label}</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Who Section */}
      <section id="for-who" className="py-24 px-6 border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="section-header mb-3">Who It's For</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--text-primary)]">Built for ambitious people.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {audiences.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="card-hover p-5">
                <Icon className="w-6 h-6 text-[var(--text-secondary)] mb-3" />
                <h3 className="font-semibold text-sm mb-1 text-[var(--text-primary)]">{label}</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section id="roadmap" className="py-24 px-6 border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="section-header mb-3">Roadmap</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--text-primary)]">What's coming next.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {roadmap.map(({ label }) => (
              <div key={label} className="card p-4 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[var(--text-muted)] flex-shrink-0" />
                <span className="text-sm text-[var(--text-secondary)]">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 border-t border-[var(--border)] text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-wealth/10 mb-6">
            <Sparkles className="w-6 h-6 text-wealth" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-[var(--text-primary)]">
            Ready to start climbing?
          </h2>
          <p className="text-[var(--text-secondary)] mb-10 leading-relaxed">
            Join serious people who manage their entire life from one place.
          </p>
          <button onClick={onGetStarted} className="btn-primary flex items-center gap-2 px-8 py-4 text-base mx-auto">
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--text-primary)] flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-[var(--bg-body)]" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-[var(--text-primary)]">Climb</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-[var(--text-muted)]">
            <a href="#" className="hover:text-[var(--text-secondary)] transition-colors">About</a>
            <a href="#" className="hover:text-[var(--text-secondary)] transition-colors">Contact</a>
            <a href="#" className="hover:text-[var(--text-secondary)] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[var(--text-secondary)] transition-colors">Terms</a>
          </div>
          <p className="text-xs text-[var(--text-muted)]">One Place To Climb In Life.</p>
        </div>
      </footer>
    </div>
  );
}