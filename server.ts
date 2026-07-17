import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'velosync_db.json');

app.use(express.json());

// Type Definitions
interface User {
  id: string;
  username: string;
  passwordHash: string;
  tier: 'none' | 'basic' | 'premium' | 'gold';
  tierActivated: boolean;
  tierActivatedAt?: number;
  balance: number;
  referralCode: string;
  referredBy: string | null;
  dailyTaskCount: number;
  lastTaskResetDate: string;
  lastLoginRewardTime: number;
  createdAt: number;
  lastSpinTime?: number;
  extraTasksToday?: number;
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

interface Transaction {
  id: string;
  userId: string;
  type: 'bonus' | 'task' | 'withdrawal' | 'subscription';
  amount: number;
  description: string;
  createdAt: number;
}

interface DBState {
  users: User[];
  payment_verifications: PaymentVerification[];
  transactions: Transaction[];
}

// Helper to load/save Database
function getDB(): DBState {
  if (!fs.existsSync(DB_FILE)) {
    const initial: DBState = {
      users: [
        // Preseed a fully activated user who referred our demo
        {
          id: 'jane_ref',
          username: 'jane_smith',
          passwordHash: 'password',
          tier: 'premium',
          tierActivated: true,
          balance: 1400,
          referralCode: 'VELO-JANE',
          referredBy: null,
          dailyTaskCount: 1,
          lastTaskResetDate: new Date().toISOString().split('T')[0],
          lastLoginRewardTime: Date.now() - 3600000,
          createdAt: Date.now() - 86400000 * 2,
        },
        // Preseed a pending referral
        {
          id: 'john_ref',
          username: 'john_doe',
          passwordHash: 'password',
          tier: 'none',
          tierActivated: false,
          balance: 0,
          referralCode: 'VELO-JOHN',
          referredBy: 'VELO-DEMO', // Referred by the default demo user
          dailyTaskCount: 0,
          lastTaskResetDate: new Date().toISOString().split('T')[0],
          lastLoginRewardTime: 0,
          createdAt: Date.now() - 3600000 * 5,
        },
        // Preseed an approved/activated referral
        {
          id: 'mike_ref',
          username: 'mike_valid',
          passwordHash: 'password',
          tier: 'gold',
          tierActivated: true,
          tierActivatedAt: Date.now() - 3600000 * 24 * 3, // Activated 3 days ago
          balance: 1200,
          referralCode: 'VELO-MIKE',
          referredBy: 'VELO-DEMO',
          dailyTaskCount: 2,
          lastTaskResetDate: new Date().toISOString().split('T')[0],
          lastLoginRewardTime: 0,
          createdAt: Date.now() - 3600000 * 24 * 4, // Registered 4 days ago
        },
      ],
      payment_verifications: [
        {
          id: 'pv_john_ref',
          userId: 'john_ref',
          username: 'john_doe',
          tier: 'basic',
          amount: 3000,
          transactionRef: 'TXN-9988776655',
          status: 'pending',
          createdAt: Date.now() - 3600000,
        },
      ],
      transactions: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return { users: [], payment_verifications: [], transactions: [] };
  }
}

function saveDB(db: DBState) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

// Reset daily counts if date shifted
function resetUserDailyLimitsIfNeeded(user: User): boolean {
  const todayStr = new Date().toISOString().split('T')[0];
  if (user.lastTaskResetDate !== todayStr) {
    user.dailyTaskCount = 0;
    user.lastTaskResetDate = todayStr;
    user.extraTasksToday = 0;
    return true;
  }
  return false;
}

// Get tier maximum daily tasks
function getTierTaskLimit(tier: string): number {
  switch (tier) {
    case 'basic': return 2;
    case 'premium': return 4;
    case 'gold': return 6;
    default: return 0;
  }
}

// API Endpoints

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// 2. Authentication: Register
app.post('/api/auth/register', (req, res) => {
  const { username, password, tier, transactionRef, referredBy } = req.body;

  if (!username || !password || !tier || !transactionRef) {
    return res.status(400).json({ error: 'Username, password, tier, and transaction reference are required' });
  }

  const db = getDB();
  const existingUser = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const refCode = `VELO-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const userId = `usr_${Math.random().toString(36).substring(2, 11)}`;

  // Create user
  const newUser: User = {
    id: userId,
    username,
    passwordHash: password, // simple storage for demo/learning
    tier: 'none', // starts as none until payment is verified/approved
    tierActivated: false,
    balance: 500,
    referralCode: refCode,
    referredBy: referredBy || null,
    dailyTaskCount: 0,
    lastTaskResetDate: new Date().toISOString().split('T')[0],
    lastLoginRewardTime: 0,
    createdAt: Date.now(),
    lastSpinTime: 0,
    extraTasksToday: 0,
  };

  db.users.push(newUser);

  // Add transaction log for registration bonus
  const regTx: Transaction = {
    id: `tx_${Math.random().toString(36).substring(2, 11)}`,
    userId: userId,
    type: 'bonus',
    amount: 500,
    description: 'Welcome Registration Bonus',
    createdAt: Date.now(),
  };
  db.transactions.push(regTx);

  // Create payment verification record
  let amount = 3000;
  if (tier === 'premium') amount = 5000;
  if (tier === 'gold') amount = 7000;

  const newPV: PaymentVerification = {
    id: `pv_${Math.random().toString(36).substring(2, 11)}`,
    userId: userId,
    username: username,
    tier: tier,
    amount,
    transactionRef,
    status: 'pending',
    createdAt: Date.now(),
  };

  db.payment_verifications.push(newPV);
  saveDB(db);

  return res.json({
    success: true,
    message: 'Registration successful! Awaiting admin payment approval.',
    user: {
      id: newUser.id,
      username: newUser.username,
      tier: newUser.tier,
      tierActivated: newUser.tierActivated,
      balance: newUser.balance,
      referralCode: newUser.referralCode,
      referredBy: newUser.referredBy,
      dailyTaskCount: newUser.dailyTaskCount,
      lastLoginRewardTime: newUser.lastLoginRewardTime,
      lastSpinTime: newUser.lastSpinTime || 0,
      extraTasksToday: newUser.extraTasksToday || 0,
    },
  });
});

// 3. Authentication: Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const db = getDB();
  const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.passwordHash === password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  resetUserDailyLimitsIfNeeded(user);
  saveDB(db);

  return res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      tier: user.tier,
      tierActivated: user.tierActivated,
      balance: user.balance,
      referralCode: user.referralCode,
      referredBy: user.referredBy,
      dailyTaskCount: user.dailyTaskCount,
      lastLoginRewardTime: user.lastLoginRewardTime,
    },
  });
});

// 4. Get Profile Details
app.get('/api/user/:id', (req, res) => {
  const userId = req.params.id;
  const db = getDB();
  const user = db.users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const updated = resetUserDailyLimitsIfNeeded(user);
  if (updated) {
    saveDB(db);
  }

  // Count valid referrals: users referred by this user's referral code who are tierActivated
  const validReferrals = db.users.filter(u => u.referredBy === user.referralCode && u.tierActivated === true);
  const totalReferrals = db.users.filter(u => u.referredBy === user.referralCode);

  // Find verification details
  const pvs = db.payment_verifications.filter(pv => pv.userId === user.id);

  res.json({
    user: {
      ...user,
      validReferralsCount: validReferrals.length,
      totalReferralsCount: totalReferrals.length,
    },
    verifications: pvs,
  });
});

// 5. Claim Daily Login Reward (100 NGN)
app.post('/api/user/:id/claim-bonus', (req, res) => {
  const userId = req.params.id;
  const db = getDB();
  const user = db.users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const now = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;

  if (user.lastLoginRewardTime && now - user.lastLoginRewardTime < dayInMs) {
    const timeRemaining = dayInMs - (now - user.lastLoginRewardTime);
    const hours = Math.floor(timeRemaining / 3600000);
    const mins = Math.floor((timeRemaining % 3600000) / 60000);
    return res.status(400).json({ error: `Daily reward already claimed. Try again in ${hours}h ${mins}m.` });
  }

  // Award bonus
  user.balance += 100;
  user.lastLoginRewardTime = now;

  // Add transaction log
  const tx: Transaction = {
    id: `tx_${Math.random().toString(36).substring(2, 11)}`,
    userId: user.id,
    type: 'bonus',
    amount: 100,
    description: 'Daily login bonus reward',
    createdAt: now,
  };

  db.transactions.push(tx);
  saveDB(db);

  res.json({
    success: true,
    balance: user.balance,
    lastLoginRewardTime: user.lastLoginRewardTime,
    message: '100 NGN daily login bonus successfully claimed!',
  });
});

// 5.5 Weekly Spin to Win (Extra task, 100 NGN, or no win)
app.post('/api/user/:id/spin', (req, res) => {
  const userId = req.params.id;
  const { bypass } = req.query; // for easy developer/admin testing bypass
  const db = getDB();
  const user = db.users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const now = Date.now();
  const weekInMs = 7 * 24 * 60 * 60 * 1000;

  if (!bypass && user.lastSpinTime && (now - user.lastSpinTime < weekInMs)) {
    const timeRemaining = weekInMs - (now - user.lastSpinTime);
    const days = Math.floor(timeRemaining / (24 * 3600000));
    const hours = Math.floor((timeRemaining % (24 * 3600000)) / 3600000);
    const mins = Math.floor((timeRemaining % 3600000) / 60000);
    return res.status(400).json({
      error: `Spin limit active. You can spin again in ${days}d ${hours}h ${mins}m.`,
    });
  }

  // Determine outcome
  // Outcomes: 'task' | 'cash' | 'none'
  const outcomes: ('task' | 'cash' | 'none')[] = ['task', 'cash', 'none'];
  const randomIndex = Math.floor(Math.random() * outcomes.length);
  const outcome = outcomes[randomIndex];

  let message = '';
  if (outcome === 'task') {
    user.extraTasksToday = (user.extraTasksToday || 0) + 1;
    message = 'Congratulations! You won 1 Extra Task for today!';
  } else if (outcome === 'cash') {
    user.balance += 100;
    message = 'Congratulations! You won 100 NGN cash bonus!';

    // Add transaction log
    const tx: Transaction = {
      id: `tx_${Math.random().toString(36).substring(2, 11)}`,
      userId: user.id,
      type: 'bonus',
      amount: 100,
      description: 'Weekly Spin-to-Win cash prize',
      createdAt: now,
    };
    db.transactions.push(tx);
  } else {
    message = 'No luck this time! Try again next week.';
  }

  user.lastSpinTime = now;
  saveDB(db);

  res.json({
    success: true,
    outcome,
    balance: user.balance,
    extraTasksToday: user.extraTasksToday || 0,
    lastSpinTime: user.lastSpinTime,
    message,
  });
});

// 6. Complete Earning Task (200 NGN)
app.post('/api/user/:id/complete-task', (req, res) => {
  const userId = req.params.id;
  const db = getDB();
  const user = db.users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!user.tierActivated || user.tier === 'none') {
    return res.status(403).json({ error: 'You must have an activated paid subscription to earn from tasks.' });
  }

  resetUserDailyLimitsIfNeeded(user);

  const limit = getTierTaskLimit(user.tier) + (user.extraTasksToday || 0);
  if (user.dailyTaskCount >= limit) {
    return res.status(400).json({ error: `Daily limit reached for ${user.tier.toUpperCase()} tier (${user.dailyTaskCount}/${limit} completed today). Upgrade your tier for more tasks.` });
  }

  // Complete task
  user.dailyTaskCount += 1;
  user.balance += 200;

  // Transaction
  const tx: Transaction = {
    id: `tx_${Math.random().toString(36).substring(2, 11)}`,
    userId: user.id,
    type: 'task',
    amount: 200,
    description: `Audio listening task reward (${user.dailyTaskCount}/${limit})`,
    createdAt: Date.now(),
  };

  db.transactions.push(tx);
  saveDB(db);

  res.json({
    success: true,
    balance: user.balance,
    dailyTaskCount: user.dailyTaskCount,
    message: 'Congratulations! 200 NGN task reward added to your wallet.',
  });
});

// 7. Request Monthly Withdrawal
app.post('/api/user/:id/withdraw', (req, res) => {
  const userId = req.params.id;
  const { amount, bankName, accountNumber, accountName } = req.body;

  if (!amount || amount <= 0 || !bankName || !accountNumber || !accountName) {
    return res.status(400).json({ error: 'All withdrawal details are required.' });
  }

  const db = getDB();
  const user = db.users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.balance < amount) {
    return res.status(400).json({ error: `Insufficient balance. Current balance is ${user.balance} NGN.` });
  }

  // Count valid referrals: users referred by this user's referral code who are tierActivated
  const validReferrals = db.users.filter(u => u.referredBy === user.referralCode && u.tierActivated === true);
  if (validReferrals.length < 1) {
    return res.status(400).json({
      error: 'Withdrawal locked. Under platform anti-fraud rules, you must have at least one (1) Valid Referral with an active paid subscription plan to enable withdrawals.',
    });
  }

  // Process withdrawal
  user.balance -= amount;

  const tx: Transaction = {
    id: `tx_${Math.random().toString(36).substring(2, 11)}`,
    userId: user.id,
    type: 'withdrawal',
    amount: -amount,
    description: `Withdrawal of ${amount} NGN to ${bankName} (${accountNumber}) - Status: Pending processing`,
    createdAt: Date.now(),
  };

  db.transactions.push(tx);
  saveDB(db);

  res.json({
    success: true,
    balance: user.balance,
    message: `Withdrawal request for ${amount} NGN submitted successfully. Processing will complete within monthly schedules.`,
  });
});

// 8. Get Transaction History
app.get('/api/user/:id/transactions', (req, res) => {
  const userId = req.params.id;
  const db = getDB();
  const txs = db.transactions
    .filter(tx => tx.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);

  res.json({ transactions: txs });
});

// 9. Get Referral Stats
app.get('/api/user/:id/referrals', (req, res) => {
  const userId = req.params.id;
  const db = getDB();
  const user = db.users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const referrals = db.users
    .filter(u => u.referredBy === user.referralCode)
    .map(r => ({
      username: r.username,
      tier: r.tier,
      tierActivated: r.tierActivated,
      createdAt: r.createdAt,
      tierActivatedAt: r.tierActivatedAt,
    }));

  res.json({ referrals });
});

// 10. Admin: Get all payment verifications
app.get('/api/admin/verifications', (req, res) => {
  const db = getDB();
  // Return all payment verifications with newest first
  const pvs = [...db.payment_verifications].sort((a, b) => b.createdAt - a.createdAt);
  res.json({ verifications: pvs });
});

// 11. Admin: Approve or Reject payment verification
app.post('/api/admin/verifications/:id/resolve', (req, res) => {
  const { status } = req.body; // 'approved' | 'rejected'
  const pvId = req.params.id;

  if (status !== 'approved' && status !== 'rejected') {
    return res.status(400).json({ error: 'Status must be approved or rejected' });
  }

  const db = getDB();
  const pv = db.payment_verifications.find(p => p.id === pvId);

  if (!pv) {
    return res.status(404).json({ error: 'Payment verification record not found' });
  }

  if (pv.status !== 'pending') {
    return res.status(400).json({ error: 'Verification has already been resolved' });
  }

  pv.status = status;

  if (status === 'approved') {
    const user = db.users.find(u => u.id === pv.userId);
    if (user) {
      user.tier = pv.tier;
      user.tierActivated = true;
      user.tierActivatedAt = Date.now();

      // Log subscription transaction
      const tx: Transaction = {
        id: `tx_${Math.random().toString(36).substring(2, 11)}`,
        userId: user.id,
        type: 'subscription',
        amount: -pv.amount,
        description: `Activated subscription plan: ${pv.tier.toUpperCase()}`,
        createdAt: Date.now(),
      };
      db.transactions.push(tx);
    }
  }

  saveDB(db);

  res.json({
    success: true,
    message: `Payment verification successfully marked as ${status.toUpperCase()}.`,
  });
});

// 12. Create additional test accounts or manual trigger for demo
app.post('/api/admin/seed-test-data', (req, res) => {
  const db = getDB();
  const now = Date.now();

  // Ensure demo user exists
  let demoUser = db.users.find(u => u.id === 'demo_user');
  if (!demoUser) {
    demoUser = {
      id: 'demo_user',
      username: 'demo_user',
      passwordHash: 'password',
      tier: 'premium',
      tierActivated: true,
      balance: 1500,
      referralCode: 'VELO-DEMO',
      referredBy: null,
      dailyTaskCount: 1,
      lastTaskResetDate: new Date().toISOString().split('T')[0],
      lastLoginRewardTime: now - 3600000 * 2,
      createdAt: now - 86400000 * 5,
    };
    db.users.push(demoUser);
  }

  // Ensure john_ref exists
  let johnRef = db.users.find(u => u.id === 'john_ref');
  if (!johnRef) {
    johnRef = {
      id: 'john_ref',
      username: 'john_doe',
      passwordHash: 'password',
      tier: 'none',
      tierActivated: false,
      balance: 0,
      referralCode: 'VELO-JOHN',
      referredBy: 'VELO-DEMO',
      dailyTaskCount: 0,
      lastTaskResetDate: new Date().toISOString().split('T')[0],
      lastLoginRewardTime: 0,
      createdAt: now - 3600000 * 5,
    };
    db.users.push(johnRef);
  }

  // Ensure mike_ref exists
  let mikeRef = db.users.find(u => u.id === 'mike_ref');
  if (!mikeRef) {
    mikeRef = {
      id: 'mike_ref',
      username: 'mike_valid',
      passwordHash: 'password',
      tier: 'gold',
      tierActivated: true,
      tierActivatedAt: now - 3600000 * 24 * 3,
      balance: 1200,
      referralCode: 'VELO-MIKE',
      referredBy: 'VELO-DEMO',
      dailyTaskCount: 2,
      lastTaskResetDate: new Date().toISOString().split('T')[0],
      lastLoginRewardTime: 0,
      createdAt: now - 3600000 * 24 * 4,
    };
    db.users.push(mikeRef);
  }

  saveDB(db);
  res.json({ success: true, message: 'Test demo data seeded successfully!' });
});

// Vite Setup & Serving logic
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VeloSync Server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start VeloSync full-stack server:', err);
});
