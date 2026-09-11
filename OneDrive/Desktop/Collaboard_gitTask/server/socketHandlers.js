// socketHandlers.js — All Socket.io event handlers

const rm = require('./roomManager');

module.exports = function registerHandlers(io, socket) {
  let currentRoomId = null;
  let currentUserId = socket.id;

  // ── ROOM JOIN ──────────────────────────────────────────────────────────────
  socket.on('room:join', ({ roomId, name, color }) => {
    currentRoomId = roomId;
    socket.join(roomId);

    const user = rm.addUser(roomId, socket.id, { name, color });
    const snapshot = rm.getRoomSnapshot(roomId);

    // Send full state to the joining user
    socket.emit('room:state', snapshot);

    // Notify everyone else of the updated user list
    io.to(roomId).emit('room:users', rm.getUsersArray(roomId));

    // Announce join
    socket.to(roomId).emit('room:user_joined', user);

    console.log(`[+] ${name} (${socket.id}) joined room ${roomId}`);
  });

  // ── WHITEBOARD DRAWING ─────────────────────────────────────────────────────
  socket.on('draw:start', (data) => {
    if (!currentRoomId) return;
    const action = {
      id: data.actionId,
      type: 'stroke',
      points: [data.point],
      color: data.color,
      width: data.width,
      userId: socket.id,
      ts: Date.now(),
    };
    rm.startStroke(currentRoomId, action);
    socket.to(currentRoomId).emit('draw:start', { ...data, userId: socket.id });
  });

  socket.on('draw:move', (data) => {
    if (!currentRoomId) return;
    rm.appendStrokePoint(currentRoomId, data.actionId, data.point);
    socket.to(currentRoomId).emit('draw:move', { ...data, userId: socket.id });
  });

  socket.on('draw:end', (data) => {
    if (!currentRoomId) return;
    const stroke = rm.endStroke(currentRoomId, data.actionId);
    if (stroke) {
      socket.to(currentRoomId).emit('draw:end', { actionId: data.actionId, userId: socket.id });
    }
  });

  socket.on('shape:add', (data) => {
    if (!currentRoomId) return;
    const action = { ...data.action, userId: socket.id, ts: Date.now() };
    rm.addWhiteboardAction(currentRoomId, action);
    socket.to(currentRoomId).emit('shape:add', { action, userId: socket.id });
  });

  socket.on('text:add', (data) => {
    if (!currentRoomId) return;
    const action = { ...data.action, userId: socket.id, ts: Date.now() };
    rm.addWhiteboardAction(currentRoomId, action);
    socket.to(currentRoomId).emit('text:add', { action, userId: socket.id });
  });

  socket.on('text:edit', ({ actionId, text }) => {
    if (!currentRoomId) return;
    rm.updateWhiteboardAction(currentRoomId, actionId, { text });
    socket.to(currentRoomId).emit('text:edit', { actionId, text, userId: socket.id });
  });

  socket.on('action:update', ({ actionId, patch }) => {
    if (!currentRoomId) return;
    rm.updateWhiteboardAction(currentRoomId, actionId, patch);
    socket.to(currentRoomId).emit('action:update', { actionId, patch, userId: socket.id });
  });

  socket.on('action:undo', () => {
    if (!currentRoomId) return;
    const result = rm.undoUserAction(currentRoomId, socket.id);
    if (result) {
      // Broadcast full action list so everyone re-renders
      io.to(currentRoomId).emit('whiteboard:sync', result.actions);
    }
  });

  socket.on('whiteboard:clear', () => {
    if (!currentRoomId) return;
    rm.clearWhiteboardActions(currentRoomId);
    io.to(currentRoomId).emit('whiteboard:sync', []);
  });

  // ── CURSOR MOVEMENT ────────────────────────────────────────────────────────
  socket.on('cursor:move', ({ x, y }) => {
    if (!currentRoomId) return;
    rm.updateUserCursor(currentRoomId, socket.id, { x, y });
    socket.to(currentRoomId).emit('cursor:move', { userId: socket.id, x, y });
  });

  // ── VOICE / WebRTC SIGNALING ───────────────────────────────────────────────
  socket.on('voice:offer', ({ to, offer }) => {
    io.to(to).emit('voice:offer', { from: socket.id, offer });
  });

  socket.on('voice:answer', ({ to, answer }) => {
    io.to(to).emit('voice:answer', { from: socket.id, answer });
  });

  socket.on('voice:ice', ({ to, candidate }) => {
    io.to(to).emit('voice:ice', { from: socket.id, candidate });
  });

  socket.on('voice:speaking', ({ isSpeaking }) => {
    if (!currentRoomId) return;
    rm.updateUserSpeaking(currentRoomId, socket.id, isSpeaking);
    socket.to(currentRoomId).emit('voice:speaking', { userId: socket.id, isSpeaking });
  });

  // ── DISCONNECT ─────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    if (!currentRoomId) return;
    const remainingRoom = rm.removeUser(currentRoomId, socket.id);
    if (remainingRoom !== null) {
      io.to(currentRoomId).emit('room:users', rm.getUsersArray(currentRoomId));
      io.to(currentRoomId).emit('room:user_left', { userId: socket.id });
    }
    console.log(`[-] ${socket.id} left room ${currentRoomId}`);
  });
};
