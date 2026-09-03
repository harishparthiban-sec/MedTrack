import React, { useState } from 'react';
import { Pill, Mail, Lock, User, ArrowRight, Sparkles } from 'lucide-react';
import type { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile, token?: string) => void;
  onStartBlankAccount: (name: string, email: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onStartBlankAccount,
}) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password || (mode === 'signup' && !name)) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);

    try {
      // Attempt FastAPI backend connection
      const endpoint = mode === 'signup' ? 'http://localhost:8000/api/auth/register' : 'http://localhost:8000/api/auth/login';
      const bodyPayload = mode === 'signup' ? { name, email, password } : { name: name || 'User', email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      if (res.ok) {
        const data = await res.json();
        onLoginSuccess(data.user, data.access_token);
        setLoading(false);
        onClose();
        return;
      }
    } catch {
      // Fallback offline authentication mechanism
    }

    // Local authentication fallback if backend API is not running directly
    const authUser: UserProfile = {
      id: 'usr-' + Math.random().toString(36).substr(2, 7),
      name: name || (email.split('@')[0] || 'User'),
      email,
      streakDays: 0,
    };

    if (mode === 'signup') {
      onStartBlankAccount(authUser.name, authUser.email);
    } else {
      onLoginSuccess(authUser);
    }

    setLoading(false);
    onClose();
  };

  const handleDemoLogin = () => {
    onLoginSuccess({
      id: 'usr-1',
      name: 'Harish Kumar',
      email: 'harish.k@example.com',
      streakDays: 0,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-fade-in">
      <div className="card-subtle rounded-3xl p-8 max-w-md w-full border border-slate-200 dark:border-emerald-900/50 space-y-6 shadow-2xl relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 hover:opacity-75 font-bold p-1 cursor-pointer"
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <Pill className="w-6 h-6 transform -rotate-45" />
          </div>
          <h2 className="text-2xl font-extrabold">
            {mode === 'signup' ? 'Create MedTrack Account' : 'Welcome Back'}
          </h2>
          <p className="text-xs">
            {mode === 'signup'
              ? 'Sign up to manage your medical reports and medicine reminders securely.'
              : 'Log in to access your personal medicine schedule and health report trends.'}
          </p>
        </div>

        {/* Mode Switcher Pills */}
        <div className="flex bg-slate-100 dark:bg-[#031f17] p-1 rounded-2xl border border-slate-200 dark:border-emerald-900/40">
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'signup'
                ? 'btn-primary-visible shadow-md'
                : 'text-slate-600 dark:text-emerald-200/70 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Sign Up (New User)
          </button>
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'login'
                ? 'btn-primary-visible shadow-md'
                : 'text-slate-600 dark:text-emerald-200/70 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Sign In
          </button>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-600 dark:text-rose-300 text-center font-semibold">
            {error}
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider block">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider block">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                placeholder="your.name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider block">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl btn-primary-visible text-xs font-bold flex items-center justify-center space-x-2 shadow-lg cursor-pointer transition-all"
          >
            <span>{loading ? 'Processing...' : mode === 'signup' ? 'Create Blank Account & Start Fresh' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Fast-Track Demo Login Option */}
        <div className="pt-2 border-t border-slate-200 dark:border-emerald-900/30 text-center space-y-2">
          <button
            onClick={handleDemoLogin}
            className="w-full py-2.5 rounded-2xl btn-secondary-visible font-bold text-xs flex items-center justify-center space-x-2 cursor-pointer transition-all"
          >
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>Fast-Track Test Drive (Load Demo Data)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
