// roomManager.js — In-memory room state management (with Skribble game support)

const { v4: uuidv4 } = require('uuid');

const rooms = new Map();

function getOrCreateRoom(roomId, options = {}) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      roomId,
      users: new Map(), // socketId -> user object
      whiteboard: { actions: [] },
      messages: [], // last 100 messages
      gameMode: options.gameMode || 'freeform',
      totalRounds: options.totalRounds || 3,
      game: null, // populated when skribble game starts
    });
  }
  return rooms.get(roomId);
}

function setRoomMode(roomId, gameMode, totalRounds) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.gameMode = gameMode || 'freeform';
  room.totalRounds = totalRounds || 3;
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
  return user;
}

function removeUser(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.users.delete(socketId);
  // Clean up empty rooms
  if (room.users.size === 0) {
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
    users: Array.from(room.users.values()),
    whiteboard: {
      actions: room.whiteboard.actions,
    },
    messages: room.messages || [],
    gameMode: room.gameMode,
    totalRounds: room.totalRounds,
  };

  // Include safe game state (without the secret word)
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
    turnOrder: [...game.turnOrder],
    guessedCorrectly: Array.from(game.guessedCorrectly),
    winnerIds: game.winnerIds || null,
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

  const scores = {};
  for (const uid of turnOrder) scores[uid] = 0;

  room.game = {
    drawerId: null,
    word: null,
    maskedWord: null,
    phase: 'choosing',
    round: 0, // 0-indexed turn count across all players
    totalRounds,
    turnOrder: [...turnOrder],
    turnIndex: 0,
    roundEndsAt: null,
    scores,
    guessedCorrectly: new Set(),
    winnerIds: null,
    roundTimer: null,
    choiceTimer: null,
  };

  return room.game;
}

function resetGame(roomId) {
  const room = rooms.get(roomId);
  if (!room || !room.game) return null;

  const { turnOrder, totalRounds, scores } = room.game;
  // Reset scores
  const newScores = {};
  for (const uid of turnOrder) newScores[uid] = 0;

  room.game = {
    drawerId: null,
    word: null,
    maskedWord: null,
    phase: 'choosing',
    round: 0,
    totalRounds,
    turnOrder: [...turnOrder],
    turnIndex: 0,
    roundEndsAt: null,
    scores: newScores,
    guessedCorrectly: new Set(),
    winnerIds: null,
    roundTimer: null,
    choiceTimer: null,
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
  resetGame,
  maskWord,
};
