import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Music,
  Calendar as CalendarIcon,
  BarChart3,
  Brain,
  Sparkles,
  Layers,
  ChevronDown,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { GlobalSearch } from './GlobalSearch';

type DropdownChild = {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
};
type NavGroup = { label: string; path: string; end?: boolean } | { label: string; children: DropdownChild[] };

const TOP_NAV: NavGroup[] = [
  { label: 'Hub', path: '/', end: true },
  {
    label: 'Music',
    children: [
      { label: 'Ideas & WIPs', path: '/ideas', icon: Sparkles, description: 'Tracks in progress' },
      { label: 'Releases', path: '/releases', icon: Music, description: 'Published catalog' },
    ],
  },
  {
    label: 'Manage',
    children: [
      { label: 'Content Engine', path: '/content', icon: Layers, description: 'Posts & scheduling' },
      { label: 'Calendar', path: '/calendar', icon: CalendarIcon, description: 'Events & deadlines' },
    ],
  },
  { label: 'Analytics', path: '/analytics' },
  { label: 'Coach', path: '/coach' },
];

const MOBILE_NAV = [
  { icon: LayoutDashboard, label: 'Hub', path: '/', end: true },
  { icon: Sparkles, label: 'Ideas', path: '/ideas' },
  { icon: Music, label: 'Releases', path: '/releases' },
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
          isActive ? 'text-white' : 'text-zinc-400 hover:text-white'
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
            className="absolute top-[calc(100%+4px)] left-0 z-50 w-54 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
          >
            {children.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-start gap-3 px-4 py-3 transition-colors',
                    isActive ? 'bg-zinc-800' : 'hover:bg-zinc-800'
                  )
                }
              >
                <item.icon className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-zinc-200 leading-none">{item.label}</p>
                  <p className="text-xs text-zinc-500 mt-1">{item.description}</p>
                </div>
              </NavLink>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Layout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('artist_os_authorized');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background text-text-secondary flex flex-col pb-16 md:pb-0">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-zinc-950 border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center gap-2">

          {/* Mobile: hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 -ml-1 text-zinc-400 hover:text-white transition-colors rounded-lg"
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
                      isActive ? 'text-white' : 'text-zinc-400 hover:text-white'
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
            <GlobalSearch compact />
            <button
              onClick={handleLogout}
              className="hidden md:flex items-center p-2 text-zinc-600 hover:text-zinc-200 rounded-lg transition-colors"
              title="Lock"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* WES wordmark */}
          <NavLink
            to="/"
            className="ml-2 flex items-center"
          >
            <span className="text-[13px] font-bold tracking-[0.18em] text-white uppercase select-none">
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
              className="absolute left-0 top-0 bottom-0 w-72 bg-zinc-950 border-r border-zinc-800 flex flex-col"
            >
              <div className="h-14 px-4 flex items-center justify-between border-b border-zinc-800">
                <span className="text-[13px] font-bold tracking-[0.18em] text-white uppercase">WES</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 text-zinc-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {TOP_NAV.map((item) => {
                  if ('children' in item) {
                    return (
                      <div key={item.label}>
                        <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">
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
                                  ? 'bg-zinc-800 text-white'
                                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
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
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                        )
                      }
                    >
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
              <div className="p-4 border-t border-zinc-800">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 rounded-xl text-sm font-medium transition-colors"
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-zinc-950 border-t border-zinc-800/80 px-4 h-16 flex items-center justify-around">
        {MOBILE_NAV.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 transition-colors',
                isActive ? 'text-white' : 'text-zinc-600'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase tracking-widest">{item.label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center gap-1 text-zinc-600"
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
            className="p-4 md:p-10 max-w-7xl mx-auto"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
