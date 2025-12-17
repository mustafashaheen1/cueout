import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../components/utils';
import { ChevronLeft, Phone, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../components/AuthContext';
import { sendVerificationCall, verifyCode, resendVerificationCode } from '../api/verification';

export default function PhoneVerification() {
  const [step, setStep] = useState('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [countryCode, setCountryCode] = useState('+1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!user) {
        throw new Error('You must be logged in to verify your phone number');
      }

      // Send verification call via Luron API
      const response = await sendVerificationCall({
        userId: user.id,
        phoneNumber: phoneNumber,
        countryCode: countryCode
      });

      if (response.success) {
        setStep('code');
        // Show code in development for testing
        if (response.code) {
          console.log('🔐 Development Mode - Verification code:', response.code);
        }
      }
    } catch (err) {
      console.error('Error sending code:', err);
      setError(err.message || 'Failed to send verification call');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!user) {
        throw new Error('You must be logged in to verify your phone number');
      }

      // Join the code array into a single string
      const codeString = code.join('');

      if (codeString.length !== 6) {
        throw new Error('Please enter the complete 6-digit code');
      }

      // Verify the code
      const response = await verifyCode({
        userId: user.id,
        phoneNumber: phoneNumber,
        code: codeString
      });

      if (response.success) {
        // Navigate to home on successful verification
        navigate(createPageUrl('Home'));
      }
    } catch (err) {
      console.error('Error verifying code:', err);
      setError(err.message || 'Failed to verify code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setIsLoading(true);

    try {
      if (!user) {
        throw new Error('You must be logged in');
      }

      const response = await resendVerificationCode({
        userId: user.id,
        phoneNumber: phoneNumber,
        countryCode: countryCode
      });

      if (response.success) {
        // Clear existing code inputs
        setCode(['', '', '', '', '', '']);
        // Show code in development for testing
        if (response.code) {
          console.log('🔐 Development Mode - New verification code:', response.code);
        }
        // Show success feedback (you could add a success toast here)
        alert('New verification call scheduled!');
      }
    } catch (err) {
      console.error('Error resending code:', err);
      setError(err.message || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index, value) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);
      
      if (value && index < 5) {
        document.getElementById(`code-${index + 1}`)?.focus();
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      document.getElementById(`code-${index - 1}`)?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col pt-safe pb-safe">
      <div className="fixed inset-0 bg-gradient-to-b from-red-950/20 via-black to-black" />
      
      <div className="relative pt-4 px-6">
        <button
          onClick={() => step === 'code' ? setStep('phone') : navigate(-1)}
          className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-6">
        {step === 'phone' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg mx-auto"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mx-auto mb-8 shadow-lg shadow-red-500/30">
              <Phone className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-3xl font-bold text-center mb-3 text-white">
              Add your phone number
            </h1>
            <p className="text-zinc-400 text-center mb-12">
              We'll call you with a verification code
            </p>

            <form onSubmit={handleSendCode} className="space-y-6">
              <div className="flex gap-3">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-4 text-white focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all"
                >
                  <option value="+1">+1</option>
                  <option value="+44">+44</option>
                  <option value="+91">+91</option>
                </select>

                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-2xl px-6 py-4 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all"
                  placeholder="(555) 123-4567"
                  required
                />
              </div>

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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-red-500/50 disabled:to-red-600/50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-full shadow-lg shadow-red-500/30 transition-all duration-200 active:scale-95"
              >
                {isLoading ? 'Calling...' : 'Call Me with Code'}
              </button>
            </form>

            <div className="mt-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
              <p className="text-sm text-zinc-400 text-center leading-relaxed">
                <strong className="text-white">🎯 On-brand verification!</strong><br />
                You'll receive a quick AI call that reads your 6-digit verification code. QueOut will only contact you for scheduled calls.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg mx-auto"
          >
            <h1 className="text-3xl font-bold text-center mb-3 text-white">
              Verify your number
            </h1>
            <p className="text-zinc-400 text-center mb-12">
              You should receive a call in a few moments at
              <br />
              <span className="text-white font-medium">
                {countryCode} {phoneNumber}
              </span>
              <br />
              <span className="text-xs text-zinc-500 mt-2 block">
                Listen for your 6-digit code
              </span>
            </p>

            <form onSubmit={handleVerifyCode} className="space-y-8">
              <div className="flex gap-3 justify-center">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    id={`code-${index}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-14 h-16 bg-zinc-900 border-2 border-zinc-700 rounded-2xl text-center text-2xl font-bold text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                  />
                ))}
              </div>

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

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isLoading}
                  className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Didn't get the call? Request new code
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-red-500/50 disabled:to-red-600/50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-full shadow-lg shadow-red-500/30 transition-all duration-200 active:scale-95"
              >
                {isLoading ? 'Verifying...' : 'Verify'}
              </button>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}