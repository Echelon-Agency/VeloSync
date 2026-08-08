import React, { useEffect, useState } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, Clock, RefreshCw, Sparkles, UserCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { fireTierConfetti } from '../utils/confetti';

interface AdminPanelProps {
  onStatusResolved: () => void;
  theme?: 'light' | 'dark';
}

interface PaymentVerification {
  id: string;
  userId: string;
  username: string;
  tier: 'basic' | 'premium' | 'gold';
  amount: number;
  transactionRef: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export default function AdminPanel({ onStatusResolved, theme = 'light' }: AdminPanelProps) {
  const isLight = theme === 'light';
  const [verifications, setVerifications] = useState<PaymentVerification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchVerifications = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/verifications');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch verifications');
      setVerifications(data.verifications || []);
    } catch (err: any) {
      setError(err.message || 'Error loading verifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, []);

  const handleResolve = async (id: string, status: 'approved' | 'rejected', tier?: string) => {
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/admin/verifications/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Resolution failed');

      if (status === 'approved') {
        fireTierConfetti(tier || 'gold');
      }

      setSuccess(`Payment reference has been successfully ${status}!`);
      fetchVerifications();
      onStatusResolved(); // trigger update on parent dashboard
    } catch (err: any) {
      setError(err.message || 'Failed to update record');
    }
  };

  return (
    <div className={`${isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#1A1F29] border-gray-800 text-white'} border rounded-3xl p-6 shadow-xl space-y-6`} id="admin_control_panel">
      {/* Header */}
      <div className={`flex justify-between items-center pb-4 border-b ${isLight ? 'border-slate-100' : 'border-gray-800/60'}`} id="admin_panel_header">
        <div className="space-y-1">
          <h3 className={`font-bold text-lg flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <ShieldAlert className="w-5 h-5 text-purple-500" /> VeloSync Manual Operations Desk
          </h3>
          <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Review transfer reference codes & approve active subscription tiers</p>
        </div>
        <button
          onClick={fetchVerifications}
          disabled={loading}
          className="p-2 border border-gray-800 hover:bg-[#0B0E14] text-gray-400 hover:text-white rounded-xl transition-all"
          id="admin_refresh_btn"
          title="Refresh Verification Records"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl text-xs" id="admin_error">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 px-4 py-3 rounded-xl text-xs" id="admin_success">
          {success}
        </div>
      )}

      {/* Verification List */}
      <div className="space-y-4" id="verifications_records_list">
        {verifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm font-light">
            No subscription payment requests logged on the network yet.
          </div>
        ) : (
          verifications.map((pv) => (
            <div
              key={pv.id}
              className={`p-4 rounded-2xl border transition-all ${
                pv.status === 'pending'
                  ? 'bg-[#0B0E14] border-gray-800'
                  : pv.status === 'approved'
                  ? 'bg-emerald-950/10 border-emerald-500/10'
                  : 'bg-red-950/10 border-red-500/10'
              }`}
              id={`pv_record_card_${pv.id}`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">@{pv.username}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      pv.tier === 'gold'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : pv.tier === 'premium'
                        ? 'bg-[#8A2BE2]/10 text-[#8A2BE2] border border-[#8A2BE2]/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                      {pv.tier} Plan
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-xs text-gray-400 font-light">
                    <p>Amount: <span className="font-semibold text-white">₦{pv.amount.toLocaleString()}</span></p>
                    <p>Ref ID: <span className="font-mono text-purple-300 font-semibold">{pv.transactionRef}</span></p>
                    <p>Submitted: <span className="text-gray-500">{new Date(pv.createdAt).toLocaleTimeString()}</span></p>
                  </div>
                </div>

                {/* Resolution controls */}
                <div className="flex items-center gap-2 shrink-0" id="pv_record_actions">
                  {pv.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleResolve(pv.id, 'rejected', pv.tier)}
                        className="px-3 py-2 text-xs border border-red-500/30 hover:bg-red-500/15 text-red-400 rounded-xl transition-all flex items-center gap-1 font-semibold"
                        id={`reject_btn_${pv.id}`}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button
                        onClick={() => handleResolve(pv.id, 'approved', pv.tier)}
                        className="px-3.5 py-2 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl transition-all flex items-center gap-1 font-bold"
                        id={`approve_btn_${pv.id}`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve Payout
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      {pv.status === 'approved' ? (
                        <span className="text-emerald-400 bg-emerald-950/30 px-3 py-1.5 rounded-xl border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approved / Activated
                        </span>
                      ) : (
                        <span className="text-red-400 bg-red-950/30 px-3 py-1.5 rounded-xl border border-red-500/20 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Rejected Payout
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
