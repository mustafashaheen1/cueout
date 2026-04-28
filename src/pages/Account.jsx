import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../components/AppContext';
import { useAuth } from '../components/AuthContext';
import { createPageUrl } from '../components/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { cancelSubscription } from '../api/subscriptions';
import PullToRefresh from '../components/PullToRefresh';
import InfoModal from '../components/InfoModal';
import {
  User,
  Mail,
  Phone,
  CheckCircle2,
  Crown,
  ChevronRight,
  Bell,
  Sparkles,
  Video,
  Shield,
  HelpCircle,
  LogOut,
  Smartphone,
  Edit2,
  X,
  Volume2,
  AlertTriangle,
  Clock,
  Users,
  Zap,
  Star
} from 'lucide-react';

// ─── How CueOut Works content ─────────────────────────────────────────────────
const HOW_IT_WORKS_SECTIONS = [
  {
    icon: Phone,
    title: 'What is CueOut?',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    content: 'CueOut is a smart call scheduling app that lets you set up realistic-sounding phone calls to arrive at exactly the right moment. Whether you need an exit from an awkward situation, a reminder during a meeting, or a confidence boost — CueOut has you covered.',
  },
  {
    icon: Clock,
    title: 'Scheduling a Call',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    content: 'Tap the schedule button on the Home screen and choose when you want the call to come in — from 1 minute to several hours from now. You can also use Quick Presets for your most-used timings so you can schedule a call in seconds.',
  },
  {
    icon: Users,
    title: 'Personas',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    content: 'Choose from a variety of AI personas to customize who is calling you. Each persona has a unique voice and personality. You can configure persona-specific settings like background sounds, tone, and custom phrases in the Persona Settings screen.',
  },
  {
    icon: Zap,
    title: 'Quick Presets',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    content: 'Save your favourite call configurations as Quick Presets so you can repeat them instantly. Access presets from the History screen. Each preset stores the persona, timing, context note, and caller ID so your call is ready to go in one tap.',
  },
  {
    icon: Star,
    title: 'Caller IDs',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    content: 'CueOut uses a set of preset caller IDs that appear on your screen when the call comes in. You can give each one a custom name from Account → Manage Caller IDs, so the incoming call looks even more believable.',
  },
  {
    icon: Shield,
    title: 'Your Privacy',
    color: 'text-zinc-400',
    bg: 'bg-zinc-800/50',
    border: 'border-zinc-700',
    content: 'Your data is stored securely and is never sold to third parties. Call logs are kept only to improve your experience and can be deleted at any time from the History screen. See our Privacy Policy for full details.',
  },
];

// ─── Privacy Policy content ───────────────────────────────────────────────────
const PRIVACY_SECTIONS = [
  { title: '1. Information We Collect', content: `We collect information you provide directly to us, such as when you create an account, update your profile, or contact us for support. This includes your name, email address, phone number, and any other information you choose to provide.\n\nWe also automatically collect certain information when you use our services, including log data, device information, and usage data such as the features you use and the time spent on the app.` },
  { title: '2. How We Use Your Information', content: `We use the information we collect to:\n\n• Provide, maintain, and improve our services\n• Process transactions and send related information\n• Send you technical notices and support messages\n• Respond to your comments and questions\n• Monitor and analyse usage patterns and trends\n• Detect and prevent fraudulent or abusive activity` },
  { title: '3. Sharing of Information', content: `We do not sell, trade, or otherwise transfer your personal information to outside parties. This does not include trusted third parties who assist us in operating our app, conducting our business, or servicing you, as long as those parties agree to keep this information confidential.\n\nWe may release your information when we believe it is appropriate to comply with the law, enforce our site policies, or protect ours or others' rights, property, or safety.` },
  { title: '4. Data Retention', content: `We retain your personal information for as long as your account is active or as needed to provide you services. You may delete your account at any time, and we will delete your personal information within 30 days of account deletion, except where we are required by law to retain it longer.` },
  { title: '5. Security', content: `We take reasonable measures to help protect your personal information from loss, theft, misuse, and unauthorised access. However, no security system is impenetrable, and we cannot guarantee the security of our systems 100%. In the event of a breach, we will notify you in accordance with applicable law.` },
  { title: "6. Children's Privacy", content: `CueOut is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If we discover that a child under 13 has provided us with personal information, we will promptly delete such information from our servers.` },
  { title: '7. Changes to This Policy', content: `We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date. Your continued use of the app after we make changes indicates your acceptance of those changes.` },
  { title: '8. Contact Us', content: `If you have any questions about this Privacy Policy, please contact us through the Support section of the app or at the contact details provided on our website.` },
];

