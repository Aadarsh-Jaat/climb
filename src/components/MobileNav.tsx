// src/components/MobileNav.tsx
import { useState } from 'react';
import { 
  LayoutDashboard, Calendar, Heart, BookOpen, Briefcase,
  DollarSign, Building2, Zap, FileText, Settings, Menu, X,
  TrendingUp, LogOut, User
} from 'lucide-react';
import type { AppPage } from './AppLayout';
import { useAuth } from '../context/AuthContext';

interface MobileNavProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
}

// Define all nav items with correct AppPage type
const allNavItems: { id: AppPage; icon: React.ElementType; label: string; color?: string }[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
  { id: 'planner', icon: Calendar, label: 'Plan' },
  { id: 'health', icon: Heart, label: 'Health', color: 'text-health' },
  { id: 'knowledge', icon: BookOpen, label: 'Knowledge', color: 'text-knowledge' },
  { id: 'career', icon: Briefcase, label: 'Career', color: 'text-career' },
  { id: 'wealth', icon: DollarSign, label: 'Wealth', color: 'text-wealth' },
  { id: 'business', icon: Building2, label: 'Business', color: 'text-business' },
  { id: 'guide', icon: Zap, label: 'Guide' },
  { id: 'notes', icon: FileText, label: 'Notes' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

// Bottom nav items (first 5)
const bottomNavItems: typeof allNavItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
  { id: 'planner', icon: Calendar, label: 'Plan' },
  { id: 'health', icon: Heart, label: 'Health', color: 'text-health' },
  { id: 'wealth', icon: DollarSign, label: 'Wealth', color: 'text-wealth' },
  { id: 'business', icon: Building2, label: 'Biz', color: 'text-business' },
];

export default function MobileNav({ currentPage, onNavigate }: MobileNavProps) {
  const { user, profile, signOut } = useAuth(); // Add 'user' here
  const [isOpen, setIsOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Get remaining items (not in bottom nav)
  const moreMenuItems = allNavItems.filter(
    item => !bottomNavItems.some(bottom => bottom.id === item.id)
  );

  const handleNavigate = (page: AppPage) => {
    onNavigate(page);
    setIsOpen(false);
    setShowMoreMenu(false);
  };

  return (
    <>
      {/* Mobile Bottom Tab Bar - Always visible */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-card)] border-t border-[var(--border)] z-40 safe-area-bottom">
        <div className="flex items-center justify-around py-1 px-2">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-all min-w-[60px] ${
                  isActive ? 'text-wealth' : 'text-[var(--text-secondary)]'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive && item.color ? item.color : ''} ${isActive ? 'text-wealth' : ''}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
          
          {/* More button */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-all min-w-[60px] ${
                showMoreMenu ? 'text-wealth' : 'text-[var(--text-secondary)]'
              }`}
            >
              <Menu className="w-5 h-5" />
              <span className="text-[10px] font-medium">More</span>
            </button>
            
            {/* More menu popup */}
            {showMoreMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowMoreMenu(false)} 
                />
                <div className="absolute bottom-14 right-0 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg py-2 z-50 min-w-[160px]">
                  {moreMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          isActive
                            ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive && item.color ? item.color : ''}`} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                  
                  {/* Divider */}
                  <div className="h-px bg-[var(--border)] my-2 mx-2" />
                  
                  {/* User info in popup - Fixed: use user.email instead of profile.email */}
                  <div className="px-4 py-2 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-xs font-semibold text-[var(--text-primary)]">
                      {profile?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                        {profile?.name || 'User'}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] truncate">
                        {user?.email || ''}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      signOut();
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Full Menu Modal (optional - for when you want full screen menu) */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 md:hidden">
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center p-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--text-primary)] flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-[var(--bg-body)]" />
                </div>
                <span className="font-bold text-lg text-[var(--text-primary)]">Climb</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2">
                <X className="w-6 h-6 text-[var(--text-secondary)]" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-3">
                {allNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                        isActive 
                          ? 'bg-wealth/10 text-wealth' 
                          : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive && item.color ? item.color : ''}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="p-4 border-t border-[var(--border)]">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] mb-2">
                <div className="w-8 h-8 rounded-full bg-[var(--bg-card)] flex items-center justify-center text-sm font-semibold text-[var(--text-primary)]">
                  {profile?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{profile?.name || 'User'}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{user?.email || ''}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  signOut();
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add bottom padding to main content to prevent overlap */}
      <style>{`
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>
    </>
  );
}