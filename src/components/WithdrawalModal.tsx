import React, { useState } from 'react';
import { Lock, Unlock, Landmark, CreditCard, User, HelpCircle, AlertTriangle, ShieldCheck, Gift, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface WithdrawalModalProps {
  user: any;
  onClose: () => void;
  onWithdrawalComplete: (newBalance: number) => void;
}

export default function WithdrawalModal({ user, onClose, onWithdrawalComplete }: WithdrawalModalProps) {
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isBalanceAvailable = user.balance && user.balance > 0;

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!bankName || !accountNumber || !accountName || !amount) {
      setError('Please fill in all withdrawal details.');
      return;
    }

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      setError('Please enter a valid positive withdrawal amount.');
      return;
    }

    if (withdrawAmount > user.balance) {
      setError(`Insufficient balance. Your current balance is ₦${user.balance.toLocaleString()}.`);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/user/${user.id}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: withdrawAmount,
          bankName,
          accountNumber,
          accountName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Withdrawal failed');
      }

      setSuccess(`Success! ₦${withdrawAmount.toLocaleString()} withdrawal request submitted for processing to ${bankName} (${accountNumber}).`);
      onWithdrawalComplete(data.balance);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0B0E14]/90 flex items-center justify-center p-4 z-50 overflow-y-auto" id="withdraw_overlay">
      <motion.div
        className="bg-[#1A1F29] border border-gray-800 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative space-y-6 text-white"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        id="withdraw_modal_container"
      >
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-gray-800">
          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              ₦ Bank Withdrawal Portal
            </h3>
            <p className="text-xs text-gray-400">Direct Local Bank Settlement Gateway</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white p-1 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
            id="close_withdraw_modal_btn"
          >
            ✕
          </button>
        </div>

        {/* Welcome Registration Bonus & Wallet Status Card */}
        <div className="bg-gradient-to-r from-emerald-950/40 via-purple-950/30 to-[#0B0E14] border border-emerald-500/30 p-4 rounded-2xl flex items-start gap-3 shadow-lg" id="welcome_bonus_status_box">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-emerald-300">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              <span>Welcome Registration Bonus Unlocked</span>
            </div>
            <p className="text-gray-300 font-light leading-relaxed">
              Your credited <span className="font-bold text-white">₦500.00 Registration Bonus</span> and total wallet balance (<span className="font-bold text-emerald-300">₦{user.balance.toLocaleString()}</span>) are fully eligible for local bank settlement.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl text-xs" id="withdraw_error">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 px-4 py-3 rounded-xl text-xs" id="withdraw_success">
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleWithdrawalSubmit} className="space-y-4" id="withdraw_form">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" htmlFor="withdraw_bank_input">
                Local Bank Name
              </label>
              <div className="relative">
                <Landmark className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="withdraw_bank_input"
                  type="text"
                  placeholder="e.g. Fairmoney, GTBank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-[#0B0E14] border border-gray-800 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#8A2BE2] text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" htmlFor="withdraw_account_number_input">
                Account Number
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="withdraw_account_number_input"
                  type="text"
                  placeholder="10-digit NUBAN"
                  maxLength={10}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-10 pr-3 py-3 bg-[#0B0E14] border border-gray-800 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#8A2BE2] font-mono text-sm"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" htmlFor="withdraw_account_name_input">
              Account Holder Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                id="withdraw_account_name_input"
                type="text"
                placeholder="Name registered with bank"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full pl-10 pr-3 py-3 bg-[#0B0E14] border border-gray-800 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#8A2BE2] text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="flex justify-between items-center text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" htmlFor="withdraw_amount_input">
              <span>Withdrawal Amount (NGN)</span>
              <span className="text-gray-400 font-mono lowercase">Balance: ₦{user.balance.toLocaleString()}</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">₦</span>
              <input
                id="withdraw_amount_input"
                type="number"
                placeholder="e.g. 500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                max={user.balance}
                className="w-full pl-8 pr-16 py-3 bg-[#0B0E14] border border-gray-800 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#8A2BE2] font-mono text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setAmount(user.balance.toString())}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#8A2BE2] hover:text-white uppercase px-2 py-1 bg-purple-950/40 rounded border border-purple-500/20"
              >
                Max Balance
              </button>
            </div>
          </div>

          {/* Action button */}
          <button
            id="withdraw_submit_btn"
            type="submit"
            disabled={loading || !isBalanceAvailable}
            className={`w-full py-4 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 mt-4 ${
              isBalanceAvailable
                ? 'bg-[#8A2BE2] hover:bg-[#7b24cc] shadow-[#8A2BE2]/20 active:scale-[0.98]'
                : 'bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed shadow-none'
            }`}
          >
            {loading ? (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
            ) : isBalanceAvailable ? (
              'Request Local Bank Settlement'
            ) : (
              'Zero Wallet Balance'
            )}
          </button>
        </form>

        {/* Security & Local Settlement Disclosure */}
        <div className="bg-[#0B0E14] border border-gray-800/80 rounded-2xl p-4 text-[11px] text-gray-500 space-y-2 leading-relaxed" id="payout_terms_box">
          <p className="font-bold text-gray-400 flex items-center gap-1 uppercase tracking-wider text-[10px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Direct Local Bank Transfer Security
          </p>
          <p className="text-gray-500 italic text-[10.5px]">
            All credited registration bonuses and task rewards are processed directly into your registered NUBAN local bank account. Transfers are queued and dispatched via automated clearing operations.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

