import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../components/utils';
import { ChevronLeft, Phone } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PhoneVerification() {
  const [step, setStep] = useState('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [countryCode, setCountryCode] = useState('+1');
  const navigate = useNavigate();

  const handleSendCode = (e) => {
    e.preventDefault();
    setStep('code');
  };

  const handleVerifyCode = (e) => {
    e.preventDefault();
    navigate(createPageUrl('Home'));
  };

  const handleResendCode = () => {
    alert('New code sent!');
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
    <div className="min-h-screen bg-black flex flex-col">
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
              This is where GoCall will reach you.
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

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-4 rounded-full shadow-lg shadow-red-500/30 transition-all duration-200 active:scale-95"
              >
                Send Code
              </button>
            </form>

            <div className="mt-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
              <p className="text-sm text-zinc-400 text-center leading-relaxed">
                GoCall will only call/text you for scheduled calls. You're always in control.
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
              We just texted a 6-digit code to
              <br />
              <span className="text-white font-medium">
                {countryCode} {phoneNumber}
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

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                >
                  Resend code
                </button>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-4 rounded-full shadow-lg shadow-red-500/30 transition-all duration-200 active:scale-95"
              >
                Verify
              </button>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}