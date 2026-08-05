export type CardColor = 'RED' | 'YELLOW' | 'GREEN' | 'BLUE' | 'WILD';
export type CardRank = 
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'SKIP' | 'REVERSE' | 'DRAW2'
  | 'WILD' | 'WILD4';

export interface Card {
  id: string; // unique card id in deck
  color: CardColor;
  rank: CardRank;
}

export interface Player {
  id: string; // player_id
  slotIndex: number;
  name: string;
  isHost: boolean;
  inviteToken: string;
  joined: boolean;
  quota: number;
  uploadedPhotos: string[]; // photo IDs or file paths
  selectedTheme?: string; // e.g. 'muscle_cars'
  hand: Card[];
  disconnected: boolean;
}

export interface ThemeOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  photoCount: number;
}

export interface DeckStyle {
  mode: 'quick' | 'cars' | 'full';
  totalPhotos: number; // 15 for quick/cars, 54 for full
}

export interface RankPhotoMapping {
  [rankKey: string]: string; // key e.g. "0" or "RED_SKIP" -> photo filePath
}

export interface GameState {
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  currentTurnPlayerId: string;
  turnDirection: 1 | -1; // 1 = clockwise, -1 = counter-clockwise
  drawPileCount: number;
  discardPile: Card[];
  topDiscard: Card | null;
  activeColor: CardColor | null; // set after Wild play
  turnCount: number;
  winner: {
    id: string;
    name: string;
    turnCount: number;
    standings: Array<{
      playerId: string;
      name: string;
      cardCount: number;
    }>;
  } | null;
}

export interface Room {
  id: string;
  hostToken: string;
  nPlayers: number;
  deckMode: 'quick' | 'cars' | 'full';
  totalPhotos: number;
  players: Player[]; // fixed array size nPlayers
  rankPhotoMap: RankPhotoMapping;
  themePhotos?: string[];
  game: GameState & {
    drawPile: Card[];
  };
  createdAt: number;
  lastActivityAt: number;
  purgeTimer?: NodeJS.Timeout;
}

export interface SanitizedPlayerState {
  id: string;
  name: string;
  slotIndex: number;
  isHost: boolean;
  joined: boolean;
  disconnected: boolean;
  cardCount: number;
  uploadCount: number;
  quota: number;
  selectedTheme?: string;
}

export interface BroadcastPayload {
  roomId: string;
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  deckMode: 'quick' | 'cars' | 'full';
  nPlayers: number;
  totalPhotosRequired: number;
  totalPhotosCollected: number;
  allPhotosCollected: boolean;
  players: SanitizedPlayerState[];
  self: {
    id: string;
    name: string;
    isHost: boolean;
    quota: number;
    uploadedPhotos: string[];
    selectedTheme?: string;
    hand: Card[]; // ONLY sent to self
  };
  game: {
    currentTurnPlayerId: string;
    turnDirection: 1 | -1;
    drawPileCount: number;
    topDiscard: Card | null;
    activeColor: CardColor | null;
    turnCount: number;
    winner: GameState['winner'];
  };
}
