import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Calendar as CalendarIcon,
  Brain,
  MessageSquareMore,
  Sparkles,
  Target,
  CheckSquare,
  ChevronDown,
  Menu,
  X,
  LogOut,
  Settings,
  FileText,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { GlobalSearch } from './GlobalSearch';
import { GlobalAssistantDrawer } from './GlobalAssistantDrawer';
import { AssistantProvider, useAssistantContext } from '../context/AssistantContext';
import { useCurrentUserRole } from '../hooks/useCurrentUserRole';
import { applyGeneralSettings, applyTheme, loadCachedGeneralSettings } from '../lib/generalSettingsRuntime';
import { settingsService } from '../services/settingsService';

type DropdownChild = {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
};
type NavGroup = { label: string; path: string; end?: boolean } | { label: string; children: DropdownChild[] };

const TOP_NAV: NavGroup[] = [
  { label: 'Dashboard', path: '/dashboard', end: true },
  {
    label: 'Music',
    children: [
      { label: 'Ideas & WIPs', path: '/ideas', icon: Sparkles, description: 'Tracks in progress' },
    ],
  },
  {
    label: 'Manage',
    children: [
      { label: 'Calendar', path: '/calendar', icon: CalendarIcon, description: 'Events & deadlines' },
      { label: 'Goals', path: '/goals', icon: Target, description: 'Track milestones & targets' },
      { label: 'Tasks', path: '/tasks', icon: CheckSquare, description: 'To-do list & action items' },
      { label: 'Reports', path: '/reports', icon: FileText, description: 'Saved reports' },
    ],
  },
  { label: 'Coach', path: '/coach' },
];

const MOBILE_NAV = [
  { icon: LayoutDashboard, label: 'Hub', path: '/dashboard', end: true },
  { icon: Sparkles, label: 'Ideas', path: '/ideas' },
  { icon: CalendarIcon, label: 'Calendar', path: '/calendar' },
  { icon: Brain, label: 'Coach', path: '/coach' },
];

