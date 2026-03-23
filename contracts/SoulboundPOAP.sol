// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SoulboundPOAP
 * @dev Non-transferable (soulbound) ERC-721 NFT for Proof of Attendance
 * Once minted, tokens cannot be transferred — they are permanently bound
 * to the student's wallet address.
 */
contract SoulboundPOAP is ERC721, ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;

    // Track which student+session combos have been minted
    mapping(bytes32 => bool) public mintedProofs;

    event POAPMinted(
        address indexed student,
        uint256 indexed tokenId,
        string tokenURI
    );

    constructor() ERC721("Proof of Attendance", "POAP") Ownable(msg.sender) {
        _tokenIdCounter = 0;
    }

    /**
     * @dev Mint a soulbound POAP NFT to a student
     * @param to Student wallet address
     * @param uri IPFS metadata URI
     */
    function mint(address to, string memory uri) public onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        emit POAPMinted(to, tokenId, uri);
        return tokenId;
    }

    /**
     * @dev Override transfer to make tokens soulbound (non-transferable)
     * Only minting (from address(0)) is allowed
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0)) and burning (to == address(0))
        // Block all other transfers
        if (from != address(0) && to != address(0)) {
            revert("SoulboundPOAP: tokens are non-transferable");
        }

        return super._update(to, tokenId, auth);
    }

    // Required overrides
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
