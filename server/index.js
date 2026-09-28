// index.js — Express + Socket.io server entry point

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const registerHandlers = require('./socketHandlers');

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', ts: Date.now() });
});

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`[socket] connected: ${socket.id}`);
  registerHandlers(io, socket);
});

httpServer.listen(PORT, () => {
  console.log(`\n🎨  Collab Whiteboard Server running on http://localhost:${PORT}\n`);
});
