/**
 * Luron API Integration for QueOut App
 * Base URL: https://luron-api.onrender.com
 */

const BASE_URL = 'https://luron-api.onrender.com';

/**
 * Helper function to calculate ISO 8601 datetime from selectedTime
 * @param {string} selectedTime - '3min', '5min', 'now', or 'custom'
 * @param {Date} customDate - Custom date for 'custom' option
 * @returns {string} ISO 8601 formatted datetime
 */
function calculateScheduleTime(selectedTime, customDate = null) {
  const now = new Date();

  switch (selectedTime) {
    case 'now':
      // 5 seconds from now
      return new Date(now.getTime() + 5000).toISOString();
    case '3min':
      // 3 minutes from now
      return new Date(now.getTime() + 3 * 60 * 1000).toISOString();
    case '5min':
      // 5 minutes from now
      return new Date(now.getTime() + 5 * 60 * 1000).toISOString();
    case 'custom':
      // Use provided custom date or default to 10 minutes
      if (customDate) {
        return new Date(customDate).toISOString();
      }
      return new Date(now.getTime() + 10 * 60 * 1000).toISOString();
    default:
      // Default to 3 minutes
      return new Date(now.getTime() + 3 * 60 * 1000).toISOString();
  }
}

/**
 * Map contact methods array to primary type
 * @param {Array<string>} contactMethods - Array of contact methods from app
 * @returns {string} Primary contact type: 'call', 'text', or 'email'
 */
function mapContactMethodToType(contactMethods) {
  if (!contactMethods || contactMethods.length === 0) {
    return 'call'; // Default to call
  }

  // Priority: call > text > email
  if (contactMethods.includes('call')) return 'call';
  if (contactMethods.includes('text')) return 'text';
  if (contactMethods.includes('email')) return 'email';

  return 'call'; // Fallback
}

/**
 * Schedule a new call via Luron API
 * @param {Object} params - Call scheduling parameters
 * @param {string} params.userId - User ID
 * @param {Array<string>} params.contactMethods - Contact methods array
 * @param {string} params.selectedTime - Time option
 * @param {Date} params.customDate - Custom date if selectedTime is 'custom'
 * @param {string} params.selectedPersona - Persona ID
 * @param {string} params.note - Custom instruction/context
 * @param {string} params.selectedVoice - Voice ID
 * @param {Object} params.selectedCallerID - Caller ID object
 * @param {Object} params.personaConfig - Persona configuration
 * @param {string} params.recipientPhone - Optional recipient phone number (for verification calls)
 * @returns {Promise<Object>} Response with success, message, call_id, scheduled_for
 */
