// ============================================================
// Attendance Routes - Core attendance marking and history
// Full validation pipeline: QR → Geofence → Duplicate → Store
// ============================================================

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { validateQRPayload } from '../services/qr.service';
import { isWithinGeofence } from '../services/geofence.service';
import { storeProofOnChain, generateAttendanceHash } from '../services/blockchain.service';
import { mintPOAP, buildPOAPMetadata, uploadMetadataToIPFS } from '../services/nft.service';
import { getIO } from '../socket';

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/attendance
 * Main attendance marking endpoint.
 * Validates QR → checks geofence → prevents duplicates → stores → emits real-time update.
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { payload, lat, lng } = req.body;
    const studentId = req.user!.id;

    // ── Step 1: Validate QR ──────────────────────────────────────
    const qrResult = await validateQRPayload(payload);
    if (!qrResult.valid || !qrResult.sessionId) {
      return res.status(400).json({
        status: 'INVALID_QR',
        error: qrResult.error || 'Invalid QR code',
      });
    }

    const sessionId = qrResult.sessionId;

    // ── Step 2: Check session exists and is active ───────────────
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      return res.status(404).json({ status: 'INVALID_QR', error: 'Session not found' });
    }
    if (!session.active) {
      return res.status(400).json({ status: 'INVALID_QR', error: 'Session has ended' });
    }

    // ── Step 3: Geofence validation ──────────────────────────────
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        status: 'OUTSIDE_GEOFENCE',
        error: 'GPS coordinates are required',
      });
    }

    const geoResult = isWithinGeofence(
      parseFloat(lat),
      parseFloat(lng),
      session.locationLat,
      session.locationLng
    );

    if (!geoResult.isWithin) {
      // Store the failed attempt for auditing
      await prisma.attendance.create({
        data: {
          studentId,
          sessionId,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          status: 'OUTSIDE_GEOFENCE',
        },
      }).catch(() => {}); // Ignore duplicate constraint errors

      return res.status(400).json({
        status: 'OUTSIDE_GEOFENCE',
        error: `Too far from classroom (${geoResult.distance}m away, max 70m)`,
        distance: geoResult.distance,
      });
    }

    // ── Step 4: Duplicate prevention ─────────────────────────────
    const existing = await prisma.attendance.findUnique({
      where: { studentId_sessionId: { studentId, sessionId } },
    });

    if (existing && existing.status === 'PRESENT') {
      return res.status(400).json({
        status: 'DUPLICATE',
        error: 'Attendance already marked for this session',
      });
    }

    // ── Step 5: Store attendance ─────────────────────────────────
    const timestamp = Date.now();
    let txHash: string | null = null;
    let nftTokenId: string | null = null;

    // Optional: store proof on blockchain
    txHash = await storeProofOnChain(studentId, sessionId, timestamp);

    // Optional: mint POAP NFT
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (student?.walletAddress) {
      const metadata = buildPOAPMetadata(student.name, session.name, timestamp);
      const tokenURI = await uploadMetadataToIPFS(metadata);
      nftTokenId = await mintPOAP(student.walletAddress, tokenURI);
    }

    // Upsert attendance record (handles case where failed attempt exists)
    const attendance = await prisma.attendance.upsert({
      where: { studentId_sessionId: { studentId, sessionId } },
      create: {
        studentId,
        sessionId,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        status: 'PRESENT',
        txHash,
        nftTokenId,
      },
      update: {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        status: 'PRESENT',
        txHash,
        nftTokenId,
        timestamp: new Date(),
      },
    });

    // ── Step 6: Real-time update ─────────────────────────────────
    const io = getIO();
    const stats = await getSessionStats(sessionId);

    io.to(`session:${sessionId}`).emit('attendance:marked', {
      attendance: {
        ...attendance,
        student: { id: student?.id, name: student?.name, email: student?.email },
      },
      stats,
    });

    return res.status(201).json({
      status: 'PRESENT',
      message: 'Attendance marked successfully!',
      attendance,
      txHash,
      nftTokenId,
      distance: geoResult.distance,
    });
  } catch (error) {
    console.error('[Attendance] Mark error:', error);
    return res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

/**
 * GET /api/attendance/session/:sessionId
 * Get all attendance records for a session.
 */
router.get('/session/:sessionId', authenticate, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const records = await prisma.attendance.findMany({
      where: { sessionId, status: 'PRESENT' },
      include: {
        student: { select: { id: true, name: true, email: true } },
      },
      orderBy: { timestamp: 'desc' },
    });

    const stats = await getSessionStats(sessionId);

    return res.json({ records, stats });
  } catch (error) {
    console.error('[Attendance] Session records error:', error);
    return res.status(500).json({ error: 'Failed to get attendance records' });
  }
});

/**
 * GET /api/attendance/student/:studentId
 * Get attendance history for a specific student.
 */
router.get('/student/:studentId', authenticate, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    // Students can only view their own records
    if (req.user!.role === 'STUDENT' && req.user!.id !== studentId) {
      return res.status(403).json({ error: 'Cannot view other student records' });
    }

    const records = await prisma.attendance.findMany({
      where: { studentId },
      include: {
        session: { select: { id: true, name: true, startTime: true } },
      },
      orderBy: { timestamp: 'desc' },
    });

    return res.json(records);
  } catch (error) {
    console.error('[Attendance] Student records error:', error);
    return res.status(500).json({ error: 'Failed to get student records' });
  }
});

/**
 * GET /api/attendance/stats/:sessionId
 * Get real-time attendance stats for a session.
 */
router.get('/stats/:sessionId', authenticate, async (req: Request, res: Response) => {
  try {
    const stats = await getSessionStats(req.params.sessionId);
    return res.json(stats);
  } catch (error) {
    console.error('[Attendance] Stats error:', error);
    return res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * Helper: calculate attendance statistics for a session.
 */
async function getSessionStats(sessionId: string) {
  const totalStudents = await prisma.student.count({ where: { role: 'STUDENT' } });
  const presentStudents = await prisma.attendance.count({
    where: { sessionId, status: 'PRESENT' },
  });

  return {
    totalStudents,
    presentStudents,
    percentage: totalStudents > 0 ? Math.round((presentStudents / totalStudents) * 100) : 0,
  };
}

export default router;
