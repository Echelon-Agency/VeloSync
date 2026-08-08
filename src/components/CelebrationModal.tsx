import React, { useEffect } from 'react';
import { Sparkles, Trophy, Check, Zap, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fireTierConfetti } from '../utils/confetti';

interface CelebrationModalProps {
  isOpen: boolean;
  tier: 'basic' | 'premium' | 'gold' | string;
  theme?: string;
  onClose: () => void;
}

export default function CelebrationModal({ isOpen, tier, theme = 'dark', onClose }: CelebrationModalProps) {
  const isLight = theme === 'light';

  useEffect(() => {
    if (isOpen) {
      fireTierConfetti(tier);
    }
  }, [isOpen, tier]);

  if (!isOpen) return null;

  const getTierDetails = () => {
    if (tier === 'gold') {
      return {
        name: 'Gold Tier VIP',
        color: 'from-amber-400 via-yellow-300 to-amber-500',
        borderColor: 'border-amber-400/50',
        bgColor: 'bg-amber-500/10',
        textColor: 'text-amber-300',
        badgeBg: 'bg-gradient-to-r from-amber-500 to-yellow-600',
        perks: [
          '6 Daily High-Yield Earning Tasks',
          'Maximum Monthly Withdrawal Limit',
          'Priority Instant Admin Approvals',
          'Exclusive Weekly Spin-to-Win Bonuses'
        ]
      };
    } else if (tier === 'premium') {
      return {
        name: 'Premium Tier',
        color: 'from-purple-400 via-fuchsia-300 to-purple-500',
        borderColor: 'border-purple-400/50',
        bgColor: 'bg-purple-500/10',
        textColor: 'text-purple-300',
        badgeBg: 'bg-gradient-to-r from-purple-600 to-fuchsia-600',
        perks: [
          '4 Daily High-Yield Earning Tasks',
          'Enhanced Monthly Withdrawal Cap',
          'Accelerated Referral Commission Payouts',
          'Weekly Spin-to-Win Bonus Access'
        ]
      };
    } else {
      return {
        name: 'Basic Tier',
        color: 'from-emerald-400 via-teal-300 to-emerald-500',
        borderColor: 'border-emerald-400/50',
        bgColor: 'bg-emerald-500/10',
        textColor: 'text-emerald-300',
        badgeBg: 'bg-gradient-to-r from-emerald-600 to-teal-600',
        perks: [
          '2 Daily Earning Tasks',
          'Standard Wallet Withdrawal Access',
          'Full Referral Commission System'
        ]
      };
    }
  };

  const details = getTierDetails();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          className={`relative w-full max-w-md ${isLight ? 'bg-white text-slate-900 border-slate-200' : 'bg-[#161B24] text-white ' + details.borderColor} border rounded-3xl p-6 shadow-2xl overflow-hidden`}
          id="celebration_modal_box"
        >
          {/* Background Ambient Glow */}
          <div className={`absolute top-[-50%] left-[20%] w-60 h-60 ${details.bgColor} rounded-full blur-3xl pointer-events-none`} />

          {/* Close button */}
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 p-2 rounded-full transition-all ${
              isLight ? 'text-slate-400 hover:text-slate-800 bg-slate-100 hover:bg-slate-200' : 'text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-800'
            }`}
            id="close_celebration_modal_btn"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon & Title */}
          <div className="flex flex-col items-center text-center space-y-3 pt-2">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              className={`w-20 h-20 rounded-3xl ${details.badgeBg} p-0.5 shadow-xl flex items-center justify-center relative`}
            >
              <div className={`w-full h-full ${isLight ? 'bg-slate-100' : 'bg-[#0B0E14]'} rounded-[22px] flex items-center justify-center`}>
                <Trophy className={`w-10 h-10 ${details.textColor}`} />
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                className="absolute -top-1 -right-1 text-yellow-500"
              >
                <Sparkles className="w-5 h-5 fill-current" />
              </motion.div>
            </motion.div>

            <div>
              <span className={`text-[10px] font-mono tracking-widest uppercase font-bold ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                Level Up Complete
              </span>
              <h2 className={`text-2xl font-black bg-gradient-to-r ${details.color} bg-clip-text text-transparent mt-1`}>
                Tier Activated!
              </h2>
            </div>

            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-gray-300'} font-light max-w-xs leading-relaxed`}>
              Congratulations! Your subscription has been upgraded to{' '}
              <span className={`font-bold ${details.textColor}`}>{details.name}</span>.
            </p>
          </div>

          {/* Unlocked Perks List */}
          <div className={`my-5 p-4 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#0B0E14]/70 border-gray-800/80 text-gray-300'} border rounded-2xl space-y-2.5`}>
            <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
              <Zap className={`w-3.5 h-3.5 ${details.textColor}`} />
              <span>Unlocked Membership Features</span>
            </div>
            <ul className="space-y-2 text-xs">
              {details.perks.map((perk, idx) => (
                <li key={idx} className={`flex items-center gap-2 font-medium ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                  <div className={`p-0.5 rounded-full ${details.bgColor} ${details.textColor}`}>
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={() => fireTierConfetti(tier)}
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                isLight 
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' 
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white border-gray-700'
              }`}
              id="replay_confetti_btn"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
              <span>Replay Confetti Burst</span>
            </button>

            <button
              onClick={onClose}
              className={`w-full py-3 ${details.badgeBg} text-white rounded-xl text-xs font-bold shadow-lg transition-all hover:brightness-110`}
              id="continue_dashboard_btn"
            >
              Start Earning Now
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
