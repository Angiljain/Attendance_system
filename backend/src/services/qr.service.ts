// ============================================================
// QR Code Service - Dynamic QR generation with HMAC-SHA256
// QR codes are valid for 20 seconds only
// ============================================================

import crypto from 'crypto';
import QRCode from 'qrcode';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const QR_SECRET = process.env.QR_SECRET || 'default-qr-secret';
const QR_VALIDITY = parseInt(process.env.QR_VALIDITY_SECONDS || '20', 10);

/**
 * Generate a cryptographically signed QR payload.
 * Format: sessionId:timestamp:signature
 */
export function generateQRPayload(sessionId: string): {
  payload: string;
  signature: string;
  timestamp: number;
} {
  const timestamp = Date.now();
  const data = `${sessionId}:${timestamp}`;
  const signature = crypto
    .createHmac('sha256', QR_SECRET)
    .update(data)
    .digest('hex');

  const payload = `${sessionId}:${timestamp}:${signature}`;

  return { payload, signature, timestamp };
}

/**
 * Generate a QR code image as a data URL from the signed payload.
 */
export async function generateQRImage(sessionId: string): Promise<{
  dataUrl: string;
  payload: string;
  expiresAt: number;
}> {
  const { payload, timestamp } = generateQRPayload(sessionId);

  // Store in QRLog for audit trail
  const parts = payload.split(':');
  await prisma.qRLog.create({
    data: {
      sessionId,
      payload,
      signature: parts[2],
    },
  });

  // Generate QR code as data URL
  const dataUrl = await QRCode.toDataURL(payload, {
    width: 400,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });

  return {
    dataUrl,
    payload,
    expiresAt: timestamp + QR_VALIDITY * 1000,
  };
}

/**
 * Validate a scanned QR payload.
 * Checks: signature integrity, time window, and single-use.
 */
export async function validateQRPayload(payload: string): Promise<{
  valid: boolean;
  sessionId?: string;
  error?: string;
}> {
  // Parse payload parts
  const parts = payload.split(':');
  if (parts.length !== 3) {
    return { valid: false, error: 'Invalid QR format' };
  }

  const [sessionId, timestampStr, providedSignature] = parts;
  const timestamp = parseInt(timestampStr, 10);

  if (isNaN(timestamp)) {
    return { valid: false, error: 'Invalid timestamp in QR' };
  }

  // 1. Verify HMAC signature
  const data = `${sessionId}:${timestamp}`;
  const expectedSignature = crypto
    .createHmac('sha256', QR_SECRET)
    .update(data)
    .digest('hex');

  if (providedSignature !== expectedSignature) {
    return { valid: false, error: 'Invalid QR signature — possible tampering' };
  }

  // 2. Check time validity (within 20 seconds)
  const now = Date.now();
  const age = now - timestamp;

  if (age > QR_VALIDITY * 1000) {
    return { valid: false, error: `QR expired (${Math.round(age / 1000)}s old, max ${QR_VALIDITY}s)` };
  }

  if (age < 0) {
    return { valid: false, error: 'QR timestamp is in the future — clock tampering detected' };
  }

  // 3. Check if QR was already used (replay attack prevention)
  const qrLog = await prisma.qRLog.findFirst({
    where: { payload },
    orderBy: { createdAt: 'desc' },
  });

  if (qrLog && qrLog.usedAt) {
    return { valid: false, error: 'QR code already used — replay attack prevented' };
  }

  // Mark QR as used
  if (qrLog) {
    await prisma.qRLog.update({
      where: { id: qrLog.id },
      data: { usedAt: new Date() },
    });
  }

  return { valid: true, sessionId };
}
