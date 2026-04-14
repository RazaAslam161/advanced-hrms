import { useUIStore } from '../store/uiStore';

export type SoundKind = 'click' | 'success' | 'soft';

let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextConstructor();
  }

  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }

  return audioContext;
};

const soundProfiles: Record<SoundKind, { frequency: number; duration: number; type: OscillatorType; gain: number }> = {
  click: { frequency: 420, duration: 0.075, type: 'triangle', gain: 0.05 },
  success: { frequency: 620, duration: 0.14, type: 'sine', gain: 0.06 },
  soft: { frequency: 260, duration: 0.1, type: 'sine', gain: 0.04 },
};

export const playUiTone = (kind: SoundKind = 'click', force = false) => {
  if (!force && !useUIStore.getState().soundEnabled) {
    return;
  }

  const context = getAudioContext();
  if (!context) {
    return;
  }

  const profile = soundProfiles[kind];
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = profile.type;
  oscillator.frequency.setValueAtTime(profile.frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(profile.frequency * 1.06, now + profile.duration);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(profile.gain, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + profile.duration);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + profile.duration + 0.02);
};
