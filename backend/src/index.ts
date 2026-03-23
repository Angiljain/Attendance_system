// ============================================================
// Server Entry Point - Express + Socket.IO
// ============================================================

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import http from 'http';
import { initSocket } from './socket';

// Import routes
import authRoutes from './routes/auth';
import sessionRoutes from './routes/session';
import qrRoutes from './routes/qr';
import attendanceRoutes from './routes/attendance';

const app = express();
const server = http.createServer(app);

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/attendance', attendanceRoutes);

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── Socket.IO ────────────────────────────────────────────────
initSocket(server);

// ── Start server ─────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '4000', 10);

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║   🚀 Attendance System Backend                    ║
║   Running on http://localhost:${PORT}               ║
║   Socket.IO enabled                               ║
║   Environment: ${process.env.NODE_ENV || 'development'}                     ║
╚═══════════════════════════════════════════════════╝
  `);
});

export default server;
