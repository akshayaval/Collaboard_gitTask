// socketHandlers.js — Socket.io event handlers (Collaboard + Skribble modes)

const rm = require('./roomManager');
const { v4: uuidv4 } = require('uuid');
const { pickWords } = require('./wordList');

const ROUND_DURATION_MS = 80_000;  // 80 seconds per drawing turn
const CHOICE_DURATION_MS = 10_000; // 10 seconds to pick a word
const ROUND_END_DELAY_MS = 5_000;  // 5 second pause between rounds
const MAX_POINTS = 100;

// ── Skribble helpers ────────────────────────────────────────────────────────

function computePoints(roundEndsAt) {
  const remaining = Math.max(0, roundEndsAt - Date.now());
  const fraction = remaining / ROUND_DURATION_MS;
  return Math.max(10, Math.round(MAX_POINTS * fraction));
}

/** Start the "choosing" phase for the current turn's drawer */
function startChoosing(io, roomId) {
  const room = rm.getRoom(roomId);
  if (!room || !room.game) return;

  const game = room.game;
  const totalTurns = game.turnOrder.length * game.totalRounds;

  // Check game over
  if (game.round >= totalTurns) {
    endGame(io, roomId);
    return;
  }

  // Figure out who's drawing this turn
  const drawerIndex = game.turnIndex % game.turnOrder.length;
  const drawerId = game.turnOrder[drawerIndex];

  // Verify drawer is still in room
  const drawerPresent = room.users.has(drawerId);
  if (!drawerPresent) {
    // Skip absent player
    game.round += 1;
    game.turnIndex = (game.turnIndex + 1) % game.turnOrder.length;
    startChoosing(io, roomId);
    return;
  }

  game.drawerId = drawerId;
  game.word = null;
  game.maskedWord = null;
  game.phase = 'choosing';
  game.guessedCorrectly = new Set();
  game.roundEndsAt = null;

  const words = pickWords(3);

  // Emit word choices ONLY to drawer
  const drawerSocket = getSocketById(io, drawerId);
  if (drawerSocket) {
    drawerSocket.emit('game:wordChoices', {
      words,
      timeoutMs: CHOICE_DURATION_MS,
    });
  }

  // Notify everyone of drawing phase starting (who's drawing, but no word yet)
  io.to(roomId).emit('game:choosingStart', {
    drawerId,
    drawerName: room.users.get(drawerId)?.name || 'Someone',
    round: game.round + 1,
    totalTurns,
    timeoutMs: CHOICE_DURATION_MS,
  });

  // Auto-pick if drawer doesn't choose in time
  if (game.choiceTimer) clearTimeout(game.choiceTimer);
  game.choiceTimer = setTimeout(() => {
    const r = rm.getRoom(roomId);
    if (!r || !r.game || r.game.phase !== 'choosing' || r.game.drawerId !== drawerId) return;
    // Auto-pick first word
    handleWordChosen(io, roomId, drawerId, words[0]);
  }, CHOICE_DURATION_MS);
}

/** Called when the drawer picks (or is auto-assigned) a word */
function handleWordChosen(io, roomId, drawerId, word) {
  const room = rm.getRoom(roomId);
  if (!room || !room.game) return;

  const game = room.game;
  if (game.phase !== 'choosing' || game.drawerId !== drawerId) return;

  // Clear choice timer
  if (game.choiceTimer) { clearTimeout(game.choiceTimer); game.choiceTimer = null; }

  game.word = word;
  game.maskedWord = rm.maskWord(word);
  game.phase = 'drawing';
  game.roundEndsAt = Date.now() + ROUND_DURATION_MS;

  // Tell the drawer their confirmed word
  const drawerSocket = getSocketById(io, drawerId);
  if (drawerSocket) {
    drawerSocket.emit('game:yourWord', { word, roundEndsAt: game.roundEndsAt });
  }

  // Tell everyone else: masked word + timer
  io.to(roomId).emit('game:roundStart', {
    drawerId,
    drawerName: room.users.get(drawerId)?.name || 'Someone',
    maskedWord: game.maskedWord,
    roundEndsAt: game.roundEndsAt,
    round: game.round + 1,
    totalTurns: game.turnOrder.length * game.totalRounds,
  });

  // Clear canvas for the new round
  rm.clearWhiteboardActions(roomId);
  io.to(roomId).emit('whiteboard:sync', []);

  // Set round end timer
  if (game.roundTimer) clearTimeout(game.roundTimer);
  game.roundTimer = setTimeout(() => {
    const r = rm.getRoom(roomId);
    if (!r || !r.game || r.game.phase !== 'drawing' || r.game.drawerId !== drawerId) return;
    endRound(io, roomId);
  }, ROUND_DURATION_MS);
}

