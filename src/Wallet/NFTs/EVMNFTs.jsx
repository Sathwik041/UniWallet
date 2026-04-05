import { useState, useEffect } from "react";
import NFTCard from "./NFTCard";
import NFTDetail from "./NFTDetail";

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

                // Normalize into our standard NFT shape
                const normalizedNfts = uniqueNfts.map((tx) => ({
                    name: tx.asset ? `${tx.asset} #${tx.tokenId}` : `NFT #${tx.tokenId}`,
                    image: "", // Transfer API doesn't include images — handled by NFTCard fallback
                    collection: tx.asset || "Unknown Collection",
                    tokenId: tx.tokenId,
                    contractAddress: tx.rawContract?.address,
                    attributes: [],
                    explorerUrl: `https://${selectednet === "Mainnet" ? "" : "sepolia."}etherscan.io/nft/${tx.rawContract?.address}/${tx.tokenId}`,
                }));

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
