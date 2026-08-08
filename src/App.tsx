import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, ShieldCheck, LogOut, Coins, Lock, User, Copy, Check, 
  Clock, ArrowUpRight, Activity, Volume2, Award, Terminal, 
  Unlock, HelpCircle, AlertCircle, RefreshCw, Calendar, UserCheck,
  Sun, Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Onboarding from './components/Onboarding';
import AudioPlayer from './components/AudioPlayer';
import WithdrawalModal from './components/WithdrawalModal';
import AdminPanel from './components/AdminPanel';
import CelebrationModal from './components/CelebrationModal';
import { fireTierConfetti } from './utils/confetti';

interface UserProfile {
  id: string;
  username: string;
  tier: 'none' | 'basic' | 'premium' | 'gold';
  tierActivated: boolean;
  tierActivatedAt?: number;
  balance: number;
  referralCode: string;
  referredBy: string | null;
  dailyTaskCount: number;
  lastLoginRewardTime: number;
  validReferralsCount: number;
  totalReferralsCount: number;
  lastSpinTime?: number;
  extraTasksToday?: number;
}

interface Transaction {
  id: string;
  userId: string;
  type: 'bonus' | 'task' | 'withdrawal' | 'subscription';
  amount: number;
  description: string;
  createdAt: number;
}

