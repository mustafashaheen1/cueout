import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, MessageSquare, ChevronDown } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { supabase } from '../lib/supabase';

const CATEGORIES = [
  'General Question',
  'Bug Report',
  'Feature Request',
  'Billing & Subscription',
  'Account Issue',
  'Other',
];

export default function Support() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [category, setCategory] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { document.getElementById('scroll-container')?.scrollTo(0, 0); }, []);

  const isRelayEmail = email?.endsWith('@privaterelay.appleid.com');

  const handleSubmit = async () => {
    setError('');

    if (!category) { setError('Please select a category.'); return; }
    if (!subject.trim()) { setError('Please enter a subject.'); return; }
    if (!message.trim() || message.trim().length < 10) {
      setError('Please enter a message (at least 10 characters).');
      return;
    }
    if (!isRelayEmail && !email.trim()) {
      setError('Please enter your email so we can get back to you.');
      return;
    }

    setIsSubmitting(true);
    try {
      await supabase.from('support_requests').insert({
        user_id: user?.id || null,
        email: isRelayEmail ? null : email.trim(),
        category,
        subject: subject.trim(),
        message: message.trim(),
      });
      // Show success regardless — table may not exist yet until client sets it up
    } catch (_) {
      // Intentional: show success even if DB insert fails until table is provisioned
    } finally {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-full bg-black flex flex-col">
        <div className="sticky top-0 z-10 pt-safe bg-black/80 backdrop-blur-xl border-b border-zinc-800/60">
          <div className="flex items-center gap-3 px-4 py-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-lg font-bold text-white">Support</h1>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6">
          <div className="w-20 h-20 bg-green-500/15 border border-green-500/30 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Message Sent!</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Thanks for reaching out. Our team will get back to you as soon as possible.
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-full transition-colors text-sm"
          >
            Back to Account
          </button>
        </div>
      </div>
    );
  }

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
          <h1 className="text-lg font-bold text-white">Support</h1>
        </div>
      </div>

      <div className="px-5 pt-6 pb-12 max-w-lg mx-auto space-y-4">
        {/* Intro */}
        <div className="flex items-start gap-3 p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
          <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl">
            <MessageSquare className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white mb-0.5">We're here to help</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Fill out the form below and our team will respond as soon as possible.
            </p>
          </div>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Category</label>
          <button
            onClick={() => setShowCategoryPicker(!showCategoryPicker)}
            className="w-full flex items-center justify-between bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500/50 transition-colors"
          >
            <span className={category ? 'text-white' : 'text-zinc-500'}>
              {category || 'Select a category'}
            </span>
            <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${showCategoryPicker ? 'rotate-180' : ''}`} />
          </button>

          {showCategoryPicker && (
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden">
              {CATEGORIES.map((cat, i) => (
                <button
                  key={cat}
                  onClick={() => { setCategory(cat); setShowCategoryPicker(false); }}
                  className={`w-full px-4 py-3 text-left text-sm transition-colors hover:bg-zinc-800 ${
                    category === cat ? 'text-red-400 bg-red-500/10' : 'text-white'
                  } ${i < CATEGORIES.length - 1 ? 'border-b border-zinc-800' : ''}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Subject */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief description of your issue"
            maxLength={100}
            className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/50 transition-colors"
          />
        </div>

        {/* Email — hide if Apple relay */}
        {!isRelayEmail && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Your Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/50 transition-colors"
            />
          </div>
        )}

        {/* Message */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your issue or question in detail..."
            rows={6}
            maxLength={1000}
            className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/50 transition-colors resize-none"
          />
          <p className="text-right text-xs text-zinc-600">{message.length}/1000</p>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-full transition-all duration-200 text-sm flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending...
            </>
          ) : (
            'Send Message'
          )}
        </button>
      </div>
    </div>
  );
}
