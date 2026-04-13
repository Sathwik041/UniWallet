import { useState, useEffect } from "react";
import NFTCard from "./NFTCard";
import NFTDetail from "./NFTDetail";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** List of public IPFS gateways to try, in priority order */
const IPFS_GATEWAYS = [
    "https://ipfs.io/ipfs/",
    "https://cloudflare-ipfs.com/ipfs/",
    "https://gateway.pinata.cloud/ipfs/",
    "https://dweb.link/ipfs/",
];

/**
 * Convert an IPFS URI (ipfs://CID or ipfs://CID/path) to an HTTPS gateway URL.
 * If the input is already an HTTP(S) URL, return it as-is.
 * Also handles Pinata-specific gateway URLs and data URIs.
 */
const resolveIpfsUrl = (uri) => {
    if (!uri) return "";

    // data: URIs (e.g. on-chain SVG NFTs) — use directly
    if (uri.startsWith("data:")) return uri;

    // Already an HTTP(S) URL — use directly
    if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;

    // ipfs:// protocol → replace with gateway
    if (uri.startsWith("ipfs://")) {
        const path = uri.replace("ipfs://", "");
        return `${IPFS_GATEWAYS[0]}${path}`;
    }

    // Raw CID (starts with Qm or bafy) — treat as IPFS
    if (uri.startsWith("Qm") || uri.startsWith("bafy")) {
        return `${IPFS_GATEWAYS[0]}${uri}`;
    }

    return uri;
};

/**
 * ERC-721 tokenURI(uint256) function selector = 0xc87b56dd
 * ERC-1155 uri(uint256) function selector     = 0x0e89341c
 *
 * Both take a uint256 tokenId and return a string.
 */
const TOKEN_URI_SELECTOR = "0xc87b56dd";
const ERC1155_URI_SELECTOR = "0x0e89341c";

/** Encode a hex tokenId into a 32-byte padded argument for eth_call */
const encodeTokenId = (tokenIdHex) => {
    // tokenIdHex comes from Alchemy as e.g. "0x01" or "0x0000…01"
    const stripped = tokenIdHex.replace(/^0x/i, "");
    return stripped.padStart(64, "0");
};

/** Decode an ABI-encoded string return value from eth_call */
const decodeStringResult = (hex) => {
    if (!hex || hex === "0x" || hex.length < 130) return null;
    const data = hex.replace(/^0x/, "");
    // First 32 bytes = offset, next 32 bytes = length, then the string bytes
    const length = parseInt(data.substring(64, 128), 16);
    if (length === 0 || isNaN(length)) return null;
    const strHex = data.substring(128, 128 + length * 2);
    try {
        return decodeURIComponent(
            strHex.replace(/../g, (pair) => `%${pair}`)
        );
    } catch {
        // Fallback: manual byte decode
        const bytes = [];
        for (let i = 0; i < strHex.length; i += 2) {
            bytes.push(parseInt(strHex.substring(i, i + 2), 16));
        }
        return new TextDecoder().decode(new Uint8Array(bytes));
    }
};

/**
 * Fetch the tokenURI for a given NFT by calling the contract on-chain.
 * Tries the ERC-721 tokenURI selector first, then falls back to ERC-1155 uri.
 */
const fetchTokenUri = async (rpcUrl, contractAddress, tokenIdHex) => {
    const paddedTokenId = encodeTokenId(tokenIdHex);

    for (const selector of [TOKEN_URI_SELECTOR, ERC1155_URI_SELECTOR]) {
        try {
            const res = await fetch(rpcUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: 1,
                    method: "eth_call",
                    params: [
                        { to: contractAddress, data: `${selector}${paddedTokenId}` },
                        "latest",
                    ],
                }),
            });
            const json = await res.json();
            if (json.result && json.result !== "0x") {
                const decoded = decodeStringResult(json.result);
                if (decoded) return decoded;
            }
        } catch {
            // Try next selector
        }
    }
    return null;
};

/**
 * Fetch the JSON metadata from a tokenURI (supports IPFS, HTTP, data URIs).
 */
const fetchMetadata = async (tokenUri) => {
    if (!tokenUri) return null;

    // Handle data:application/json;base64,... URIs (on-chain metadata)
    if (tokenUri.startsWith("data:application/json;base64,")) {
        try {
            const base64 = tokenUri.split(",")[1];
            return JSON.parse(atob(base64));
        } catch {
            return null;
        }
    }
    // Handle data:application/json,... URIs (URL-encoded JSON)
    if (tokenUri.startsWith("data:application/json,")) {
        try {
            const jsonStr = decodeURIComponent(tokenUri.split(",")[1]);
            return JSON.parse(jsonStr);
        } catch {
            return null;
        }
    }

    const url = resolveIpfsUrl(tokenUri);
    if (!url) return null;

    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
};

// ── Component ────────────────────────────────────────────────────────────────

