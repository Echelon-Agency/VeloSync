/**
 * Shared Type Definitions for VeloSync
 */

export type SubscriptionTier = 'none' | 'basic' | 'premium' | 'gold';

export interface User {
  id: string;
  username: string;
  passwordHash: string; // Stored securely
  tier: SubscriptionTier;
  tierActivated: boolean; // Approved verification makes this true
  tierActivatedAt?: number;
  balance: number; // in NGN (Naira)
  referralCode: string; // e.g. VELO-XXXX
  referredBy: string | null; // referralCode of referrer
  dailyTaskCount: number; // tracks completed tasks today
  lastTaskResetDate: string; // YYYY-MM-DD
  lastLoginRewardTime: number; // ms timestamp
  createdAt: number; // ms timestamp
  lastSpinTime?: number;
  extraTasksToday?: number;
}

export interface PaymentVerification {
  id: string;
  userId: string;
  username: string;
  tier: SubscriptionTier;
  amount: number; // NGN
  transactionRef: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'bonus' | 'task' | 'withdrawal' | 'subscription';
  amount: number; // Positive for reward, negative for withdrawal/cost
  description: string;
  createdAt: number;
}

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  duration: number; // in seconds, e.g. 180
  src: string; // URL or local synth cue
}
