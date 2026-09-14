import React from 'react';
import { motion } from 'framer-motion';
import { Pill, Activity, Calendar, Upload, BarChart3, LogOut, UserCheck, Sun, Moon, User, FileText } from 'lucide-react';
import type { UserProfile } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: UserProfile | null;
  pendingCount: number;
  reportsCount?: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenAuthModal: () => void;
  onOpenAccountModal: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  user,
  pendingCount,
  reportsCount = 0,
  theme,
  onToggleTheme,
  onOpenAuthModal,
  onOpenAccountModal,
  onLogout,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: Activity },
    { id: 'schedule', label: 'Doses', icon: Pill, badge: pendingCount > 0 ? pendingCount : null },
    { id: 'upload', label: 'Add records', icon: Upload },
    { id: 'reports', label: 'Records', icon: FileText, badge: reportsCount > 0 ? reportsCount : null },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'comparison', label: 'Insights', icon: BarChart3 },
  ];

  const isLight = theme === 'light';
  const headerClass = isLight
    ? 'border-slate-200/80 bg-white/75 text-slate-900'
    : 'border-emerald-900/40 bg-[#041b16]/80 text-white';
  const navClass = isLight ? 'bg-slate-100/80 border-slate-200/80' : 'bg-black/20 border-white/5';
  const inactiveClass = isLight
    ? 'text-slate-500 hover:text-slate-900'
    : 'text-emerald-100/60 hover:text-white';

  return (
    <motion.header
      initial={{ y: -18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={`sticky top-0 z-50 border-b backdrop-blur-2xl ${headerClass}`}
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[74px] gap-3">
          <button
            type="button"
            className="flex items-center gap-3 cursor-pointer group flex-shrink-0"
            onClick={() => setActiveTab('dashboard')}
            aria-label="Go to dashboard"
          >
            <motion.div
              whileHover={{ rotate: -7, scale: 1.06 }}
              whileTap={{ scale: 0.96 }}
              className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/25 ring-1 ring-white/30"
            >
              <Pill className="w-5 h-5 -rotate-45" />
            </motion.div>
            <div className="hidden sm:block text-left leading-none">
              <span className="block text-[15px] font-black tracking-[-0.04em]">medtrack</span>
              <span className={`block mt-1 text-[9px] font-bold uppercase tracking-[0.16em] ${isLight ? 'text-slate-400' : 'text-emerald-200/45'}`}>
                personal health
              </span>
            </div>
          </button>

          <nav className={`hidden lg:flex items-center gap-0.5 p-1.5 rounded-2xl border ${navClass}`} aria-label="Primary navigation">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  whileTap={{ scale: 0.97 }}
                  className={`relative isolate flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-extrabold transition-colors cursor-pointer ${
                    isActive ? (isLight ? 'text-slate-900' : 'text-white') : inactiveClass
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="active-nav-pill"
                      transition={{ type: 'spring', stiffness: 430, damping: 32 }}
                      className={`absolute inset-0 -z-10 rounded-xl border shadow-sm ${
                        isLight ? 'bg-white border-slate-200 shadow-slate-900/5' : 'bg-white/12 border-white/10 shadow-black/20'
                      }`}
                    />
                  )}
                  <item.icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-500' : ''}`} />
                  <span>{item.label}</span>
                  {item.badge !== null && (
                    <span className="min-w-4 h-4 px-1 rounded-full bg-amber-400 text-[9px] leading-4 text-amber-950 font-black">
                      {item.badge}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 flex-shrink-0">
            <motion.button
              type="button"
              onClick={onToggleTheme}
              whileTap={{ rotate: 18, scale: 0.9 }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-colors cursor-pointer ${
                isLight
                  ? 'bg-slate-100/80 text-slate-600 border-slate-200 hover:bg-slate-200'
                  : 'bg-white/5 text-emerald-200 border-white/10 hover:bg-white/10'
              }`}
              title={`Switch to ${isLight ? 'dark' : 'light'} mode`}
            >
              {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </motion.button>

            {user ? (
              <>
                <motion.button
                  type="button"
                  onClick={onOpenAccountModal}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-2 py-1.5 pl-1.5 pr-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    isLight
                      ? 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300 shadow-sm shadow-slate-950/5'
                      : 'bg-white/5 border-white/10 text-white hover:border-emerald-400/50'
                  }`}
                  title="My account"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center font-black text-[11px] shadow-sm">
                    {user.name[0]}
                  </div>
                  <span className="hidden sm:inline max-w-[100px] truncate">{user.name.split(' ')[0]}</span>
                  <User className="w-3 h-3 opacity-50 hidden sm:inline" />
                </motion.button>
                <motion.button
                  type="button"
                  onClick={onLogout}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.94 }}
                  className="w-9 h-9 rounded-xl btn-danger-visible flex items-center justify-center cursor-pointer flex-shrink-0"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </motion.button>
              </>
            ) : (
              <button onClick={onOpenAuthModal} className="flex items-center gap-1.5 px-4 py-2 rounded-xl btn-primary-visible text-xs font-bold cursor-pointer">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Sign in</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={`lg:hidden flex overflow-x-auto px-4 py-2.5 gap-1.5 border-t scrollbar-none ${isLight ? 'border-slate-200/80 bg-white/65' : 'border-white/5 bg-black/10'}`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <motion.button
              type="button"
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              whileTap={{ scale: 0.96 }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap border transition-colors ${
                isActive
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm shadow-emerald-600/25'
                  : isLight
                  ? 'bg-white text-slate-500 border-slate-200'
                  : 'bg-white/5 text-emerald-100/70 border-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
              {item.badge !== null && <span className="w-4 h-4 rounded-full bg-amber-400 text-amber-950 text-[9px] leading-4 font-black">{item.badge}</span>}
            </motion.button>
          );
        })}
      </div>
    </motion.header>
  );
};
