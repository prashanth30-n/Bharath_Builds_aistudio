// Amazon Polly voice synthesis & audio unlock helper
let audioContext: AudioContext | null = null;
let isAudioUnlocked = false;

export function unlockAudioContext(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioContext && AudioContextClass) {
      audioContext = new AudioContextClass();
    }
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
    isAudioUnlocked = true;
    // Play a very subtle pleasant acoustic initiation chime (520Hz -> 659Hz -> 784Hz major chord)
    playChime('info');
  } catch (e) {
    console.warn('AudioContext initialization note:', e);
  }
}

export function playChime(type: 'info' | 'warning' | 'critical' | 'success'): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioContext && AudioContextClass) {
      audioContext = new AudioContextClass();
    }
    if (!audioContext) return;
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);

    if (type === 'success') {
      // Pleasant double ping (break logged)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === 'critical') {
      // Urgent attention pulse
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(750, now);
      osc.frequency.setValueAtTime(450, now + 0.15);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.55);
    } else if (type === 'warning') {
      // Soft reminder chime
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(740, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.38);
    } else {
      // Gentle notification
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(660, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.32);
    }
  } catch (err) {
    console.debug('Chime playback error:', err);
  }
}

/**
 * Speaks text using Web Speech API, picking best available Indian English or Hindi neural voice (simulating Amazon Polly Kajal / Aditi)
 */
export function speakWithPollyVoice(text: string, lang: 'en' | 'hi' = 'en'): void {
  if (!('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel(); // Cancel any ongoing speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; // Clear and slightly deliberate for delivery riders in traffic
    utterance.pitch = 1.05;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (lang === 'hi') {
      utterance.lang = 'hi-IN';
      const hindiVoice = voices.find(v => v.lang.startsWith('hi') || v.name.includes('Hindi') || v.name.includes('Kajal') || v.name.includes('Lekha'));
      if (hindiVoice) utterance.voice = hindiVoice;
    } else {
      utterance.lang = 'en-IN';
      const indianVoice = voices.find(v => v.lang.includes('IN') || v.name.includes('India') || v.name.includes('Kajal') || v.name.includes('Raveena'));
      if (indianVoice) utterance.voice = indianVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('SpeechSynthesis error:', e);
  }
}
