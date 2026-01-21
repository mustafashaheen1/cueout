export const timeOptions = [
  { id: 'now', label: 'Now' },
  { id: '3min', label: '3 min' },
  { id: '5min', label: '5 min' },
  { id: 'custom', label: 'Custom' }
];

// Voices supported by Luron API: emma, michael, sarah
export const realisticVoices = [
  { id: 'emma', name: 'Emma', gender: 'female', icon: '👩', description: 'Professional & warm' },
  { id: 'michael', name: 'Michael', gender: 'male', icon: '👨', description: 'Confident & clear' },
  { id: 'sarah', name: 'Sarah', gender: 'female', icon: '👩‍💼', description: 'Friendly & approachable' }
];

// Character voices map to Luron's available voices
export const characterVoices = [
  { id: 'sarah', name: 'Sophia', type: 'friendly', icon: '🌸' },
  { id: 'michael', name: 'Alex', type: 'casual', icon: '😎' },
  { id: 'emma', name: 'Morgan', type: 'formal', icon: '🎩' },
  { id: 'michael', name: 'Jordan', type: 'energetic', icon: '⚡' }
];