/** End the current round (timer expired or everyone guessed) */
function endRound(io, roomId) {
  const room = rm.getRoom(roomId);
  if (!room || !room.game) return;

  const game = room.game;
  if (game.phase !== 'drawing') return;

  // Clear timers
  if (game.roundTimer) { clearTimeout(game.roundTimer); game.roundTimer = null; }
  if (game.choiceTimer) { clearTimeout(game.choiceTimer); game.choiceTimer = null; }

  game.phase = 'round_end';

  // Drawer gets partial points if at least one person guessed
  const guessCount = game.guessedCorrectly.size;
  if (guessCount > 0 && game.drawerId) {
    const drawerBonus = Math.round((guessCount / (room.users.size - 1)) * 50);
    game.scores[game.drawerId] = (game.scores[game.drawerId] || 0) + drawerBonus;
  }

  io.to(roomId).emit('game:roundEnd', {
    word: game.word,
    scores: { ...game.scores },
    drawerId: game.drawerId,
  });

  // Clear canvas
  rm.clearWhiteboardActions(roomId);
  io.to(roomId).emit('whiteboard:sync', []);

  // Advance to next turn after delay
  setTimeout(() => {
    const r = rm.getRoom(roomId);
    if (!r || !r.game) return;

    r.game.round += 1;
    r.game.turnIndex = (r.game.turnIndex + 1) % r.game.turnOrder.length;

    startChoosing(io, roomId);
  }, ROUND_END_DELAY_MS);
}

/** Called when all turns exhausted */
function endGame(io, roomId) {
  const room = rm.getRoom(roomId);
  if (!room || !room.game) return;

  const game = room.game;
  if (game.roundTimer) { clearTimeout(game.roundTimer); game.roundTimer = null; }
  if (game.choiceTimer) { clearTimeout(game.choiceTimer); game.choiceTimer = null; }

  game.phase = 'game_over';

  // Find winners
  const scores = game.scores;
  const maxScore = Math.max(...Object.values(scores));
  const winnerIds = Object.entries(scores)
    .filter(([, s]) => s === maxScore)
    .map(([uid]) => uid);

  game.winnerIds = winnerIds;

  // Build winner names
  const winnerNames = winnerIds.map(uid => room.users.get(uid)?.name || 'Unknown');

  io.to(roomId).emit('game:over', {
    winnerIds,
    winnerNames,
    scores: { ...scores },
  });
}

/** Get a socket by its ID from the io server */
function getSocketById(io, socketId) {
  return io.sockets.sockets.get(socketId) || null;
}

/** Try to start a Skribble game if conditions are met (2+ players, no game running) */
function tryStartSkribble(io, roomId) {
  const room = rm.getRoom(roomId);
  if (!room || room.gameMode !== 'skribble') return;
  if (room.users.size < 2) return;
  if (room.game && room.game.phase !== 'game_over') return;

  const turnOrder = Array.from(room.users.keys());
  rm.initGame(roomId, turnOrder, room.totalRounds);

  io.to(roomId).emit('game:starting', {
    turnOrder,
    totalRounds: room.totalRounds,
    scores: room.game.scores,
  });

  startChoosing(io, roomId);
}

// ── Main handler registration ───────────────────────────────────────────────

