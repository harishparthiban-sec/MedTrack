import React, { useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Activity, ArrowRight, Check, Eye, EyeOff, HeartPulse, LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import type { UserProfile } from '../types';
import { registerAccount, loginAccount } from '../services/authService';

interface AuthScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

const formVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.16 } },
};

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = (nextMode: 'signup' | 'login') => {
    setError('');
    setMode(nextMode);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    const result = mode === 'signup'
      ? await registerAccount(name, email, password)
      : await loginAccount(email, password);
    setLoading(false);

    if (result.success && result.user) {
      onLoginSuccess(result.user);
      return;
    }
    setError(result.message || (mode === 'signup' ? 'Unable to create your workspace.' : 'Unable to sign you in.'));
  };

  return (
    <main className="auth-shell min-h-screen bg-[#e7edea] p-3 sm:p-5 lg:p-7">
      <section className="relative min-h-[calc(100vh-1.5rem)] sm:min-h-[calc(100vh-2.5rem)] lg:min-h-[calc(100vh-3.5rem)] overflow-hidden rounded-[2rem] bg-[#082e28] shadow-[0_28px_90px_rgba(8,46,40,0.22)] lg:grid lg:grid-cols-[1.16fr_0.84fr]">
        <div className="auth-grain" aria-hidden="true" />
        <motion.div
          aria-hidden="true"
          animate={{ rotate: [0, 5, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-48 -left-36 h-[42rem] w-[42rem] rounded-full bg-[#54f2ba]/22 blur-3xl"
        />
        <motion.div
          aria-hidden="true"
          animate={{ x: [0, -40, 0], y: [0, 36, 0] }}
          transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-52 left-[22%] h-[36rem] w-[36rem] rounded-full bg-[#3a9ff5]/20 blur-3xl"
        />

        <div className="relative z-10 flex min-h-[31rem] flex-col justify-between p-6 sm:p-9 lg:p-12 xl:p-14">
          <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#c5ff7b] text-[#082e28] shadow-lg shadow-[#c5ff7b]/10">
                <HeartPulse className="h-5 w-5" strokeWidth={2.6} />
              </div>
              <span className="text-sm font-black tracking-[-0.04em]">medtrack</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-[10px] font-bold text-white/70">
              <ShieldCheck className="h-3.5 w-3.5 text-[#c5ff7b]" />
              PRIVATE BY DESIGN
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.12, ease: [0.16, 1, 0.3, 1] }} className="max-w-3xl pt-16 lg:pt-0">
            <p className="mb-5 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#c5ff7b]">
              <Sparkles className="h-3.5 w-3.5" /> Personal health, rethought
            </p>
            <h1 className="max-w-3xl text-[clamp(3.2rem,7vw,7.2rem)] font-black leading-[0.84] tracking-[-0.085em] text-white">
              Health care,<br />
              <span className="text-[#c5ff7b]">in your flow.</span>
            </h1>
            <p className="mt-7 max-w-md text-sm leading-relaxed text-white/68 sm:text-base">
              A clear, calm command centre for the medicines you take and the health signals you want to understand.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.3, ease: [0.16, 1, 0.3, 1] }} className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-2xl border border-white/15 bg-white/[0.09] p-4 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/45">Your next dose</p>
                  <p className="mt-1 text-sm font-bold text-white">Care, right on time.</p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#c5ff7b] text-[#082e28]"><Activity className="h-5 w-5" /></div>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"><motion.div initial={{ width: 0 }} animate={{ width: '68%' }} transition={{ duration: 1.1, delay: 0.7 }} className="h-full rounded-full bg-[#c5ff7b]" /></div>
            </div>
            <div className="rounded-2xl bg-[#c5ff7b] p-4 text-[#082e28]">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] opacity-60">Made for you</p>
              <p className="mt-4 text-xl font-black leading-none tracking-[-0.06em]">One place.<br />Full picture.</p>
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }} className="auth-form relative z-10 flex items-center bg-[#fafbf9] p-6 sm:p-10 lg:p-12 xl:p-16">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-9 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Your health workspace</p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-[#123d35]">
                  {mode === 'signup' ? 'Start simply.' : 'Welcome back.'}
                </h2>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e5f3ed] text-emerald-700"><HeartPulse className="h-5 w-5" /></div>
            </div>

            <div className="mb-7 rounded-2xl bg-[#edf1ee] p-1">
              {(['signup', 'login'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => switchMode(option)}
                  className={`relative w-1/2 rounded-xl py-2.5 text-xs font-black transition-colors ${mode === option ? 'text-white' : 'text-slate-500'}`}
                >
                  {mode === option && <motion.span layoutId="auth-mode" className="absolute inset-0 -z-0 rounded-xl bg-[#123d35] shadow-md" transition={{ type: 'spring', stiffness: 460, damping: 32 }} />}
                  <span className="relative z-10">{option === 'signup' ? 'Create account' : 'Sign in'}</span>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.form key={mode} variants={formVariants} initial="hidden" animate="visible" exit="exit" onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <label className="block">
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Your name</span>
                    <span className="relative block"><UserRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" className="auth-input w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm font-semibold outline-none" /></span>
                  </label>
                )}
                <label className="block">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Email address</span>
                  <span className="relative block"><Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="auth-input w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm font-semibold outline-none" /></span>
                </label>
                <label className="block">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Password</span>
                  <span className="relative block"><LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input required type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" className="auth-input w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-12 text-sm font-semibold outline-none" /><button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#123d35]" title={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span>
                </label>

                {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs font-bold text-rose-600">{error}</div>}

                <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} disabled={loading} type="submit" className="mt-2 flex w-full items-center justify-between rounded-2xl bg-[#123d35] px-5 py-4 text-sm font-black text-white shadow-[0_12px_24px_rgba(18,61,53,0.2)] disabled:opacity-60">
                  <span>{loading ? 'Just a moment...' : mode === 'signup' ? 'Create my workspace' : 'Continue to MedTrack'}</span>
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#c5ff7b] text-[#123d35]"><ArrowRight className="h-4 w-4" /></span>
                </motion.button>
              </motion.form>
            </AnimatePresence>

            <div className="mt-8 flex items-center gap-2 text-[11px] font-medium text-slate-500"><Check className="h-3.5 w-3.5 text-emerald-600" /> Your data stays in your private workspace.</div>
          </div>
        </motion.div>
      </section>
    </main>
  );
};
