import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { getRoom, notifyRoomChange } from './rooms.ts';
import { BroadcastPayload } from './types.ts';

// Map: roomId -> Map<playerId, WebSocket>
const connections: Map<string, Map<string, WebSocket>> = new Map();

export function setupWebSocketServer(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const pathname = url.pathname; // Expected: /ws/:roomId/:playerId

    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 3 && parts[0] === 'ws') {
      const roomId = parts[1];
      const playerId = parts[2];

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, roomId, playerId);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket, roomId: string, playerId: string) => {
    const room = getRoom(roomId);
    if (!room) {
      ws.close(4004, 'Room not found');
      return;
    }

    const player = room.players.find((p) => p.id === playerId);
    if (!player) {
      ws.close(4003, 'Player not found');
      return;
    }

    // Register connection
    if (!connections.has(roomId)) {
      connections.set(roomId, new Map());
    }
    const roomConns = connections.get(roomId)!;
    
    // Close any previous stale socket for this player
    const existingWs = roomConns.get(playerId);
    if (existingWs && existingWs !== ws && existingWs.readyState === WebSocket.OPEN) {
      existingWs.close(4000, 'Replaced by new connection');
    }

    roomConns.set(playerId, ws);

    // Mark player reconnected
    player.disconnected = false;

    // Notify room of reconnect/connect
    notifyRoomChange(roomId);

    ws.on('close', () => {
      const currentRoomConns = connections.get(roomId);
      if (currentRoomConns && currentRoomConns.get(playerId) === ws) {
        currentRoomConns.delete(playerId);
      }

      // Mark player disconnected
      player.disconnected = true;
      notifyRoomChange(roomId);
    });

    ws.on('error', (err) => {
      console.error(`WS error for player ${playerId} in room ${roomId}:`, err);
    });
  });

  return wss;
}

export function broadcastToRoom(roomId: string, playerId: string, payload: BroadcastPayload): void {
  const roomConns = connections.get(roomId);
  if (!roomConns) return;

  const ws = roomConns.get(playerId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}