export async function scheduleCall(params) {
  try {
    const {
      userId,
      contactMethods = ['call'],
      selectedTime = '3min',
      customDate = null,
      selectedPersona = 'manager',
      note = '',
      selectedVoice = 'emma',
      selectedCallerID = null,
      personaConfig = {},
      recipientPhone = null
    } = params;

    // Map app data to Luron API format
    const requestBody = {
      user_id: userId,
      type: mapContactMethodToType(contactMethods),
      when: calculateScheduleTime(selectedTime, customDate),
      persona_type: selectedPersona,
      custom_instruction: note || '',
      advanced_settings: {
        tone: personaConfig.tone || 'casual',
        voice: selectedVoice,
        caller_id: selectedCallerID?.number || null,
        duration: personaConfig.duration || 30,
        custom_phrases: personaConfig.customPhrases || []
      }
    };

    // Add recipient phone if provided (for verification calls)
    if (recipientPhone) {
      requestBody.recipient_phone = recipientPhone;
    }

    const response = await fetch(`${BASE_URL}/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle different error status codes
      if (response.status === 400) {
        throw new Error(data.message || 'Invalid request parameters. Please check your input.');
      } else if (response.status === 422) {
        throw new Error(data.message || 'Validation error. Please check all fields.');
      } else {
        throw new Error(data.message || 'Failed to schedule call. Please try again.');
      }
    }

    return {
      success: true,
      message: data.message || 'Call scheduled successfully',
      call_id: data.call_id,
      scheduled_for: data.scheduled_for
    };

  } catch (error) {
    console.error('Error scheduling call:', error);

    // Check if it's a network error
    if (error.message === 'Failed to fetch' || error instanceof TypeError) {
      throw new Error('Connection failed. Please check your internet connection and try again.');
    }

    throw error;
  }
}

/**
 * Get call history for a user
 * @param {string} userId - User ID
 * @param {Object} filters - Optional filters
 * @param {string} filters.type - Filter by type: 'call', 'text', 'email'
 * @param {string} filters.status - Filter by status
 * @param {number} filters.limit - Max number of results (default: 50)
 * @param {number} filters.offset - Pagination offset (default: 0)
 * @returns {Promise<Object>} Response with success, user_id, total_count, history[]
 */
export async function getHistory(userId, filters = {}) {
  try {
    const {
      type = null,
      status = null,
      limit = 50,
      offset = 0
    } = filters;

    // Build query parameters
    const params = new URLSearchParams({
      user_id: userId,
      limit: limit.toString(),
      offset: offset.toString()
    });

    if (type) params.append('type', type);
    if (status) params.append('status', status);

    const response = await fetch(`${BASE_URL}/history?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 404) {
        // No history found - return empty array
        return {
          success: true,
          user_id: userId,
          total_count: 0,
          history: []
        };
      }
      throw new Error(data.message || 'Failed to fetch history.');
    }

    return {
      success: true,
      user_id: data.user_id,
      total_count: data.total_count,
      history: data.history || []
    };

  } catch (error) {
    console.error('Error fetching history:', error);

    if (error.message === 'Failed to fetch' || error instanceof TypeError) {
      throw new Error('Connection failed. Please check your internet connection and try again.');
    }

    throw error;
  }
}

/**
 * Get details for a specific call
 * @param {string} callId - Call ID
 * @returns {Promise<Object>} Response with success and call data
 */
export async function getCallDetails(callId) {
  try {
    const response = await fetch(`${BASE_URL}/history/${callId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Call not found.');
      }
      throw new Error(data.message || 'Failed to fetch call details.');
    }

    return {
      success: true,
      data: data.data
    };

  } catch (error) {
    console.error('Error fetching call details:', error);

    if (error.message === 'Failed to fetch' || error instanceof TypeError) {
      throw new Error('Connection failed. Please check your internet connection and try again.');
    }

    throw error;
  }
}

/**
 * Get user statistics
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Response with user statistics
 */
export async function getUserStats(userId) {
  try {
    const response = await fetch(`${BASE_URL}/users/${userId}/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('User not found.');
      }
      throw new Error(data.message || 'Failed to fetch user stats.');
    }

    return {
      success: true,
      data: data
    };

  } catch (error) {
    console.error('Error fetching user stats:', error);

    if (error.message === 'Failed to fetch' || error instanceof TypeError) {
      throw new Error('Connection failed. Please check your internet connection and try again.');
    }

    throw error;
  }
}

/**
 * Check API health status
 * @returns {Promise<Object>} Response with API health status
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error('API health check failed.');
    }

    return {
      success: true,
      status: data.status || 'healthy',
      data: data
    };

  } catch (error) {
    console.error('Error checking API health:', error);

    if (error.message === 'Failed to fetch' || error instanceof TypeError) {
      return {
        success: false,
        status: 'unreachable',
        message: 'API is unreachable. Please check your internet connection.'
      };
    }

    throw error;
  }
}

/**
 * Generate or retrieve a user ID
 * Stores in localStorage for persistence
 * @returns {string} User ID
 */
export function getUserId() {
  const STORAGE_KEY = 'queout_user_id';

  // Check if user ID already exists in localStorage
  let userId = localStorage.getItem(STORAGE_KEY);

  if (!userId) {
    // Generate a new unique user ID
    userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(STORAGE_KEY, userId);
  }

  return userId;
}
