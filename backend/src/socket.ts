// ============================================================
// Socket.IO Handler - Real-time events for attendance & QR
// ============================================================

import { Server as SocketServer, Socket } from 'socket.io';
import http from 'http';
import { generateQRImage } from './services/qr.service';

let io: SocketServer;

// Track active QR refresh intervals per session
const qrIntervals: Map<string, NodeJS.Timeout> = new Map();

/**
 * Initialize Socket.IO server.
 */
export function initSocket(server: http.Server): SocketServer {
  io = new SocketServer(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // ── Join a session room ──────────────────────────────────────
    socket.on('session:join', (sessionId: string) => {
      socket.join(`session:${sessionId}`);
      console.log(`[Socket] ${socket.id} joined session:${sessionId}`);
    });

    // ── Leave a session room ─────────────────────────────────────
    socket.on('session:leave', (sessionId: string) => {
      socket.leave(`session:${sessionId}`);
      console.log(`[Socket] ${socket.id} left session:${sessionId}`);
    });

    // ── Admin starts QR auto-refresh for a session ───────────────
    socket.on('qr:start', async (sessionId: string) => {
      console.log(`[Socket] QR auto-refresh started for session:${sessionId}`);

      // Clear any existing interval for this session
      if (qrIntervals.has(sessionId)) {
        clearInterval(qrIntervals.get(sessionId)!);
      }

      // Send initial QR immediately
      try {
        const qr = await generateQRImage(sessionId);
        io.to(`session:${sessionId}`).emit('qr:refreshed', qr);
      } catch (err) {
        console.error('[Socket] Initial QR error:', err);
      }

      // Refresh QR every 20 seconds
      const interval = setInterval(async () => {
        try {
          const qr = await generateQRImage(sessionId);
          io.to(`session:${sessionId}`).emit('qr:refreshed', qr);
        } catch (err) {
          console.error('[Socket] QR refresh error:', err);
        }
      }, 20_000);

      qrIntervals.set(sessionId, interval);
    });

    // ── Stop QR auto-refresh ─────────────────────────────────────
    socket.on('qr:stop', (sessionId: string) => {
      if (qrIntervals.has(sessionId)) {
        clearInterval(qrIntervals.get(sessionId)!);
        qrIntervals.delete(sessionId);
        console.log(`[Socket] QR auto-refresh stopped for session:${sessionId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Get the Socket.IO instance (for use in routes).
 */
export function getIO(): SocketServer {
  if (!io) {
    throw new Error('Socket.IO not initialized — call initSocket first');
  }
  return io;
}
