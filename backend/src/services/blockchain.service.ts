// ============================================================
// Blockchain Service - Store attendance proof on Polygon
// Optional: only active when BLOCKCHAIN_ENABLED=true
// ============================================================

import { ethers } from 'ethers';
import crypto from 'crypto';

const BLOCKCHAIN_ENABLED = process.env.BLOCKCHAIN_ENABLED === 'true';
const RPC_URL = process.env.POLYGON_RPC_URL || 'https://rpc-mumbai.maticvigil.com';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const CONTRACT_ADDRESS = process.env.PROOF_CONTRACT_ADDRESS || '';

// Minimal ABI for the ProofOfPresence contract
const PROOF_ABI = [
  'function markAttendance(bytes32 proof) public',
  'event AttendanceMarked(address indexed marker, bytes32 proof, uint256 timestamp)',
];

/**
 * Generate a SHA-256 hash of the attendance record as on-chain proof.
 */
export function generateAttendanceHash(
  studentId: string,
  sessionId: string,
  timestamp: number
): string {
  const data = `${studentId}:${sessionId}:${timestamp}`;
  return '0x' + crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Store attendance proof hash on the Polygon blockchain.
 * Returns transaction hash if successful, null if blockchain is disabled.
 */
export async function storeProofOnChain(
  studentId: string,
  sessionId: string,
  timestamp: number
): Promise<string | null> {
  if (!BLOCKCHAIN_ENABLED) {
    console.log('[Blockchain] Disabled — skipping on-chain storage');
    return null;
  }

  if (!PRIVATE_KEY || !CONTRACT_ADDRESS) {
    console.warn('[Blockchain] Missing PRIVATE_KEY or CONTRACT_ADDRESS');
    return null;
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, PROOF_ABI, wallet);

    const proofHash = generateAttendanceHash(studentId, sessionId, timestamp);
    const tx = await contract.markAttendance(proofHash);
    const receipt = await tx.wait();

    console.log(`[Blockchain] Proof stored — tx: ${receipt.hash}`);
    return receipt.hash;
  } catch (error) {
    console.error('[Blockchain] Failed to store proof:', error);
    return null;
  }
}
