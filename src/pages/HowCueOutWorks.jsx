import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Phone, Clock, Users, Zap, Star, Shield } from 'lucide-react';

const sections = [
  {
    icon: Phone,
    title: 'What is CueOut?',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    content:
      'CueOut is a smart call scheduling app that lets you set up realistic-sounding phone calls to arrive at exactly the right moment. Whether you need an exit from an awkward situation, a reminder during a meeting, or a confidence boost — CueOut has you covered.',
  },
  {
    icon: Clock,
    title: 'Scheduling a Call',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    content:
      'Tap the schedule button on the Home screen and choose when you want the call to come in — from 1 minute to several hours from now. You can also use Quick Presets for your most-used timings so you can schedule a call in seconds.',
  },
  {
    icon: Users,
    title: 'Personas',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    content:
      'Choose from a variety of AI personas to customize who is calling you. Each persona has a unique voice and personality. You can configure persona-specific settings like background sounds, tone, and custom phrases in the Persona Settings screen.',
  },
  {
    icon: Zap,
    title: 'Quick Presets',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    content:
      'Save your favourite call configurations as Quick Presets so you can repeat them instantly. Access presets from the History screen. Each preset stores the persona, timing, context note, and caller ID so your call is ready to go in one tap.',
  },
  {
    icon: Star,
    title: 'Caller IDs',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    content:
      'CueOut uses a set of preset caller IDs that appear on your screen when the call comes in. You can give each one a custom name from Account → Manage Caller IDs, so the incoming call looks even more believable.',
  },
  {
    icon: Shield,
    title: 'Your Privacy',
    color: 'text-zinc-400',
    bg: 'bg-zinc-800/50',
    border: 'border-zinc-700',
    content:
      'Your data is stored securely and is never sold to third parties. Call logs are kept only to improve your experience and can be deleted at any time from the History screen. See our Privacy Policy for full details.',
  },
];

export default function HowCueOutWorks() {
  const navigate = useNavigate();

  useEffect(() => { document.getElementById('scroll-container')?.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-full bg-black">
      {/* Header */}
      <div className="sticky top-0 z-10 pt-safe bg-black/80 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-bold text-white">How CueOut Works</h1>
        </div>
      </div>

      <div className="px-5 pt-6 pb-12 max-w-lg mx-auto space-y-4">
        {sections.map(({ icon: Icon, title, color, bg, border, content }) => (
          <div
            key={title}
            className={`rounded-2xl border p-5 ${bg} ${border}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-xl ${bg} border ${border}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <h2 className="font-semibold text-white text-base">{title}</h2>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">{content}</p>
          </div>
        ))}

        <p className="text-center text-xs text-zinc-600 pt-4">
          {/* Content coming soon — this is placeholder text. */}
        </p>
      </div>
    </div>
  );
}
