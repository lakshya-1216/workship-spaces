require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// ── Socket.io setup ────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: true,   // reflect the request origin — allows all origins in dev
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io available to controllers via req.app.get('io')
app.set('io', io);

io.on('connection', (socket) => {
  // Client joins a conversation room to receive realtime events
  socket.on('join:conversation', (convId) => {
    socket.join(`conv:${convId}`);
  });

  socket.on('leave:conversation', (convId) => {
    socket.leave(`conv:${convId}`);
  });

  // Each authenticated client registers their userId so we can push
  // targeted events (e.g. conversation:new) to specific users
  socket.on('register:user', (userId) => {
    if (userId) socket.join(`user:${userId}`);
  });

  // Typing indicator relay
  socket.on('typing:start', ({ convId, userId }) => {
    socket.to(`conv:${convId}`).emit('typing', { conversationId: convId, userId });
  });
});

// ── Middleware ─────────────────────────────────────────────────────────────────
// Allow all origins so localhost:5173/5174/8081 all work during development.
// In production, set CLIENT_ORIGIN to your deployed frontend URL.
const allowedOrigin = process.env.CLIENT_ORIGIN;
app.use(
  cors({
    origin: allowedOrigin
      ? (origin, cb) => {
          if (!origin || origin === allowedOrigin) return cb(null, true);
          cb(new Error('CORS not allowed'));
        }
      : true, // open CORS when no CLIENT_ORIGIN is set (local dev)
    credentials: true,
  })
);
app.use(express.json());

// ── Routes ─────────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
app.use('/auth', authRoutes);

const workspaceRoutes = require('./routes/workspaceRoutes');
app.use('/workspaces', workspaceRoutes);

const bookingRoutes = require('./routes/bookingRoutes');
app.use('/bookings', bookingRoutes);

const hostRoutes = require('./routes/hostRoutes');
app.use('/host', hostRoutes);

const conversationRoutes = require('./routes/conversationRoutes');
app.use('/conversations', conversationRoutes);

// ── Root ───────────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => res.send('Workship API running'));

// ── Global Error Handler ───────────────────────────────────────────────────────
// Express 5: async route errors are automatically forwarded here.
// Guard against "headers already sent" which would throw again and crash.
app.use((err, _req, res, _next) => {
  console.error('GLOBAL ERROR:', err);
  if (res.headersSent) return; // response already started — can't send again
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
});

// ── Process-level crash guards ─────────────────────────────────────────────────
// Prevent a single bad request from killing the whole server process.
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

// ── Database + Start ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/workship';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (Socket.io enabled)`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
