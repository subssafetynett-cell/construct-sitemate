import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Mail, ShieldCheck, Cpu, Code, Server, Terminal } from 'lucide-react';

const Maintenance = () => {
  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(30,58,138,0.1),transparent_70%)]" />
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-cyan-600/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Main Content Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-4xl px-6 flex flex-col items-center text-center"
      >
        {/* Tech Icon Hero Section */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 1, ease: "backOut" }}
          className="relative mb-16"
        >
          {/* Animated Tech Hub */}
          <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center">
            {/* Glowing Rings */}
            <div className="absolute inset-0 border border-blue-500/20 rounded-full animate-[spin_10s_linear_infinite]" />
            <div className="absolute inset-4 border border-indigo-500/20 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
            <div className="absolute inset-8 border border-cyan-500/10 rounded-full animate-[spin_20s_linear_infinite]" />
            
            {/* Central Icon */}
            <div className="relative z-10 bg-slate-900/80 backdrop-blur-2xl border border-slate-800 p-8 rounded-[2.5rem] shadow-[0_0_50px_rgba(59,130,246,0.15)] group hover:border-blue-500/50 transition-colors duration-500">
              <motion.div
                animate={{ 
                  rotate: [0, 360],
                }}
                transition={{ 
                  duration: 20, 
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                <Cpu className="w-16 h-16 md:w-24 md:h-24 text-blue-400 group-hover:text-blue-300 transition-colors" />
              </motion.div>
              
              {/* Floating Orbiting Icons */}
              <motion.div 
                className="absolute -top-4 -right-4 bg-slate-900 border border-slate-800 p-3 rounded-2xl shadow-xl"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <Code className="w-6 h-6 text-indigo-400" />
              </motion.div>
              
              <motion.div 
                className="absolute -bottom-4 -left-4 bg-slate-900 border border-slate-800 p-3 rounded-2xl shadow-xl"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              >
                <Terminal className="w-6 h-6 text-cyan-400" />
              </motion.div>

              <motion.div 
                className="absolute top-1/2 -left-12 -translate-y-1/2 bg-slate-900 border border-slate-800 p-2.5 rounded-xl shadow-xl opacity-50"
                animate={{ x: [0, -5, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Server className="w-5 h-5 text-blue-500" />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Content Box */}
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8 backdrop-blur-md"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Infrastructure Optimization</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-5xl md:text-7xl font-extrabold text-white mb-8 tracking-tight leading-[1.1]"
          >
            Optimizing Our <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400">Technology Stack</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-slate-400 text-lg md:text-xl mb-12 leading-relaxed max-w-xl mx-auto"
          >
            SafetyNet is upgrading its core infrastructure to provide you with a faster, more secure experience. We're tuning our servers and will be back online shortly.
          </motion.p>

          {/* Centered Action/Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg mx-auto mb-16">
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-3 group transition-all duration-300 hover:bg-slate-900/60 hover:border-blue-500/30"
            >
              <div className="bg-blue-500/10 p-3 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold mb-1">Status</p>
                <p className="text-white font-semibold">Tuning Engines</p>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-3 group transition-all duration-300 hover:bg-slate-900/60 hover:border-indigo-500/30"
            >
              <div className="bg-indigo-500/10 p-3 rounded-xl group-hover:bg-indigo-500/20 transition-colors">
                <Mail className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold mb-1">Support</p>
                <p className="text-white font-semibold">contact@safety-net.com</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="pt-8 w-full max-w-md border-t border-slate-900/50"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity duration-500">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-xs">SN</div>
              <span className="text-white font-bold tracking-tighter text-xl">SafetyNet</span>
            </div>
            <p className="text-slate-600 text-[10px] tracking-[0.3em] uppercase">
              Secure &middot; Scalable &middot; Smart
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Background Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_0.5px,transparent_0.5px),linear-gradient(to_bottom,#1e293b_0.5px,transparent_0.5px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />
    </div>
  );
};

export default Maintenance;
