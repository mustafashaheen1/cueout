import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../components/AppContext';
import { useAuth } from '../components/AuthContext';
import { createPageUrl } from '../components/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
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
  Volume2
} from 'lucide-react';

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
  const navigate = useNavigate();
  const { callerIDs, updateCallerIDName, setIsTabBarHidden } = useApp();
  const { user, signOut, checkUser } = useAuth();

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

  // On mount, force a fresh fetch from server so we always have the latest email
  useEffect(() => {
    checkUser();
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

  return (
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
                      <span className="truncate min-w-0 flex-1">{email}</span>
                      <button
                        onClick={() => { setTempEmail(email); setEmailError(''); setEmailSuccess(''); setIsEditingEmail(true); }}
                        className="p-1 hover:bg-zinc-800 rounded transition-colors flex-shrink-0"
                      >
                        <Edit2 className="w-3 h-3 text-zinc-500" />
                      </button>
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

          <div className="mb-4 p-3 bg-zinc-800/50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-400 text-xs">Current Plan</span>
              <span className="px-2.5 py-1 bg-zinc-700 rounded-full text-xs font-semibold text-white">Free</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-xs">Calls remaining</span>
              <span className="font-semibold text-sm text-red-400">1 of 2 left</span>
            </div>
          </div>

          <button
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 rounded-full transition-all duration-200 flex items-center justify-center gap-2 text-sm"
          >
            <Crown className="w-4 h-4" />
            <span>Upgrade to Plus</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>

        <motion.div
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
        </motion.div>

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
          
          <button
            onClick={() => setShowRingtoneSelector(true)}
            className="w-full flex items-center gap-3 p-4 hover:bg-zinc-800/50 transition-colors"
          >
            <Smartphone className="w-5 h-5 text-zinc-400" />
            <span className="flex-1 text-left font-medium text-sm text-white">Ringtone & Vibration</span>
            <span className="text-xs text-zinc-400">{selectedRingtone}</span>
            <ChevronRight className="w-5 h-5 text-zinc-600" />
          </button>


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
            onClick={() => {}}
          />
          <SettingsItem
            icon={Shield}
            label="Privacy Policy"
            onClick={() => {}}
          />
          <SettingsItem
            icon={Shield}
            label="Terms of Use"
            onClick={() => {}}
          />
          <SettingsItem
            icon={Mail}
            label="Support"
            onClick={() => {}}
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
    </div>
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