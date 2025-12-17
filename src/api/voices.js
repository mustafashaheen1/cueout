import { supabase } from '../lib/supabase';

// ============================================================================
// VOICES API
// ============================================================================

/**
 * Get all available voices
 */
export const getVoices = async () => {
  const { data, error } = await supabase
    .from('voices')
    .select('*')
    .eq('is_available', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
};

/**
 * Get voices by category
 */
export const getVoicesByCategory = async (category) => {
  const { data, error } = await supabase
    .from('voices')
    .select('*')
    .eq('category', category)
    .eq('is_available', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
};

/**
 * Get realistic voices
 */
export const getRealisticVoices = async () => {
  return getVoicesByCategory('realistic');
};

/**
 * Get character voices
 */
export const getCharacterVoices = async () => {
  return getVoicesByCategory('character');
};

/**
 * Get a single voice by ID
 */
export const getVoice = async (voiceId) => {
  const { data, error } = await supabase
    .from('voices')
    .select('*')
    .eq('id', voiceId)
    .single();

  if (error) throw error;
  return data;
};
