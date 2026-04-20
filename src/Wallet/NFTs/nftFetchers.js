/**
 * Pure async functions for fetching NFTs from Solana and EVM chains.
 * Extracted from EVMNFTs.jsx and SolanaNFTs.jsx so they can be reused
 * by both the per-wallet NFT views and the unified Portfolio dashboard.
 */

// ── IPFS Helpers ─────────────────────────────────────────────────────────────

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
export const resolveIpfsUrl = (uri) => {
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

// ── EVM Helpers ──────────────────────────────────────────────────────────────

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
    const stripped = tokenIdHex.replace(/^0x/i, "");
    return stripped.padStart(64, "0");
};

/** Decode an ABI-encoded string return value from eth_call */
const decodeStringResult = (hex) => {
    if (!hex || hex === "0x" || hex.length < 130) return null;
    const data = hex.replace(/^0x/, "");
    const length = parseInt(data.substring(64, 128), 16);
    if (length === 0 || isNaN(length)) return null;
    const strHex = data.substring(128, 128 + length * 2);
    try {
        return decodeURIComponent(
            strHex.replace(/../g, (pair) => `%${pair}`)
        );
    } catch {
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

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch all NFTs held by an EVM address (Ethereum).
 * Uses alchemy_getAssetTransfers with erc721 + erc1155 categories,
 * then resolves on-chain tokenURI metadata for each.
 *
 * @param {string} rpcUrl        - Alchemy JSON-RPC URL
 * @param {string} address       - Wallet address
 * @param {string} selectednet   - "Mainnet" or "Testnet"
 * @param {object} chainConfig   - Chain configuration object
 * @returns {Promise<Array>}     - Normalized NFT objects
 */
export async function fetchEVMNFTs(rpcUrl, address, selectednet, chainConfig) {
    // Monad and other newer chains may not have Alchemy NFT indexing yet
    if (chainConfig && chainConfig.name !== "Ethereum") {
        return [];
    }

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

    // Build a set of NFTs that were sent away
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

    // Deduplicate
    const seen = new Set();
    const uniqueNfts = heldNfts.filter(tx => {
        const key = `${tx.rawContract.address.toLowerCase()}:${tx.tokenId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // Fetch on-chain metadata for each NFT
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

    return Promise.all(metadataPromises);
}

// ── Solana ────────────────────────────────────────────────────────────────────

/** Interfaces that represent NFTs (not fungible tokens or other asset types) */
const NFT_INTERFACES = ["V1_NFT", "ProgrammableNFT", "V1_PRINT", "MplCoreAsset"];

/**
 * Fetch all NFTs held by a Solana address using the DAS API.
 *
 * @param {string} address     - Solana wallet address (base58)
 * @param {string} selectednet - "Mainnet" or "Testnet"
 * @returns {Promise<Array>}   - Normalized NFT objects
 */
export async function fetchSolanaNFTs(address, selectednet) {
    const rpcUrl =
        selectednet === "Mainnet"
            ? "https://solana-mainnet.g.alchemy.com/v2/gWFPvImhts-OGEUAZyed0"
            : "https://solana-devnet.g.alchemy.com/v2/gWFPvImhts-OGEUAZyed0";

    const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: "nft-fetch",
            method: "getAssetsByOwner",
            params: {
                ownerAddress: address,
                page: 1,
                limit: 50,
                displayOptions: {
                    showFungible: false,
                    showCollectionMetadata: true,
                },
            },
        }),
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message || "Solana DAS API error");
    }

    const items = data.result?.items || [];

    // Filter to only NFT-type assets
    const nftItems = items.filter((item) =>
        NFT_INTERFACES.includes(item.interface)
    );

    // Normalize into the same shape as EVM NFTs
    return nftItems.map((item) => ({
        name: item.content?.metadata?.name || "Unnamed NFT",
        image:
            item.content?.links?.image ||
            item.content?.files?.[0]?.cdn_uri ||
            item.content?.files?.[0]?.uri ||
            "",
        description: item.content?.metadata?.description || "",
        collection:
            item.grouping?.find((g) => g.group_key === "collection")
                ?.collection_metadata?.name || "Unknown Collection",
        tokenId: item.id,
        contractAddress: null,
        attributes: item.content?.metadata?.attributes || [],
        explorerUrl: `https://explorer.solana.com/address/${item.id}?cluster=${selectednet === "Mainnet" ? "mainnet-beta" : "devnet"}`,
    }));
}
