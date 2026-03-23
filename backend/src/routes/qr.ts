// ============================================================
// QR Routes - Generate and validate dynamic QR codes
// ============================================================

import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { generateQRImage, validateQRPayload } from '../services/qr.service';

const router = Router();

/**
 * GET /api/qr/:sessionId
 * Generate a fresh QR code for a session (admin only).
 */
router.get('/:sessionId', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const qr = await generateQRImage(sessionId);

    return res.json({
      dataUrl: qr.dataUrl,
      payload: qr.payload,
      expiresAt: qr.expiresAt,
      validFor: parseInt(process.env.QR_VALIDITY_SECONDS || '20', 10),
    });
  } catch (error) {
    console.error('[QR] Generate error:', error);
    return res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

/**
 * POST /api/qr/validate
 * Validate a scanned QR payload (internal use by attendance route).
 */
router.post('/validate', authenticate, async (req: Request, res: Response) => {
  try {
    const { payload } = req.body;

    if (!payload) {
      return res.status(400).json({ error: 'QR payload is required' });
    }

    const result = await validateQRPayload(payload);
    return res.json(result);
  } catch (error) {
    console.error('[QR] Validate error:', error);
    return res.status(500).json({ error: 'QR validation failed' });
  }
});

export default router;
