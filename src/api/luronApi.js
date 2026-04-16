/**
 * Luron API Integration
 * Uses the same base URL and raw fetch approach as the working call API.
 */

const BASE_URL = 'https://luron-api.onrender.com';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calculateScheduleTime(selectedTime, customDate = null) {
  const now = new Date();
  let scheduled;

  switch (selectedTime) {
    case 'now':    scheduled = new Date(now.getTime() + 5_000);           break;
    case '3min':   scheduled = new Date(now.getTime() + 3 * 60_000);      break;
    case '5min':   scheduled = new Date(now.getTime() + 5 * 60_000);      break;
    case 'custom': scheduled = customDate ? new Date(customDate)
                                          : new Date(now.getTime() + 10 * 60_000); break;
    default:       scheduled = new Date(now.getTime() + 3 * 60_000);
  }

  console.log(`⏰ Scheduling for ${selectedTime}: ${scheduled.toISOString()}`);
  return scheduled.toISOString();
}

/**
 * Auto-generate an email subject from persona + note context.
 */
function generateEmailSubject(persona, note) {
  if (note && note.trim().length > 0) {
    const first = note.split(/[.!?]/)[0].trim();
    return first.length <= 60 ? first : first.substring(0, 57) + '…';
  }
  const defaults = {
    manager:     'Urgent: Team Meeting Required',
    coordinator: 'Scheduling Update Required',
    friend:      'Hey, can we chat?',
    mom:         'Please call me when you can',
    doctor:      'Important: Medical Appointment Reminder',
    boss:        'Quick check-in needed',
    service:     'Action Required: Account Update',
  };
  return defaults[persona] || 'Quick Update';
}

/**
 * Generate a full email body from persona + note.
 * Luron sends custom_instruction verbatim as the email body for email type.
 */
function generateEmailBody(persona, note) {
  const greetings = {
    manager:     'Hi,',
    coordinator: 'Hello,',
    friend:      'Hey!',
    mom:         'Hi sweetheart,',
    doctor:      'Dear Patient,',
    boss:        'Hello,',
    service:     'Dear Valued Customer,',
  };
  const closings = {
    manager:     'Please respond at your earliest convenience.\n\nBest regards,\nYour Manager',
    coordinator: 'Please confirm your availability.\n\nBest regards,\nYour Coordinator',
    friend:      'Let me know what works for you!\n\nTalk soon,\nA Friend',
    mom:         'Love you and hope to hear from you soon.\n\nLove,\nMom',
    doctor:      'If you have any questions, please do not hesitate to reach out.\n\nKind regards,\nYour Healthcare Team',
    boss:        'Please get back to me when you have a moment.\n\nRegards,\nYour Boss',
    service:     'Thank you for your attention to this matter.\n\nBest regards,\nCueOut Support',
  };

  const greeting = greetings[persona] || 'Hello,';
  const closing  = closings[persona]  || 'Best regards,\nCueOut';
  const body     = note && note.trim()
    ? note.trim()
    : 'I wanted to reach out regarding an important matter that requires your attention.';

  return `${greeting}\n\n${body}\n\n${closing}`;
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

/**
 * Schedule a call, text, or email via Luron API.
 *
 * @param {Object}   params
 * @param {string}   params.userId
 * @param {string[]} params.contactMethods   - ['call'] | ['text'] | ['email']
 * @param {string}   params.selectedTime     - '3min' | '5min' | 'now' | 'custom'
 * @param {Date}     [params.customDate]
 * @param {string}   params.selectedPersona
 * @param {string}   [params.note]
 * @param {string}   params.selectedVoice
 * @param {Object}   [params.selectedCallerID]
 * @param {Object}   [params.personaConfig]
 * @param {string}   [params.recipientPhone]  - required for call / text
 * @param {string}   [params.recipientEmail]  - required for email
 */
export async function scheduleCall(params) {
  const {
    userId,
    contactMethods   = ['call'],
    selectedTime     = '3min',
    customDate       = null,
    selectedPersona  = 'manager',
    note             = '',
    selectedVoice    = 'emma',
    selectedCallerID = null,
    personaConfig    = {},
    recipientPhone   = null,
    recipientEmail   = null,
  } = params;

  const scheduledTime = calculateScheduleTime(selectedTime, customDate);

  const type = contactMethods.includes('email') ? 'email'
             : contactMethods.includes('text')  ? 'text'
             : 'call';

  let body;

  if (type === 'email') {
    // ── Email format (from Luron API docs) ───────────────────────────────────
    body = {
      user_id:            userId,
      type:               'email',
      email_address:      recipientEmail,
      when:               scheduledTime,
      persona_type:       selectedPersona,
      custom_instruction: generateEmailBody(selectedPersona, note),
      advanced_settings: {
        email_subject: generateEmailSubject(selectedPersona, note),
      },
    };
  } else {
    // ── Call / Text format ────────────────────────────────────────────────────
    body = {
      user_id:            userId,
      type,
      when:               scheduledTime,
      persona_type:       selectedPersona,
      custom_instruction: note || '',
      advanced_settings: {
        tone:           personaConfig.tone     || 'casual',
        voice:          selectedVoice,
        caller_id:      selectedCallerID?.number || null,
        duration:       personaConfig.duration   || 30,
        custom_phrases: Array.isArray(personaConfig.customPhrases)
                          ? personaConfig.customPhrases.join(', ')
                          : (personaConfig.customPhrases || ''),
      },
    };
    if (recipientPhone) body.phone_number = recipientPhone;
  }

  console.log('🚀 Luron schedule request:', JSON.stringify(body, null, 2));

  const response = await fetch(`${BASE_URL}/schedule`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  console.log('📡 Response status:', response.status, response.statusText);
  const data = await response.json();
  console.log('📥 Response data:', data);

  if (!response.ok) {
    const msg = data.message || `Failed to schedule (${response.status})`;
    throw new Error(msg);
  }

  return {
    success:       true,
    message:       data.message || 'Scheduled successfully',
    call_id:       data.call_id,
    scheduled_for: data.scheduled_for,
  };
}

// ─── History ──────────────────────────────────────────────────────────────────

export async function getHistory(userId, filters = {}) {
  const { type = null, status = null, limit = 50, offset = 0 } = filters;

  const params = new URLSearchParams({ user_id: userId, limit, offset });
  if (type)   params.append('type',   type);
  if (status) params.append('status', status);

  const response = await fetch(`${BASE_URL}/history?${params.toString()}`, {
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 404) {
      return { success: true, user_id: userId, total_count: 0, history: [] };
    }
    throw new Error(data.message || 'Failed to fetch history.');
  }

  // Handle both API response shapes:
  //   api.luron.ai/api/v1  → { data: [...], count: N }
  //   luron-api.onrender.com → { history: [...], total_count: N }
  const records = data.data || data.history || [];
  return {
    success:     true,
    user_id:     data.user_id,
    total_count: data.count || data.total_count || records.length,
    history:     records,
  };
}

export async function getCallDetails(callId) {
  console.log('🔍 Fetching call details:', callId);

  const response = await fetch(`${BASE_URL}/history/${callId}`, {
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch call details.');
  }

  // Handle both shapes: { data: {...} } and flat { id, status, ... }
  const record = data.data || data;
  console.log('📞 Call details:', record);
  return { success: true, data: record };
}

/**
 * Get or generate a stable Luron user ID (stored in localStorage).
 */
export function getUserId() {
  const KEY = 'queout_user_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}

// Dev helper — test call details from Safari console
if (typeof window !== 'undefined') {
  window.getCallDetails = getCallDetails;
}
