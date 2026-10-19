// roomManager.js — In-memory room state management (with Skribble game support)

const { v4: uuidv4 } = require('uuid');

const rooms = new Map();

function getOrCreateRoom(roomId, options = {}) {
  if (!rooms.has(roomId)) {
    const gameMode = options.gameMode || 'freeform';
    const totalRounds = Number(options.totalRounds) || 3;
    const maxPlayers = Number(options.maxPlayers) || (gameMode === 'skribble' ? 4 : 10);
    rooms.set(roomId, {
      roomId,
      hostId: options.hostId || null,
      maxPlayers,
      users: new Map(), // socketId -> user object
      whiteboard: { actions: [] },
      messages: [], // last 100 messages
      gameMode,
      totalRounds,
      game: gameMode === 'skribble' ? createInitialGameState(totalRounds) : null,
    });
  }
  return rooms.get(roomId);
}

function createInitialGameState(totalRounds) {
  return {
    drawerId: null,
    word: null,
    maskedWord: null,
    phase: 'lobby',
    round: 0,
    totalRounds: totalRounds || 3,
    turnOrder: [],
    turnIndex: 0,
    roundEndsAt: null,
    scores: {},
    roundScores: {},
    guessedCorrectly: new Set(),
    winnerIds: null,
    roundTimer: null,
    choiceTimer: null,
    roundEndTimer: null,
    lastWord: null,
    lastReason: null,
  };
}

function setRoomMode(roomId, gameMode, totalRounds, maxPlayers) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.gameMode = gameMode || 'freeform';
  if (totalRounds) room.totalRounds = Number(totalRounds);
  if (maxPlayers) room.maxPlayers = Number(maxPlayers);
  if (room.gameMode === 'skribble' && !room.game) {
    room.game = createInitialGameState(room.totalRounds);
  }
}

function addUser(roomId, socketId, userData) {
  const room = getOrCreateRoom(roomId);
  const user = {
    id: socketId,
    name: userData.name || 'Anonymous',
    color: userData.color || '#60A5FA',
    cursor: { x: 0, y: 0 },
  };
  room.users.set(socketId, user);
  if (!room.hostId) {
    room.hostId = socketId;
  }
  return user;
}

function removeUser(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.users.delete(socketId);
  // Clean up empty rooms
  if (room.users.size === 0) {
    if (room.game) {
      if (room.game.roundTimer) clearTimeout(room.game.roundTimer);
      if (room.game.choiceTimer) clearTimeout(room.game.choiceTimer);
      if (room.game.roundEndTimer) clearTimeout(room.game.roundEndTimer);
    }
    rooms.delete(roomId);
    return null;
  }
  return room;
}

function getRoom(roomId) {
  return rooms.get(roomId) || null;
}

function getRoomSnapshot(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  const snap = {
    roomId: room.roomId,
    hostId: room.hostId,
    maxPlayers: room.maxPlayers,
    users: Array.from(room.users.values()),
    whiteboard: {
      actions: room.whiteboard.actions,
    },
    messages: room.messages || [],
    gameMode: room.gameMode,
    totalRounds: room.totalRounds,
  };

  // Include safe game state (without the secret word during drawing)
  if (room.game) {
    snap.game = getSafeGameState(room.game);
  }

  return snap;
}

function getSafeGameState(game) {
  if (!game) return null;
  return {
    drawerId: game.drawerId,
    maskedWord: game.maskedWord,
    phase: game.phase,
    round: game.round,
    totalRounds: game.totalRounds,
    turnIndex: game.turnIndex,
    roundEndsAt: game.roundEndsAt,
    scores: { ...game.scores },
    roundScores: { ...game.roundScores },
    turnOrder: [...game.turnOrder],
    guessedCorrectly: Array.from(game.guessedCorrectly),
    winnerIds: game.winnerIds || null,
    lastWord: (game.phase === 'round_end' || game.phase === 'game_over') ? game.lastWord : null,
    lastReason: game.lastReason || null,
  };
}

function addMessage(roomId, message) {
  const room = rooms.get(roomId);
  if (!room) return null;
  if (!room.messages) room.messages = [];
  room.messages.push(message);
  if (room.messages.length > 100) {
    room.messages.shift();
  }
  return message;
}

function addWhiteboardAction(roomId, action) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.whiteboard.actions.push(action);
}

