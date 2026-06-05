export type DistanceKey = "short" | "medium" | "long";

export interface Character {
  id: string;
  name: string;
  icon: string;
  createdAt: string;
}

export interface RaceRecord {
  id: string;
  winner: string;
  winnerIcon?: string;
  distance: number;
  racedAt: string;
}

export interface Settings {
  muted: boolean;
  distance: DistanceKey;
}

export interface CurrentRace {
  participants: Character[];
  distance: DistanceKey;
  startedAt: string;
}