interface Referral {
  username: string;
  tier: 'none' | 'basic' | 'premium' | 'gold';
  tierActivated: boolean;
  createdAt: number;
  tierActivatedAt?: number;
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('velosync_theme');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('velosync_theme', nextTheme);
  };

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.body.style.backgroundColor = '#F8FAFC';
      document.body.style.color = '#0F172A';
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#0B0E14';
      document.body.style.color = '#F3F4F6';
    }
  }, [theme]);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([]);
  
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isAudioPlayerExpanded, setIsAudioPlayerExpanded] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bonusLoading, setBonusLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Celebration & Confetti state
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [celebrationTier, setCelebrationTier] = useState<string>('basic');
  const prevUserTierRef = useRef<string | null>(null);
  const prevTierActivatedRef = useRef<boolean | null>(null);

  // Auto-trigger celebratory confetti when tier updates from 'none' (or inactive) to 'basic'/'premium'/'gold'
  useEffect(() => {
    if (user) {
      const isNowActivated = user.tier !== 'none' && user.tierActivated;
      const wasNotActivated = prevUserTierRef.current === 'none' || prevTierActivatedRef.current === false;

      if (prevUserTierRef.current !== null && wasNotActivated && isNowActivated) {
        setCelebrationTier(user.tier);
        setShowCelebrationModal(true);
        fireTierConfetti(user.tier);
      }

      prevUserTierRef.current = user.tier;
      prevTierActivatedRef.current = user.tierActivated;
    } else {
      prevUserTierRef.current = null;
      prevTierActivatedRef.current = null;
    }
  }, [user]);

  // Spin to Win states
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [spinResultMsg, setSpinResultMsg] = useState('');
  const [devBypassSpin, setDevBypassSpin] = useState(false);
  const [spinLoading, setSpinLoading] = useState(false);
  const spinsCount = React.useRef(0);

  // 1. Initial State Load (Check localStorage session)
  useEffect(() => {
    const savedSession = localStorage.getItem('velosync_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        fetchUserProfile(parsed.id);
      } catch (e) {
        localStorage.removeItem('velosync_session');
      }
    }
  }, []);

  // 2. Fetch User Profile & Dashboard Data
  const fetchUserProfile = async (userId: string) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await fetch(`/api/user/${userId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync user details');
      }

      setUser(data.user);
      setPendingVerifications(data.verifications || []);
      
      // Save session
      localStorage.setItem('velosync_session', JSON.stringify({ id: data.user.id }));
      
      // Fetch associated histories
      fetchTransactions(userId);
      fetchReferralStats(userId);
    } catch (err: any) {
      setErrorMessage(err.message || 'Connection lost');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (userId: string) => {
    try {
      const response = await fetch(`/api/user/${userId}/transactions`);
      const data = await response.json();
      if (response.ok) {
        setTransactions(data.transactions || []);
      }
    } catch (e) {
      console.warn("Error loading transactions", e);
    }
  };

  const fetchReferralStats = async (userId: string) => {
    try {
      const response = await fetch(`/api/user/${userId}/referrals`);
      const data = await response.json();
      if (response.ok) {
        setReferrals(data.referrals || []);
      }
    } catch (e) {
      console.warn("Error loading referrals", e);
    }
  };

  // 3. Claim Daily Login Bonus (100 NGN)
  const handleClaimDailyBonus = async () => {
    if (!user) return;
    setBonusLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      const response = await fetch(`/api/user/${user.id}/claim-bonus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Claim failed');
      }

      setSuccessMessage(data.message);
      // Reload profile
      fetchUserProfile(user.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to claim daily reward');
    } finally {
      setBonusLoading(false);
    }
  };

  // Weekly Spin to Win
  const handleSpinWheel = async () => {
    if (!user || isSpinning) return;
    setSpinLoading(true);
    setErrorMessage('');
    setSpinResultMsg('');

    try {
      const response = await fetch(`/api/user/${user.id}/spin${devBypassSpin ? '?bypass=true' : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Spin request failed');
      }

      // We have a successful response with outcome.
      // Now start the spinning animation on the wheel!
      setIsSpinning(true);
      spinsCount.current += 1;
      
      // Calculate target angle based on outcome
      let offsetAngle = 0; // 'task'
      if (data.outcome === 'cash') {
        offsetAngle = 180;
      } else if (data.outcome === 'none') {
        offsetAngle = 60;
      } else {
        offsetAngle = 300; // 'task'
      }

      const totalSpins = 5;
      const targetRotation = spinsCount.current * 360 * totalSpins + offsetAngle;
      setWheelRotation(targetRotation);

      // Wait 4 seconds for the rotation transition to finish
      setTimeout(() => {
        setIsSpinning(false);
        setSpinResultMsg(data.message);
        setSuccessMessage(data.message);

        // Update local state dynamically so user balances / daily limits update
        setUser(prev => prev ? {
          ...prev,
          balance: data.balance,
          extraTasksToday: data.extraTasksToday,
          lastSpinTime: data.lastSpinTime,
        } : null);

        // Fetch transaction ledger history to show any cash reward log
        fetchTransactions(user.id);
      }, 4000);

    } catch (err: any) {
      setErrorMessage(err.message || 'Spin failed. Check if cooldown active.');
    } finally {
      setSpinLoading(false);
    }
  };

  // 4. Copy Referral Link
  const handleCopyReferral = () => {
    if (!user) return;
    const inviteLink = `${window.location.origin}/?ref=${user.referralCode}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // 5. Logout
  const handleLogout = () => {
    localStorage.removeItem('velosync_session');
    setUser(null);
    setTransactions([]);
    setReferrals([]);
    setIsAdminMode(false);
    setIsAudioPlayerExpanded(false);
  };

  // Helper for daily limits
  const getTierLimit = (tier: string) => {
    if (tier === 'basic') return 2;
    if (tier === 'premium') return 4;
    if (tier === 'gold') return 6;
    return 0;
  };

  // Login handler from Onboarding
  const handleLoginSuccess = (userData: any) => {
    fetchUserProfile(userData.id);
  };

  if (!user) {
    return <Onboarding onLoginSuccess={handleLoginSuccess} theme={theme} onToggleTheme={toggleTheme} />;
  }

  const isLight = theme === 'light';
  const taskLimit = getTierLimit(user.tier) + (user.extraTasksToday || 0);
  const tasksRemaining = Math.max(0, taskLimit - user.dailyTaskCount);

  // Calculate daily login countdown
  const now = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;
  const isDailyClaimable = !user.lastLoginRewardTime || (now - user.lastLoginRewardTime >= dayInMs);
  
  let rewardCountdown = '';
  if (!isDailyClaimable && user.lastLoginRewardTime) {
    const remaining = dayInMs - (now - user.lastLoginRewardTime);
    const hrs = Math.floor(remaining / 3600000);
    const mins = Math.floor((remaining % 3600000) / 60000);
    rewardCountdown = `${hrs}h ${mins}m`;
  }

  return (
    <div className={`min-h-screen ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0B0E14] text-gray-100'} pb-16 font-sans relative transition-colors duration-300`} id="velosync_dashboard_root">
      {/* Visual Ambient Elements */}
      <div className={`absolute top-0 right-[15%] w-[45%] h-[350px] ${isLight ? 'bg-purple-300/20' : 'bg-[#8A2BE2]/5'} rounded-full blur-[140px] pointer-events-none`}></div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        
        {/* Header Navigation Area */}
        <header className={`flex items-center justify-between ${isLight ? 'bg-white/90 border-slate-200/80 shadow-sm text-slate-900' : 'bg-[#1A1F29]/60 border-gray-800/80 text-white'} border rounded-2xl px-6 py-4 backdrop-blur-md transition-colors`} id="dashboard_header">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-[#8A2BE2] to-purple-500 rounded-xl shadow-md">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h2 className={`text-xl font-extrabold tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>VeloSync</h2>
              <p className="text-[10px] text-purple-500 font-mono tracking-widest uppercase">Admin Active Status</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Light / Dark Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                isLight 
                  ? 'bg-slate-100 border-slate-300 text-amber-600 hover:bg-slate-200' 
                  : 'bg-[#0B0E14]/40 border-gray-800 text-yellow-400 hover:border-gray-700 hover:text-yellow-300'
              }`}
              id="theme_toggle_btn"
              title={isLight ? "Switch to Dark Mode" : "Switch to White Light Mode"}
            >
              {isLight ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span className="hidden sm:inline text-slate-700">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-purple-300 fill-purple-300" />
                  <span className="hidden sm:inline text-gray-300">Dark</span>
                </>
              )}
            </button>

            {/* Quick Admin Toggle Desk for testers */}
            <button
              onClick={() => setIsAdminMode(!isAdminMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
                isAdminMode 
                  ? (isLight ? 'bg-purple-100 border-[#8A2BE2] text-purple-800' : 'bg-purple-900/30 border-[#8A2BE2] text-purple-300')
                  : (isLight ? 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300' : 'bg-[#0B0E14]/40 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700')
              }`}
              id="admin_ops_toggle"
              title="Toggle administrative operations panel for payment verification approval"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Admin Desk</span>
              <span className={`w-1.5 h-1.5 rounded-full ${isAdminMode ? 'bg-[#8A2BE2] animate-ping' : (isLight ? 'bg-slate-400' : 'bg-gray-600')}`}></span>
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className={`p-2 border rounded-xl transition-all ${
                isLight 
                  ? 'border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-400 hover:text-red-600' 
                  : 'border-gray-800 hover:border-red-500/20 hover:bg-red-950/15 text-gray-500 hover:text-red-400'
              }`}
              id="logout_btn"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Dynamic Sync/Error Notifications */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-950/40 border border-red-500/30 text-red-200 px-4 py-3 rounded-2xl text-xs flex justify-between items-center"
              id="dashboard_global_error"
            >
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage('')} className="text-red-400 hover:text-white">✕</button>
            </motion.div>
          )}

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 px-4 py-3 rounded-2xl text-xs flex justify-between items-center animate-pulse"
              id="dashboard_global_success"
            >
              <span>{successMessage}</span>
              <button onClick={() => setSuccessMessage('')} className="text-emerald-400 hover:text-white">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1. Subscription Pending Review Status Banner */}
        {user.tier === 'none' && (
          <div className={`${isLight ? 'bg-white border-amber-300 text-slate-800' : 'bg-[#1A1F29] border-yellow-500/20 text-white'} border rounded-3xl p-6 shadow-xl relative overflow-hidden`} id="pending_tier_banner">
            <div className="absolute top-0 right-0 p-4 shrink-0">
              <Clock className="w-16 h-16 text-yellow-500/10" />
            </div>
            <div className="space-y-3 max-w-lg">
              <span className="px-2.5 py-0.5 rounded-full bg-yellow-950 text-yellow-400 text-[10px] font-bold uppercase tracking-wider border border-yellow-500/20">
                Awaiting Verification
              </span>
              <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Manual Subscription Review is Pending</h3>
              <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-gray-400'} font-light leading-relaxed`}>
                We detected a logged transfer request under reference <span className="font-mono text-purple-600 dark:text-purple-300 font-bold">{pendingVerifications[0]?.transactionRef || 'N/A'}</span>. Your premium earning suite will instantly unlock as soon as operations manual verification is complete.
              </p>
              <div className={`${isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-[#0B0E14] border-gray-800 text-gray-500'} p-3.5 rounded-xl border text-[11px] space-y-1.5 leading-relaxed font-light`}>
                <p className={`font-semibold ${isLight ? 'text-slate-700' : 'text-gray-400'}`}>💡 Testing Guidelines for Reviewers:</p>
                <p>Click the <span className="text-[#8A2BE2] font-semibold">Admin Desk</span> button in the header right now, then click <span className="text-emerald-500 font-semibold">Approve</span> to instantly activate your subscription plan and experience real task earnings!</p>
              </div>
            </div>
          </div>
        )}

        {/* 2. Bento Grid Stats & Wallets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="dashboard_bento_grid">
          
          {/* Main Wallet Balance Card */}
          <div className={`md:col-span-2 ${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#1A1F29] border-gray-800/80 text-white shadow-xl'} border rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden`} id="wallet_balance_card">
            {/* Visual shine inside wallet */}
            <div className="absolute top-[-50%] right-[-10%] w-[150px] h-[150px] bg-[#8A2BE2]/10 rounded-full blur-[40px] pointer-events-none"></div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className={`text-xs uppercase tracking-widest font-light ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Available Naira Balance</p>
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold flex items-center gap-1 ${
                  isLight 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300'
                }`}>
                  <Sparkles className="w-3 h-3 text-yellow-500" />
                  <span>Welcome Registration Bonus Credited & Withdrawable</span>
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl md:text-5xl font-black tracking-tight font-mono ${
                  isLight ? 'text-slate-900' : 'text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-purple-200'
                }`}>
                  ₦{user.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-semibold text-[#8A2BE2] uppercase font-mono">NGN</span>
              </div>
            </div>

            <div className={`flex flex-wrap items-center justify-between gap-4 pt-6 mt-4 border-t ${isLight ? 'border-slate-100' : 'border-gray-800/60'}`}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#8A2BE2]" />
                <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'} font-light`}>
                  Status: <span className={`font-bold uppercase text-[10px] ${isLight ? 'text-slate-900' : 'text-white'}`}>{user.tierActivated ? `${user.tier} active` : 'unactivated'}</span>
                </span>
                
                {user.tierActivated && (
                  <button
                    onClick={() => {
                      const activeTier = user.tier !== 'none' ? user.tier : 'basic';
                      setCelebrationTier(activeTier);
                      setShowCelebrationModal(true);
                      fireTierConfetti(activeTier);
                    }}
                    className="ml-1 px-2 py-0.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-300 border border-yellow-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                    id="trigger_celebration_btn"
                    title="Play Celebratory Tier Upgrade Particle Effect"
                  >
                    <Sparkles className="w-3 h-3 text-yellow-500" />
                    <span>Celebrate Tier</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setIsWithdrawing(true)}
                className="px-5 py-2.5 bg-[#8A2BE2] hover:bg-[#7b24cc] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#8A2BE2]/20 active:scale-[0.98] transition-all flex items-center gap-1.5"
                id="open_withdraw_portal_btn"
              >
                <ArrowUpRight className="w-4 h-4" /> Withdraw Earnings
              </button>
            </div>
          </div>

          {/* Daily Login Reward Card */}
          <div className={`${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#1A1F29] border-gray-800/80 text-white shadow-xl'} border rounded-3xl p-6 flex flex-col justify-between`} id="daily_bonus_card">
            <div>
              <p className={`text-xs uppercase tracking-widest font-light mb-1 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Daily Login Bonus</p>
              <h4 className={`text-xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>₦100.00</h4>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-gray-500'} font-light mt-1`}>Claim 100 NGN daily login reward every 24 hours.</p>
            </div>

            <div className="pt-4">
              {isDailyClaimable ? (
                <button
                  onClick={handleClaimDailyBonus}
                  disabled={bonusLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-[#8A2BE2] to-purple-600 hover:from-[#7b24cc] hover:to-purple-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                  id="claim_bonus_btn"
                >
                  {bonusLoading ? (
                    <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></span>
                  ) : (
                    <>
                      <Coins className="w-3.5 h-3.5" />
                      <span>Claim Bonus</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  disabled
                  className={`w-full py-2.5 rounded-xl border flex items-center justify-center gap-1.5 cursor-not-allowed font-mono text-xs font-bold ${
                    isLight 
                      ? 'bg-slate-100 border-slate-200 text-slate-400' 
                      : 'bg-gray-800 border-gray-700/60 text-gray-500'
                  }`}
                  id="claim_bonus_btn_disabled"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Claimed ({rewardCountdown})</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. "Listen Now" CTA expander & Audio Engine */}
        <div className={`${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#1A1F29] border-gray-800 text-white shadow-xl'} border rounded-3xl overflow-hidden`} id="audio_task_parent">
          {!isAudioPlayerExpanded ? (
            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6" id="audio_teaser_box">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-[#8A2BE2]/15 text-[#8A2BE2] rounded-lg">
                    <Volume2 className="w-4 h-4 animate-bounce" />
                  </span>
                  <h3 className={`font-bold text-base ${isLight ? 'text-slate-900' : 'text-white'}`}>Focused Stream Earnings</h3>
                </div>
                <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-gray-400'} font-light leading-relaxed max-w-xl`}>
                  Earn <span className="text-[#8A2BE2] font-semibold">200 NGN per audio stream</span>. Under our platform limits, your selected <span className="text-purple-600 dark:text-purple-300 font-bold uppercase">{user.tier}</span> tier authorizes <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{user.dailyTaskCount}/{taskLimit} streams</span> completed today.
                </p>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right hidden md:block">
                  <p className={`text-xs ${isLight ? 'text-slate-400' : 'text-gray-500'} font-light`}>Tally Today</p>
                  <p className={`text-sm font-bold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>{user.dailyTaskCount} / {taskLimit} streams</p>
                </div>
                <button
                  onClick={() => setIsAudioPlayerExpanded(true)}
                  className="px-6 py-3.5 bg-[#8A2BE2] hover:bg-[#7b24cc] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#8A2BE2]/20 hover:scale-[1.02] transition-all"
                  id="listen_now_teaser_btn"
                >
                  Listen Now
                </button>
              </div>
            </div>
          ) : (
            <div className="p-1 bg-gradient-to-b from-purple-500/10 to-transparent rounded-3xl" id="audio_player_active_wrap">
              <AudioPlayer 
                user={user} 
                theme={theme}
                onTaskCompleted={(newBal, newCount) => {
                  setUser(prev => prev ? { ...prev, balance: newBal, dailyTaskCount: newCount } : null);
                  fetchTransactions(user.id);
                }} 
              />
              <div className={`p-3 text-center border-t ${isLight ? 'border-slate-100' : 'border-gray-800/40'}`}>
                <button 
                  onClick={() => setIsAudioPlayerExpanded(false)}
                  className={`text-[11px] font-bold tracking-wider uppercase ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-gray-500 hover:text-white'}`}
                  id="collapse_audio_player_btn"
                >
                  Collapse Player
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Weekly Spin to Win Interactive Card */}
        <div className={`${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#1A1F29] border-gray-800 text-white shadow-xl'} border rounded-3xl p-6 relative overflow-hidden`} id="spin_to_win_parent">
          {/* Visual glow element */}
          <div className="absolute top-[-40%] left-[-10%] w-[120px] h-[120px] bg-purple-500/10 rounded-full blur-[30px] pointer-events-none"></div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Left Content Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-1 bg-[#8A2BE2]/15 text-[#8A2BE2] rounded-lg">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h3 className={`font-bold text-base ${isLight ? 'text-slate-900' : 'text-white'}`}>Velo-Spin Weekly Wheel</h3>
              </div>
              
              <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-gray-400'} font-light leading-relaxed`}>
                Maximize your daily earnings! Spin our loyalty wheel once a week to win premium bonuses:
              </p>

              <div className="grid grid-cols-3 gap-2.5 text-center text-[10px] font-mono">
                <div className={`${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0E14]/50 border-purple-500/10'} border p-2 rounded-xl`}>
                  <span className="block text-[#8A2BE2] font-black">1 EXTRA TASK</span>
                  <span className={`${isLight ? 'text-slate-500' : 'text-gray-500'} font-light`}>Daily limit expansion</span>
                </div>
                <div className={`${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0E14]/50 border-cyan-500/10'} border p-2 rounded-xl`}>
                  <span className="block text-cyan-600 dark:text-cyan-400 font-black">₦100.00 CASH</span>
                  <span className={`${isLight ? 'text-slate-500' : 'text-gray-500'} font-light`}>Direct wallet credit</span>
                </div>
                <div className={`${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0E14]/50 border-gray-800'} border p-2 rounded-xl`}>
                  <span className={`block font-black ${isLight ? 'text-slate-700' : 'text-gray-400'}`}>TRY AGAIN</span>
                  <span className={`${isLight ? 'text-slate-500' : 'text-gray-500'} font-light`}>Maybe next week</span>
                </div>
              </div>

              {/* Cooldown Info */}
              <div className={`${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0E14] border-gray-800'} p-3.5 rounded-xl border flex flex-col gap-1`}>
                <div className="flex justify-between items-center text-xs">
                  <span className={`${isLight ? 'text-slate-500' : 'text-gray-400'} font-light`}>Spin Cooldown:</span>
                  <span className="font-bold font-mono text-purple-600 dark:text-purple-300">
                    {(() => {
                      if (!user.lastSpinTime) return 'READY TO SPIN';
                      const weekInMs = 7 * 24 * 60 * 60 * 1000;
                      const elapsed = Date.now() - user.lastSpinTime;
                      if (elapsed >= weekInMs) return 'READY TO SPIN';
                      const remaining = weekInMs - elapsed;
                      const days = Math.floor(remaining / (24 * 3600000));
                      const hours = Math.floor((remaining % (24 * 3600000)) / 3600000);
                      return `LOCKED (${days}d ${hours}h left)`;
                    })()}
                  </span>
                </div>
                
                {/* Developer bypass checkbox */}
                <div className={`flex items-center gap-2 pt-2 mt-1 border-t ${isLight ? 'border-slate-200' : 'border-gray-800/40'}`}>
                  <input
                    type="checkbox"
                    id="dev_bypass_spin"
                    checked={devBypassSpin}
                    onChange={(e) => setDevBypassSpin(e.target.checked)}
                    className="rounded border-gray-300 text-[#8A2BE2] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                  <label htmlFor="dev_bypass_spin" className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-gray-500'} font-mono cursor-pointer select-none`}>
                    Dev Mode (Bypass 7-day Cooldown)
                  </label>
                </div>
              </div>
            </div>

            {/* Right Wheel Column */}
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative w-44 h-44 flex items-center justify-center" id="spin_wheel_wrapper">
                {/* Outer Glow Ring */}
                <div className={`absolute inset-0 rounded-full border border-purple-500/20 bg-purple-500/5 ${isSpinning ? 'animate-pulse scale-105' : ''} transition-all duration-500`}></div>
                
                {/* Spinning Disc */}
                <div 
                  className={`w-40 h-40 rounded-full border-4 ${isLight ? 'border-white' : 'border-[#0B0E14]'} shadow-2xl relative overflow-hidden flex items-center justify-center`}
                  style={{
                    transform: `rotate(${wheelRotation}deg)`,
                    transition: isSpinning ? 'transform 4s cubic-bezier(0.15, 0.85, 0.35, 1)' : 'none',
                    background: 'conic-gradient(#8A2BE2 0deg 120deg, #06B6D4 120deg 240deg, #1E293B 240deg 360deg)'
                  }}
                  id="spin_wheel_disc"
                >
                  {/* Segment Lines & Labels */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {/* Sector Lines */}
                    <div className="absolute w-[2px] h-20 bg-[#0B0E14]/40 origin-bottom" style={{ transform: 'translateY(-40px) rotate(0deg)' }}></div>
                    <div className="absolute w-[2px] h-20 bg-[#0B0E14]/40 origin-bottom" style={{ transform: 'translateY(-40px) rotate(120deg)' }}></div>
                    <div className="absolute w-[2px] h-20 bg-[#0B0E14]/40 origin-bottom" style={{ transform: 'translateY(-40px) rotate(240deg)' }}></div>

                    {/* Task label */}
                    <div className="absolute text-[9px] font-black text-white tracking-widest uppercase flex flex-col items-center" style={{ transform: 'rotate(60deg) translateY(-46px)' }}>
                      <span>EXTRA</span>
                      <span>TASK</span>
                    </div>
                    {/* Cash label */}
                    <div className="absolute text-[9px] font-black text-white tracking-widest uppercase flex flex-col items-center" style={{ transform: 'rotate(180deg) translateY(-46px)' }}>
                      <span>₦100</span>
                      <span>CASH</span>
                    </div>
                    {/* None label */}
                    <div className="absolute text-[9px] font-black text-gray-300 tracking-widest uppercase flex flex-col items-center" style={{ transform: 'rotate(300deg) translateY(-46px)' }}>
                      <span>TRY</span>
                      <span>AGAIN</span>
                    </div>
                  </div>
                </div>

                {/* Center pin button */}
                <div className={`absolute w-10 h-10 bg-white rounded-full border-4 ${isLight ? 'border-slate-200' : 'border-[#0B0E14]'} shadow-lg flex items-center justify-center z-10`}>
                  <div className="w-3.5 h-3.5 bg-[#8A2BE2] rounded-full"></div>
                </div>

                {/* Pointer at the top (12 o'clock) */}
                <div className="absolute top-[-6px] z-20 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-purple-500 drop-shadow-[0_2px_5px_rgba(138,43,226,0.6)]"></div>
              </div>

              {/* Action Button */}
              <div className="w-full max-w-[200px]">
                {(() => {
                  const weekInMs = 7 * 24 * 60 * 60 * 1000;
                  const elapsed = user.lastSpinTime ? (Date.now() - user.lastSpinTime) : Infinity;
                  const isCooldownActive = !devBypassSpin && elapsed < weekInMs;

                  return (
                    <button
                      onClick={handleSpinWheel}
                      disabled={isSpinning || spinLoading || isCooldownActive}
                      className="w-full py-2.5 bg-gradient-to-r from-[#8A2BE2] to-purple-600 hover:from-[#7b24cc] hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-300 text-white disabled:text-gray-500 text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:shadow-none"
                      id="spin_the_wheel_btn"
                    >
                      {spinLoading ? (
                        <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></span>
                      ) : isSpinning ? (
                        <span className="animate-pulse">Spinning...</span>
                      ) : isCooldownActive ? (
                        <span>Spin Cooldown Locked</span>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" style={{ animationDuration: '4s' }} />
                          <span>Spin Wheel Now</span>
                        </>
                      )}
                    </button>
                  );
                })()}
              </div>

              {/* Spin Result Message Overlay */}
              {spinResultMsg && !isSpinning && (
                <p className="text-center text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500 animate-bounce" id="spin_result_status_msg">
                  {spinResultMsg}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 4. Admin Ops Desk - Toggle Drawer */}
        <AnimatePresence>
          {isAdminMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
              id="admin_ops_box"
            >
              <AdminPanel onStatusResolved={() => fetchUserProfile(user.id)} theme={theme} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 5. Referrals and Payout Guidelines Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="lower_dashboard_grid">
          
          {/* Referral Suite */}
          <div className={`${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#1A1F29] border-gray-800 text-white shadow-xl'} border rounded-3xl p-6 flex flex-col justify-between space-y-4`} id="referrals_card">
            <div className="space-y-2">
              <h3 className={`font-bold text-base flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Award className="w-4 h-4 text-[#8A2BE2]" /> Referral Earning Hub
              </h3>
              <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-gray-400'} font-light leading-relaxed`}>
                Invite friends and expand your active circle. To enable monthly withdrawals, you must possess at least <span className="text-[#8A2BE2] font-semibold">1 Valid Referral</span> with an active paid plan.
              </p>
            </div>

            {/* Link Copy Field */}
            <div className={`${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0E14] border-gray-800'} border rounded-xl p-3 flex items-center justify-between gap-2`} id="referral_link_bar">
              <div className="truncate text-xs font-mono text-purple-600 dark:text-purple-300 font-semibold">
                {user.referralCode}
              </div>
              <button
                onClick={handleCopyReferral}
                className="px-3 py-1.5 bg-[#8A2BE2]/10 border border-[#8A2BE2]/30 hover:bg-[#8A2BE2]/20 text-[#8A2BE2] dark:text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 shrink-0"
                id="copy_referral_link_btn"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span>Copied Code</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            {/* Referrals Stats Grid */}
            <div className="grid grid-cols-2 gap-4 pt-1" id="referrals_stats_bar">
              <div className={`${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0E14]/40 border-gray-800/60'} border p-3 rounded-xl text-center`}>
                <p className={`text-[10px] uppercase ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Total Referrals</p>
                <p className={`text-lg font-bold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>{user.totalReferralsCount || 0}</p>
              </div>
              <div className={`${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0E14]/40 border-gray-800/60'} border p-3 rounded-xl text-center`}>
                <p className={`text-[10px] uppercase ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Valid Referrals</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">{user.validReferralsCount || 0}</p>
              </div>
            </div>

            {/* Detailed Referral Validation & History Log */}
            {referrals.length > 0 ? (
              <div className={`space-y-3 pt-3 border-t ${isLight ? 'border-slate-100' : 'border-gray-800/60'}`} id="referred_users_box">
                <div className="flex justify-between items-center">
                  <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-gray-400'} font-bold uppercase tracking-wider flex items-center gap-1`}>
                    <Calendar className="w-3.5 h-3.5 text-purple-500" /> Referral Validation History
                  </p>
                  <span className="text-[9px] bg-[#8A2BE2]/10 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded-full font-mono">
                    {referrals.filter(r => r.tierActivated).length} of {referrals.length} Valid
                  </span>
                </div>

                <div className="max-h-[190px] overflow-y-auto space-y-2.5 pr-1 text-xs" id="referred_users_scroller">
                  {referrals.map((ref, idx) => {
                    const formattedJoinDate = new Date(ref.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });
                    const formattedActivationDate = ref.tierActivatedAt 
                      ? new Date(ref.tierActivatedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : null;

                    return (
                      <div 
                        key={idx} 
                        className={`p-3 rounded-xl border transition-all ${
                          ref.tierActivated 
                            ? (isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/10 border-emerald-500/20')
                            : (isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0E14]/40 border-gray-800/80')
                        }`}
                        id={`referral_item_${ref.username}`}
                      >
                        <div className="flex justify-between items-start mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <UserCheck className={`w-3.5 h-3.5 ${ref.tierActivated ? 'text-emerald-500' : 'text-gray-400'}`} />
                            <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-gray-200'}`}>@{ref.username}</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            {ref.tier !== 'none' && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-300 dark:border-purple-500/20 rounded uppercase font-mono">
                                {ref.tier}
                              </span>
                            )}
                            {ref.tierActivated ? (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-0.5 animate-pulse" />
                                Valid
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-yellow-600 dark:text-yellow-500 flex items-center gap-0.5 bg-yellow-50 dark:bg-yellow-950/40 px-1.5 py-0.5 rounded border border-yellow-300 dark:border-yellow-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mr-0.5" />
                                Pending
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Milestones Log */}
                        <div className={`space-y-1 font-mono text-[10px] ${isLight ? 'text-slate-500' : 'text-gray-400'} pl-5`}>
                          <div className="flex justify-between">
                            <span className="font-light">Joined:</span>
                            <span className={`${isLight ? 'text-slate-700' : 'text-gray-300'} font-medium`}>{formattedJoinDate}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-light">Validated:</span>
                            {ref.tierActivated && formattedActivationDate ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                {formattedActivationDate}
                              </span>
                            ) : (
                              <span className="text-yellow-600 dark:text-yellow-500 font-light flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" /> Awaiting subscription plan
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Progress and Withdrawal Guidance helper text */}
                        <div className={`mt-2 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-gray-800/40'} pl-5 text-[9px] ${isLight ? 'text-slate-500' : 'text-gray-500'} font-light`}>
                          {ref.tierActivated ? (
                            <span className="text-emerald-600 dark:text-emerald-500 font-medium">✓ Qualifies as active referral for withdrawal limits</span>
                          ) : (
                            <span>✗ Invite must pay & complete subscription verification to unlock withdrawal</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className={`text-center py-6 ${isLight ? 'text-slate-400' : 'text-gray-500'} text-xs font-light border-t ${isLight ? 'border-slate-100' : 'border-gray-800/40'} pt-4`} id="referred_users_empty">
                No invited members logged yet. Copy your code and invite friends!
              </div>
            )}
          </div>

          {/* Ledger History List */}
          <div className={`${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#1A1F29] border-gray-800 text-white shadow-xl'} border rounded-3xl p-6 flex flex-col justify-between space-y-4`} id="ledger_card">
            <div className="space-y-1">
              <h3 className={`font-bold text-base flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Activity className="w-4 h-4 text-[#8A2BE2]" /> Financial Transaction Ledger
              </h3>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'} font-light`}>Real-time ledger audit history log</p>
            </div>

            <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1" id="transactions_scroll_wrapper">
              {transactions.length === 0 ? (
                <div className={`text-center py-12 ${isLight ? 'text-slate-400' : 'text-gray-500'} text-xs font-light`}>
                  No logged transactions recorded yet on your node.
                </div>
              ) : (
                transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className={`flex justify-between items-center ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0E14]/40 border-gray-800/60'} border p-3 rounded-2xl`}
                    id={`tx_item_${tx.id}`}
                  >
                    <div className="space-y-0.5">
                      <p className={`text-xs font-semibold ${isLight ? 'text-slate-800' : 'text-gray-200'}`}>{tx.description}</p>
                      <p className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-gray-500'} font-light`}>{new Date(tx.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs font-mono font-bold ${
                      tx.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                    }`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} NGN
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 6. Withdrawal Portal Overlay Modal */}
      <AnimatePresence>
        {isWithdrawing && (
          <WithdrawalModal
            user={user}
            theme={theme}
            onClose={() => setIsWithdrawing(false)}
            onWithdrawalComplete={(newBalance) => {
              setUser(prev => prev ? { ...prev, balance: newBalance } : null);
              fetchUserProfile(user.id);
            }}
          />
        )}
      </AnimatePresence>

      {/* 7. Celebratory Tier Upgrade Particle & Confetti Modal */}
      <CelebrationModal
        isOpen={showCelebrationModal}
        tier={celebrationTier}
        onClose={() => setShowCelebrationModal(false)}
      />
    </div>
  );
}
