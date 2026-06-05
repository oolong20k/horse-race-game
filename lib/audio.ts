export type SoundEffect = "drum" | "go" | "cheer" | "boost" | "slow" | "sleep" | "stumble" | "turbo";

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) {
    return null;
  }

  audioContext ??= new AudioCtor();
  return audioContext;
}

function tone(frequency: number, duration: number, startAt = 0, type: OscillatorType = "sine", volume = 0.08) {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime + startAt;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

export function playSound(effect: SoundEffect, muted: boolean) {
  if (muted) {
    return;
  }

  if (effect === "drum") {
    tone(120, 0.09, 0, "triangle", 0.1);
    tone(90, 0.09, 0.18, "triangle", 0.1);
    tone(120, 0.09, 0.36, "triangle", 0.1);
    return;
  }

  if (effect === "go") {
    tone(440, 0.12, 0, "square", 0.08);
    tone(660, 0.16, 0.12, "square", 0.08);
    return;
  }

  if (effect === "cheer") {
    [440, 554, 659, 880].forEach((frequency, index) => tone(frequency, 0.25, index * 0.08, "sine", 0.06));
    return;
  }

  const effects: Record<Exclude<SoundEffect, "drum" | "go" | "cheer">, [number, number, OscillatorType]> = {
    boost: [720, 0.18, "sawtooth"],
    slow: [180, 0.28, "triangle"],
    sleep: [150, 0.35, "sine"],
    stumble: [95, 0.2, "square"],
    turbo: [980, 0.18, "square"],
  };
  const [frequency, duration, type] = effects[effect];
  tone(frequency, duration, 0, type, 0.07);
}
