import React, { useState } from 'react';
import { Outlet, useLocation, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Music, 
  Calendar, 
  BarChart3, 
  Users,
  Search,
  Zap,
  LogOut,
  Brain,
  Sparkles,
  Shield,
  Map,
  CheckSquare,
  Menu,
  X,
  ChevronDown,
  User,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { GlobalSearchOverlay } from './GlobalSearchOverlay';
import { GlobalAssistantDrawer } from './GlobalAssistantDrawer';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { signOut } from '../lib/auth';
import { getRoleDisplayName } from '../types/roles';

// Navigation structure with grouping
const mainNav = [
  { icon: LayoutDashboard, label: 'Hub', path: '/' },
  { 
    icon: Sparkles, 
    label: 'Creative', 
    path: '/ideas',
    submenu: [
      { label: 'Ideas', path: '/ideas' },
      { label: 'Releases', path: '/releases' },
    ]
  },
  { 
    icon: Calendar, 
    label: 'Content', 
    path: '/content',
    submenu: [
      { label: 'Calendar', path: '/calendar' },
      { label: 'Content Engine', path: '/content' },
    ]
  },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
  { icon: Zap, label: 'Goals', path: '/goals' },
];

const secondaryNav = [
  { icon: Brain, label: 'Coach', path: '/coach' },
  { icon: Map, label: 'Strategy', path: '/strategy' },
  { icon: Users, label: 'Network', path: '/network' },
  { icon: Shield, label: 'Vault', path: '/resources' },
];

const mobileNav = [
  { icon: LayoutDashboard, label: 'Hub', path: '/' },
  { icon: Sparkles, label: 'Ideas', path: '/ideas' },
  { icon: Music, label: 'Releases', path: '/releases' },
  { icon: Calendar, label: 'Calendar', path: '/calendar' },
  { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
];

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, role, authUser } = useCurrentUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/unauthorized');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // Handle CMD/CTRL+K for search
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-light-bg text-text-primary flex flex-col pb-20 md:pb-0">
      {/* Top Navigation - Premium Redesign */}
      <header className="sticky top-0 z-40 bg-light-surface/70 backdrop-blur-xl border-b border-border">
        <div className="max-w-full mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          {/* Left: Navigation */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {mainNav.map((item) => (
              <div key={item.path} className="relative group">
                <NavLink
                  to={item.path}
                  className={({ isActive }) => cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all relative',
                    isActive 
                      ? 'text-primary bg-primary/5' 
                      : 'text-text-secondary hover:text-text-primary hover:bg-light-surface-secondary'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.submenu && <ChevronDown className="w-3 h-3 ml-1" />}
                </NavLink>

                {/* Dropdown */}
                {item.submenu && (
                  <div className="absolute left-0 top-full pt-1 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-light-surface border border-border rounded-lg shadow-lg overflow-hidden min-w-48">
                      {item.submenu.map((subitem) => (
                        <NavLink
                          key={subitem.path}
                          to={subitem.path}
                          className={({ isActive }) => cn(
                            'block px-4 py-2.5 text-sm font-medium transition-colors border-b border-border last:border-b-0',
                            isActive
                              ? 'bg-primary/5 text-primary'
                              : 'text-text-secondary hover:text-text-primary hover:bg-light-surface-secondary'
                          )}
                        >
                          {subitem.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Center: Empty spacer for balance */}
          <div className="flex-1" />

          {/* Right: Logo, Search, Actions */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Role Badge */}
            {role && (
              <div
                className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary"
                title={`Role: ${getRoleDisplayName(role)}`}
              >
                <User className="w-3 h-3" />
                {getRoleDisplayName(role)}
              </div>
            )}

            {/* Search */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-tertiary hover:text-text-secondary hover:bg-light-surface-secondary transition-all group"
              title="Search (CMD+K)"
            >
              <Search className="w-4 h-4" />
              <span className="hidden md:inline text-xs">Search</span>
              <kbd className="hidden lg:inline-flex px-1.5 py-0.5 rounded text-xs font-mono bg-light-surface-secondary text-text-tertiary ml-2">
                ⌘K
              </kbd>
            </button>

            {/* Mobile Search */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="sm:hidden p-2 rounded-lg text-text-tertiary hover:bg-light-surface-secondary transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Logo / Brand */}
            <NavLink to="/" className="flex items-center gap-2 group ml-4 lg:ml-6">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <Zap className="w-4 h-4 text-white fill-current" />
              </div>
              <span className="hidden lg:inline font-bold text-sm tracking-tight">ARTIST OS</span>
            </NavLink>

            {/* Mobile Menu */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-light-surface-secondary transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-error/70 hover:text-error hover:bg-error/5 transition-all"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-72 bg-light-surface shadow-2xl flex flex-col border-l border-border"
            >
              {/* Header */}
              <div className="p-6 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white fill-current" />
                  </div>
                  <span className="font-bold text-sm tracking-tight">ARTIST OS</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-light-surface-secondary rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-text-tertiary" />
                </button>
              </div>

              {/* Navigation */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {/* Main Nav */}
                {mainNav.map((item) => (
                  <div key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={() => !item.submenu && setIsMobileMenuOpen(false)}
                      className={({ isActive }) => cn(
                        'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-text-secondary hover:text-text-primary hover:bg-light-surface-secondary'
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </NavLink>
                    {/* Submenu Items */}
                    {item.submenu && (
                      <div className="ml-6 space-y-1 mt-1">
                        {item.submenu.map((subitem) => (
                          <NavLink
                            key={subitem.path}
                            to={subitem.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={({ isActive }) => cn(
                              'block px-3 py-2 rounded-lg text-xs font-medium transition-all',
                              isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-text-tertiary hover:text-text-secondary hover:bg-light-surface-secondary'
                            )}
                          >
                            {subitem.label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Secondary Nav */}
                <div className="pt-6 mt-6 border-t border-border space-y-1">
                  {secondaryNav.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) => cn(
                        'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-text-secondary hover:text-text-primary hover:bg-light-surface-secondary'
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-border space-y-4">
                {/* User Info */}
                {profile && authUser && (
                  <div className="px-3 py-2 bg-light-surface-secondary rounded-lg space-y-1 border border-border">
                    <p className="text-xs font-semibold text-text-primary">{profile.full_name || 'User'}</p>
                    <p className="text-xs text-text-tertiary break-all">{authUser.email}</p>
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 border border-primary/20 mt-2">
                      <User className="w-3 h-3 text-primary" />
                      <span className="text-xs font-medium text-primary">{getRoleDisplayName(role)}</span>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-error/10 text-error rounded-lg text-sm font-semibold hover:bg-error/20 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-light-surface/90 backdrop-blur-xl border-t border-border px-2 h-20 flex items-center justify-around safe-bottom">
        {mobileNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              'flex flex-col items-center gap-1.5 py-2 px-3 rounded-lg transition-all',
              isActive
                ? 'text-primary'
                : 'text-text-tertiary hover:text-text-secondary'
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest leading-tight">{item.label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-1.5 py-2 px-3 rounded-lg text-text-tertiary hover:text-text-secondary transition-all"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-widest leading-tight">More</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="px-4 md:px-8 py-8 md:py-10 max-w-7xl mx-auto w-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Global Search Overlay */}
      <GlobalSearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <GlobalAssistantDrawer />
    </div>
  );
}
