import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Settings,
  LogOut,
  Zap
} from 'lucide-react';
import { cn } from '../lib/utils';
import { navigationRoutes } from '../config/navigation';

export function Sidebar() {
  return (
    <aside className="w-72 border-r border-zinc-800 h-screen sticky top-0 flex flex-col bg-zinc-950/50 backdrop-blur-2xl">
      <div className="p-8 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Zap className="w-5 h-5 text-white fill-current" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">ARTIST OS</h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {navigationRoutes.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              isActive 
                ? "bg-blue-600/10 text-blue-400 border border-blue-500/20" 
                : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium text-sm">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="p-6 border-t border-zinc-800">
        <div className="flex items-center gap-3 px-2 mb-6">
          <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden">
            <img src="https://picsum.photos/seed/dj/100/100" alt="Artist" />
          </div>
          <div>
            <p className="text-sm font-bold">WES ROB</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Producer / DJ</p>
          </div>
        </div>
        <div className="space-y-1">
          <button className="flex items-center gap-3 px-4 py-2 w-full text-zinc-500 hover:text-white transition-colors text-sm">
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <button className="flex items-center gap-3 px-4 py-2 w-full text-zinc-500 hover:text-red-400 transition-colors text-sm">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
