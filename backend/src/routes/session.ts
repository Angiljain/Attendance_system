// ============================================================
// Session Routes - CRUD for attendance sessions
// ============================================================

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/sessions
 * Create a new attendance session (admin only).
 */
router.post('/', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { name, locationLat, locationLng } = req.body;

    if (!name || locationLat === undefined || locationLng === undefined) {
      return res.status(400).json({ error: 'name, locationLat, and locationLng are required' });
    }

    const session = await prisma.session.create({
      data: {
        name,
        locationLat: parseFloat(locationLat),
        locationLng: parseFloat(locationLng),
        createdBy: req.user!.id,
      },
    });

    return res.status(201).json(session);
  } catch (error) {
    console.error('[Session] Create error:', error);
    return res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * GET /api/sessions
 * List all sessions (most recent first).
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const sessions = await prisma.session.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { attendance: true },
        },
      },
    });

    return res.json(sessions);
  } catch (error) {
    console.error('[Session] List error:', error);
    return res.status(500).json({ error: 'Failed to list sessions' });
  }
});

/**
 * GET /api/sessions/:id
 * Get a single session with attendance details.
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: {
        attendance: {
          include: { student: { select: { id: true, name: true, email: true } } },
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.json(session);
  } catch (error) {
    console.error('[Session] Get error:', error);
    return res.status(500).json({ error: 'Failed to get session' });
  }
});

/**
 * PATCH /api/sessions/:id/end
 * End an active session (admin only).
 */
router.patch('/:id/end', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const session = await prisma.session.update({
      where: { id: req.params.id },
      data: {
        active: false,
        endTime: new Date(),
      },
    });

    return res.json(session);
  } catch (error) {
    console.error('[Session] End error:', error);
    return res.status(500).json({ error: 'Failed to end session' });
  }
});

export default router;
