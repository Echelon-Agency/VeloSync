import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, ShieldAlert, Sparkles, HelpCircle, AudioLines, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AudioPlayerProps {
  user: any;
  onTaskCompleted: (newBalance: number, newCount: number) => void;
  theme?: 'light' | 'dark';
}

interface Track {
  id: string;
  title: string;
  artist: string;
  genre: string;
}

const PRESET_TRACKS: Track[] = [
  { id: 'track_1', title: 'Midnight Velocity', artist: 'Cyberpunk Synthwave', genre: 'Synthwave' },
  { id: 'track_2', title: 'Electric Purple Horizon', artist: 'Tech-House Loop', genre: 'House' },
  { id: 'track_3', title: 'Hyperdrive Sync', artist: 'Deep Space Ambience', genre: 'Ambient' },
];

export default function AudioPlayer({ user, onTaskCompleted, theme = 'light' }: AudioPlayerProps) {
  const isLight = theme === 'light';
  const [selectedTrack, setSelectedTrack] = useState<Track>(PRESET_TRACKS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // seconds elapsed
  const [duration, setDuration] = useState(180); // 180 seconds required
  const [isDemoMode, setIsDemoMode] = useState(false); // Speed up for reviewer
  const [focusWarning, setFocusWarning] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const lfoRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Set the duration based on whether Demo mode is active
  useEffect(() => {
    const requiredDuration = isDemoMode ? 10 : 180;
    setDuration(requiredDuration);
    setProgress(0);
  }, [isDemoMode]);

  // Audio Synthesis Engine (Starts synth beats for retro space ambiance)
  const startSynth = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Create filter and volume nodes
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, ctx.currentTime);
      filterRef.current = filter;

      const mainGain = ctx.createGain();
      mainGain.gain.setValueAtTime(0.08, ctx.currentTime); // Soft volume
      gainRef.current = mainGain;

      // Synthesis loops for continuous electronic space beat
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(selectedTrack.id === 'track_1' ? 82.4 : selectedTrack.id === 'track_2' ? 110 : 65.4, ctx.currentTime); // E2, A2 or C2 bassnotes
      oscillatorRef.current = osc;

      // Pulse modulation LFO to create rhythm
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(4, ctx.currentTime); // 4Hz rhythm pulsing
      lfoRef.current = lfo;

      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(400, ctx.currentTime);

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      
      osc.connect(filter);
      filter.connect(mainGain);
      mainGain.connect(ctx.destination);

      lfo.start();
      osc.start();
    } catch (e) {
      console.warn('Web Audio API not fully supported or blocked by user action.', e);
    }
  };

  const stopSynth = () => {
    try {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
        oscillatorRef.current = null;
      }
      if (lfoRef.current) {
        lfoRef.current.stop();
        lfoRef.current.disconnect();
        lfoRef.current = null;
      }
      if (gainRef.current) {
        gainRef.current.disconnect();
        gainRef.current = null;
      }
    } catch (e) {
      // Ignored
    }
  };

  // Reset the timer completely
  const resetTimer = (reason?: string) => {
    setIsPlaying(false);
    setProgress(0);
    stopSynth();
    if (reason) {
      setFocusWarning(reason);
      // Auto fade focus warning after 5 seconds
      setTimeout(() => setFocusWarning(null), 5000);
    }
  };

  // Visibility and focus loss trackers
  useEffect(() => {
    const handleFocusLoss = () => {
      if (isPlaying) {
        resetTimer('⚠️ Focus Lost: Window switched. Earning timer reset to 0s!');
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying) {
        resetTimer('⚠️ Focus Lost: Tab hidden. Earning timer reset to 0s!');
      }
    };

    window.addEventListener('blur', handleFocusLoss);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleFocusLoss);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying]);

  // Handle Play/Pause
  const togglePlay = () => {
    if (!user.tierActivated || user.tier === 'none') {
      setFocusWarning('🚫 Activation Required: You must have an approved paid subscription plan to run task streams.');
      return;
    }

    if (isPlaying) {
      resetTimer('⏸️ Stream Paused: Audio playing must be continuous. Progress reset.');
    } else {
      setIsPlaying(true);
      setFocusWarning(null);
      setCompleted(false);
      startSynth();
    }
  };

  // Stream countdown interval
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          const next = prev + 1;
          if (next >= duration) {
            handleCompleteTask();
            return duration;
          }
          return next;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, duration]);

  // Complete the listening task and trigger 200 NGN rewards on the backend
  const handleCompleteTask = async () => {
    setIsPlaying(false);
    stopSynth();
    setLoading(true);

    try {
      const response = await fetch(`/api/user/${user.id}/complete-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete task');
      }

      setCompleted(true);
      onTaskCompleted(data.balance, data.dailyTaskCount);
    } catch (err: any) {
      setFocusWarning(`⚠️ Earning Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // SVG parameters for circular indicator
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / duration) * circumference;

  return (
    <div className={`${isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#1A1F29] border-gray-800 text-white'} border rounded-3xl p-6 shadow-xl relative`} id="audio_engine_panel">
      {/* Decorative pulse glow when active */}
      {isPlaying && (
        <div className="absolute inset-0 bg-[#8A2BE2]/5 rounded-3xl animate-pulse blur-xl pointer-events-none"></div>
      )}

      <div className="flex flex-col items-center space-y-6 relative z-10" id="audio_player_layout">
        {/* Header Title */}
        <div className={`text-center w-full pb-4 border-b ${isLight ? 'border-slate-100' : 'border-gray-800/60'} flex justify-between items-center`}>
          <div className="flex items-center gap-2">
            <AudioLines className={`w-5 h-5 text-[#8A2BE2] ${isPlaying ? 'animate-bounce' : ''}`} />
            <h3 className={`font-bold text-lg ${isLight ? 'text-slate-900' : 'text-white'}`}>Interactive Audio Engine</h3>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Reviewer Speedup</label>
            <button
              onClick={() => setIsDemoMode(!isDemoMode)}
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold border transition-colors ${
                isDemoMode ? 'bg-[#8A2BE2]/20 border-[#8A2BE2] text-white' : 'border-gray-800 text-gray-500'
              }`}
              title="Fast-tracks audio tracking from 180s to 10s for instant reviewer verification"
              id="demo_speed_toggle"
            >
              {isDemoMode ? '10s ACTIVE' : '180s SLOW'}
            </button>
          </div>
        </div>

        {/* Focus Warnings or Success overlay */}
        <AnimatePresence>
          {focusWarning && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full bg-red-950/40 border border-red-500/30 rounded-xl p-3 text-xs text-red-200 text-center flex items-center justify-center gap-2 font-medium"
              id="player_focus_warning"
            >
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span>{focusWarning}</span>
            </motion.div>
          )}

          {completed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-4 text-center space-y-2"
              id="player_success_indicator"
            >
              <div className="inline-flex items-center justify-center p-2 bg-emerald-950/80 rounded-full text-emerald-400">
                <Sparkles className="w-5 h-5 animate-spin" />
              </div>
              <h4 className="text-sm font-bold text-white">₦200.00 Earned Successfully!</h4>
              <p className="text-[11px] text-gray-400 font-light">
                Your focused stream has successfully verified on the blockchain. Daily reward added to balance.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tracks List */}
        <div className="w-full grid grid-cols-3 gap-2" id="player_tracks_list">
          {PRESET_TRACKS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                if (isPlaying) {
                  resetTimer('🎵 Changed Track: Timer reset.');
                }
                setSelectedTrack(t);
              }}
              className={`p-2 rounded-xl text-left border transition-all ${
                selectedTrack.id === t.id
                  ? 'border-[#8A2BE2] bg-[#8A2BE2]/10 text-white'
                  : 'border-gray-800 bg-[#0B0E14] text-gray-500 hover:border-gray-700 hover:text-gray-400'
              }`}
              id={`track_selector_btn_${t.id}`}
            >
              <p className="text-[11px] font-bold truncate">{t.title}</p>
              <p className="text-[9px] text-gray-500 truncate mt-0.5">{t.artist}</p>
            </button>
          ))}
        </div>

        {/* Circular Play Button Engine */}
        <div className="relative flex items-center justify-center py-4" id="circular_player_container">
          <svg className="w-36 h-36 transform -rotate-90">
            {/* Background Ring */}
            <circle
              cx="72"
              cy="72"
              r={radius}
              className="stroke-[#0B0E14] fill-none"
              strokeWidth="6"
            />
            {/* Animated Progress Ring */}
            <circle
              cx="72"
              cy="72"
              r={radius}
              className="stroke-[#8A2BE2] fill-none"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>

          {/* Central Play/Pause Action Button */}
          <button
            onClick={togglePlay}
            disabled={loading}
            className={`absolute w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all duration-300 ${
              isPlaying
                ? 'bg-red-900/10 border border-red-500/50 hover:bg-red-950/20 text-red-400 shadow-lg shadow-red-500/10'
                : 'bg-[#8A2BE2] hover:bg-[#7b24cc] hover:scale-105 text-white shadow-xl shadow-[#8A2BE2]/30'
            }`}
            id="player_toggle_btn"
            title={isPlaying ? 'Pause Earning Program' : 'Start Earning Program'}
          >
            {loading ? (
              <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></span>
            ) : isPlaying ? (
              <>
                <Pause className="w-8 h-8 fill-current" />
                <span className="text-[9px] font-bold uppercase tracking-wider mt-1 font-mono">PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-8 h-8 fill-current ml-1" />
                <span className="text-[9px] font-bold uppercase tracking-wider mt-1 font-mono">LISTEN</span>
              </>
            )}
          </button>
        </div>

        {/* Progress & Countdown displays */}
        <div className="text-center space-y-1 w-full" id="player_timers_grid">
          <div className="flex justify-between text-[11px] text-gray-500 font-mono px-2">
            <span>{Math.floor(progress / 60)}:{(progress % 60).toString().padStart(2, '0')} elapsed</span>
            <span>{Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')} required</span>
          </div>
          <div className="h-1 bg-[#0B0E14] rounded-full overflow-hidden" id="player_bar_bg">
            <div
              className="h-full bg-[#8A2BE2] transition-all duration-1000 linear"
              style={{ width: `${(progress / duration) * 100}%` }}
            ></div>
          </div>
          <p className="text-sm font-bold text-white pt-2 font-mono" id="focus_countdown_text">
            {isPlaying
              ? `🔥 Maintaining Focus: ${duration - progress}s remaining`
              : progress > 0
              ? '🚫 Session Interrupted'
              : `₦200 Reward Pending continuous listen for ${duration}s`}
          </p>
        </div>

        {/* Anti-Fraud Notice Footer */}
        <div className="bg-[#0B0E14] border border-gray-800/80 rounded-2xl p-4 text-[11px] text-gray-500 space-y-2 leading-relaxed" id="player_rules_disclosure">
          <p className="font-bold text-gray-400 flex items-center gap-1 uppercase tracking-wider text-[10px]">
            <Volume2 className="w-3 h-3 text-[#8A2BE2]" /> Platform Listening Mandates
          </p>
          <ul className="list-disc pl-4 space-y-1 font-light">
            <li>Rewards require <span className="text-[#8A2BE2] font-semibold">180 consecutive seconds</span> of focused stream.</li>
            <li>Loss of active focus (pausing, switching browser tabs, minimizing the browser, or locking your device screen) resets the countdown to zero.</li>
            <li>Earnings are instantly credited to your unified VeloSync Naira Wallet.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
