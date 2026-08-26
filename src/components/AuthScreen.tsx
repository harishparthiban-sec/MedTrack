import React, { useState } from 'react';
import { Pill, Mail, Lock, User, ArrowRight, ShieldCheck, Sparkles, FileText, Calendar, BarChart3, Eye, EyeOff } from 'lucide-react';
import type { UserProfile } from '../types';
import { registerAccount, loginAccount } from '../services/authService';

interface AuthScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'signup') {
      const res = await registerAccount(name, email, password);
      setLoading(false);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError(res.message || 'Registration failed.');
      }
    } else {
      const res = await loginAccount(email, password);
      setLoading(false);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError(res.message || 'Login failed.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#041a14] text-white flex flex-col justify-between font-sans selection:bg-emerald-500 selection:text-slate-950 relative overflow-hidden">
      
      {/* Background Ambient Glow Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-extrabold shadow-lg shadow-emerald-500/20">
            <Pill className="w-5 h-5 transform -rotate-45" />
          </div>
          <span className="text-2xl font-extrabold text-white tracking-tight" style={{ color: '#ffffff' }}>
            MedTrack AI
          </span>
        </div>

        <button
          onClick={() => {
            setError('');
            setMode(mode === 'login' ? 'signup' : 'login');
          }}
          className="text-xs sm:text-sm font-extrabold text-teal-300 hover:text-white transition-colors cursor-pointer bg-slate-900/90 px-4 py-2.5 rounded-xl border border-slate-700/80"
          style={{ color: '#5eead4' }}
        >
          {mode === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
        </button>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10 flex-1">
        
        {/* Left Column: Product Value Proposition (100% High-Contrast Bright Visible Text) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center space-x-2.5 px-4 py-2 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-extrabold">
            <Sparkles className="w-4 h-4 text-teal-300" />
            <span style={{ color: '#5eead4' }}>AI Prescription & Health Report Intelligence</span>
          </div>

          <h1
            className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight"
            style={{ color: '#ffffff' }}
          >
            Your Personal Medicine & Health Progress Tracker.
          </h1>

          <p
            className="text-base sm:text-lg leading-relaxed max-w-xl font-medium"
            style={{ color: '#cbd5e1' }}
          >
            Upload doctor prescriptions and medical blood reports. AI automatically parses medicine timings, creates daily reminders, tracks adherence, and compares lab test values over time.
          </p>

          {/* 4 Feature Highlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            
            <div className="flex items-start space-x-3.5 p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-md">
              <FileText className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-extrabold" style={{ color: '#ffffff' }}>
                  Prescription OCR Scanner
                </h4>
                <p className="text-xs mt-1 font-medium" style={{ color: '#94a3b8' }}>
                  Extracts drug names, dosages, and food timings automatically.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5 p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-md">
              <Calendar className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-extrabold" style={{ color: '#ffffff' }}>
                  Adherence Calendar
                </h4>
                <p className="text-xs mt-1 font-medium" style={{ color: '#94a3b8' }}>
                  Track taken vs skipped medicine doses with color coding.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5 p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-md">
              <BarChart3 className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-extrabold" style={{ color: '#ffffff' }}>
                  AI Health Lab Comparison
                </h4>
                <p className="text-xs mt-1 font-medium" style={{ color: '#94a3b8' }}>
                  Compares past vs present lab tests & plots trend graphs.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5 p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-md">
              <ShieldCheck className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-extrabold" style={{ color: '#ffffff' }}>
                  Ambiguity Review
                </h4>
                <p className="text-xs mt-1 font-medium" style={{ color: '#94a3b8' }}>
                  Flags handwritten or unclear instructions for user verification.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Authentication Card */}
        <div className="lg:col-span-5">
          <div className="rounded-3xl p-8 sm:p-10 border border-emerald-900/60 space-y-6 shadow-2xl bg-[#07281f]/95 text-white">
            
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white" style={{ color: '#ffffff' }}>
                {mode === 'signup' ? 'Create Your Account' : 'Sign In to MedTrack'}
              </h2>
              <p className="text-xs font-medium" style={{ color: '#94a3b8' }}>
                {mode === 'signup'
                  ? 'Start fresh by creating your secure health account.'
                  : 'Enter your registered email and password to continue.'}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setMode('signup');
                }}
                className={`flex-1 py-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'btn-primary-visible'
                    : 'text-emerald-300 hover:text-white hover:bg-emerald-900/40'
                }`}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setMode('login');
                }}
                className={`flex-1 py-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'btn-primary-visible'
                    : 'text-emerald-300 hover:text-white hover:bg-emerald-900/40'
                }`}
              >
                Sign In
              </button>
            </div>

            {error && (
              <div className="bg-rose-500/20 border border-rose-500/50 rounded-2xl p-4 text-xs text-rose-200 text-center font-extrabold">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider block" style={{ color: '#ffffff' }}>
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                    <input
                      type="text"
                      placeholder="e.g. Harish Parthiban"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-2xl pl-11 pr-4 py-3 text-xs text-white font-bold placeholder-slate-500 focus:border-emerald-400 outline-none"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider block" style={{ color: '#ffffff' }}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                  <input
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl pl-11 pr-4 py-3 text-xs text-white font-bold placeholder-slate-500 focus:border-emerald-400 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Password Input with High Contrast View Password Toggle */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider block" style={{ color: '#ffffff' }}>
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#041a14] border border-emerald-900/60 rounded-2xl pl-11 pr-11 py-3 text-xs text-white font-bold placeholder-emerald-900 focus:border-emerald-400 outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-300 hover:text-white p-1 focus:outline-none cursor-pointer"
                    title={showPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 text-emerald-400" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl btn-primary-visible text-xs font-extrabold flex items-center justify-center space-x-2 shadow-xl cursor-pointer transition-all mt-2"
              >
                <span>{loading ? 'Authenticating...' : mode === 'signup' ? 'Create Account & Continue' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="max-w-7xl w-full mx-auto px-6 py-6 text-center text-xs text-slate-400 font-semibold relative z-10 border-t border-slate-800/40">
        © 2026 MedTrack AI — Smart Health & Medicine Tracker
      </footer>

    </div>
  );
};
