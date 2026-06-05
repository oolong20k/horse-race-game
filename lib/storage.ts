import type { Character, CurrentRace, DistanceKey, RaceRecord, Settings } from "./types";

export const CHARACTER_ICONS = [
  "🐴",
  "🦄",
  "🐸",
  "🐢",
  "🦀",
  "🐠",
  "🐧",
  "🦊",
  "🐺",
  "🦁",
  "🐯",
  "🐮",
  "🐷",
  "🐻",
  "🐼",
  "🐨",
  "🐰",
  "🦝",
];

export const DISTANCES: Record<
  DistanceKey,
  { value: number; label: string; durationLabel: string; targetSeconds: number }
> = {
  short: { value: 500, label: "Short", durationLabel: "~10s", targetSeconds: 10 },
  medium: { value: 1500, label: "Medium", durationLabel: "~30s", targetSeconds: 30 },
  long: { value: 3000, label: "Long", durationLabel: "~60s", targetSeconds: 60 },
};

export const STORAGE_KEYS = {
  characters: "hrc_characters",
  history: "hrc_race_history",
  settings: "hrc_settings",
  currentRace: "hrc_current_race",
};

export const DEFAULT_SETTINGS: Settings = {
  muted: false,
  distance: "medium",
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (canUseStorage()) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
}

export function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function loadCharacters() {
  return readJson<Character[]>(STORAGE_KEYS.characters, []);
}

export function saveCharacters(characters: Character[]) {
  writeJson(STORAGE_KEYS.characters, characters);
}

export function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...readJson<Partial<Settings>>(STORAGE_KEYS.settings, DEFAULT_SETTINGS) };
}

export function saveSettings(settings: Settings) {
  writeJson(STORAGE_KEYS.settings, settings);
  window.dispatchEvent(new CustomEvent("hrc-settings-change", { detail: settings }));
}

export function loadHistory() {
  return readJson<RaceRecord[]>(STORAGE_KEYS.history, []);
}

export function saveRaceRecord(record: RaceRecord) {
  const nextRecords = [record, ...loadHistory()].slice(0, 200);
  writeJson(STORAGE_KEYS.history, nextRecords);
}

export function clearHistory() {
  writeJson(STORAGE_KEYS.history, []);
}

export function saveCurrentRace(currentRace: CurrentRace) {
  writeJson(STORAGE_KEYS.currentRace, currentRace);
}

export function loadCurrentRace() {
  return readJson<CurrentRace | null>(STORAGE_KEYS.currentRace, null);
}

export function randomCharacterIcon() {
  return CHARACTER_ICONS[Math.floor(Math.random() * CHARACTER_ICONS.length)];
}
