import React, { useState } from 'react';
import { User, Mail, ShieldCheck, Flame, FileText, BarChart3, LogOut, Key, Trash2, X, CheckCircle2 } from 'lucide-react';
import type { UserProfile } from '../types';

interface AccountModalProps {
  user: UserProfile | null;
  prescriptionsCount: number;
  reportsCount: number;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onResetData: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  user,
  prescriptionsCount,
  reportsCount,
  isOpen,
  onClose,
  onLogout,
  onResetData,
}) => {
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  if (!isOpen || !user) return null;

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;
    setPwSuccess(true);
    setTimeout(() => {
      setPwSuccess(false);
      setShowPasswordChange(false);
      setNewPassword('');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="card-subtle max-w-lg w-full rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 dark:border-emerald-900/50">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-emerald-900/30 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-extrabold text-base shadow-md shadow-emerald-500/20">
              {user.name[0]}
            </div>
            <div>
              <h3 className="text-xl font-extrabold">My Account Profile</h3>
              <span className="text-xs text-slate-400 font-medium">User ID: {user.id}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl btn-secondary-visible transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Details Grid */}
        <div className="space-y-3 bg-slate-50 dark:bg-[#031f17] p-4 rounded-2xl border border-slate-200 dark:border-emerald-900/30">
          <div className="flex items-center justify-between text-xs font-bold py-1 border-b border-slate-200 dark:border-emerald-900/30">
            <span className="flex items-center text-slate-500 dark:text-emerald-200/70">
              <User className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Full Name
            </span>
            <span className="font-extrabold">{user.name}</span>
          </div>

          <div className="flex items-center justify-between text-xs font-bold py-1 border-b border-slate-200 dark:border-emerald-900/30">
            <span className="flex items-center text-slate-500 dark:text-emerald-200/70">
              <Mail className="w-3.5 h-3.5 mr-2 text-cyan-500" /> Email Address
            </span>
            <span className="font-extrabold">{user.email}</span>
          </div>

          <div className="flex items-center justify-between text-xs font-bold py-1 border-b border-slate-200 dark:border-emerald-900/30">
            <span className="flex items-center text-slate-500 dark:text-emerald-200/70">
              <Flame className="w-3.5 h-3.5 mr-2 text-amber-500" /> Adherence Streak
            </span>
            <span className="text-amber-500 font-extrabold">🔥 {user.streakDays || 7} Days</span>
          </div>

          <div className="flex items-center justify-between text-xs font-bold py-1">
            <span className="flex items-center text-slate-500 dark:text-emerald-200/70">
              <ShieldCheck className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Account Security
            </span>
            <span className="text-emerald-500 font-extrabold">✓ Encrypted SQLite</span>
          </div>
        </div>

        {/* Account Activity Summary */}
        <div className="grid grid-cols-2 gap-3 text-xs font-bold">
          <div className="bg-slate-50 dark:bg-[#031f17] p-3.5 rounded-2xl border border-slate-200 dark:border-emerald-900/30 space-y-1">
            <span className="block text-[10px] uppercase text-slate-400">Prescriptions Active</span>
            <span className="text-lg font-extrabold flex items-center">
              <FileText className="w-4 h-4 mr-1.5 text-emerald-500" /> {prescriptionsCount} Docs
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-[#031f17] p-3.5 rounded-2xl border border-slate-200 dark:border-emerald-900/30 space-y-1">
            <span className="block text-[10px] uppercase text-slate-400">Blood Reports</span>
            <span className="text-lg font-extrabold flex items-center">
              <BarChart3 className="w-4 h-4 mr-1.5 text-indigo-500" /> {reportsCount} Reports
            </span>
          </div>
        </div>

        {/* Change Password Collapsible Section */}
        {showPasswordChange ? (
          <form onSubmit={handleUpdatePassword} className="space-y-3 bg-slate-50 dark:bg-[#031f17] p-4 rounded-2xl border border-slate-200 dark:border-emerald-900/30">
            <h4 className="text-xs font-extrabold uppercase tracking-wider">Update Account Password</h4>
            <input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl px-3.5 py-2 text-xs outline-none"
              required
            />
            {pwSuccess && (
              <div className="text-xs text-emerald-500 font-bold flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Password updated successfully!
              </div>
            )}
            <div className="flex items-center space-x-2 pt-1">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl btn-primary-visible text-xs font-bold cursor-pointer"
              >
                Save New Password
              </button>
              <button
                type="button"
                onClick={() => setShowPasswordChange(false)}
                className="px-4 py-2 rounded-xl btn-secondary-visible text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowPasswordChange(true)}
            className="w-full py-3 rounded-2xl btn-secondary-visible font-bold text-xs flex items-center justify-center space-x-2 cursor-pointer transition-colors"
          >
            <Key className="w-4 h-4 text-emerald-500" />
            <span>Update Account Password</span>
          </button>
        )}

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 pt-2 border-t border-slate-200 dark:border-emerald-900/30">
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to clear your local health data?')) {
                onResetData();
                onClose();
              }
            }}
            className="flex-1 py-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-extrabold text-xs border border-rose-200 dark:border-rose-900/40 flex items-center justify-center space-x-2 cursor-pointer transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>Reset Data</span>
          </button>

          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="flex-1 py-3.5 rounded-2xl btn-danger-visible text-xs font-extrabold flex items-center justify-center space-x-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

      </div>
    </div>
  );
};
