import React from 'react';
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
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'schedule', label: "Today's Doses", icon: Pill, badge: pendingCount > 0 ? pendingCount : null },
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'reports', label: 'History', icon: FileText, badge: reportsCount > 0 ? reportsCount : null },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'comparison', label: 'Analytics', icon: BarChart3 },
  ];

  const navBg = theme === 'light'
    ? 'bg-white border-b border-slate-200'
    : 'bg-[#041a14] border-b border-emerald-900/30';

  const pillBg = theme === 'light'
    ? 'bg-slate-100 border border-slate-200'
    : 'bg-[#031f17] border border-emerald-900/40';

  const activeItem = theme === 'light'
    ? 'bg-emerald-600 text-white shadow-sm'
    : 'bg-emerald-700 text-white shadow-md shadow-emerald-900/40';

  const inactiveItem = theme === 'light'
    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    : 'text-emerald-200/70 hover:text-white hover:bg-emerald-900/40';

  const logoText = theme === 'light' ? 'text-slate-900' : 'text-white';

  return (
    <header className={`sticky top-0 z-50 ${navBg} backdrop-blur-xl`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <div
            className="flex items-center space-x-2.5 cursor-pointer group flex-shrink-0"
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-extrabold shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-transform">
              <Pill className="w-4 h-4 transform -rotate-45" />
            </div>
            <span className={`text-base font-extrabold tracking-tight ${logoText}`}>
              MedTrack
            </span>
          </div>

          {/* Center Nav Pill — clean, no icons, no separators */}
          <nav className={`hidden md:flex items-center gap-1 p-1 rounded-xl ${pillBg}`}>
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive ? activeItem : inactiveItem
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge !== null && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-slate-950 leading-none">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2">

            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                  : 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-800/50'
              }`}
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>

            {user ? (
              <>
                {/* Account Pill */}
                <button
                  onClick={onOpenAccountModal}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    theme === 'light'
                      ? 'bg-white border-slate-200 text-slate-900 hover:border-emerald-400 hover:bg-slate-50'
                      : 'bg-emerald-900/30 border-emerald-800/50 text-white hover:border-emerald-500/60'
                  }`}
                  title="My Account"
                >
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-extrabold text-[11px] shadow-sm">
                    {user.name[0]}
                  </div>
                  <span className="hidden sm:inline max-w-[100px] truncate">{user.name.split(' ')[0]}</span>
                  <User className="w-3 h-3 opacity-60 hidden sm:inline" />
                </button>

                {/* Logout */}
                <button
                  onClick={onLogout}
                  className="w-8 h-8 rounded-xl btn-danger-visible flex items-center justify-center cursor-pointer flex-shrink-0"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl btn-primary-visible text-xs font-bold cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className={`md:hidden flex overflow-x-auto px-4 py-2 gap-2 border-t ${
        theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#031f17] border-emerald-900/30'
      } scrollbar-none`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-600 text-white'
                  : theme === 'light'
                  ? 'text-slate-600 hover:bg-slate-100'
                  : 'text-emerald-200/70 hover:bg-emerald-900/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