function NavDropdown({ label, children }: { label: string; children: DropdownChild[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const isActive = children.some(
    (c) => location.pathname === c.path || location.pathname.startsWith(c.path + '/')
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors select-none',
          isActive ? 'text-brand' : 'text-text-secondary hover:text-text-primary'
        )}
      >
        {label}
        <ChevronDown
          className={cn('w-3.5 h-3.5 opacity-50 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.13, ease: 'easeOut' }}
      className="absolute top-[calc(100%+6px)] left-0 z-50 min-w-[13rem] overflow-hidden rounded-2xl border border-border/60 shadow-[var(--shadow-lifted)]"
            style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
          >
            {children.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-start gap-3 px-4 py-3 transition-colors',
                    isActive ? 'bg-brand-dim' : 'hover:bg-background/70'
                  )
                }
              >
                <item.icon className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-text-primary leading-none">{item.label}</p>
                  <p className="text-xs text-text-muted mt-1">{item.description}</p>
                </div>
              </NavLink>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AssistantTrigger() {
  const { toggleOpen } = useAssistantContext();
  return (
    <button
      type="button"
      onClick={toggleOpen}
      className="flex items-center p-2 text-text-muted hover:text-text-primary rounded-lg transition-colors"
      title="Open assistant"
      aria-label="Open assistant"
    >
      <MessageSquareMore className="w-4 h-4" />
    </button>
  );
}

function LayoutInner() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { roleDisplayName, isArtist, isManager } = useCurrentUserRole();

  useEffect(() => {
    const cached = loadCachedGeneralSettings();
    applyGeneralSettings(cached);

    settingsService.general.get()
      .then((settings) => applyGeneralSettings(settings))
      .catch(() => {});

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = () => {
      const current = loadCachedGeneralSettings();
      if (current.theme === 'system') {
        applyTheme('system');
      }
    };

    media.addEventListener?.('change', handleThemeChange);
    return () => media.removeEventListener?.('change', handleThemeChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('artist_os_authorized');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background text-text-secondary flex flex-col pb-16 md:pb-0">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/50"
        style={{ background: 'var(--shell-backdrop)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center gap-2">

          {/* Mobile: hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 -ml-1 text-text-muted hover:text-text-primary transition-colors rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop nav — left */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1">
            {TOP_NAV.map((item) => {
              if ('children' in item) {
                return <NavDropdown key={item.label} label={item.label} children={item.children} />;
              }
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive ? 'text-brand bg-brand-dim rounded-lg font-semibold' : 'text-text-secondary hover:text-text-primary hover:bg-background/80 rounded-lg'
                    )
                  }
                >
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          {/* Spacer on mobile */}
          <div className="flex-1 lg:hidden" />

          {/* Right cluster */}
          <div className="flex items-center gap-1">
            {roleDisplayName && (
              <span className={cn(
                'hidden md:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border mr-1',
                isArtist
                  ? 'bg-brand-dim text-brand border-brand/20'
                  : isManager
                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                  : 'bg-background text-text-muted border-border/70'
              )}>
                {roleDisplayName}
              </span>
            )}
            <GlobalSearch compact />
            <AssistantTrigger />
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                cn(
                  'hidden md:flex items-center p-2 rounded-lg transition-colors',
                  isActive ? 'text-brand' : 'text-text-muted hover:text-text-primary'
                )
              }
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </NavLink>
            <button
              onClick={handleLogout}
              className="hidden md:flex items-center p-2 text-text-muted hover:text-text-primary rounded-lg transition-colors"
              title="Lock"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* WES wordmark */}
          <NavLink
            to="/dashboard"
            className="ml-2 flex items-center"
          >
            <span className="text-[13px] font-bold tracking-[0.18em] text-text-primary uppercase select-none">
              WES
            </span>
          </NavLink>
        </div>
      </header>

      {/* Mobile slide-over */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="absolute left-0 top-0 bottom-0 w-72 flex flex-col border-r border-border/50"
              style={{ background: 'var(--shell-panel)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
            >
              <div className="h-14 px-4 flex items-center justify-between border-b border-border/50">
                <span className="text-[13px] font-bold tracking-[0.18em] text-text-primary uppercase">WES</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 text-text-muted hover:text-text-primary rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {TOP_NAV.map((item) => {
                  if ('children' in item) {
                    return (
                      <div key={item.label}>
                        <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted">
                          {item.label}
                        </p>
                        {item.children.map((child) => (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            onClick={() => setMobileOpen(false)}
                            className={({ isActive }) =>
                              cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                                isActive
                                  ? 'bg-brand-dim text-brand font-semibold'
                                  : 'text-text-secondary hover:text-text-primary hover:bg-background/80'
                              )
                            }
                          >
                            <child.icon className="w-4 h-4" />
                            {child.label}
                          </NavLink>
                        ))}
                      </div>
                    );
                  }
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.end}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-brand-dim text-brand font-semibold'
                            : 'text-text-secondary hover:text-text-primary hover:bg-background/80'
                        )
                      }
                    >
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
              <div className="p-4 border-t border-border/50 space-y-1">
                <NavLink
                  to="/settings"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-brand-dim text-brand'
                        : 'text-text-muted hover:text-text-primary hover:bg-background/70'
                    )
                  }
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </NavLink>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-text-muted hover:text-rose-500 hover:bg-background/70 rounded-xl text-sm font-medium transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Lock Dashboard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border/50 px-4 h-16 flex items-center justify-around"
        style={{ background: 'var(--shell-panel)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        {MOBILE_NAV.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 transition-colors',
                isActive ? 'text-brand' : 'text-text-muted'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase tracking-widest">{item.label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center gap-1 text-text-muted"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-widest">More</span>
        </button>
      </nav>

      {/* Main content */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className={cn(
              'mx-auto p-5 max-w-7xl',
              location.pathname === '/coach' ? 'md:max-w-full md:p-2' : 'md:p-10',
            )}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Global assistant — rendered once here so it's available on every page */}
      <GlobalAssistantDrawer />
    </div>
  );
}

export function Layout() {
  return (
    <AssistantProvider>
      <LayoutInner />
    </AssistantProvider>
  );
}
