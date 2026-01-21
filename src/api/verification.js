/**
 * Phone Verification API
 * Handles phone number verification using voice calls via Luron API
 */

import { supabase } from '../lib/supabase';
import { scheduleCall as scheduleLuronCall } from './luronApi';

/**
 * Generate a 6-digit verification code
 * @returns {string} 6-digit code
 */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash a verification code for secure storage
 * @param {string} code - The code to hash
 * @returns {Promise<string>} Hashed code
 */
async function hashCode(code) {
  // Simple hash using Web Crypto API
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Format verification code for speech
 * Converts "123456" to "1-2-3-4-5-6" for clear pronunciation
 * @param {string} code - The 6-digit code
 * @returns {string} Formatted code for speech
 */
function formatCodeForSpeech(code) {
  return code.split('').join('-');
}

/**
 * Send verification code via voice call using Luron API
 * @param {Object} params - Verification parameters
 * @param {string} params.userId - User ID
 * @param {string} params.phoneNumber - Phone number to verify
 * @param {string} params.countryCode - Country code (e.g., '+1')
 * @returns {Promise<Object>} Response with success, code (for testing), callId
 */
export async function sendVerificationCall(params) {
  try {
    const { userId, phoneNumber, countryCode = '+1' } = params;

    if (!userId || !phoneNumber) {
      throw new Error('User ID and phone number are required');
    }

    // Generate verification code
    const code = generateVerificationCode();
    const codeHash = await hashCode(code);

    // Calculate expiration (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Format code for clear speech
    const speechCode = formatCodeForSpeech(code);

    // Format full phone number with country code
    const fullPhoneNumber = `${countryCode}${phoneNumber}`;

    // Schedule verification call via Luron API
    // Work with the conversational AI - give explicit instructions to say the code immediately
    const verificationMessage = `You must immediately say the following verification code to the person who answers. Do not ask questions. Just say: "Your QueOut verification code is ${speechCode}. Again, your code is ${speechCode}. Goodbye." Then end the call.`;

    const luronResponse = await scheduleLuronCall({
      userId,
      contactMethods: ['call'], // Back to voice call
      selectedTime: 'now', // Immediate call
      selectedPersona: 'customer_support',
      note: verificationMessage,
      selectedVoice: 'emma',
      selectedCallerID: null,
      recipientPhone: fullPhoneNumber, // Pass the phone number being verified
      personaConfig: {
        tone: 'friendly',
        duration: 30,
        customPhrases: `Your QueOut verification code is ${speechCode}. Again, your code is ${speechCode}.`
      }
    });

    if (!luronResponse.success) {
      throw new Error('Failed to schedule verification call');
    }

    // Store verification in Supabase
    const { data: verificationData, error: dbError } = await supabase
      .from('phone_verifications')
      .insert({
        user_id: userId,
        phone_number: phoneNumber,
        country_code: countryCode,
        code_hash: codeHash,
        luron_call_id: luronResponse.call_id,
        expires_at: expiresAt,
        verified: false,
        attempts: 0
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error storing verification:', dbError);
      throw new Error('Failed to store verification. Please try again.');
    }

    return {
      success: true,
      message: 'Verification call scheduled successfully',
      verificationId: verificationData.id,
      callId: luronResponse.call_id,
      // Include code in development for testing
      ...(process.env.NODE_ENV === 'development' && { code })
    };

  } catch (error) {
    console.error('Error sending verification call:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    });
    throw new Error(error.message || 'Failed to send verification call. Please try again.');
  }
}

/**
 * Verify the code entered by user
 * @param {Object} params - Verification parameters
 * @param {string} params.userId - User ID
 * @param {string} params.phoneNumber - Phone number being verified
 * @param {string} params.code - 6-digit code entered by user
 * @returns {Promise<Object>} Response with success status
 */
export async function verifyCode(params) {
  try {
    const { userId, phoneNumber, code } = params;

    if (!userId || !phoneNumber || !code) {
      throw new Error('User ID, phone number, and code are required');
    }

    // Hash the provided code
    const codeHash = await hashCode(code);

    // Find the most recent verification for this user and phone
    const { data: verification, error: fetchError } = await supabase
      .from('phone_verifications')
      .select('*')
      .eq('user_id', userId)
      .eq('phone_number', phoneNumber)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !verification) {
      throw new Error('No pending verification found. Please request a new code.');
    }

    // Check if verification has expired
    if (new Date(verification.expires_at) < new Date()) {
      throw new Error('Verification code has expired. Please request a new code.');
    }

    // Check attempts limit (max 5 attempts)
    if (verification.attempts >= 5) {
      throw new Error('Too many failed attempts. Please request a new code.');
    }

    // Update attempts
    await supabase
      .from('phone_verifications')
      .update({
        attempts: verification.attempts + 1,
        last_attempt_at: new Date().toISOString()
      })
      .eq('id', verification.id);

    // Verify the code
    if (verification.code_hash !== codeHash) {
      throw new Error('Invalid verification code. Please try again.');
    }

    // Mark verification as complete
    const { error: updateError } = await supabase
      .from('phone_verifications')
      .update({ verified: true })
      .eq('id', verification.id);

    if (updateError) {
      console.error('Error marking verification as complete:', updateError);
    }

    // Update user's phone number
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        phone_number: phoneNumber,
        country_code: verification.country_code,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (userUpdateError) {
      console.error('Error updating user phone number:', userUpdateError);
      throw new Error('Failed to update phone number. Please try again.');
    }

    return {
      success: true,
      message: 'Phone number verified successfully!'
    };

  } catch (error) {
    console.error('Error verifying code:', error);
    throw error;
  }
}

/**
 * Resend verification code
 * @param {Object} params - Verification parameters
 * @param {string} params.userId - User ID
 * @param {string} params.phoneNumber - Phone number to verify
 * @param {string} params.countryCode - Country code
 * @returns {Promise<Object>} Response with success status
 */
export async function resendVerificationCode(params) {
  try {
    const { userId, phoneNumber, countryCode } = params;

    // Check rate limiting - can't resend within 30 seconds
    const { data: recentVerification } = await supabase
      .from('phone_verifications')
      .select('created_at')
      .eq('user_id', userId)
      .eq('phone_number', phoneNumber)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (recentVerification) {
      const timeSinceLastSend = Date.now() - new Date(recentVerification.created_at).getTime();
      if (timeSinceLastSend < 30000) { // 30 seconds
        const waitTime = Math.ceil((30000 - timeSinceLastSend) / 1000);
        throw new Error(`Please wait ${waitTime} seconds before requesting a new code.`);
      }
    }

    // Send new verification code
    return await sendVerificationCall({ userId, phoneNumber, countryCode });

  } catch (error) {
    console.error('Error resending verification code:', error);
    throw error;
  }
}

/**
 * Get verification status for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Verification status
 */
export async function getVerificationStatus(userId) {
  try {
    console.log('🔍 Checking verification status for user:', userId);

    const { data: user, error } = await supabase
      .from('users')
      .select('phone_number, country_code')
      .eq('id', userId)
      .single();

    console.log('📊 Database query result:', { user, error });

    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }

    const isVerified = !!user?.phone_number;
    console.log('✅ Verification check result:', {
      isVerified,
      phone_number: user?.phone_number,
      country_code: user?.country_code
    });

    return {
      isVerified: isVerified,
      phoneNumber: user?.phone_number,
      countryCode: user?.country_code
    };

  } catch (error) {
    console.error('💥 Error getting verification status:', error);
    // Return NOT verified on error to be safe
    return {
      isVerified: false,
      phoneNumber: null,
      countryCode: null
    };
  }
}
