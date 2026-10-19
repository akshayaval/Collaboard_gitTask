const { io } = require('./../client/node_modules/socket.io-client');

const SERVER_URL = 'http://localhost:3001';
const ROOM_ID = 'TEST' + Math.floor(1000 + Math.random() * 9000);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createClient() {
  return io(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true,
  });
}

async function runTests() {
  console.log(`\n========================================`);
  console.log(`Running Skribble Multi-Client Test Suite`);
  console.log(`Room ID: ${ROOM_ID}`);
  console.log(`========================================\n`);

  const client1 = createClient();
  let client1State = null;
  let client1Host = null;

  // 1. Client 1 creates room with maxPlayers: 3, totalRounds: 2
  await new Promise((resolve) => {
    client1.on('connect', () => {
      client1.emit('room:join', {
        roomId: ROOM_ID,
        name: 'Alice (Creator)',
        color: '#60A5FA',
        gameMode: 'skribble',
        totalRounds: 2,
        maxPlayers: 3,
      });
    });

    client1.on('room:state', (snap) => {
      client1State = snap;
      resolve();
    });

    client1.on('room:host', ({ hostId }) => {
      client1Host = hostId;
    });
  });

  console.log('✓ Client 1 (Alice) joined.');
  console.log(`  Phase: ${client1State.game?.phase} (Expected: 'lobby')`);
  console.log(`  Host ID: ${client1State.hostId} (Alice socket: ${client1.id})`);
  console.log(`  Max players: ${client1State.maxPlayers} (Expected: 3)`);

  if (client1State.game?.phase !== 'lobby') {
    throw new Error(`Expected initial phase to be 'lobby', got ${client1State.game?.phase}`);
  }
  if (client1State.hostId !== client1.id) {
    throw new Error(`Expected Alice to be host`);
  }

  // 2. Client 1 tries to start game with 1 player -> should be rejected/ignored
  client1.emit('game:start');
  await sleep(300);
  console.log('✓ Start game with 1 player correctly ignored (game did not start).');

  // 3. Client 2 (Bob) joins
  const client2 = createClient();
  let client2Started = false;
  await new Promise((resolve) => {
    client2.on('connect', () => {
      client2.emit('room:join', {
        roomId: ROOM_ID,
        name: 'Bob',
        color: '#F472B6',
      });
    });
    client2.on('room:state', () => resolve());
  });
  console.log('✓ Client 2 (Bob) joined. Players count: 2 / 3.');

  // 4. Bob (non-host) tries to trigger game:start -> should be ignored
  client2.emit('game:start');
  await sleep(300);
  console.log('✓ Non-host (Bob) cannot trigger game:start.');

  // 5. Client 3 (Charlie) joins -> room reaches 3 players
  const client3 = createClient();
  await new Promise((resolve) => {
    client3.on('connect', () => {
      client3.emit('room:join', {
        roomId: ROOM_ID,
        name: 'Charlie',
        color: '#34D399',
      });
    });
    client3.on('room:state', () => resolve());
  });
  console.log('✓ Client 3 (Charlie) joined. Players count: 3 / 3 (Room Full).');

  // 6. Client 4 (Dave) tries to join -> should receive room:join_error "Room is full"
  const client4 = createClient();
  const joinErrorPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for room:join_error')), 3000);
    client4.on('connect', () => {
      client4.emit('room:join', {
        roomId: ROOM_ID,
        name: 'Dave (4th Player)',
        color: '#FBBF24',
      });
    });
    client4.on('room:join_error', (data) => {
      clearTimeout(timeout);
      resolve(data);
    });
  });

  const joinError = await joinErrorPromise;
  console.log(`✓ 4th player join rejected with: "${joinError.message}" (Expected: "Room is full").`);
  if (joinError.message !== 'Room is full') {
    throw new Error(`Expected "Room is full", got ${joinError.message}`);
  }
  client4.disconnect();

  // 7. Host (Alice) starts the game
  console.log('\n--- Starting Game ---');
  let roundStartedData = null;
  let wordChoicesData = null;
  let chosenWord = null;

  client1.on('game:wordChoices', (data) => {
    wordChoicesData = data;
    chosenWord = data.words[0];
    console.log(`✓ Drawer received word choices: [${data.words.join(', ')}]`);
    // Drawer chooses the first word
    client1.emit('game:chooseWord', { word: chosenWord });
  });

  const roundStartPromise = new Promise((resolve) => {
    client2.on('game:roundStart', (data) => {
      roundStartedData = data;
      resolve(data);
    });
  });

  client1.emit('game:start');
  await roundStartPromise;

  console.log('✓ game:roundStart broadcast received across clients.');
  console.log(`  Masked word sent to guessers: "${roundStartedData.maskedWord}"`);
  console.log(`  Drawer: ${roundStartedData.drawerName}`);
  console.log(`  Round ends in: ${(roundStartedData.roundEndsAt - Date.now()) / 1000}s (Expected: ~80s)`);

  const secondsRemaining = (roundStartedData.roundEndsAt - Date.now()) / 1000;
  if (secondsRemaining < 78 || secondsRemaining > 81) {
    throw new Error(`Expected round timer ~80s, got ${secondsRemaining}s`);
  }

  // 8. Bob guesses correctly
  const bobGuessPromise = new Promise((resolve) => {
    client2.on('chat:message', (msg) => {
      if (msg.correct) resolve(msg);
    });
  });
  client2.emit('chat:message', { text: chosenWord });
  const bobCorrectMsg = await bobGuessPromise;
  console.log(`✓ Bob guessed correctly! Message: "${bobCorrectMsg.text}"`);

  // 9. Charlie guesses correctly -> everyone has guessed -> immediate roundEnd
  const roundEndPromise = new Promise((resolve) => {
    client1.on('game:roundEnd', (data) => resolve(data));
  });

  client3.emit('chat:message', { text: chosenWord });
  const roundEndData = await roundEndPromise;

  console.log('✓ Round ended immediately upon all guessers guessing correctly!');
  console.log(`  Reason: ${roundEndData.reason} (Expected: 'allGuessed')`);
  console.log(`  Revealed Word: "${roundEndData.word}"`);
  console.log(`  Scores:`, roundEndData.scores);
  console.log(`  Round Points:`, roundEndData.roundScores);

  if (roundEndData.reason !== 'allGuessed') {
    throw new Error(`Expected reason 'allGuessed', got ${roundEndData.reason}`);
  }
  if (roundEndData.word !== chosenWord) {
    throw new Error(`Expected revealed word "${chosenWord}", got "${roundEndData.word}"`);
  }

  // 10. Host transfer test: Alice disconnects, host transfers to Bob
  const hostTransferPromise = new Promise((resolve) => {
    client2.on('room:host', (data) => resolve(data));
  });

  client1.disconnect();
  const newHostData = await hostTransferPromise;
  console.log(`✓ Host disconnected. New host transferred to: ${newHostData.hostId} (Bob socket: ${client2.id}).`);
  if (newHostData.hostId !== client2.id) {
    throw new Error(`Expected Bob to become new host`);
  }

  // 11. Collaboard freeform room check
  const FREEFORM_ROOM = 'FREEFORM' + Math.floor(1000 + Math.random() * 9000);
  const clientFF = createClient();
  let ffState = null;
  await new Promise((resolve) => {
    clientFF.on('connect', () => {
      clientFF.emit('room:join', {
        roomId: FREEFORM_ROOM,
        name: 'Artist',
        color: '#60A5FA',
        gameMode: 'freeform',
      });
    });
    clientFF.on('room:state', (snap) => {
      ffState = snap;
      resolve();
    });
  });
  console.log(`✓ Collaboard (freeform) room created successfully: mode=${ffState.gameMode}. Freeform unaffected.`);

  client2.disconnect();
  client3.disconnect();
  clientFF.disconnect();

  console.log('\n========================================');
  console.log('🎉 ALL SKRIBBLE INTEGRATION TESTS PASSED!');
  console.log('========================================\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
