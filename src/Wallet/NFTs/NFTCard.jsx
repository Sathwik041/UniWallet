import { useState } from "react";

const NFTCard = ({ nft, onClick, chainName, chainIcon, walletIndex }) => {
    const [imgError, setImgError] = useState(false);

    // Portfolio mode: show chain badge and wallet label
    const isPortfolioMode = chainName !== undefined;

    return (
        <div
            onClick={() => onClick(nft)}
            className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden cursor-pointer 
                       hover:border-gray-500 hover:scale-[1.03] transition-all duration-200 group"
        >
            {/* NFT Image */}
            <div className="aspect-square w-full bg-gray-900 overflow-hidden relative">
                {!imgError && nft.image ? (
                    <img
                        src={nft.image}
                        alt={nft.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={() => setImgError(true)}
                        loading="lazy"
                    />
                ) : (
                    // Fallback placeholder when image fails to load or is missing
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-blue-900/50">
                        <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                        </svg>
                    </div>
                )}

                {/* Chain badge — only shown in portfolio mode */}
                {isPortfolioMode && chainIcon && (
                    <div className="absolute top-2 left-2 bg-black/70 rounded-full p-1 backdrop-blur-sm border border-gray-600">
                        <img src={chainIcon} alt={chainName} className="w-5 h-5 object-contain" />
                    </div>
                )}
            </div>

            {/* NFT Info */}
            <div className="p-3">
                <p className="text-white font-semibold text-sm truncate" title={nft.name}>
                    {nft.name}
                </p>
                <p className="text-gray-400 text-xs truncate mt-1" title={nft.collection}>
                    {nft.collection}
                </p>
                {/* Wallet label — only shown in portfolio mode */}
                {isPortfolioMode && (
                    <p className="text-gray-500 text-xs mt-1">
                        {chainName} · Wallet #{walletIndex + 1}
                    </p>
                )}
            </div>
        </div>
    );
};

export default NFTCard;
