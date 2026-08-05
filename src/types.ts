export type CardColor = 'RED' | 'YELLOW' | 'GREEN' | 'BLUE' | 'WILD';
export type CardRank = 
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'SKIP' | 'REVERSE' | 'DRAW2'
  | 'WILD' | 'WILD4';

export interface Card {
  id: string;
  color: CardColor;
  rank: CardRank;
}

export interface ThemeOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  photoCount: number;
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

export interface GameWinner {
  id: string;
  name: string;
  turnCount: number;
  standings: Array<{
    playerId: string;
    name: string;
    cardCount: number;
  }>;
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
    hand: Card[];
  };
  game: {
    currentTurnPlayerId: string;
    turnDirection: 1 | -1;
    drawPileCount: number;
    topDiscard: Card | null;
    activeColor: CardColor | null;
    turnCount: number;
    winner: GameWinner | null;
  };
}

export interface InviteLink {
  slotIndex: number;
  inviteToken: string;
  inviteUrl: string;
}
