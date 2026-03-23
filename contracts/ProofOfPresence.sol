// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ProofOfPresence
 * @dev Stores attendance proof hashes on-chain (Polygon)
 * Each hash = SHA256(studentId + sessionId + timestamp)
 */
contract ProofOfPresence {
    // Mapping: proof hash => timestamp when stored
    mapping(bytes32 => uint256) public proofs;
    
    // Mapping: proof hash => address of marker
    mapping(bytes32 => address) public proofMarkers;

    // Events
    event AttendanceMarked(
        address indexed marker,
        bytes32 indexed proof,
        uint256 timestamp
    );

    /**
     * @dev Store an attendance proof hash on-chain
     * @param proof SHA-256 hash of attendance record
     */
    function markAttendance(bytes32 proof) public {
        require(proofs[proof] == 0, "Proof already recorded");
        
        proofs[proof] = block.timestamp;
        proofMarkers[proof] = msg.sender;

        emit AttendanceMarked(msg.sender, proof, block.timestamp);
    }

    /**
     * @dev Verify if a proof hash exists on-chain
     * @param proof The hash to verify
     * @return exists Whether the proof is recorded
     * @return timestamp When the proof was recorded
     * @return marker Who recorded the proof
     */
    function verifyProof(bytes32 proof) public view returns (
        bool exists,
        uint256 timestamp,
        address marker
    ) {
        exists = proofs[proof] != 0;
        timestamp = proofs[proof];
        marker = proofMarkers[proof];
    }
}
