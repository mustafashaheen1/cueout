import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../components/utils';
import { Mail, Lock, Apple, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../components/AuthContext';
import { getVerificationStatus } from '../api/verification';

export default function Auth() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const navigate = useNavigate();
  const { signIn, signUp, signInWithApple, isAuthenticated, user } = useAuth();

  // Redirect if already authenticated - check phone verification status
  useEffect(() => {
    const checkAndRedirect = async () => {
      if (isAuthenticated && user) {
        setDebugInfo(`Checking user: ${user.id}`);
        console.log('🔍 Auth.jsx - Checking verification for user:', user.id);
        try {
          const verificationStatus = await getVerificationStatus(user.id);
          console.log('📱 Verification Status:', verificationStatus);

          setDebugInfo(`Phone: ${verificationStatus.phoneNumber || 'NULL'} | Verified: ${verificationStatus.isVerified}`);

          if (verificationStatus.isVerified) {
            setDebugInfo('Phone verified → Home');
            console.log('✅ Phone verified - redirecting to Home');
            setTimeout(() => navigate(createPageUrl('Home')), 500);
          } else {
            setDebugInfo('Phone NOT verified → PhoneVerification');
            console.log('❌ Phone NOT verified - redirecting to PhoneVerification');
            setTimeout(() => navigate(createPageUrl('PhoneVerification')), 500);
          }
        } catch (error) {
          console.error('Error checking verification status:', error);
          setDebugInfo(`Error: ${error.message} → PhoneVerification`);
          console.log('⚠️ Error occurred - redirecting to PhoneVerification');
          setTimeout(() => navigate(createPageUrl('PhoneVerification')), 500);
        }
      }
    };

    checkAndRedirect();
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      // Don't navigate here - let the useEffect handle it based on verification status
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setError('');
    setIsLoading(true);

    try {
      await signInWithApple();
      // Don't navigate here - let the useEffect handle it based on verification status
    } catch (err) {
      console.error('Apple sign in error:', err);
      setError(err.message || 'Failed to sign in with Apple');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 pt-safe pb-safe">
      <div className="fixed inset-0 bg-gradient-to-b from-red-950/30 via-black to-black" />

      {/* Debug Panel - Remove after testing */}
      {debugInfo && (
        <div className="fixed top-4 left-4 right-4 bg-yellow-500/90 text-black p-4 rounded-lg text-xs font-mono z-50">
          <div className="font-bold mb-1">DEBUG:</div>
          <div>{debugInfo}</div>
          <div className="mt-2 text-[10px]">
            Auth: {isAuthenticated ? 'YES' : 'NO'} | User: {user ? user.id.substring(0, 8) : 'NONE'}
          </div>
        </div>
      )}
      
      <div className="relative w-full max-w-lg mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <h1 className="text-4xl font-bold text-white">QueOut</h1>
            <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50 animate-pulse" />
          </div>
          <p className="text-zinc-400">Get the perfect call, right on cue.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 backdrop-blur-xl rounded-3xl border border-red-500/20 shadow-2xl shadow-red-500/10 p-8"
        >
          <div className="flex gap-2 mb-8 bg-zinc-800/50 rounded-full p-1">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 px-4 rounded-full font-semibold text-sm transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                  : 'text-zinc-400'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 px-4 rounded-full font-semibold text-sm transition-all duration-200 ${
                mode === 'signup'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                  : 'text-zinc-400'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </motion.div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all"
                  placeholder="your@email.com"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  disabled={isLoading}
                />
              </div>
              {mode === 'signup' && (
                <p className="text-xs text-zinc-500 mt-2">
                  Password must be at least 6 characters
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-4 rounded-full shadow-lg shadow-red-500/30 transition-all duration-200 active:scale-95 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Loading...' : 'Continue'}
            </button>
          </form>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-zinc-500 text-sm">or</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          <button
            onClick={handleAppleSignIn}
            disabled={isLoading}
            className="w-full bg-white text-black font-semibold py-4 rounded-full flex items-center justify-center gap-3 hover:bg-zinc-100 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Apple className="w-5 h-5 fill-current" />
            Continue with Apple
          </button>

          <p className="text-xs text-zinc-500 text-center mt-6 leading-relaxed">
            By continuing, you agree to our{' '}
            <a href="#" className="text-red-400 hover:underline">
              Terms
            </a>{' '}
            &{' '}
            <a href="#" className="text-red-400 hover:underline">
              Privacy Policy
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}