// ─── Terms of Use content ─────────────────────────────────────────────────────
const TERMS_SECTIONS = [
  { title: '1. Acceptance of Terms', content: `By downloading, installing, or using the CueOut application, you agree to be bound by these Terms of Use. If you do not agree to these terms, do not use the app. We reserve the right to update these terms at any time, and your continued use of the app constitutes acceptance of those changes.` },
  { title: '2. Use of the Service', content: `CueOut is provided for personal, non-commercial use. You agree to use the service only for lawful purposes and in a manner that does not infringe the rights of others. You may not use CueOut to:\n\n• Harass, stalk, or harm any person\n• Impersonate any person or entity\n• Engage in any fraudulent or deceptive activity\n• Violate any applicable local, national, or international law` },
  { title: '3. Account Registration', content: `To use certain features of CueOut you must register for an account. You agree to provide accurate, current, and complete information during registration and to keep your account information up to date. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.` },
  { title: '4. Subscriptions and Billing', content: `CueOut offers both free and paid subscription tiers. Paid subscriptions are billed on a recurring basis through your Apple ID. You can manage or cancel your subscription at any time via iPhone Settings → Apple ID → Subscriptions. Refunds are handled in accordance with Apple's refund policies. We reserve the right to change subscription pricing with reasonable notice.` },
  { title: '5. Intellectual Property', content: `All content, features, and functionality of CueOut — including but not limited to text, graphics, logos, icons, and software — are the exclusive property of CueOut and are protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written consent.` },
  { title: '6. Disclaimer of Warranties', content: `CueOut is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that the service will be uninterrupted, error-free, or free of viruses or other harmful components. Use of the service is at your sole risk.` },
  { title: '7. Limitation of Liability', content: `To the fullest extent permitted by law, CueOut shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the service. Our total liability to you for any claims shall not exceed the amount you paid to us in the twelve months preceding the claim.` },
  { title: '8. Termination', content: `We reserve the right to suspend or terminate your account at any time for any reason, including if we believe you have violated these Terms of Use. Upon termination, your right to use the service will immediately cease. Provisions of these terms that by their nature should survive termination shall survive.` },
  { title: '9. Governing Law', content: `These Terms of Use shall be governed by and construed in accordance with applicable law. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the courts in the applicable jurisdiction.` },
  { title: '10. Contact', content: `If you have any questions about these Terms of Use, please contact us through the Support section of the app.` },
];

