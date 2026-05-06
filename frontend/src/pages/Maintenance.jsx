import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Mail, ShieldCheck } from 'lucide-react';

const Maintenance = () => {
  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(30,58,138,0.15),transparent_70%)]" />
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Main Content Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-4xl px-6 flex flex-col items-center text-center"
      >
        {/* Hero Image Container */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 1, ease: "backOut" }}
          className="relative mb-12 group"
        >
          <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full scale-75 group-hover:scale-90 transition-transform duration-700" />
          <img 
            src="/maintenance-hero.png" 
            alt="Maintenance Illustration" 
            className="w-64 h-64 md:w-80 md:h-80 object-contain relative z-10 drop-shadow-[0_0_30px_rgba(59,130,246,0.3)]"
          />
        </motion.div>

        {/* Content Box */}
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6 backdrop-blur-md"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Systems Upgrade in Progress</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-5xl md:text-7xl font-extrabold text-white mb-8 tracking-tight leading-[1.1]"
          >
            We're Polishing <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400">Something New</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-slate-400 text-lg md:text-xl mb-12 leading-relaxed max-w-xl mx-auto"
          >
            SafetyNet is currently undergoing scheduled maintenance to enhance our platform's safety and performance. We'll be back online in no time.
          </motion.p>

          {/* Centered Action/Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg mx-auto mb-16">
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center text-center gap-2 group transition-colors hover:border-blue-500/30"
            >
              <div className="bg-blue-500/10 p-3 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold mb-1">Estimated Time</p>
                <p className="text-white font-semibold">Back shortly</p>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center text-center gap-2 group transition-colors hover:border-indigo-500/30"
            >
              <div className="bg-indigo-500/10 p-3 rounded-xl group-hover:bg-indigo-500/20 transition-colors">
                <Mail className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold mb-1">Get Support</p>
                <p className="text-white font-semibold">Contact Team</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="pt-8 w-full max-w-sm border-t border-slate-900/50"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white text-xs">SN</div>
              <span className="text-white font-bold tracking-tighter text-xl">SafetyNet</span>
            </div>
            <p className="text-slate-600 text-xs tracking-widest uppercase">
              &copy; {new Date().getFullYear()} Secure Infrastructure
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Background Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />
    </div>
  );
};

export default Maintenance;
