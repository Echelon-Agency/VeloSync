import React, { useState } from 'react';
import { ShieldCheck, Copy, Check, Sparkles, User, Lock, ExternalLink, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OnboardingProps {
  onLoginSuccess: (userData: any) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export default function Onboarding({ onLoginSuccess, theme = 'light', onToggleTheme }: OnboardingProps) {
  const isLight = theme === 'light';
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tier, setTier] = useState<'basic' | 'premium' | 'gold'>('basic');
  const [transactionRef, setTransactionRef] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const handleCopyAccount = () => {
    navigator.clipboard.writeText('7051534608');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter username and password');
      return;
    }
    // Show secure payment modal
    setError('');
    setShowPaymentModal(true);
  };

  const completeRegistration = async () => {
    if (!transactionRef.trim()) {
      setError('Please input your Transaction Reference ID from your bank transfer');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          tier,
          transactionRef,
          referredBy: referredBy.trim() || undefined,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Success
      setShowPaymentModal(false);
      setInfoMessage('Registration submitted successfully! Please log in now. Your account is pending admin payment approval.');
      setIsLogin(true);
      setPassword('');
      setTransactionRef('');
      setReferredBy('');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const getTierPrice = (t: string) => {
    if (t === 'basic') return '₦3,000';
    if (t === 'premium') return '₦5,000';
    return '₦7,000';
  };

  const getTierTasks = (t: string) => {
    if (t === 'basic') return '2 Tasks/day';
    if (t === 'premium') return '4 Tasks/day';
    return '6 Tasks/day';
  };

  return (
    <div className={`min-h-screen ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0B0E14] text-gray-100'} flex flex-col justify-center items-center px-4 relative overflow-hidden transition-colors duration-200`} id="onboarding_container">
      {/* Top Bar Theme Toggle */}
      {onToggleTheme && (
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={onToggleTheme}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all shadow-sm ${
              isLight
                ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
                : 'bg-[#1A1F29] border-gray-800 text-gray-200 hover:bg-gray-800'
            }`}
            id="onboarding_theme_toggle"
            title="Toggle Light White Mode or Dark Mode"
          >
            {isLight ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                <span>White Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-purple-400" />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Visual background accents */}
      <div className={`absolute top-[-20%] left-[-10%] w-[50%] h-[50%] ${isLight ? 'bg-purple-300/20' : 'bg-[#8A2BE2]/10'} rounded-full blur-[120px] pointer-events-none`}></div>
      <div className={`absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] ${isLight ? 'bg-indigo-300/20' : 'bg-[#8A2BE2]/10'} rounded-full blur-[120px] pointer-events-none`}></div>

      {/* Brand Header */}
      <motion.div 
        className="text-center mb-8 z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        id="brand_header"
      >
        <div className="inline-flex items-center justify-center p-3 bg-gradient-to-tr from-[#8A2BE2] to-[#b366ff] rounded-2xl shadow-lg shadow-[#8A2BE2]/20 mb-3" id="brand_logo_container">
          <Sparkles className="w-8 h-8 text-white animate-pulse" />
        </div>
        <h1 className={`text-4xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r ${
          isLight ? 'from-purple-900 via-indigo-900 to-slate-900' : 'from-white via-gray-100 to-purple-300'
        }`} id="brand_name">
          VeloSync
        </h1>
        <p className={`text-sm ${isLight ? 'text-slate-500' : 'text-gray-400'} mt-2 font-light uppercase tracking-widest`} id="brand_tagline">
          Audio Earning Platform
        </p>
      </motion.div>

      {/* Auth Card */}
      <motion.div 
        className={`w-full max-w-md ${
          isLight ? 'bg-white border-slate-200 text-slate-900 shadow-xl' : 'bg-[#1A1F29]/90 border-gray-800 text-gray-100 shadow-2xl backdrop-blur-md'
        } border rounded-3xl p-8 relative z-10 transition-colors`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        id="auth_card"
      >
        <div className={`flex border-b ${isLight ? 'border-slate-200' : 'border-gray-800'} mb-6`} id="auth_tabs">
          <button
            onClick={() => { setIsLogin(true); setError(''); setInfoMessage(''); }}
            className={`flex-1 pb-4 text-center text-lg font-semibold transition-all ${
              isLogin 
                ? 'text-[#8A2BE2] border-b-2 border-[#8A2BE2]' 
                : isLight ? 'text-slate-400 hover:text-slate-700' : 'text-gray-400 hover:text-gray-200'
            }`}
            id="login_tab_btn"
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); setInfoMessage(''); }}
            className={`flex-1 pb-4 text-center text-lg font-semibold transition-all ${
              !isLogin 
                ? 'text-[#8A2BE2] border-b-2 border-[#8A2BE2]' 
                : isLight ? 'text-slate-400 hover:text-slate-700' : 'text-gray-400 hover:text-gray-200'
            }`}
            id="register_tab_btn"
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-200 px-4 py-3 rounded-xl text-sm mb-4" id="auth_error">
            {error}
          </div>
        )}

        {infoMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-200 px-4 py-3 rounded-xl text-sm mb-4" id="auth_info">
            {infoMessage}
          </div>
        )}

        <form onSubmit={isLogin ? handleLoginSubmit : handleRegisterSubmit} className="space-y-5" id="auth_form">
          <div>
            <label className={`block text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-gray-400'} uppercase tracking-wider mb-2`} htmlFor="username_input">
              Username
            </label>
            <div className="relative">
              <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isLight ? 'text-slate-400' : 'text-gray-500'}`} />
              <input
                id="username_input"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
                className={`w-full pl-12 pr-4 py-3.5 rounded-xl border transition-colors ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#8A2BE2]'
                    : 'bg-[#0B0E14] border-gray-800 text-gray-200 placeholder-gray-600 focus:border-[#8A2BE2]'
                }`}
                required
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-gray-400'} uppercase tracking-wider mb-2`} htmlFor="password_input">
              Password
            </label>
            <div className="relative">
              <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isLight ? 'text-slate-400' : 'text-gray-500'}`} />
              <input
                id="password_input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-12 pr-4 py-3.5 rounded-xl border transition-colors ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#8A2BE2]'
                    : 'bg-[#0B0E14] border-gray-800 text-gray-200 placeholder-gray-600 focus:border-[#8A2BE2]'
                }`}
                required
              />
            </div>
          </div>

          {!isLogin && (
            <>
              {/* Subscription Tier Selection */}
              <div>
                <label className={`block text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-gray-400'} uppercase tracking-wider mb-2`}>
                  Select Earning Subscription Tier
                </label>
                <div className="grid grid-cols-3 gap-3" id="tier_selector">
                  {(['basic', 'premium', 'gold'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTier(t)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                        tier === t
                          ? 'border-[#8A2BE2] bg-purple-500/10 text-[#8A2BE2] font-bold shadow-sm'
                          : isLight
                          ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                          : 'border-gray-800 bg-[#0B0E14] text-gray-400 hover:border-gray-700'
                      }`}
                      id={`tier_btn_${t}`}
                    >
                      <span className="text-xs font-bold uppercase tracking-wider">{t}</span>
                      <span className="text-sm font-extrabold text-[#8A2BE2] mt-1">{getTierPrice(t)}</span>
                      <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-gray-500'} mt-1`}>{getTierTasks(t)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Referral Input */}
              <div>
                <label className={`block text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-gray-400'} uppercase tracking-wider mb-2`} htmlFor="referred_by_input">
                  Referral Code (Optional)
                </label>
                <input
                  id="referred_by_input"
                  type="text"
                  placeholder="e.g. VELO-DEMO"
                  value={referredBy}
                  onChange={(e) => setReferredBy(e.target.value.toUpperCase())}
                  className={`w-full px-4 py-3 rounded-xl border font-mono transition-colors ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#8A2BE2]'
                      : 'bg-[#0B0E14] border-gray-800 text-gray-200 placeholder-gray-600 focus:border-[#8A2BE2]'
                  }`}
                />
              </div>
            </>
          )}

          <button
            id="auth_submit_btn"
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#8A2BE2] hover:bg-[#7b24cc] text-white font-bold rounded-xl shadow-lg shadow-[#8A2BE2]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
            ) : isLogin ? (
              'Sign In Account'
            ) : (
              'Proceed to Secure Payment'
            )}
          </button>
        </form>
      </motion.div>

      {/* Payment Activation Verification Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-[#0B0E14]/95 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm" id="payment_modal">
            <motion.div
              className={`${
                isLight ? 'bg-white border-slate-200 text-slate-900 shadow-2xl' : 'bg-[#1A1F29] border-gray-800 text-white shadow-2xl'
              } border rounded-3xl max-w-md w-full p-8 relative space-y-6`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              id="payment_modal_content"
            >
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center p-3 bg-purple-500/10 rounded-full text-[#8A2BE2] mb-1">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight">Secure Payment Required</h3>
                <p className={`text-sm ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                  Please transfer the subscription fee for your selected <span className="text-[#8A2BE2] font-semibold uppercase">{tier}</span> tier.
                </p>
              </div>

              {/* Payment Details Card */}
              <div className={`${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0E14] border-gray-800'} border rounded-2xl p-5 space-y-4`} id="payment_details_card">
                <div className={`flex justify-between items-center pb-3 border-b ${isLight ? 'border-slate-200' : 'border-gray-800/60'}`}>
                  <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'} uppercase tracking-wider font-semibold`}>Tier Activation Price</span>
                  <span className={`text-xl font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>{getTierPrice(tier)} NGN</span>
                </div>

                <div className="space-y-3 pt-1 text-sm">
                  <div className="flex justify-between">
                    <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>Bank Name:</span>
                    <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-gray-200'}`}>Fairmoney Microfinance Bank</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>Account Number:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#8A2BE2]">7051534608</span>
                      <button
                        type="button"
                        onClick={handleCopyAccount}
                        className={`${isLight ? 'text-slate-400 hover:text-slate-800' : 'text-gray-400 hover:text-white'} p-1 transition-colors`}
                        title="Copy account number"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>Account Name:</span>
                    <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-gray-200'}`}>VeloSync Operations</span>
                  </div>
                </div>
              </div>

              {/* Secure Reference Input */}
              <div className="space-y-2">
                <label className={`block text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-gray-400'} uppercase tracking-wider`} htmlFor="txn_ref_input">
                  Transaction Reference ID <span className="text-red-500">*</span>
                </label>
                <input
                  id="txn_ref_input"
                  type="text"
                  placeholder="Paste or enter transaction reference code"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#8A2BE2]'
                      : 'bg-[#0B0E14] border-gray-800 text-gray-200 placeholder-gray-600 focus:border-[#8A2BE2]'
                  }`}
                  required
                />
                <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-gray-500'} font-light leading-relaxed`}>
                  Provide your bank transfer reference ID (e.g. Session ID or Ref Number). VeloSync administrators verify payments manually to unlock premium access.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className={`flex-1 py-3.5 border rounded-xl font-semibold transition-colors ${
                    isLight
                      ? 'border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      : 'border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={completeRegistration}
                  disabled={loading}
                  className="flex-1 py-3.5 bg-[#8A2BE2] hover:bg-[#7b24cc] text-white rounded-xl shadow-lg shadow-[#8A2BE2]/20 font-bold transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                  ) : (
                    'Activate Subscription'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <p className={`text-[11px] ${isLight ? 'text-slate-400' : 'text-gray-600'} font-light tracking-wide mt-8 uppercase z-10`}>
        Secured with device fingerprinting and IP verification
      </p>
    </div>
  );
}
