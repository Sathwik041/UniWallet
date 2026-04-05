import { useState, useEffect } from "react";
import NFTCard from "./NFTCard";
import NFTDetail from "./NFTDetail";

// Interfaces that represent NFTs (not fungible tokens or other asset types)
const NFT_INTERFACES = ["V1_NFT", "ProgrammableNFT", "V1_PRINT", "MplCoreAsset"];

const SolanaNFTs = ({ address, onClose, selectednet }) => {
    const [nfts, setNfts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedNft, setSelectedNft] = useState(null);

    useEffect(() => {
        const fetchNFTs = async () => {
            setLoading(true);
            setError(null);

            try {
                // Use the same Alchemy Solana RPC URL you already use for balances.
                // The DAS (Digital Asset Standard) API is available as a JSON-RPC method
                // on this same endpoint — no separate URL needed.
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
                                showFungible: false,          // Only NFTs, not SPL tokens
                                showCollectionMetadata: true, // Include collection info
                            },
                        },
                    }),
                });

                const data = await response.json();

                if (data.error) {
                    throw new Error(data.error.message || "Solana DAS API error");
                }

                const items = data.result?.items || [];

                // Filter to only NFT-type assets.
                // The DAS API returns ALL digital assets (including fungible tokens).
                // We check the 'interface' field to keep only actual NFTs.
                const nftItems = items.filter((item) =>
                    NFT_INTERFACES.includes(item.interface)
                );

                // Normalize each NFT into the same shape that NFTCard/NFTDetail expect.
                // Solana NFTs have a different structure from EVM:
                //   - content.metadata.name → NFT name
                //   - content.links.image → image URL
                //   - content.files[0].cdn_uri → alternative CDN image
                //   - grouping → array of group objects, one of which is the collection
                //   - id → the mint address (equivalent to tokenId on EVM)
                const normalizedNfts = nftItems.map((item) => ({
                    name: item.content?.metadata?.name || "Unnamed NFT",
                    image:
                        item.content?.links?.image ||
                        item.content?.files?.[0]?.cdn_uri ||
                        item.content?.files?.[0]?.uri ||
                        "",
                    collection:
                        item.grouping?.find((g) => g.group_key === "collection")
                            ?.collection_metadata?.name || "Unknown Collection",
                    tokenId: item.id, // Mint address on Solana
                    contractAddress: null, // Solana doesn't have contract addresses like EVM
                    attributes: item.content?.metadata?.attributes || [],
                    explorerUrl: `https://explorer.solana.com/address/${item.id}?cluster=${selectednet === "Mainnet" ? "mainnet-beta" : "devnet"}`,
                }));

                setNfts(normalizedNfts);
            } catch (err) {
                console.error("Error fetching Solana NFTs:", err);
                setError("Could not load NFTs. (API error or unsupported network)");
            }
            setLoading(false);
        };

        if (address) {
            fetchNFTs();
        }
    }, [address, selectednet]);

    return (
        <>
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-xl border border-gray-700">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white">Solana NFTs</h2>
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
                                    key={`${nft.tokenId}-${index}`}
                                    nft={nft}
                                    onClick={setSelectedNft}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Detail modal */}
            {selectedNft && (
                <NFTDetail nft={selectedNft} onClose={() => setSelectedNft(null)} />
            )}
        </>
    );
};

export default SolanaNFTs;