module.exports = function registerHandlers(io, socket) {
  let currentRoomId = null;
  let currentUserId = socket.id;

  // ── ROOM JOIN ──────────────────────────────────────────────────────────────
  socket.on('room:join', ({ roomId, name, color, gameMode, totalRounds }) => {
    if (!roomId) return;
    currentRoomId = roomId;
    socket.join(roomId);

    // If this is the first join, set the mode; otherwise preserve existing mode
    const existingRoom = rm.getRoom(roomId);
    if (!existingRoom) {
      rm.getOrCreateRoom(roomId, {
        gameMode: gameMode || 'freeform',
        totalRounds: Number(totalRounds) || 3,
      });
    } else if (gameMode && !existingRoom.game) {
      // Allow updating mode before game starts
      rm.setRoomMode(roomId, gameMode, Number(totalRounds) || existingRoom.totalRounds);
    }

    const user = rm.addUser(roomId, socket.id, { name, color });
    const snapshot = rm.getRoomSnapshot(roomId);

    // Send full state to the joining user
    socket.emit('room:state', snapshot);

    // Notify everyone else of the updated user list
    io.to(roomId).emit('room:users', rm.getUsersArray(roomId));

    // Announce join
    socket.to(roomId).emit('room:user_joined', user);

    console.log(`[+] ${name} (${socket.id}) joined room ${roomId} (${snapshot.gameMode})`);

    // If skribble room: try to start game (delayed slightly to let state propagate)
    if (snapshot.gameMode === 'skribble') {
      setTimeout(() => tryStartSkribble(io, roomId), 500);
    }
  });

  // ── WHITEBOARD DRAWING ─────────────────────────────────────────────────────

  socket.on('draw:start', (data) => {
    if (!currentRoomId) return;
    const room = rm.getRoom(currentRoomId);
    if (!room) return;

    // Skribble: only drawer can draw
    if (room.gameMode === 'skribble') {
      if (!room.game || room.game.drawerId !== socket.id || room.game.phase !== 'drawing') return;
    }

    const action = {
      id: data.actionId,
      type: data.tool === 'eraser' ? 'erase' : (data.type || 'stroke'),
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
    const room = rm.getRoom(currentRoomId);
    if (!room) return;

    if (room.gameMode === 'skribble') {
      if (!room.game || room.game.drawerId !== socket.id || room.game.phase !== 'drawing') return;
    }

    rm.appendStrokePoint(currentRoomId, data.actionId, data.point);
    socket.to(currentRoomId).emit('draw:move', { ...data, userId: socket.id });
  });

  socket.on('draw:end', (data) => {
    if (!currentRoomId) return;
    const room = rm.getRoom(currentRoomId);
    if (!room) return;

    if (room.gameMode === 'skribble') {
      if (!room.game || room.game.drawerId !== socket.id || room.game.phase !== 'drawing') return;
    }

    const stroke = rm.endStroke(currentRoomId, data.actionId);
    if (stroke) {
      socket.to(currentRoomId).emit('draw:end', { actionId: data.actionId, userId: socket.id });
    }
  });

  socket.on('shape:add', (data) => {
    if (!currentRoomId) return;
    const room = rm.getRoom(currentRoomId);
    if (!room) return;

    if (room.gameMode === 'skribble') {
      if (!room.game || room.game.drawerId !== socket.id || room.game.phase !== 'drawing') return;
    }

    const action = { ...data.action, userId: socket.id, ts: Date.now() };
    rm.addWhiteboardAction(currentRoomId, action);
    socket.to(currentRoomId).emit('shape:add', { action, userId: socket.id });
  });

  socket.on('text:add', (data) => {
    if (!currentRoomId) return;
    const room = rm.getRoom(currentRoomId);
    if (!room) return;

    if (room.gameMode === 'skribble') {
      if (!room.game || room.game.drawerId !== socket.id || room.game.phase !== 'drawing') return;
    }

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

  // ── CHAT ───────────────────────────────────────────────────────────────────
  socket.on('chat:message', (payload) => {
    if (!currentRoomId || !payload || typeof payload.text !== 'string') return;
    const text = payload.text.trim();
    if (!text) return;
    const cappedText = text.slice(0, 500);

    const room = rm.getRoom(currentRoomId);
    if (!room) return;
    const user = room.users.get(socket.id);
    const name = user ? user.name : 'Anonymous';
    const color = user ? user.color : '#60A5FA';

    // ── Skribble guess handling ──────────────────────────────────────────────
    if (room.gameMode === 'skribble' && room.game && room.game.phase === 'drawing') {
      const game = room.game;

      // Block drawer from chatting during their turn
      if (socket.id === game.drawerId) {
        // Send them a private system notice
        socket.emit('chat:message', {
          id: uuidv4(),
          userId: '__system__',
          name: 'Game',
          color: '#8B5CF6',
          text: '🎨 You\'re drawing — no chatting during your turn!',
          ts: Date.now(),
          system: true,
        });
        return;
      }

      // Check if they already guessed correctly
      if (game.guessedCorrectly.has(socket.id)) {
        // They can still chat but can't win again — broadcast normally
        const message = {
          id: uuidv4(),
          userId: socket.id,
          name,
          color,
          text: cappedText,
          ts: Date.now(),
        };
        rm.addMessage(currentRoomId, message);
        io.to(currentRoomId).emit('chat:message', message);
        return;
      }

      // Check if guess is correct (case-insensitive)
      if (cappedText.toLowerCase() === game.word.toLowerCase()) {
        // Correct guess!
        const points = computePoints(game.roundEndsAt);
        game.scores[socket.id] = (game.scores[socket.id] || 0) + points;
        game.guessedCorrectly.add(socket.id);

        // Send private "correct!" message to guesser
        socket.emit('chat:message', {
          id: uuidv4(),
          userId: '__system__',
          name: 'Game',
          color: '#10B981',
          text: `✅ You guessed it! +${points} points`,
          ts: Date.now(),
          system: true,
          correct: true,
        });

        // Broadcast score update to everyone
        io.to(currentRoomId).emit('game:correctGuess', {
          userId: socket.id,
          name,
          points,
          scores: { ...game.scores },
        });

        // Check if everyone (except drawer) has guessed
        const nonDrawers = Array.from(room.users.keys()).filter(uid => uid !== game.drawerId);
        const allGuessed = nonDrawers.length > 0 && nonDrawers.every(uid => game.guessedCorrectly.has(uid));
        if (allGuessed) {
          endRound(io, currentRoomId);
        }
        return;
      }

      // Wrong guess — broadcast as normal chat so everyone sees the attempt
      const message = {
        id: uuidv4(),
        userId: socket.id,
        name,
        color,
        text: cappedText,
        ts: Date.now(),
      };
      rm.addMessage(currentRoomId, message);
      io.to(currentRoomId).emit('chat:message', message);
      return;
    }

    // ── Normal chat (freeform mode, or non-drawing skribble phases) ──────────
    const message = {
      id: uuidv4(),
      userId: socket.id,
      name,
      color,
      text: cappedText,
      ts: Date.now(),
    };

    rm.addMessage(currentRoomId, message);
    io.to(currentRoomId).emit('chat:message', message);
  });

  socket.on('chat:typing', (payload) => {
    if (!currentRoomId || !payload) return;
    const isTyping = Boolean(payload.isTyping);
    socket.to(currentRoomId).emit('chat:typing', {
      userId: socket.id,
      isTyping,
    });
  });

  // ── SKRIBBLE: Word chosen by drawer ───────────────────────────────────────
  socket.on('game:chooseWord', ({ word }) => {
    if (!currentRoomId || !word) return;
    const room = rm.getRoom(currentRoomId);
    if (!room || room.gameMode !== 'skribble') return;

    handleWordChosen(io, currentRoomId, socket.id, word);
  });

  // ── SKRIBBLE: Restart game ─────────────────────────────────────────────────
  socket.on('game:restart', () => {
    if (!currentRoomId) return;
    const room = rm.getRoom(currentRoomId);
    if (!room || room.gameMode !== 'skribble') return;
    if (!room.game || room.game.phase !== 'game_over') return;

    // Clear any lingering timers
    if (room.game.roundTimer) clearTimeout(room.game.roundTimer);
    if (room.game.choiceTimer) clearTimeout(room.game.choiceTimer);

    // Reset game with current players
    const turnOrder = Array.from(room.users.keys());
    rm.initGame(currentRoomId, turnOrder, room.totalRounds);

    // Clear canvas
    rm.clearWhiteboardActions(currentRoomId);
    io.to(currentRoomId).emit('whiteboard:sync', []);

    const r = rm.getRoom(currentRoomId);
    io.to(currentRoomId).emit('game:starting', {
      turnOrder,
      totalRounds: room.totalRounds,
      scores: r.game.scores,
    });

    startChoosing(io, currentRoomId);
  });

  // ── DISCONNECT ─────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    if (!currentRoomId) return;
    socket.to(currentRoomId).emit('chat:typing', {
      userId: socket.id,
      isTyping: false,
    });

    const room = rm.getRoom(currentRoomId);
    const wasDrawer = room?.game?.drawerId === socket.id;

    const remainingRoom = rm.removeUser(currentRoomId, socket.id);
    if (remainingRoom !== null) {
      io.to(currentRoomId).emit('room:users', rm.getUsersArray(currentRoomId));
      io.to(currentRoomId).emit('room:user_left', { userId: socket.id });

      // If in skribble and the drawer left during drawing, end the round
      if (remainingRoom.gameMode === 'skribble' && remainingRoom.game) {
        const g = remainingRoom.game;
        if (wasDrawer && g.phase === 'drawing') {
          endRound(io, currentRoomId);
        } else if (g.phase === 'choosing' && wasDrawer) {
          // Advance to next player
          g.round += 1;
          g.turnIndex = (g.turnIndex + 1) % g.turnOrder.length;
          startChoosing(io, currentRoomId);
        }
      }
    }
    console.log(`[-] ${socket.id} left room ${currentRoomId}`);
  });
};