export default function Account() {
  const [creatorMode, setCreatorMode] = useState(false);
  const [showWatermark, setShowWatermark] = useState(true);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [tempPhone, setTempPhone] = useState('');
  const [tempEmail, setTempEmail] = useState('');
  const [tempUsername, setTempUsername] = useState('');
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [selectedRingtone, setSelectedRingtone] = useState('Default');
  const [showRingtoneSelector, setShowRingtoneSelector] = useState(false);
  const [showCallerIDEditor, setShowCallerIDEditor] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [infoModal, setInfoModal] = useState(null); // 'how' | 'privacy' | 'terms' | null
  const navigate = useNavigate();
  const { callerIDs, updateCallerIDName, setIsTabBarHidden, subscription, refreshSubscription } = useApp();
  const { user, signOut, checkUser } = useAuth();

  // Detect sign-in method
  const isAppleUser = user?.app_metadata?.provider === 'apple';
  const isRelayEmail = email?.endsWith('@privaterelay.appleid.com');

  const ringtones = ['Default', 'Classic', 'Modern', 'Gentle', 'Urgent'];

  // Ensure tab bar is visible on this page
  useEffect(() => {
    setIsTabBarHidden(false);
  }, [setIsTabBarHidden]);

  // Ensure tab bar shows when modals close
  useEffect(() => {
    if (!showRingtoneSelector && !showCallerIDEditor) {
      setIsTabBarHidden(false);
    }
  }, [showRingtoneSelector, showCallerIDEditor, setIsTabBarHidden]);

  // Only re-fetch subscription if we don't have it yet (AppContext handles initial load)
  useEffect(() => {
    if (!subscription) refreshSubscription().catch(() => {});
  }, []);

  // Load user data from Supabase
  useEffect(() => {
    async function loadUserProfile() {
      if (!user) return;

      setIsLoadingProfile(true);
      try {
        // Get fresh user directly from server (bypasses cached session)
        const { data: { user: freshUser } } = await supabase.auth.getUser();
        setEmail((freshUser?.email || user.email) || '');
        setUsername(freshUser?.user_metadata?.full_name || user.user_metadata?.full_name || '');

        // Fetch user profile from users table
        const { data: profile, error } = await supabase
          .from('users')
          .select('phone_number, country_code')
          .eq('id', user.id)
          .single();

        if (!error && profile?.phone_number) {
          const formatted = formatPhoneNumber(profile.phone_number, profile.country_code);
          setPhoneNumber(formatted);
          setTempPhone(formatted);
        }
      } finally {
        setIsLoadingProfile(false);
      }
    }

    loadUserProfile();
  }, [user]);

  // Helper to format phone number
  const formatPhoneNumber = (phone, countryCode = '+1') => {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');

    // Format for US/Canada numbers (10 digits)
    if (digits.length === 10) {
      return `${countryCode} (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    // Return with country code for other formats
    return `${countryCode} ${phone}`;
  };

  const handleUpgrade = () => {
    navigate(createPageUrl('Paywall'));
  };

  const handleSavePhone = () => {
    setPhoneNumber(tempPhone);
    setIsEditingPhone(false);
  };

  const handleSaveEmail = async () => {
    const trimmed = tempEmail.trim().toLowerCase();
    if (!trimmed) { setEmailError('Email cannot be empty'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setEmailError('Enter a valid email address'); return; }
    if (trimmed === email.toLowerCase()) { setIsEditingEmail(false); return; }

    setIsSavingEmail(true);
    setEmailError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ newEmail: trimmed }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update email.');

      setEmail(trimmed);
      setEmailSuccess('Email updated successfully.');
      setIsEditingEmail(false);
      setTimeout(() => setEmailSuccess(''), 4000);
      // Refresh global AuthContext user so user.email reflects the new address
      // everywhere (e.g. Home.jsx uses user.email as recipientEmail for scheduled emails)
      checkUser().catch(() => {});
    } catch (err) {
      setEmailError(err.message || 'Failed to update email. Try again.');
      console.error('Error updating email:', err);
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleSaveUsername = async () => {
    const trimmed = tempUsername.trim();
    if (!trimmed) {
      setUsernameError('Name cannot be empty');
      return;
    }
    setIsSavingUsername(true);
    setUsernameError('');
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: trimmed }
      });
      if (error) throw error;
      setUsername(trimmed);
      setIsEditingUsername(false);
    } catch (err) {
      setUsernameError('Failed to save. Try again.');
      console.error('Error saving username:', err);
    } finally {
      setIsSavingUsername(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-full bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-zinc-700 border-t-red-500 rounded-full animate-spin" />
        <p className="text-zinc-500 text-sm">Loading your account...</p>
      </div>
    );
  }

  const handleRefresh = async () => {
    await refreshSubscription().catch(() => {});
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-full bg-black px-6 pt-safe pb-safe overflow-x-hidden">
      <div className="fixed inset-0 bg-gradient-to-b from-red-950/10 via-black to-black pointer-events-none" />

      <div className="relative w-full max-w-lg mx-auto pb-12 pt-6 overflow-x-hidden">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-1">Account</h1>
          <p className="text-zinc-400 text-sm">Manage your CueOut experience</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 mb-4"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 flex-shrink-0 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
              {(username || email || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              {/* Username row */}
              {!isEditingUsername ? (
                <div className="flex items-center gap-2 mb-1 min-w-0">
                  <h3 className={`font-semibold text-base truncate ${username ? 'text-white' : 'text-zinc-500'}`}>
                    {username || 'Add your name'}
                  </h3>
                  <button
                    onClick={() => { setTempUsername(username); setUsernameError(''); setIsEditingUsername(true); }}
                    className="p-1 hover:bg-zinc-800 rounded transition-colors flex-shrink-0"
                  >
                    <Edit2 className="w-3 h-3 text-zinc-500" />
                  </button>
                </div>
              ) : (
                <div className="mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="text"
                      value={tempUsername}
                      onChange={(e) => { setTempUsername(e.target.value); setUsernameError(''); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveUsername(); if (e.key === 'Escape') setIsEditingUsername(false); }}
                      className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-red-500/50"
                      placeholder="Your name"
                      maxLength={40}
                      autoFocus
                    />
                    <button
                      onClick={handleSaveUsername}
                      disabled={isSavingUsername}
                      className="p-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded transition-colors flex-shrink-0"
                    >
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </button>
                    <button
                      onClick={() => { setIsEditingUsername(false); setUsernameError(''); }}
                      className="p-1 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors flex-shrink-0"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                  {usernameError && <p className="text-[10px] text-red-400 mt-1">{usernameError}</p>}
                </div>
              )}
              <div className="text-xs text-zinc-400 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                  {!isEditingEmail ? (
                    <>
                      <span className="truncate min-w-0 flex-1">
                        {isRelayEmail ? 'Apple private email' : email}
                      </span>
                      {isAppleUser ? (
                        <span className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 bg-zinc-800 rounded text-[9px] text-zinc-400 border border-zinc-700">
                          <img src="/appleLogo.png" alt="Apple" className="w-2.5 h-2.5 opacity-60" />
                          Apple
                        </span>
                      ) : (
                        <button
                          onClick={() => { setTempEmail(email); setEmailError(''); setEmailSuccess(''); setIsEditingEmail(true); }}
                          className="p-1 hover:bg-zinc-800 rounded transition-colors flex-shrink-0"
                        >
                          <Edit2 className="w-3 h-3 text-zinc-500" />
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <input
                        type="email"
                        value={tempEmail}
                        onChange={(e) => { setTempEmail(e.target.value); setEmailError(''); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEmail(); if (e.key === 'Escape') setIsEditingEmail(false); }}
                        className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-red-500/50"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveEmail}
                        disabled={isSavingEmail}
                        className="p-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded transition-colors flex-shrink-0"
                      >
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </button>
                      <button
                        onClick={() => { setIsEditingEmail(false); setEmailError(''); }}
                        className="p-1 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors flex-shrink-0"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  )}
                </div>
                {emailError && <p className="text-[10px] text-red-400 mt-1 ml-5">{emailError}</p>}
                {emailSuccess && <p className="text-[10px] text-green-400 mt-1 ml-5">{emailSuccess}</p>}
                {isRelayEmail && (
                  <p className="text-[10px] text-zinc-600 mt-1 ml-5">Managed by Apple</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm pt-4 border-t border-zinc-800">
            <Phone className="w-4 h-4 text-zinc-400" />
            {!phoneNumber ? (
              <button
                onClick={() => navigate(createPageUrl('PhoneVerification'))}
                className="flex-1 text-left text-red-400 hover:text-red-300 transition-colors text-sm font-medium"
              >
                Add phone number
              </button>
            ) : !isEditingPhone ? (
              <>
                <span className="flex-1 text-zinc-300">{phoneNumber}</span>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <button
                  onClick={() => navigate(createPageUrl('PhoneVerification'))}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              </>
            ) : (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="tel"
                  value={tempPhone}
                  onChange={(e) => setTempPhone(e.target.value)}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-red-500/50"
                  autoFocus
                />
                <button
                  onClick={handleSavePhone}
                  className="p-1.5 bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => setIsEditingPhone(false)}
                  className="p-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            )}
          </div>
          
          <button
            onClick={() => setShowCallerIDEditor(true)}
            className="w-full flex items-center gap-2 text-sm pt-4 mt-4 border-t border-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <Phone className="w-4 h-4" />
            <span className="flex-1 text-left">Manage Caller IDs</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 mb-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-5 h-5 text-red-400" />
            <h3 className="font-semibold text-base text-white">Your Plan</h3>
          </div>

          <div className="mb-4 p-3 bg-zinc-800/50 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-xs">Current Plan</span>
              {subscription?.tier === 'plus' ? (
                <span className="px-2.5 py-1 bg-gradient-to-r from-red-500 to-red-600 rounded-full text-xs font-bold text-white">Plus</span>
              ) : (
                <span className="px-2.5 py-1 bg-zinc-700 rounded-full text-xs font-semibold text-white">Free</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-xs">Calls remaining</span>
              <span className={`font-semibold text-sm ${
                !subscription || subscription.calls_remaining === 0
                  ? 'text-red-400'
                  : subscription.calls_remaining <= 3
                  ? 'text-yellow-400'
                  : 'text-green-400'
              }`}>
                {subscription
                  ? `${subscription.calls_remaining} of ${subscription.calls_limit} left`
                  : '—'}
              </span>
            </div>

            {subscription?.calls_limit > 0 && (
              <div className="w-full h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    subscription.calls_remaining === 0
                      ? 'bg-red-500'
                      : subscription.calls_remaining <= 3
                      ? 'bg-yellow-400'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${(subscription.calls_remaining / subscription.calls_limit) * 100}%` }}
                />
              </div>
            )}

            {subscription?.expires_at && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-xs">
                  {subscription.auto_renew ? 'Renews' : 'Expires'}
                </span>
                <span className="text-zinc-300 text-xs">
                  {new Date(subscription.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            )}
          </div>

          {subscription?.tier === 'plus' ? (
            showCancelConfirm ? (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300 leading-relaxed">
                    To cancel, go to iPhone Settings → Apple ID → Subscriptions → CueOut.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      cancelSubscription();
                      setShowCancelConfirm(false);
                    }}
                    className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-full transition-all"
                  >
                    Open Settings
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-semibold rounded-full transition-all"
                  >
                    Keep Plus
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="w-full text-zinc-500 hover:text-zinc-300 text-xs py-2 transition-colors"
              >
                Cancel subscription
              </button>
            )
          ) : (
            <button
              onClick={handleUpgrade}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 rounded-full transition-all duration-200 flex items-center justify-center gap-2 text-sm"
            >
              <Crown className="w-4 h-4" />
              <span>Upgrade to Plus</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </motion.div>

        {/* <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 mb-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Video className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold text-base text-white">Creator Mode</h3>
          </div>

          <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
            Optimizes UI for screen recording and adds optional watermark.
          </p>

          <div className="flex items-center justify-between mb-3 p-3 bg-zinc-800/50 rounded-xl">
            <span className="font-medium text-sm text-white">Enable Creator Mode</span>
            <button
              onClick={() => setCreatorMode(!creatorMode)}
              className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
                creatorMode ? 'bg-red-500' : 'bg-zinc-700'
              }`}
            >
              <motion.div
                initial={false}
                animate={{ x: creatorMode ? 20 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-1 w-5 h-5 bg-white rounded-full shadow"
              />
            </button>
          </div>

          {creatorMode && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl">
                  <span className="text-xs font-medium text-white">Show CueOut watermark</span>
                  <button
                    onClick={() => setShowWatermark(!showWatermark)}
                    className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
                      showWatermark ? 'bg-red-500' : 'bg-zinc-700'
                    }`}
                  >
                    <motion.div
                      initial={false}
                      animate={{ x: showWatermark ? 20 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="absolute top-1 w-5 h-5 bg-white rounded-full shadow"
                    />
                  </button>
                </div>

                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 mt-0.5" />
                    <div className="text-[10px] text-purple-300 leading-relaxed">
                      <strong>Tip:</strong> Best recorded in portrait mode with sound on!
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </motion.div> */}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl overflow-hidden mb-4"
        >
          <button
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className="w-full flex items-center gap-3 p-4 hover:bg-zinc-800/50 transition-colors border-b border-zinc-800"
          >
            <Bell className="w-5 h-5 text-zinc-400" />
            <span className="flex-1 text-left font-medium text-sm text-white">Notifications</span>
            <div className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
              notificationsEnabled ? 'bg-green-500' : 'bg-zinc-700'
            }`}>
              <motion.div
                initial={false}
                animate={{ x: notificationsEnabled ? 20 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-1 w-5 h-5 bg-white rounded-full shadow"
              />
            </div>
          </button>
          
          {/* <button
            onClick={() => setShowRingtoneSelector(true)}
            className="w-full flex items-center gap-3 p-4 hover:bg-zinc-800/50 transition-colors"
          >
            <Smartphone className="w-5 h-5 text-zinc-400" />
            <span className="flex-1 text-left font-medium text-sm text-white">Ringtone & Vibration</span>
            <span className="text-xs text-zinc-400">{selectedRingtone}</span>
            <ChevronRight className="w-5 h-5 text-zinc-600" />
          </button> */}


        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl overflow-hidden mb-4"
        >
          <SettingsItem
            icon={HelpCircle}
            label="How CueOut works"
            onClick={() => setInfoModal('how')}
          />
          <SettingsItem
            icon={Shield}
            label="Privacy Policy"
            onClick={() => setInfoModal('privacy')}
          />
          <SettingsItem
            icon={Shield}
            label="Terms of Use"
            onClick={() => setInfoModal('terms')}
          />
          <SettingsItem
            icon={Mail}
            label="Support"
            onClick={() => navigate(createPageUrl('Support'))}
            last
          />
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={async () => {
            try {
              await signOut();
              navigate(createPageUrl('Auth'));
            } catch (error) {
              console.error('Sign out error:', error);
              alert('Failed to sign out. Please try again.');
            }
          }}
          className="w-full bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 hover:border-red-500/30 rounded-2xl p-4 transition-all duration-200 flex items-center justify-center gap-2 text-red-400 font-semibold text-sm"
        >
          <LogOut className="w-5 h-5" />
          <span>Log Out</span>
        </motion.button>
      </div>

      {/* Caller ID Editor Modal */}
      <AnimatePresence>
        {showCallerIDEditor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCallerIDEditor(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[380px] bg-zinc-900 rounded-3xl p-6 max-h-[600px] overflow-y-auto"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Edit Caller IDs</h3>
                <button
                  onClick={() => setShowCallerIDEditor(false)}
                  className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="space-y-3 mb-4">
                {callerIDs.map((cid) => (
                  <div key={cid.id} className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-zinc-700 rounded-lg flex items-center justify-center">
                        <Phone className="w-4 h-4 text-zinc-400" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-zinc-500">{cid.phone_number || cid.number}</div>
                        <div className="text-xs text-zinc-500">{cid.location}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={cid.name}
                        onChange={(e) => updateCallerIDName(cid.id, e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                        placeholder="Caller Name"
                      />
                      <Edit2 className="w-4 h-4 text-zinc-500" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-zinc-800/50 rounded-xl">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Customize the names of these preset caller IDs to make them easier to recognize.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ringtone selector modal */}
      <AnimatePresence>
        {showRingtoneSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowRingtoneSelector(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[380px] bg-zinc-900 rounded-3xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Select Ringtone</h3>
                <button
                  onClick={() => setShowRingtoneSelector(false)}
                  className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="space-y-2 mb-4">
                {ringtones.map((ringtone) => (
                  <button
                    key={ringtone}
                    onClick={() => {
                      setSelectedRingtone(ringtone);
                      setShowRingtoneSelector(false);
                    }}
                    className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${
                      selectedRingtone === ringtone
                        ? 'bg-red-500/20 border-2 border-red-500'
                        : 'bg-zinc-800/50 border-2 border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    <Volume2 className={`w-5 h-5 ${selectedRingtone === ringtone ? 'text-red-500' : 'text-zinc-400'}`} />
                    <span className="flex-1 text-left font-medium text-white">{ringtone}</span>
                    {selectedRingtone === ringtone && (
                      <CheckCircle2 className="w-5 h-5 text-red-500" />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-xs text-blue-300 leading-relaxed">
                  <strong>💡 Tip:</strong> Ringtone will play when you receive a scheduled call.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* How CueOut Works modal */}
      <InfoModal
        isOpen={infoModal === 'how'}
        onClose={() => setInfoModal(null)}
        title="How CueOut Works"
      >
        <div className="space-y-4 pb-4">
          {HOW_IT_WORKS_SECTIONS.map(({ icon: Icon, title, color, bg, border, content }) => (
            <div key={title} className={`rounded-2xl border p-4 ${bg} ${border}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-xl ${bg} border ${border}`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <h3 className="font-semibold text-white text-sm">{title}</h3>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">{content}</p>
            </div>
          ))}
          {/* <p className="text-center text-xs text-zinc-600 pt-2">Content coming soon — placeholder text.</p> */}
        </div>
      </InfoModal>

      {/* Privacy Policy modal */}
      <InfoModal
        isOpen={infoModal === 'privacy'}
        onClose={() => setInfoModal(null)}
        title="Privacy Policy"
      >
        <div className="space-y-6 pb-4">
          <p className="text-xs text-zinc-500">Last updated: [Date pending] — Placeholder content only.</p>
          {PRIVACY_SECTIONS.map(({ title, content }) => (
            <div key={title}>
              <h3 className="font-semibold text-white text-sm mb-2">{title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line">{content}</p>
            </div>
          ))}
          {/* <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-2xl">
            <p className="text-xs text-zinc-500 text-center">Final Privacy Policy will be provided by the client.</p>
          </div> */}
        </div>
      </InfoModal>

      {/* Terms of Use modal */}
      <InfoModal
        isOpen={infoModal === 'terms'}
        onClose={() => setInfoModal(null)}
        title="Terms of Use"
      >
        <div className="space-y-6 pb-4">
          <p className="text-xs text-zinc-500">Last updated: [Date pending] — Placeholder content only.</p>
          {TERMS_SECTIONS.map(({ title, content }) => (
            <div key={title}>
              <h3 className="font-semibold text-white text-sm mb-2">{title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line">{content}</p>
            </div>
          ))}
          {/* <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-2xl">
            <p className="text-xs text-zinc-500 text-center">Final Terms of Use will be provided by the client.</p>
          </div> */}
        </div>
      </InfoModal>
    </div>
    </PullToRefresh>
  );
}

function SettingsItem({ icon: Icon, label, value, onClick, last = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-4 hover:bg-zinc-800/50 transition-colors ${
        !last ? 'border-b border-zinc-800' : ''
      }`}
    >
      <Icon className="w-5 h-5 text-zinc-400" />
      <span className="flex-1 text-left font-medium text-sm text-white">{label}</span>
      {value && <span className="text-xs text-zinc-400">{value}</span>}
      <ChevronRight className="w-5 h-5 text-zinc-600" />
    </button>
  );
}