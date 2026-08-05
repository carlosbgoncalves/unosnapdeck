import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.tsx';
import { Credits } from './components/Credits.tsx';
import { CreateGameScreen } from './screens/CreateGameScreen.tsx';
import { InviteLinksScreen } from './screens/InviteLinksScreen.tsx';
import { JoinScreen } from './screens/JoinScreen.tsx';
import { LobbyScreen } from './screens/LobbyScreen.tsx';
import { UploadScreen } from './screens/UploadScreen.tsx';
import { LoadingGameScreen } from './screens/LoadingGameScreen.tsx';
import { GameTableScreen } from './screens/GameTableScreen.tsx';
import { WinScreen } from './screens/WinScreen.tsx';
import { BroadcastPayload, InviteLink, CardColor } from './types.ts';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<
    'CREATE' | 'INVITE' | 'JOIN' | 'LOBBY' | 'UPLOAD' | 'GAME' | 'WIN'
  >('CREATE');

  const [roomId, setRoomId] = useState<string>('');
  const [playerId, setPlayerId] = useState<string>('');
  const [hostToken, setHostToken] = useState<string>('');
  const [inviteToken, setInviteToken] = useState<string>('');
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
  const [broadcastState, setBroadcastState] = useState<BroadcastPayload | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const [isCreating, setIsCreating] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isGameLoaded, setIsGameLoaded] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  // Read URL routes on load
  useEffect(() => {
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);

    if (parts.length >= 2) {
      const action = parts[0];
      const rId = parts[1].toLowerCase().trim();

      setRoomId(rId);

      if (action === 'join' && parts.length >= 3) {
        setInviteToken(parts[2]);
        setCurrentScreen('JOIN');
      } else if (action === 'invite') {
        setCurrentScreen('INVITE');
      } else if (action === 'lobby') {
        setCurrentScreen('LOBBY');
      } else if (action === 'upload') {
        setCurrentScreen('UPLOAD');
      } else if (action === 'game') {
        setCurrentScreen('GAME');
      } else if (action === 'win') {
        setCurrentScreen('WIN');
      }
    }

    // Try restoring saved local session
    const savedPlayerId = localStorage.getItem('snapdeck_playerId');
    const savedRoomId = localStorage.getItem('snapdeck_roomId');
    if (savedPlayerId && savedRoomId) {
      setPlayerId(savedPlayerId);
      setRoomId(savedRoomId);
    }
  }, []);

  // Manage WebSocket connection whenever roomId & playerId are set
  useEffect(() => {
    if (!roomId || !playerId) return;

    let isDisposed = false;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const connectWS = () => {
      if (isDisposed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/${roomId}/${playerId}`;

      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onmessage = (event) => {
        try {
          const payload: BroadcastPayload = JSON.parse(event.data);
          setBroadcastState(payload);

          // Auto-navigate screen based on game status
          if (payload.status === 'PLAYING' && currentScreen !== 'GAME') {
            setCurrentScreen('GAME');
            window.history.pushState({}, '', `/game/${roomId}`);
          } else if (payload.status === 'FINISHED' && currentScreen !== 'WIN') {
            setCurrentScreen('WIN');
            window.history.pushState({}, '', `/win/${roomId}`);
          }
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      socket.onclose = () => {
        console.log('WS connection closed. Reconnecting in 2s...');
        if (!isDisposed) {
          reconnectTimer = setTimeout(connectWS, 2000);
        }
      };

      socket.onerror = (err) => {
        console.error('WS error:', err);
        socket.close();
      };
    };

    connectWS();

    return () => {
      isDisposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [roomId, playerId, currentScreen]);

  // Handle Create Game submit
  const handleCreateGame = (hostName: string, nPlayers: number, themeId: string) => {
    setIsCreating(true);
    setSessionExpired(false);

    fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostName, nPlayers, deckMode: 'cars', themeId }),
    })
      .then((res) => res.json())
      .then((data) => {
        setIsCreating(false);
        setRoomId(data.roomId);
        setHostToken(data.hostToken);
        setInviteLinks(data.inviteLinks);
        setPlayerId(data.hostPlayerId);

        localStorage.setItem('snapdeck_roomId', data.roomId);
        localStorage.setItem('snapdeck_playerId', data.hostPlayerId);

        setCurrentScreen('INVITE');
        window.history.pushState({}, '', `/invite/${data.roomId}`);
      })
      .catch((err) => {
        console.error('Failed to create game:', err);
        setIsCreating(false);
      });
  };

  // Handle Join Game success
  const handleJoinSuccess = (newPlayerId: string, _playerName: string) => {
    setPlayerId(newPlayerId);
    localStorage.setItem('snapdeck_roomId', roomId);
    localStorage.setItem('snapdeck_playerId', newPlayerId);

    setCurrentScreen('LOBBY');
    window.history.pushState({}, '', `/lobby/${roomId}`);
  };

  // Handle Start Game click (Host)
  const handleStartGame = () => {
    if (!hostToken && broadcastState?.self.isHost) {
      // Prompt or fetch host token if needed
    }

    setIsStarting(true);

    fetch(`/api/rooms/${roomId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostToken }),
    })
      .then((res) => res.json())
      .then(() => {
        setIsStarting(false);
      })
      .catch((err) => {
        console.error('Failed to start game:', err);
        setIsStarting(false);
      });
  };

  // Handle Play Card
  const handlePlayCard = (cardId: string, chosenColor?: CardColor) => {
    fetch(`/api/rooms/${roomId}/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, cardId, chosenColor }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.payload) {
          setBroadcastState(data.payload);
        }
      })
      .catch((err) => console.error('Play card error:', err));
  };

  // Handle Draw Card
  const handleDrawCard = () => {
    fetch(`/api/rooms/${roomId}/draw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.payload) {
          setBroadcastState(data.payload);
        }
      })
      .catch((err) => console.error('Draw card error:', err));
  };

  const handleQuitGame = () => {
    if (roomId && playerId) {
      fetch(`/api/rooms/${roomId}/quit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      }).catch(() => {});
    }

    localStorage.removeItem('snapdeck_roomId');
    localStorage.removeItem('snapdeck_playerId');

    setRoomId('');
    setPlayerId('');
    setBroadcastState(null);
    setSessionExpired(false);
    setCurrentScreen('CREATE');
    window.history.pushState({}, '', '/');
  };

  // Handle Leave Game (e.g. from win screen)
  const handleLeaveGame = () => {
    handleQuitGame();
  };

  const selfInfo = broadcastState?.self;

  return (
    <div className="min-h-screen bg-[#fdf8ff] text-[#1c1a23]">
      <Header
        playerName={selfInfo?.name}
        isHost={selfInfo?.isHost}
        roomId={roomId}
        onQuit={roomId && currentScreen !== 'CREATE' && currentScreen !== 'JOIN' ? handleQuitGame : undefined}
        onHomeClick={() => {
          if (!roomId) setCurrentScreen('CREATE');
        }}
      />

      {/* Session expired banner */}
      {sessionExpired && (
        <div className="fixed top-16 inset-x-0 z-50 flex justify-center px-4">
          <div className="w-full max-w-lg bg-[#e52b2b] text-white rounded-2xl px-5 py-4 shadow-xl flex items-center justify-between gap-4 border border-[#b91c1c]">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl shrink-0">warning</span>
              <div>
                <p className="font-black text-sm">Game session expired</p>
                <p className="text-xs font-medium opacity-90">The server restarted. Please create a new game.</p>
              </div>
            </div>
            <button
              onClick={handleQuitGame}
              className="shrink-0 bg-white text-[#e52b2b] font-black text-xs px-4 py-2 rounded-full hover:bg-[#fee2e2] transition-all"
            >
              New Game
            </button>
          </div>
        </div>
      )}

      {currentScreen === 'CREATE' && (
        <CreateGameScreen
          onCreateGame={handleCreateGame}
          isLoading={isCreating}
        />
      )}

      {currentScreen === 'INVITE' && (
        <InviteLinksScreen
          roomId={roomId}
          inviteLinks={inviteLinks}
          broadcastState={broadcastState}
          onContinueToLobby={() => {
            setCurrentScreen('LOBBY');
            window.history.pushState({}, '', `/lobby/${roomId}`);
          }}
        />
      )}

      {currentScreen === 'JOIN' && (
        <JoinScreen
          roomId={roomId}
          inviteToken={inviteToken}
          onJoinSuccess={handleJoinSuccess}
        />
      )}

      {currentScreen === 'LOBBY' && (
        <LobbyScreen
          roomId={roomId}
          playerId={playerId}
          isHost={selfInfo?.isHost || false}
          hostToken={hostToken}
          broadcastState={broadcastState}
          onStartGame={handleStartGame}
          isStarting={isStarting}
        />
      )}

      {currentScreen === 'UPLOAD' && (
        <UploadScreen
          roomId={roomId}
          playerId={playerId}
          quota={selfInfo?.quota || 4}
          uploadedPhotos={selfInfo?.uploadedPhotos || []}
          onUploadDone={() => {
            setCurrentScreen('LOBBY');
            window.history.pushState({}, '', `/lobby/${roomId}`);
          }}
          onRefreshState={() => {
            fetch(`/api/rooms/${roomId}/state?playerId=${playerId}`)
              .then(async (res) => {
                if (res.status === 404) {
                  setSessionExpired(true);
                  localStorage.removeItem('snapdeck_roomId');
                  localStorage.removeItem('snapdeck_playerId');
                  return;
                }
                const data = await res.json();
                if (data && !data.error) setBroadcastState(data);
              })
              .catch(() => {});
          }}
        />
      )}

      {currentScreen === 'GAME' && broadcastState && (
        !isGameLoaded ? (
          <LoadingGameScreen
            roomId={roomId}
            onComplete={() => setIsGameLoaded(true)}
          />
        ) : (
          <GameTableScreen
            roomId={roomId}
            playerId={playerId}
            broadcastState={broadcastState}
            onPlayCard={handlePlayCard}
            onDrawCard={handleDrawCard}
            onQuitGame={handleQuitGame}
          />
        )
      )}

      {currentScreen === 'WIN' && broadcastState?.game.winner && (
        <WinScreen
          winnerData={broadcastState.game.winner}
          onLeaveGame={handleLeaveGame}
        />
      )}

      <Credits />
    </div>
  );
}
