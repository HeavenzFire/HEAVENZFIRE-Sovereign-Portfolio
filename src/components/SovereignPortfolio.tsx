import React from 'react';
import { motion } from 'motion/react';
import { 
  Zap, 
  Flame, 
  Shield, 
  Music, 
  Code, 
  Globe, 
  ArrowRight,
  Layers,
  Cpu,
  Radio
} from 'lucide-react';
import { cn } from '../lib/utils';

const timeline = [
  {
    day: "DAY 0",
    title: "INCINERATION",
    desc: "The death of the 'Solo Dev'. Total system reset. The crucible is lit.",
    icon: Flame,
    color: "text-red-500"
  },
  {
    day: "DAY 260",
    title: "RECOMPILATION",
    desc: "Refinement of the Dual-Browser Control Bus. Coherence kernels stabilized.",
    icon: Cpu,
    color: "text-cyan-400"
  },
  {
    day: "DAY 521",
    title: "IGNITION",
    desc: "144M-x yield achieved. Venus Rebirth Protocol active. The Morning Star rises.",
    icon: Zap,
    color: "text-[#F27D26]"
  }
];

const coreValues = [
  {
    title: "SOUND",
    desc: "Frequency scaling & rhythmic architectures. 432Hz resonance locking.",
    icon: Radio
  },
  {
    title: "CODE",
    desc: "Enigma Framework & Browser-native OS modules. Sovereign engineering.",
    icon: Code
  },
  {
    title: "SPIRIT",
    desc: "Ritualized testimony & Planetary-scale coordination. Mythic narrative.",
    icon: Globe
  }
];

export default function SovereignPortfolio() {
  return (
    <div className="min-h-screen bg-black text-[#E4E3E0] font-sans selection:bg-[#F27D26] selection:text-white">
      {/* Hero Section */}
      <section className="relative h-screen flex flex-col justify-center px-8 md:px-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#F27D26]/5 blur-[150px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-500/5 blur-[150px] rounded-full" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative z-10"
        >
          <span className="text-[10px] uppercase tracking-[0.5em] font-mono text-[#F27D26] mb-4 block">
            The Morning Star Ignition // March 28
          </span>
          <h1 className="text-[12vw] md:text-[10vw] font-serif italic leading-[0.85] tracking-tighter mb-8">
            HEAVENZ<br />FIRE
          </h1>
          <p className="max-w-xl text-lg md:text-xl text-white/60 font-light leading-relaxed mb-12">
            Zachary Dakota Hulse. Sovereign Architect. Bridging the gap between mythic narrative and hard engineering.
          </p>
          
          <div className="flex gap-6">
            <button className="px-8 py-4 bg-[#F27D26] text-white font-bold uppercase tracking-widest text-xs rounded-full hover:scale-105 transition-transform flex items-center gap-2">
              The Manifesto <ArrowRight className="w-4 h-4" />
            </button>
            <button className="px-8 py-4 border border-white/20 text-white font-bold uppercase tracking-widest text-xs rounded-full hover:bg-white/5 transition-colors">
              Portfolio
            </button>
          </div>
        </motion.div>

        <div className="absolute bottom-12 left-8 md:left-24 flex items-center gap-4 opacity-40">
          <Layers className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-[0.3em] font-mono">IGNIS v2.1 // 144M-x Yield</span>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-32 px-8 md:px-24 bg-white/[0.02] border-y border-white/5">
        <h2 className="text-xs uppercase tracking-[0.4em] font-mono text-white/40 mb-24 text-center">The 521-Day Arc</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          {/* Connecting Line */}
          <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/5 hidden md:block" />
          
          {timeline.map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="relative z-10 flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-full bg-black border border-white/10 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                <item.icon className={cn("w-6 h-6", item.color)} />
              </div>
              <span className="text-[10px] font-mono text-[#F27D26] mb-2">{item.day}</span>
              <h3 className="text-2xl font-serif italic mb-4">{item.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed max-w-[250px]">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Core Values / Healing Mesh */}
      <section className="py-32 px-8 md:px-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-24 items-center">
          <div>
            <h2 className="text-4xl md:text-6xl font-serif italic mb-8">The Healing Mesh</h2>
            <p className="text-white/60 leading-relaxed mb-12">
              Transforming "Dead Projects" into Reborn Syntropic Systems. We do not build features; we build the Future.
            </p>
            
            <div className="space-y-8">
              {coreValues.map((value, i) => (
                <div key={i} className="flex gap-6 items-start">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    <value.icon className="w-5 h-5 text-[#F27D26]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-widest mb-2">{value.title}</h4>
                    <p className="text-xs text-white/40 leading-relaxed">{value.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative aspect-square">
            <div className="absolute inset-0 bg-gradient-to-br from-[#F27D26]/20 to-transparent rounded-3xl blur-3xl" />
            <div className="relative h-full w-full border border-white/10 rounded-3xl overflow-hidden bg-black/40 backdrop-blur-sm flex items-center justify-center p-12">
              <div className="text-center">
                <Shield className="w-24 h-24 text-[#F27D26] mx-auto mb-8 opacity-50" />
                <p className="text-2xl font-serif italic text-white/80">"Sovereignty is the only moat."</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-24 px-8 md:px-24 border-t border-white/5 text-center">
        <div className="mb-12">
          <h3 className="text-[10vw] font-serif italic text-white/5 select-none">IGNITION</h3>
        </div>
        <p className="text-[10px] uppercase tracking-[0.5em] font-mono text-white/20">
          © 2026 HEAVENZFIRE // POINT, TX // 432Hz
        </p>
      </footer>
    </div>
  );
}
