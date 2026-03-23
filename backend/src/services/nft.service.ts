// ============================================================
// NFT Service - Soulbound POAP minting for attendance proof
// Optional: only active when BLOCKCHAIN_ENABLED=true
// ============================================================

import { ethers } from 'ethers';

const BLOCKCHAIN_ENABLED = process.env.BLOCKCHAIN_ENABLED === 'true';
const RPC_URL = process.env.POLYGON_RPC_URL || 'https://rpc-mumbai.maticvigil.com';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const POAP_CONTRACT_ADDRESS = process.env.POAP_CONTRACT_ADDRESS || '';

// Minimal ABI for the SoulboundPOAP contract
const POAP_ABI = [
  'function mint(address to, string memory tokenURI) public returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
];

/**
 * Build IPFS metadata JSON for the POAP NFT.
 */
export function buildPOAPMetadata(
  studentName: string,
  sessionName: string,
  timestamp: number
): object {
  return {
    name: `Proof of Attendance — ${sessionName}`,
    description: `${studentName} attended "${sessionName}" on ${new Date(timestamp).toISOString()}. This is a soulbound, non-transferable proof of physical presence.`,
    image: 'ipfs://placeholder-poap-badge-image',
    attributes: [
      { trait_type: 'Session', value: sessionName },
      { trait_type: 'Student', value: studentName },
      { trait_type: 'Timestamp', value: new Date(timestamp).toISOString() },
      { trait_type: 'Type', value: 'Soulbound POAP' },
    ],
  };
}

/**
 * Upload metadata to IPFS (simplified — use Pinata or nft.storage in production).
 * For now, returns a placeholder URI.
 */
export async function uploadMetadataToIPFS(metadata: object): Promise<string> {
  // In production, upload to Pinata/nft.storage:
  // const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {...})
  console.log('[NFT] Metadata prepared for IPFS:', JSON.stringify(metadata).substring(0, 100));
  return `ipfs://metadata-${Date.now()}`;
}

/**
 * Mint a soulbound POAP NFT for a student.
 * Returns tokenId if successful, null if blockchain is disabled.
 */
export async function mintPOAP(
  studentWalletAddress: string,
  tokenURI: string
): Promise<string | null> {
  if (!BLOCKCHAIN_ENABLED) {
    console.log('[NFT] Blockchain disabled — skipping mint');
    return null;
  }

  if (!PRIVATE_KEY || !POAP_CONTRACT_ADDRESS || !studentWalletAddress) {
    console.warn('[NFT] Missing config or wallet address — skipping mint');
    return null;
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(POAP_CONTRACT_ADDRESS, POAP_ABI, wallet);

    const tx = await contract.mint(studentWalletAddress, tokenURI);
    const receipt = await tx.wait();

    // Extract tokenId from Transfer event
    const transferEvent = receipt.logs.find(
      (log: any) => log.fragment?.name === 'Transfer'
    );
    const tokenId = transferEvent?.args?.[2]?.toString() || 'unknown';

    console.log(`[NFT] POAP minted — tokenId: ${tokenId}`);
    return tokenId;
  } catch (error) {
    console.error('[NFT] Mint failed:', error);
    return null;
  }
}
