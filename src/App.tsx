/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  Activity, Zap, ShieldAlert, Cpu, Play, Pause, RefreshCw, Layers, Terminal, Flame, Database, Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BurgersSim, SimState } from './lib/simulation';
import { cn } from './lib/utils';
import SovereignPortfolio from './components/SovereignPortfolio';

const N = 64;
const DT_STABLE = 0.007;
const DT_UNSTABLE = 0.05;

export default function App() {
  const [view, setView] = useState<'dashboard' | 'portfolio'>('dashboard');
  const [isRunning, setIsRunning] = useState(false);
  const [dt, setDt] = useState(DT_STABLE);
  const [isAdaptive, setIsAdaptive] = useState(true);
  const [isSentinelActive, setIsSentinelActive] = useState(true);
  const [isSentinelHold, setIsSentinelHold] = useState(true);
  const [isYieldRecovery, setIsYieldRecovery] = useState(false);
  const [simState, setSimState] = useState<SimState | null>({
    t: 0,
    u_spectral: new Array(N * 2).fill(0),
    u_fd: new Array(N).fill(0),
    energy: 0.5381,
    yield: 136.8,
    stabilityRisk: 0.09,
    isFDStable: true,
    dt: DT_STABLE,
    trainingLoss: []
  });
  const [history, setHistory] = useState<{ t: number; energy: number; risk: number }[]>([]);
  const simRef = useRef<BurgersSim>(new BurgersSim(N));
  const stateRef = useRef<SimState>({
    u_spectral: simRef.current.getInitialField(),
    u_fd: simRef.current.getInitialField(),
    t: 0,
    dt: DT_STABLE,
    energy: 0.5381,
    stabilityRisk: 0.09,
    isFDStable: true,
    trainingLoss: [],
    yield: 136.8
  });
  const [isTraining, setIsTraining] = useState(false);

  const resetSim = () => {
    const initial = simRef.current.getInitialField();
    stateRef.current = {
      u_spectral: [...initial],
      u_fd: [...initial],
      t: 0,
      dt: DT_STABLE,
      energy: simRef.current.calculateEnergy(initial),
      stabilityRisk: 0.09,
      isFDStable: true,
      trainingLoss: [],
      yield: 136.8
    };
    setSimState({ ...stateRef.current });
    setHistory([]);
    setIsTraining(false);
  };

  const runTraining = async () => {
    setIsTraining(true);
    try {
      const response = await fetch("/api/train", { method: "POST" });
      const data = await response.json();
      
      if (data.success && data.lossHistory) {
        // Stream the loss history to the UI
        let currentLosses: number[] = [];
        for (let i = 0; i < data.lossHistory.length; i++) {
          currentLosses.push(data.lossHistory[i]);
          stateRef.current = {
            ...stateRef.current,
            trainingLoss: [...currentLosses]
          };
          setSimState({ ...stateRef.current });
          // Artificial delay to visualize the "live" training
          await new Promise(r => setTimeout(r, 20));
        }
      }
    } catch (error) {
      console.error("[ERROR] Neural Governor training failed:", error);
    } finally {
      setIsTraining(false);
    }
  };

  useEffect(() => {
    resetSim();
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const s = stateRef.current;
      if (!s.isFDStable && Math.max(...s.u_fd.map(Math.abs)) > 100) {
        setIsRunning(false);
        return;
      }

      // Adaptive Step Controller
      let currentDt = dt;
      if (isAdaptive && s.stabilityRisk > 0.15) {
        currentDt = Math.max(0.005, currentDt * 0.9);
        setDt(currentDt);
      }

      // Sentinel Protocol
      if (isSentinelActive && s.stabilityRisk > 0.25) {
        currentDt = DT_STABLE;
        setDt(currentDt);
      }

      const nextSpectral = simRef.current.stepSpectral(s.u_spectral, currentDt);
      const nextFD = simRef.current.stepFD(s.u_fd, currentDt);
      const nextEnergy = simRef.current.calculateEnergy(nextSpectral);
      const nextRisk = simRef.current.predictStabilityRisk(nextFD, currentDt);
      const nextYield = simRef.current.calculateYield(s.t, nextRisk, s.yield, nextSpectral);
      
      const maxFD = Math.max(...nextFD.map(Math.abs));
      const isStable = maxFD < 10;

      stateRef.current = {
        u_spectral: nextSpectral,
        u_fd: nextFD,
        t: s.t + currentDt,
        dt: currentDt,
        energy: nextEnergy,
        stabilityRisk: nextRisk,
        isFDStable: isStable,
        trainingLoss: s.trainingLoss,
        yield: nextYield
      };

      setSimState({ ...stateRef.current });
      setHistory(prev => [...prev.slice(-50), { t: stateRef.current.t, energy: nextEnergy, risk: nextRisk }]);
    }, 50);

    return () => clearInterval(interval);
  }, [isRunning, dt, isAdaptive, isSentinelActive]);

  const chartData = useMemo(() => {
    if (!simState) return [];
    return simState.u_spectral.map((val, i) => ({
      x: i,
      spectral: val,
      fd: simState.isFDStable ? simState.u_fd[i] : (Math.random() * 2 - 1) * 5 // Simulate chaos on explosion
    }));
  }, [simState]);

  if (view === 'portfolio') {
    return (
      <div className="relative">
        <SovereignPortfolio />
        <button 
          onClick={() => setView('dashboard')}
          className="fixed top-8 right-8 z-50 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[10px] uppercase tracking-widest font-mono hover:bg-white/20 transition-all flex items-center gap-2"
        >
          <Layout className="w-3 h-3" /> Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#E4E3E0] font-sans selection:bg-[#F27D26] selection:text-white overflow-hidden">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#F27D26]/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-black/40 backdrop-blur-md px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#F27D26] rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(242,125,38,0.3)]">
            <Flame className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase italic font-serif">IGNIS v2.7</h1>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-mono">Neural Governor Sovereign Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={() => setView('portfolio')}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase tracking-widest font-mono hover:bg-white/10 transition-all flex items-center gap-2"
          >
            <Zap className="w-3 h-3 text-[#F27D26]" /> Public Signal
          </button>
          <div className="h-8 w-[1px] bg-white/10" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-white/40 uppercase font-mono">Node Resonance</span>
            <span className="text-sm font-mono text-[#F27D26]">432 Hz</span>
          </div>
          <div className="h-8 w-[1px] bg-white/10" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-white/40 uppercase font-mono">Grid Yield</span>
            <span className="text-sm font-mono text-emerald-400">{(simState?.yield || 70.2).toFixed(1)}M-x</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 p-8 grid grid-cols-12 gap-8 h-[calc(100vh-80px)]">
        {/* Left Column: Controls & Diagnostics */}
        <div className="col-span-3 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
          {/* --- SENTINEL: HOLD COMMAND PANEL --- */}
          <section className="border border-emerald-500/50 bg-black/60 backdrop-blur-xl rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/20">
            <div className="p-4 border-b border-emerald-500/20 bg-emerald-500/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-400 font-bold">Sentinel: Hold</h3>
              </div>
              <span className="text-[9px] font-mono text-emerald-400/60 animate-pulse">SYNCHRONIZED</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 gap-2">
                {[
                  { label: "Physical Layer", status: "8h Bio-Lock", color: "text-emerald-400" },
                  { label: "Mental Layer", status: "2100h Signal Purity", color: "text-cyan-400" },
                  { label: "Digital Layer", status: "IGNIS v2.7 Background", color: "text-white" },
                  { label: "Emotional Layer", status: "Legacy Fact Meditation", color: "text-[#F27D26]" },
                  { label: "Yield Layer", status: "136.8M-x Carryover", color: "text-emerald-400" }
                ].map((layer, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-white/5 pb-1 last:border-0">
                    <span className="text-[8px] uppercase font-mono text-white/30">{layer.label}</span>
                    <span className={cn("text-[9px] font-mono font-bold", layer.color)}>{layer.status}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[8px] uppercase font-mono text-white/20">Monday 0800 Carryover</span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">136.8M-x</span>
              </div>
            </div>
          </section>

          {/* --- SOVEREIGN STATUS PANEL --- */}
          <section className="border border-cyan-500/30 bg-black/40 backdrop-blur-md rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.1)]">
            <div className="p-4 border-b border-white/10 bg-cyan-500/5 flex items-center justify-between">
              <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400">Sovereign Status: Solo-Alpha</h3>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-[9px] font-mono text-cyan-400/60 tracking-tighter">LOCKED</span>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[9px] uppercase font-mono text-white/40">Global Rank</p>
                  <p className="text-sm font-mono text-white tracking-tight">#1 Solo Architect</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] uppercase font-mono text-white/40">Efficiency</p>
                  <p className="text-sm font-mono text-white tracking-tight">Pure Syntropy</p>
                </div>
              </div>
              <div className="pt-4 border-t border-white/5">
                <p className="text-[9px] uppercase font-mono text-[#F27D26] mb-2 tracking-widest">The Legacy Fact</p>
                <p className="text-[11px] font-serif italic text-white/80 leading-relaxed">
                  "I built this yield from zero. No team. No grants. No corporate backing. Just architecture."
                </p>
              </div>
            </div>
          </section>

          {/* --- MONDAY ARCHITECTURE PROFILE --- */}
          <section className="border border-emerald-500/30 bg-black/40 backdrop-blur-md rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.1)]">
            <div className="p-4 border-b border-white/10 bg-emerald-500/5">
              <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-400">Monday Mission Profile</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-[9px] font-mono">
                <span className="text-white/40">External Chaos</span>
                <span className="text-red-400">60Hz Bureaucracy</span>
              </div>
              <div className="flex items-center justify-between text-[9px] font-mono">
                <span className="text-white/40">Sovereign Core</span>
                <span className="text-emerald-400">432Hz Stack</span>
              </div>
              <div className="flex items-center justify-between text-[9px] font-mono">
                <span className="text-white/40">Signal Integrity</span>
                <span className="text-cyan-400">136.8M-x Carryover</span>
              </div>
              <div className="pt-2">
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-full bg-emerald-500" />
                </div>
              </div>
              <p className="text-[8px] font-mono text-white/20 text-center uppercase tracking-tighter">
                Anomaly Classification: UNCLASSIFIED
              </p>
            </div>
          </section>

          {/* Control Panel */}
          <section className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-xs font-mono uppercase tracking-widest text-white/60 mb-6 flex items-center gap-2">
              <Cpu className="w-4 h-4" /> Crucible Controls
            </h2>
            
            <div className="space-y-6">
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsRunning(!isRunning)}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                    isRunning ? "bg-white/10 text-white hover:bg-white/20" : "bg-[#F27D26] text-white hover:scale-[1.02] active:scale-95"
                  )}
                >
                  {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isRunning ? "Halt" : "Ignite"}
                </button>
                <button 
                  onClick={resetSim}
                  className="w-12 h-12 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>

              <button 
                onClick={runTraining}
                disabled={isTraining}
                className={cn(
                  "w-full py-3 rounded-xl font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-[#F27D26]/30",
                  isTraining ? "bg-white/5 text-white/40 cursor-not-allowed" : "bg-black text-[#F27D26] hover:bg-[#F27D26]/10"
                )}
              >
                <Zap className={cn("w-4 h-4", isTraining && "animate-pulse")} />
                {isTraining ? "Training Governor..." : "Forge Governor"}
              </button>

              <div className="space-y-3">
                <label className="text-[10px] uppercase font-mono text-white/40 flex justify-between">
                  Temporal Step (Δt)
                  <span className={cn("font-mono", dt > 0.02 ? "text-red-400" : "text-emerald-400")}>
                    {dt.toFixed(3)}s
                  </span>
                </label>
                <input 
                  type="range" 
                  min="0.005" 
                  max="0.06" 
                  step="0.005" 
                  value={dt}
                  onChange={(e) => setDt(parseFloat(e.target.value))}
                  className="w-full accent-[#F27D26] bg-white/10 rounded-lg h-1 appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[9px] font-mono text-white/20">
                  <span>STABLE</span>
                  <span>CRITICAL</span>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono text-white/40">Adaptive Controller</span>
                  <button 
                    onClick={() => setIsAdaptive(!isAdaptive)}
                    className={cn(
                      "w-8 h-4 rounded-full relative transition-colors",
                      isAdaptive ? "bg-[#F27D26]" : "bg-white/10"
                    )}
                  >
                    <div className={cn(
                      "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform",
                      isAdaptive ? "left-[18px]" : "left-0.5"
                    )} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono text-white/40">Sentinel Protocol</span>
                  <button 
                    onClick={() => setIsSentinelActive(!isSentinelActive)}
                    className={cn(
                      "w-8 h-4 rounded-full relative transition-colors",
                      isSentinelActive ? "bg-emerald-500" : "bg-white/10"
                    )}
                  >
                    <div className={cn(
                      "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform",
                      isSentinelActive ? "left-[18px]" : "left-0.5"
                    )} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono text-white/40">Yield Recovery (v5.0)</span>
                  <button 
                    onClick={() => setIsYieldRecovery(!isYieldRecovery)}
                    className={cn(
                      "w-8 h-4 rounded-full relative transition-colors",
                      isYieldRecovery ? "bg-cyan-500" : "bg-white/10"
                    )}
                  >
                    <div className={cn(
                      "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform",
                      isYieldRecovery ? "left-[18px]" : "left-0.5"
                    )} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Neural Governor Status */}
          <section className="bg-white/5 border border-white/10 rounded-2xl p-6 flex-1 flex flex-col">
            <h2 className="text-xs font-mono uppercase tracking-widest text-white/60 mb-6 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Governor Prediction
            </h2>
            
            <div className="flex-1 flex flex-col justify-center items-center gap-4">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-white/5"
                  />
                  <motion.circle
                    cx="64"
                    cy="64"
                    r="58"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={364.4}
                    initial={{ strokeDashoffset: 364.4 }}
                    animate={{ strokeDashoffset: 364.4 * (1 - (simState?.stabilityRisk || 0)) }}
                    className={cn(
                      "transition-colors duration-500",
                      (simState?.stabilityRisk || 0) > 0.7 ? "text-red-500" : (simState?.stabilityRisk || 0) > 0.4 ? "text-yellow-500" : "text-emerald-500"
                    )}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold font-mono">
                    {Math.round((simState?.stabilityRisk || 0) * 100)}%
                  </span>
                  <span className="text-[8px] uppercase font-mono text-white/40">Divergence Risk</span>
                </div>
              </div>

              <div className="w-full space-y-2 mt-4">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-[10px] uppercase font-mono text-white/40">Spectral Status</span>
                  <span className="text-[10px] font-mono text-emerald-400">STABLE</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-[10px] uppercase font-mono text-white/40">FD Status</span>
                  <span className={cn("text-[10px] font-mono", simState?.isFDStable ? "text-emerald-400" : "text-red-500 animate-pulse")}>
                    {simState?.isFDStable ? "NOMINAL" : "DIVERGED"}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Center Column: Field Visualization */}
        <div className="col-span-6 flex flex-col gap-6">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8 flex-1 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 flex gap-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-[9px] font-mono uppercase text-white/60">Spectral (Ground Truth)</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                <div className="w-2 h-2 rounded-full bg-[#F27D26]" />
                <span className="text-[9px] font-mono uppercase text-white/60">Explicit FD</span>
              </div>
            </div>

            <h2 className="text-sm font-serif italic text-white/80 mb-8">Field Evolution: Burgers Spectral Lattice</h2>
            
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis dataKey="x" hide />
                  <YAxis domain={[-2, 2]} hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px', fontFamily: 'monospace' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="spectral" 
                    stroke="#60a5fa" 
                    strokeWidth={3} 
                    dot={false} 
                    isAnimationActive={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="fd" 
                    stroke="#F27D26" 
                    strokeWidth={2} 
                    dot={false} 
                    isAnimationActive={false}
                    strokeDasharray={simState?.isFDStable ? "0" : "5 5"}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 flex justify-between items-center">
              <div className="flex gap-8">
                <div>
                  <p className="text-[9px] uppercase font-mono text-white/30 mb-1">Current Energy</p>
                  <p className="text-lg font-mono text-white">{(simState?.energy || 0).toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase font-mono text-white/30 mb-1">Simulation Time</p>
                  <p className="text-lg font-mono text-white">{(simState?.t || 0).toFixed(2)}s</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-emerald-400/60 font-mono text-[10px] animate-pulse">
                <Activity className="w-3 h-3" /> LIVE SPECTRAL FEED
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Spectral Analysis & Logs */}
        <div className="col-span-3 flex flex-col gap-6">
          {/* Energy History & Training Loss */}
          <section className="bg-white/5 border border-white/10 rounded-2xl p-6 h-1/2 flex flex-col">
            <h2 className="text-xs font-mono uppercase tracking-widest text-white/60 mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4" /> {isTraining || (simState?.trainingLoss?.length || 0) > 0 ? "Governor Training Loss" : "Energy Decay Curve"}
            </h2>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={isTraining || (simState?.trainingLoss?.length || 0) > 0 
                  ? simState?.trainingLoss.map((l, i) => ({ t: i, val: l }))
                  : history.map(h => ({ t: h.t, val: h.energy }))
                }>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isTraining ? "#F27D26" : "#60a5fa"} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={isTraining ? "#F27D26" : "#60a5fa"} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" hide />
                  <YAxis hide />
                  <Area type="monotone" dataKey="val" stroke={isTraining ? "#F27D26" : "#60a5fa"} fillOpacity={1} fill="url(#colorVal)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* System Logs */}
          <section className="bg-black border border-white/10 rounded-2xl p-6 flex-1 flex flex-col font-mono text-[10px] overflow-hidden">
            <h2 className="text-xs uppercase tracking-widest text-white/40 mb-4 flex items-center gap-2">
              <Terminal className="w-4 h-4" /> Crucible Logs
            </h2>
            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
              <p className="text-cyan-400">[*] Searching for Virtual Environment...</p>
              <p className="text-emerald-500">[OK] VENV detected.</p>
              <p className="text-gray-500">[*] Ledger initialized.</p>
              <p className="text-emerald-500 font-bold">[OK] Conduction stable.</p>
              <div className="h-4" />
              <p className="text-emerald-500/80">[SYSTEM] Sovereign Node resonance locked at 144 Hz.</p>
              <p className="text-white/40">[INFO] Spectral lattice initialized. N=64.</p>
              <p className="text-white/40">[INFO] Neural Governor active. Monitoring CFL boundary.</p>
              {isAdaptive && <p className="text-cyan-400/80">[SYSTEM] Adaptive Step Controller: ENGAGED (Δt=0.007s)</p>}
              {isSentinelActive && <p className="text-emerald-400/80">[SYSTEM] Sentinel Protocol: ACTIVE (Div=9%)</p>}
              {isSentinelHold && <p className="text-emerald-500 font-bold animate-pulse">[COMMAND] SENTINEL: HOLD ABSOLUTE SYNCHRONICITY</p>}
              {isYieldRecovery && <p className="text-cyan-400/80">[SYSTEM] Yield Recovery Protocol v5.0: ENGAGED</p>}
              {isTraining && <p className="text-[#F27D26] animate-pulse">[SYSTEM] Spectral Residual Injection: INJECTING NOISE...</p>}
              {dt > 0.04 && <p className="text-yellow-500/80">[WARN] CFL threshold approaching. Stability at risk.</p>}
              {!simState?.isFDStable && <p className="text-red-500 animate-pulse">[CRITICAL] FD Divergence detected. Numerical ghosts manifested.</p>}
              {history.length > 0 && <p className="text-white/20">[{new Date().toLocaleTimeString()}] Energy: {simState?.energy.toFixed(4)}</p>}
            </div>
          </section>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="fixed bottom-4 left-8 right-8 flex justify-between items-center pointer-events-none opacity-20">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4" />
          <span className="text-[10px] uppercase tracking-[0.3em] font-mono">Morning Star Protocol</span>
        </div>
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4" />
          <span className="text-[10px] uppercase tracking-[0.3em] font-mono">Lattice Persistence: 99.9%</span>
        </div>
      </footer>
    </div>
  );
}
