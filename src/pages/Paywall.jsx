import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../components/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Check, Phone, Users, MessageSquare, Sparkles } from 'lucide-react';
import FeatureDetailModal from '../components/FeatureDetailModal';

const featuresList = [
  {
    id: 'calls',
    icon: Phone,
    title: "20 Calls/Month",
    description: "Top up anytime",
    color: "from-yellow-500 to-orange-500",
    longDescription: "Get 20 AI calls every month to use however you like. Need more? You can easily top up your balance at any time to keep the conversation going.",
    graphicType: "phone"
  },
  {
    id: 'personas',
    icon: Users,
    title: "All Personas",
    description: "Full access",
    color: "from-blue-500 to-cyan-500",
    longDescription: "Unlock our entire library of diverse personas. Whether you need a professional mentor, a friendly chat, or a specific roleplay scenario, you'll have access to everyone.",
    graphicType: "users"
  },
  {
    id: 'voices',
    icon: Sparkles,
    title: "Hyper-Realistic Voices",
    description: "Best voice model yet",
    color: "from-purple-500 to-pink-500",
    longDescription: "Experience our most advanced voice technology. These voices are indistinguishable from human speech, featuring natural pauses, breaths, and emotional intonation.",
    graphicType: "waves"
  },
  {
    id: 'texting',
    icon: MessageSquare,
    title: "Unlimited Texting",
    description: "Chat anytime",
    color: "from-green-500 to-emerald-500",
    longDescription: "Prefer typing? Enjoy unlimited text conversations with any persona. Perfect for quick questions, ongoing roleplays, or when you can't talk out loud.",
    graphicType: "chat"
  }
];

const features = {
  free: [
    { text: '2 AI calls total', included: true },
    { text: 'Basic persona only', included: true },
    { text: 'Standard call speed', included: false },
    { text: 'All personas', included: false },
    { text: 'Priority support', included: false },
  ],
  plus: [
    { text: 'Up to 20 calls per month', included: true },
    { text: 'Unlimited texting', included: true },
    { text: 'All personas & hyper-realistic voices', included: true },
    { text: 'Ultra-realistic voices', included: true },
    { text: 'Priority call speed', included: true },
    { text: 'Priority support', included: true },
  ],
};

export default function Paywall() {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [selectedFeature, setSelectedFeature] = useState(null);
  const navigate = useNavigate();

  const pricing = {
    monthly: { price: '$9.99', period: '/ month', savings: null },
    yearly: { price: '$89.99', period: '/ year', savings: 'Save $30' }
  };

  return (
    <div className="min-h-full bg-black px-6 py-6 overflow-y-auto">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-red-600/20 via-purple-600/10 to-transparent blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-500/20 blur-3xl rounded-full" />
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-purple-500/20 blur-3xl rounded-full" />
      </div>
      
      <div className="relative w-full max-w-lg mx-auto pb-12">
        <AnimatePresence>
          {selectedFeature && (
            <FeatureDetailModal 
              feature={selectedFeature} 
              onClose={() => setSelectedFeature(null)} 
            />
          )}
        </AnimatePresence>

        <button
          onClick={() => navigate(-1)}
          className="mb-4 p-2 hover:bg-zinc-900 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500/20 to-purple-500/20 border border-red-500/30 rounded-full mb-4">
            <Crown className="w-4 h-4 text-red-400" />
            <span className="text-red-400 font-semibold text-sm">QueOut Plus</span>
          </div>

          <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-white via-red-200 to-purple-200 bg-clip-text text-transparent">
            Go beyond the basics.
          </h1>
          <p className="text-base text-zinc-400">
            More calls. More personas. More control.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 mb-6 bg-zinc-900/50 rounded-full p-1 border border-zinc-800"
        >
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`flex-1 py-2.5 px-4 rounded-full font-semibold text-sm transition-all ${
              billingCycle === 'monthly'
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                : 'text-zinc-400'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`flex-1 py-2.5 px-4 rounded-full font-semibold text-sm transition-all relative ${
              billingCycle === 'yearly'
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                : 'text-zinc-400'
            }`}
          >
            Yearly
            {pricing.yearly.savings && (
              <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-green-500 text-white text-[9px] font-bold rounded-full">
                {pricing.yearly.savings}
              </span>
            )}
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative mb-6"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/30 to-purple-500/30 blur-3xl" />
          <div className="relative bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-5">
            <div className="grid grid-cols-2 gap-3">
              {featuresList.map((feature) => (
                <FeatureHighlight
                  key={feature.id}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  color={feature.color}
                  onClick={() => setSelectedFeature(feature)}
                />
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-3 mb-6"
        >
          <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4">
            <h3 className="font-bold text-base mb-1 text-white">Free</h3>
            <p className="text-xs text-zinc-400 mb-3">Try it out</p>
            <ul className="space-y-2">
              {features.free.slice(0, 3).map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-[10px]">
                  {feature.included ? (
                    <Check className="w-3.5 h-3.5 text-zinc-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 border border-zinc-700 rounded-full mt-0.5 flex-shrink-0" />
                  )}
                  <span className={feature.included ? 'text-zinc-300' : 'text-zinc-600'}>
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative bg-gradient-to-br from-red-500/20 to-purple-500/20 border-2 border-red-500/50 rounded-2xl p-4">
            <div className="absolute top-0 right-0 px-2 py-0.5 bg-red-500 rounded-bl-xl rounded-tr-xl text-[9px] font-bold text-white">
              Popular
            </div>
            <h3 className="font-bold text-base mb-1 text-white">Plus</h3>
            <p className="text-xs text-zinc-400 mb-3">Full power</p>
            <ul className="space-y-2">
              {features.plus.slice(0, 3).map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-[10px]">
                  <Check className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                  <span className="text-white">{feature.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-center mb-6"
        >
          <div className="flex items-baseline justify-center gap-2 mb-1">
            <span className="text-4xl font-bold text-white">{pricing[billingCycle].price}</span>
            <span className="text-base text-zinc-400">{pricing[billingCycle].period}</span>
          </div>
          <p className="text-xs text-zinc-500">
            {billingCycle === 'yearly' ? 'Billed annually' : 'Cancel anytime'}. Billed through Apple ID.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <button className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold text-base py-4 rounded-full shadow-lg shadow-red-500/40 transition-all duration-200 active:scale-95">
            Continue with Plus
          </button>
          
          <button
            onClick={() => navigate(-1)}
            className="w-full text-zinc-400 hover:text-white font-medium py-2 transition-colors text-sm"
          >
            Keep Free Plan
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-[10px] text-zinc-600 text-center mt-4 leading-relaxed"
        >
          By continuing, you agree to the subscription terms.
          <br />
          Cancel anytime in Settings.
        </motion.p>
      </div>
    </div>
  );
}

function FeatureHighlight({ icon: Icon, title, description, color, onClick }) {
  return (
    <button 
      onClick={onClick}
      className="relative group w-full text-left"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300 rounded-2xl`} />
      <div className="relative bg-zinc-800/50 rounded-2xl p-3 border border-zinc-700/50 group-hover:border-zinc-600 transition-all duration-200 h-full">
        <div className={`w-8 h-8 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-2 shadow-lg`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <h4 className="font-semibold text-xs mb-0.5 text-white">{title}</h4>
        <p className="text-[10px] text-zinc-400">{description}</p>
      </div>
    </button>
  );
}