import React from 'react';
import { motion } from 'framer-motion';
import { Hammer, Settings, Clock, Mail } from 'lucide-react';

const Maintenance = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-2xl w-full px-6 text-center">
        {/* Animated Icon Container */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8 flex justify-center"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 rounded-3xl blur-2xl animate-pulse" />
            <div className="relative bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl">
              <motion.div
                animate={{ 
                  rotate: [0, 10, -10, 0],
                }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Settings className="w-16 h-16 text-blue-500" />
              </motion.div>
              <motion.div
                className="absolute -top-2 -right-2"
                animate={{ 
                  y: [0, -5, 0],
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Hammer className="w-8 h-8 text-indigo-400" />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight"
        >
          Scheduled <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Maintenance</span>
        </motion.h1>

        {/* Description */}
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-slate-400 text-lg md:text-xl mb-12 leading-relaxed"
        >
          We're currently performing some scheduled maintenance to improve your experience. 
          We'll be back online shortly. Thank you for your patience.
        </motion.p>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-4 rounded-2xl flex items-center gap-4 text-left"
          >
            <div className="bg-blue-500/10 p-2 rounded-lg">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Status</p>
              <p className="text-white font-medium">Coming Back Soon</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-4 rounded-2xl flex items-center gap-4 text-left"
          >
            <div className="bg-indigo-500/10 p-2 rounded-lg">
              <Mail className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Support</p>
              <p className="text-white font-medium text-sm truncate">support@safety-net.co.uk</p>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="pt-8 border-t border-slate-900"
        >
          <p className="text-slate-600 text-sm">
            &copy; {new Date().getFullYear()} SafetyNet. All rights reserved.
          </p>
        </motion.div>
      </div>

      {/* Floating particles (simplified) */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            initial={{ 
              x: Math.random() * 100 + "%", 
              y: Math.random() * 100 + "%" 
            }}
            animate={{ 
              y: [null, "-20px", "20px", null],
              opacity: [0.2, 0.5, 0.2]
            }}
            transition={{ 
              duration: 5 + Math.random() * 5, 
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default Maintenance;
