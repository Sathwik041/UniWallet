import { useState } from "react";

const NFTDetail = ({ nft, onClose }) => {
    const [imgError, setImgError] = useState(false);

    if (!nft) return null;

    return (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div
                className="bg-gray-800 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-700"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
                    <h2 className="text-lg font-bold text-white truncate pr-4">{nft.name}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white font-bold text-xl shrink-0 cursor-pointer"
                    >
                        &times;
                    </button>
                </div>

                {/* NFT Image */}
                <div className="w-full aspect-square bg-gray-900">
                    {!imgError && nft.image ? (
                        <img
                            src={nft.image}
                            alt={nft.name}
                            className="w-full h-full object-contain"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/30 to-blue-900/30">
                            <svg className="w-20 h-20 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                            </svg>
                        </div>
                    )}
                </div>

                {/* Details Section */}
                <div className="p-4 flex flex-col gap-4">
                    {/* Collection & Token ID */}
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">Collection</span>
                            <span className="text-white text-sm font-medium">{nft.collection}</span>
                        </div>
                        {nft.tokenId && (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400 text-sm">Token ID</span>
                                <span className="text-white text-sm font-mono truncate ml-4 max-w-[200px]" title={nft.tokenId}>
                                    {nft.tokenId.length > 16 ? `${nft.tokenId.slice(0, 8)}...${nft.tokenId.slice(-8)}` : nft.tokenId}
                                </span>
                            </div>
                        )}
                        {nft.contractAddress && (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400 text-sm">Contract</span>
                                <span className="text-white text-sm font-mono truncate ml-4 max-w-[200px]" title={nft.contractAddress}>
                                    {`${nft.contractAddress.slice(0, 8)}...${nft.contractAddress.slice(-6)}`}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Attributes / Traits */}
                    {nft.attributes && nft.attributes.length > 0 && (
                        <div>
                            <h3 className="text-gray-300 font-semibold text-sm mb-2">Attributes</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {nft.attributes.map((attr, index) => (
                                    <div
                                        key={index}
                                        className="bg-gray-900 border border-gray-700 rounded-md p-2 text-center"
                                    >
                                        <p className="text-blue-400 text-xs uppercase tracking-wider">
                                            {attr.trait_type || attr.traitType || "Trait"}
                                        </p>
                                        <p className="text-white text-sm font-medium mt-1 truncate" title={String(attr.value)}>
                                            {String(attr.value)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Explorer Link */}
                    {nft.explorerUrl && (
                        <a
                            href={nft.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-center bg-gray-700 hover:bg-gray-600 text-blue-400 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                            View on Explorer ↗
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NFTDetail;
