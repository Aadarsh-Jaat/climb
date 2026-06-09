import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Calendar, Heart, BookOpen, Briefcase,
  DollarSign, Building2, Zap, FileText, Settings,
  TrendingUp, Menu, X, LogOut, ChevronRight, Moon, Sun
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type AppPage = 'dashboard' | 'planner' | 'health' | 'knowledge' | 'career' | 'wealth' | 'business' | 'guide' | 'notes' | 'settings';

interface NavItem {
  id: AppPage;
  icon: React.ElementType;
  label: string;
  color?: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'planner', icon: Calendar, label: 'Planner' },
  { id: 'health', icon: Heart, label: 'Health', color: 'text-health' },
  { id: 'knowledge', icon: BookOpen, label: 'Knowledge', color: 'text-knowledge' },
  { id: 'career', icon: Briefcase, label: 'Career', color: 'text-career' },
  { id: 'wealth', icon: DollarSign, label: 'Wealth', color: 'text-wealth' },
  { id: 'business', icon: Building2, label: 'Business', color: 'text-business' },
  { id: 'guide', icon: Zap, label: 'Guide' },
  { id: 'notes', icon: FileText, label: 'Notes' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

interface AppLayoutProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  children: React.ReactNode;
}

export default function AppLayout({ currentPage, onNavigate, children }: AppLayoutProps) {
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Load theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDarkMode;
    setIsDarkMode(newIsDark);
    
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleNav = (page: AppPage) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo Section */}
      <div className="px-4 py-5 flex items-center justify-between border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--text-primary)] flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-[var(--bg-body)]" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-base tracking-tight text-[var(--text-primary)]">Climb</span>
        </div>
        
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 text-[var(--text-secondary)]" />
          ) : (
            <Moon className="w-4 h-4 text-[var(--text-secondary)]" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ id, icon: Icon, label, color }) => (
          <button
            key={id}
            onClick={() => handleNav(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
              currentPage === id
                ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <Icon className={`w-4 h-4 flex-shrink-0 ${currentPage === id ? (color || 'text-[var(--text-primary)]') : ''}`} />
            <span>{label}</span>
            {currentPage === id && <ChevronRight className="w-3 h-3 ml-auto text-[var(--text-muted)]" />}
          </button>
        ))}
      </nav>

      {/* User Section */}
      <div className="px-3 py-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1">
          <div className="w-7 h-7 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-xs font-semibold flex-shrink-0 text-[var(--text-primary)]">
            {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-[var(--text-primary)]">{profile?.name || 'User'}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[var(--bg-body)] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 flex-shrink-0 bg-[var(--bg-card)] border-r border-[var(--border)] flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-56 bg-[var(--bg-card)] border-r border-[var(--border)] flex flex-col animate-slide-up">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 border-b border-[var(--border)] bg-[var(--bg-body)] flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-8 h-8 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[var(--text-primary)] flex items-center justify-center">
              <TrendingUp className="w-3 h-3 text-[var(--bg-body)]" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-sm text-[var(--text-primary)]">Climb</span>
          </div>
          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}