function updateWhiteboardAction(roomId, actionId, patch) {
  const room = rooms.get(roomId);
  if (!room) return;
  const idx = room.whiteboard.actions.findIndex(a => a.id === actionId);
  if (idx !== -1) {
    room.whiteboard.actions[idx] = { ...room.whiteboard.actions[idx], ...patch };
  }
}

function clearWhiteboardActions(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.whiteboard.actions = [];
}

function undoUserAction(roomId, userId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  // Find and remove the last action by this user
  const actions = room.whiteboard.actions;
  for (let i = actions.length - 1; i >= 0; i--) {
    if (actions[i].userId === userId) {
      const removed = actions.splice(i, 1)[0];
      return { removed, actions };
    }
  }
  return null;
}

function updateUserCursor(roomId, socketId, cursor) {
  const room = rooms.get(roomId);
  if (!room) return;
  const user = room.users.get(socketId);
  if (user) user.cursor = cursor;
}

function getUsersArray(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.users.values());
}

// ── Skribble game state helpers ────────────────────────────────────────────

function initGame(roomId, turnOrder, totalRounds) {
  const room = rooms.get(roomId);
  if (!room) return null;

  if (room.game) {
    if (room.game.roundTimer) clearTimeout(room.game.roundTimer);
    if (room.game.choiceTimer) clearTimeout(room.game.choiceTimer);
    if (room.game.roundEndTimer) clearTimeout(room.game.roundEndTimer);
  }

  const scores = {};
  for (const uid of turnOrder) scores[uid] = 0;

  room.game = {
    drawerId: null,
    word: null,
    maskedWord: null,
    phase: 'choosing',
    round: 0, // 0-indexed turn count across all players
    totalRounds: totalRounds || room.totalRounds || 3,
    turnOrder: [...turnOrder],
    turnIndex: 0,
    roundEndsAt: null,
    scores,
    roundScores: {},
    guessedCorrectly: new Set(),
    winnerIds: null,
    roundTimer: null,
    choiceTimer: null,
    roundEndTimer: null,
    lastWord: null,
    lastReason: null,
  };

  return room.game;
}

function resetGameToLobby(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  if (room.game) {
    if (room.game.roundTimer) clearTimeout(room.game.roundTimer);
    if (room.game.choiceTimer) clearTimeout(room.game.choiceTimer);
    if (room.game.roundEndTimer) clearTimeout(room.game.roundEndTimer);
  }

  const scores = {};
  for (const uid of room.users.keys()) {
    scores[uid] = 0;
  }

  room.game = {
    drawerId: null,
    word: null,
    maskedWord: null,
    phase: 'lobby',
    round: 0,
    totalRounds: room.totalRounds,
    turnOrder: [],
    turnIndex: 0,
    roundEndsAt: null,
    scores,
    roundScores: {},
    guessedCorrectly: new Set(),
    winnerIds: null,
    roundTimer: null,
    choiceTimer: null,
    roundEndTimer: null,
    lastWord: null,
    lastReason: null,
  };

  return room.game;
}

function maskWord(word) {
  // Replace letters with underscores, preserve spaces
  return word.split('').map(ch => ch === ' ' ? ' ' : '_').join('');
}

// Update an in-progress stroke (for streaming freehand)
const activeStrokes = new Map(); // `${roomId}:${actionId}` -> action

function startStroke(roomId, action) {
  const key = `${roomId}:${action.id}`;
  activeStrokes.set(key, action);
}

function appendStrokePoint(roomId, actionId, point) {
  const key = `${roomId}:${actionId}`;
  const stroke = activeStrokes.get(key);
  if (stroke) {
    stroke.points.push(point);
    return stroke;
  }
  return null;
}

function endStroke(roomId, actionId) {
  const key = `${roomId}:${actionId}`;
  const stroke = activeStrokes.get(key);
  if (stroke) {
    activeStrokes.delete(key);
    addWhiteboardAction(roomId, stroke);
    return stroke;
  }
  return null;
}

module.exports = {
  getOrCreateRoom,
  setRoomMode,
  addUser,
  removeUser,
  getRoom,
  getRoomSnapshot,
  getSafeGameState,
  addMessage,
  addWhiteboardAction,
  updateWhiteboardAction,
  clearWhiteboardActions,
  undoUserAction,
  updateUserCursor,
  getUsersArray,
  startStroke,
  appendStrokePoint,
  endStroke,
  initGame,
  resetGameToLobby,
  maskWord,
};
