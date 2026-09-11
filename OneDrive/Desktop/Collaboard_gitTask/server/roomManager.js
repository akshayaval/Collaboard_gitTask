// roomManager.js — In-memory room state management

const { v4: uuidv4 } = require('uuid');

const rooms = new Map();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      roomId,
      users: new Map(), // socketId -> user object
      whiteboard: { actions: [] },
    });
  }
  return rooms.get(roomId);
}

function addUser(roomId, socketId, userData) {
  const room = getOrCreateRoom(roomId);
  const user = {
    id: socketId,
    name: userData.name || 'Anonymous',
    color: userData.color || '#60A5FA',
    cursor: { x: 0, y: 0 },
    isSpeaking: false,
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
  return {
    roomId: room.roomId,
    users: Array.from(room.users.values()),
    whiteboard: {
      actions: room.whiteboard.actions,
    },
  };
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

function updateUserSpeaking(roomId, socketId, isSpeaking) {
  const room = rooms.get(roomId);
  if (!room) return;
  const user = room.users.get(socketId);
  if (user) user.isSpeaking = isSpeaking;
}

function getUsersArray(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.users.values());
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
  addUser,
  removeUser,
  getRoom,
  getRoomSnapshot,
  addWhiteboardAction,
  updateWhiteboardAction,
  clearWhiteboardActions,
  undoUserAction,
  updateUserCursor,
  updateUserSpeaking,
  getUsersArray,
  startStroke,
  appendStrokePoint,
  endStroke,
};
