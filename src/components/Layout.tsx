import React from 'react';
import { Outlet, useLocation, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Music, 
  Calendar, 
  BarChart3, 
  Users, 
  Mic2, 
  Link as LinkIcon,
  Zap,
  LogOut,
  Brain,
  DollarSign,
  Sparkles,
  Shield,
  Map,
  Menu,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Hub', path: '/' },
  { icon: Sparkles, label: 'Ideas', path: '/ideas' },
  { icon: Music, label: 'Releases', path: '/releases' },
  { icon: DollarSign, label: 'Finance', path: '/finance' },
  { icon: Calendar, label: 'Content', path: '/content' },
  { icon: Calendar, label: 'Calendar', path: '/calendar' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: Zap, label: 'Goals', path: '/goals' },
  { icon: Map, label: 'Strategy', path: '/strategy' },
  { icon: Users, label: 'Network', path: '/network' },
  { icon: Shield, label: 'Vault', path: '/resources' },
  { icon: Brain, label: 'Coach', path: '/coach' },
];

export function Layout() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    localStorage.removeItem('artist_os_authorized');
    window.location.reload();
  };

  const coreNavItems = [
    { icon: LayoutDashboard, label: 'Hub', path: '/' },
    { icon: Sparkles, label: 'Ideas', path: '/ideas' },
    { icon: Music, label: 'Releases', path: '/releases' },
    { icon: Brain, label: 'Coach', path: '/coach' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col pb-20 md:pb-0">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-8">
            <NavLink to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5 text-white fill-current" />
              </div>
              <span className="font-bold text-lg tracking-tight">ARTIST OS</span>
            </NavLink>

            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    isActive 
                      ? "bg-blue-50 text-blue-600" 
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  )}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <button 
              onClick={handleLogout}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all text-xs font-bold uppercase tracking-widest"
              title="Lock Dashboard"
            >
              <LogOut className="w-4 h-4" />
              Lock
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl flex flex-col"
            >
              <div className="p-6 flex items-center justify-between border-b border-slate-100">
                <span className="font-bold text-lg">Menu</span>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                      isActive 
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-100" 
                        : "text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
              <div className="p-6 border-t border-slate-100">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold hover:bg-rose-100 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  Lock Dashboard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white/90 backdrop-blur-xl border-t border-slate-200 px-4 h-20 flex items-center justify-around pb-safe">
        {coreNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex flex-col items-center gap-1 transition-all",
              isActive ? "text-blue-600" : "text-slate-400"
            )}
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "p-2 rounded-xl transition-all",
                  isActive ? "bg-blue-50" : "bg-transparent"
                )}>
                  <item.icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-1 text-slate-400"
        >
          <div className="p-2 rounded-xl">
            <Menu className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest">More</span>
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
            className="p-4 md:p-10 max-w-7xl mx-auto"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