const EVMNFTs = ({ address, onClose, selectednet, chainConfig }) => {
    const [nfts, setNfts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedNft, setSelectedNft] = useState(null);

    useEffect(() => {
        const fetchNFTs = async () => {
            setLoading(true);
            setError(null);

            try {
                // Monad and other newer chains may not have Alchemy NFT indexing yet
                if (chainConfig && chainConfig.name !== "Ethereum") {
                    setNfts([]);
                    setError(`NFT fetching for ${chainConfig.name} is not supported yet.`);
                    setLoading(false);
                    return;
                }

                // We use alchemy_getAssetTransfers with erc721 + erc1155 categories
                // instead of the /nft/v3/ REST endpoint, because the REST NFT API
                // requires a separate Alchemy plan. The JSON-RPC transfers endpoint
                // works on the same /v2/ URL you already use for balances and history.
                //
                // Strategy:
                // 1. Fetch all ERC-721/1155 transfers TO this address (received NFTs)
                // 2. Fetch all ERC-721/1155 transfers FROM this address (sent NFTs) 
                // 3. Track which NFTs are still held (received but not sent away)
                // 4. For each held NFT, call tokenURI() on the contract and fetch metadata
                const rpcUrl = chainConfig.rpcUrls[selectednet] || chainConfig.rpcUrls.Mainnet;

                const makeBody = (direction) => ({
                    jsonrpc: "2.0",
                    id: 1,
                    method: "alchemy_getAssetTransfers",
                    params: [{
                        fromBlock: "0x0",
                        toBlock: "latest",
                        ...(direction === "to" ? { toAddress: address } : { fromAddress: address }),
                        category: ["erc721", "erc1155"],
                        withMetadata: true,
                        excludeZeroValue: false,
                        maxCount: "0x64" // 100 transfers
                    }]
                });

                const [resToAddr, resFromAddr] = await Promise.all([
                    fetch(rpcUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(makeBody("to"))
                    }),
                    fetch(rpcUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(makeBody("from"))
                    })
                ]);

                const dataTo = await resToAddr.json();
                const dataFrom = await resFromAddr.json();

                if (dataTo.error || dataFrom.error) {
                    throw new Error(dataTo.error?.message || dataFrom.error?.message || "Alchemy error");
                }

                const received = dataTo.result?.transfers || [];
                const sent = dataFrom.result?.transfers || [];

                // Build a set of NFTs that were sent away (contract:tokenId)
                // so we can exclude them from the "received" list.
                const sentKeys = new Set();
                sent.forEach(tx => {
                    if (tx.rawContract?.address && tx.tokenId) {
                        sentKeys.add(`${tx.rawContract.address.toLowerCase()}:${tx.tokenId}`);
                    }
                });

                // Keep only NFTs that were received and NOT subsequently sent
                const heldNfts = received.filter(tx => {
                    if (!tx.rawContract?.address || !tx.tokenId) return false;
                    const key = `${tx.rawContract.address.toLowerCase()}:${tx.tokenId}`;
                    return !sentKeys.has(key);
                });

                // Deduplicate (same NFT may have been received multiple times)
                const seen = new Set();
                const uniqueNfts = heldNfts.filter(tx => {
                    const key = `${tx.rawContract.address.toLowerCase()}:${tx.tokenId}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });

                // ── Fetch on-chain metadata for each NFT ────────────────────
                // Call tokenURI()/uri() on each contract, then fetch the JSON.
                const metadataPromises = uniqueNfts.map(async (tx) => {
                    const contractAddr = tx.rawContract?.address;
                    const tokenIdHex = tx.tokenId;

                    let image = "";
                    let metaName = "";
                    let description = "";
                    let attributes = [];

                    try {
                        const tokenUri = await fetchTokenUri(rpcUrl, contractAddr, tokenIdHex);
                        if (tokenUri) {
                            const metadata = await fetchMetadata(tokenUri);
                            if (metadata) {
                                // Resolve image field (check image, image_url, animation_url)
                                const rawImage = metadata.image || metadata.image_url || metadata.image_data || "";
                                image = resolveIpfsUrl(rawImage);
                                metaName = metadata.name || "";
                                description = metadata.description || "";
                                attributes = metadata.attributes || [];
                            }
                        }
                    } catch (err) {
                        console.warn(`Failed to fetch metadata for ${contractAddr} #${tokenIdHex}:`, err);
                    }

                    const fallbackName = tx.asset
                        ? `${tx.asset} #${tokenIdHex}`
                        : `NFT #${tokenIdHex}`;

                    return {
                        name: metaName || fallbackName,
                        image,
                        description,
                        collection: tx.asset || "Unknown Collection",
                        tokenId: tokenIdHex,
                        contractAddress: contractAddr,
                        attributes,
                        explorerUrl: `https://${selectednet === "Mainnet" ? "" : "sepolia."}etherscan.io/nft/${contractAddr}/${tokenIdHex}`,
                    };
                });

                const normalizedNfts = await Promise.all(metadataPromises);
                setNfts(normalizedNfts);
            } catch (err) {
                console.error("Error fetching EVM NFTs:", err);
                setError("Could not load NFTs. (API error or unsupported network)");
            }
            setLoading(false);
        };

        if (address) {
            fetchNFTs();
        }
    }, [address, selectednet, chainConfig]);

    return (
        <>
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-xl border border-gray-700">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white">
                            {chainConfig.name} NFTs
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white font-bold text-xl cursor-pointer"
                        >
                            &times;
                        </button>
                    </div>

                    {/* Address display */}
                    <p className="text-gray-500 text-xs font-mono mb-4 truncate">{address}</p>

                    {/* Loading State */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin mb-3"></div>
                            <p className="text-gray-400">Loading NFTs...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <p className="text-red-400 text-center py-8">{error}</p>
                    )}

                    {/* Empty State */}
                    {!loading && !error && nfts.length === 0 && (
                        <div className="text-center py-12">
                            <svg className="w-16 h-16 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                            </svg>
                            <p className="text-gray-400">No NFTs found for this wallet.</p>
                        </div>
                    )}

                    {/* NFT Grid */}
                    {!loading && !error && nfts.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {nfts.map((nft, index) => (
                                <NFTCard
                                    key={`${nft.contractAddress}-${nft.tokenId}-${index}`}
                                    nft={nft}
                                    onClick={setSelectedNft}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Detail modal — renders on top of the gallery modal */}
            {selectedNft && (
                <NFTDetail nft={selectedNft} onClose={() => setSelectedNft(null)} />
            )}
        </>
    );
};

export default EVMNFTs;
