import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../components/utils';
import { ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const slides = [
  {
    title: "Your call, exactly when you need it.",
    subtitle: "Schedule short AI calls to yourself to create perfect timing.",
    visual: "call-incoming"
  },
  {
    title: "Set the time, pick the vibe.",
    subtitle: "Choose how soon, who's calling, and what it's about.",
    visual: "schedule-ui"
  },
  {
    title: "Built for TikTok moments.",
    subtitle: "Screen-record your setups and share them with your friends.",
    visual: "tiktok-ready"
  }
];

const VisualMockup = ({ type }) => {
  if (type === "call-incoming") {
    return (
      <div className="relative w-64 h-96 mx-auto">
        <div className="absolute inset-0 bg-gradient-to-b from-red-500/20 via-transparent to-transparent blur-3xl" />
        <div className="relative bg-zinc-900 rounded-[3rem] border-2 border-zinc-800 p-4 shadow-2xl">
          <div className="bg-black rounded-[2.5rem] h-full flex flex-col items-center justify-center p-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center mb-6 shadow-lg shadow-red-500/50">
              <div className="text-4xl">📞</div>
            </div>
            <h3 className="text-2xl font-bold mb-2 text-white">QueOut</h3>
            <p className="text-zinc-400 text-sm mb-8">Incoming call...</p>
            <div className="flex gap-4 mt-auto">
              <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/50">
                <div className="text-2xl">📱</div>
              </div>
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
                <div className="text-2xl">❌</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (type === "schedule-ui") {
    return (
      <div className="relative w-72 mx-auto">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 via-transparent to-orange-500/20 blur-3xl" />
        <div className="relative bg-zinc-900/50 backdrop-blur-xl rounded-3xl border border-red-500/30 p-6 shadow-2xl">
          <div className="flex gap-2 mb-4">
            <div className="flex-1 bg-red-500 text-white rounded-full py-2 px-4 text-sm font-semibold text-center shadow-lg shadow-red-500/30">
              Now
            </div>
            <div className="flex-1 bg-zinc-800 text-zinc-400 rounded-full py-2 px-4 text-sm font-semibold text-center">
              3 min
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {['Manager', 'Friend', 'Service', 'Mom'].map((persona, i) => (
              <div 
                key={persona}
                className={`${i === 0 ? 'bg-red-500/20 border-red-500' : 'bg-zinc-800 border-zinc-700'} border rounded-2xl p-3 text-center`}
              >
                <div className="w-10 h-10 rounded-full bg-zinc-700 mx-auto mb-2 flex items-center justify-center text-lg">
                  {['💼', '💬', '🔔', '❤️'][i]}
                </div>
                <p className="text-xs font-medium text-white">{persona}</p>
              </div>
            ))}
          </div>
          <div className="bg-zinc-800/50 rounded-2xl p-3 text-xs text-zinc-500">
            Call context...
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative w-64 mx-auto">
      <div className="absolute inset-0 bg-gradient-to-b from-red-500/20 via-transparent to-transparent blur-3xl" />
      <div className="relative bg-zinc-900 rounded-3xl border border-zinc-800 p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-600" />
          <div className="flex-1">
            <div className="h-2 bg-zinc-700 rounded w-20 mb-1" />
            <div className="h-2 bg-zinc-800 rounded w-32" />
          </div>
        </div>
        <div className="bg-black rounded-2xl aspect-[9/16] mb-3 flex items-center justify-center text-4xl">
          📱
        </div>
        <div className="flex gap-2 text-xs text-zinc-500">
          <span>❤️ 1.2k</span>
          <span>💬 89</span>
          <span>↗️ 45</span>
        </div>
      </div>
    </div>
  );
};

export default function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate(createPageUrl('Auth'));
    }
  };

  const handleSkip = () => {
    navigate(createPageUrl('Auth'));
  };

  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="fixed inset-0 bg-gradient-to-b from-red-950/20 via-black to-black" />
      
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center w-full"
          >
            <div className="mb-12">
              <VisualMockup type={slides[currentSlide].visual} />
            </div>

            <h1 className="text-3xl font-bold mb-4 leading-tight max-w-sm text-white">
              {slides[currentSlide].title}
            </h1>

            <p className="text-zinc-400 text-lg leading-relaxed max-w-md">
              {slides[currentSlide].subtitle}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-2 mt-12">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'w-8 bg-red-500' 
                  : 'w-2 bg-zinc-700'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="relative px-6 pb-12 space-y-4">
        <button
          onClick={handleNext}
          className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold text-base py-5 rounded-full shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 transition-all duration-200 active:scale-95"
        >
          {isLastSlide ? 'Start with 2 free AI calls' : 'Continue'}
          <ChevronRight className="w-5 h-5" />
        </button>
        
        <button
          onClick={handleSkip}
          className="w-full text-zinc-400 text-sm py-2"
        >
          Skip
        </button>
      </div>
    </div>
  );
}