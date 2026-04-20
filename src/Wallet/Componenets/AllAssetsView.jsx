/**
 * AllAssetsView — Unified Portfolio Dashboard
 *
 * Shows all NFTs and token balances across every chain and wallet
 * in a single, filterable view.
 */

import { useState, useEffect, useMemo } from "react";
import { ethers } from "ethers";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { deriveSolanaAddresses, deriveEVMAddresses } from "../utils/walletDerivation";
import { fetchEVMNFTs, fetchSolanaNFTs } from "../NFTs/nftFetchers";
import { ETH_CONFIG, MONAD_CONFIG } from "./UI/SelectToken";
import NFTCard from "../NFTs/NFTCard";
import NFTDetail from "../NFTs/NFTDetail";

// ── Chain metadata for display ───────────────────────────────────────────────

const CHAIN_META = {
    Solana: { name: "Solana", symbol: "SOL", icon: "/solana-sol-icon.svg" },
    Ethereum: { name: "Ethereum", symbol: "ETH", icon: "/eth-icon.svg" },
    Monad: { name: "Monad", symbol: "MON", icon: "/monad-icon.svg" },
};

const FILTER_TABS = ["All", "Solana", "Ethereum", "Monad"];

// ── Component ────────────────────────────────────────────────────────────────

const AllAssetsView = ({ mnemonic, solanaCount, ethCount, monadCount, selectednet }) => {
    const [activeFilter, setActiveFilter] = useState("All");
    const [balances, setBalances] = useState({}); // { "Solana-0": 1.5, "Ethereum-0": 0.8, ... }
    const [nfts, setNfts] = useState([]); // Array of { ...nftData, chainName, chainIcon, walletIndex }
    const [loadingBalances, setLoadingBalances] = useState(true);
    const [loadingNfts, setLoadingNfts] = useState(true);
    const [selectedNft, setSelectedNft] = useState(null);

    // ── Derive all wallet addresses ──────────────────────────────────────────

    const allWallets = useMemo(() => {
        const wallets = [];

        // Solana wallets
        const solAddresses = deriveSolanaAddresses(mnemonic, solanaCount);
        solAddresses.forEach((w) => {
            wallets.push({ chain: "Solana", publicKey: w.publicKey, index: w.index });
        });

        // Ethereum wallets
        const ethAddresses = deriveEVMAddresses(mnemonic, ethCount);
        ethAddresses.forEach((w) => {
            wallets.push({ chain: "Ethereum", publicKey: w.publicKey, index: w.index });
        });

        // Monad wallets
        const monadAddresses = deriveEVMAddresses(mnemonic, monadCount);
        monadAddresses.forEach((w) => {
            wallets.push({ chain: "Monad", publicKey: w.publicKey, index: w.index });
        });

        return wallets;
    }, [mnemonic, solanaCount, ethCount, monadCount]);

    // ── Fetch all balances ───────────────────────────────────────────────────

    useEffect(() => {
        if (allWallets.length === 0) {
            setLoadingBalances(false);
            return;
        }

        const fetchAllBalances = async () => {
            setLoadingBalances(true);
            const newBalances = {};

            const promises = allWallets.map(async (wallet) => {
                const key = `${wallet.chain}-${wallet.index}`;
                try {
                    if (wallet.chain === "Solana") {
                        const rpcUrl = selectednet === "Mainnet"
                            ? "https://solana-mainnet.g.alchemy.com/v2/gWFPvImhts-OGEUAZyed0"
                            : "https://solana-devnet.g.alchemy.com/v2/gWFPvImhts-OGEUAZyed0";
                        const connection = new Connection(rpcUrl);
                        const publicKey = new PublicKey(wallet.publicKey);
                        const balanceLamports = await connection.getBalance(publicKey);
                        newBalances[key] = balanceLamports / LAMPORTS_PER_SOL;
                    } else {
                        const config = wallet.chain === "Ethereum" ? ETH_CONFIG : MONAD_CONFIG;
                        const rpcUrl = config.rpcUrls[selectednet] || config.rpcUrls.Mainnet;
                        const provider = new ethers.JsonRpcProvider(rpcUrl);
                        const balanceWei = await provider.getBalance(wallet.publicKey);
                        newBalances[key] = parseFloat(ethers.formatEther(balanceWei));
                    }
                } catch (err) {
                    console.error(`Failed to fetch balance for ${key}:`, err);
                    newBalances[key] = null;
                }
            });

            await Promise.all(promises);
            setBalances(newBalances);
            setLoadingBalances(false);
        };

        fetchAllBalances();
    }, [allWallets, selectednet]);

    // ── Fetch all NFTs ───────────────────────────────────────────────────────

    useEffect(() => {
        if (allWallets.length === 0) {
            setLoadingNfts(false);
            return;
        }

        const fetchAllNFTs = async () => {
            setLoadingNfts(true);
            const allNftResults = [];

            const promises = allWallets.map(async (wallet) => {
                try {
                    let walletNfts = [];

                    if (wallet.chain === "Solana") {
                        walletNfts = await fetchSolanaNFTs(wallet.publicKey, selectednet);
                    } else if (wallet.chain === "Ethereum") {
                        const rpcUrl = ETH_CONFIG.rpcUrls[selectednet] || ETH_CONFIG.rpcUrls.Mainnet;
                        walletNfts = await fetchEVMNFTs(rpcUrl, wallet.publicKey, selectednet, ETH_CONFIG);
                    }
                    // Monad NFTs not supported yet — skip silently

                    // Augment each NFT with chain/wallet metadata
                    walletNfts.forEach((nft) => {
                        allNftResults.push({
                            ...nft,
                            chainName: wallet.chain,
                            chainIcon: CHAIN_META[wallet.chain]?.icon,
                            walletIndex: wallet.index,
                        });
                    });
                } catch (err) {
                    console.error(`Failed to fetch NFTs for ${wallet.chain} wallet #${wallet.index}:`, err);
                }
            });

            await Promise.all(promises);
            setNfts(allNftResults);
            setLoadingNfts(false);
        };

        fetchAllNFTs();
    }, [allWallets, selectednet]);

    // ── Compute per-chain balance summaries ──────────────────────────────────

    const chainSummaries = useMemo(() => {
        const summaries = {};

        for (const chain of ["Solana", "Ethereum", "Monad"]) {
            const chainWallets = allWallets.filter((w) => w.chain === chain);
            const walletCount = chainWallets.length;
            let totalBalance = 0;
            let hasError = false;

            chainWallets.forEach((w) => {
                const key = `${w.chain}-${w.index}`;
                const bal = balances[key];
                if (bal === null || bal === undefined) {
                    hasError = true;
                } else {
                    totalBalance += bal;
                }
            });

            if (walletCount > 0) {
                summaries[chain] = {
                    walletCount,
                    totalBalance: hasError && totalBalance === 0 ? null : totalBalance,
                    symbol: CHAIN_META[chain].symbol,
                    icon: CHAIN_META[chain].icon,
                };
            }
        }

        return summaries;
    }, [allWallets, balances]);

    // ── Filter NFTs by active tab ────────────────────────────────────────────

    const filteredNfts = useMemo(() => {
        if (activeFilter === "All") return nfts;
        return nfts.filter((n) => n.chainName === activeFilter);
    }, [nfts, activeFilter]);

    // ── Total wallet count ───────────────────────────────────────────────────

    const totalWallets = solanaCount + ethCount + monadCount;

    // ── Empty state: no wallets created yet ──────────────────────────────────

    if (totalWallets === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <svg className="w-20 h-20 mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                </svg>
                <p className="text-lg font-medium">No wallets yet</p>
                <p className="text-sm mt-1">Switch to Wallets view and create wallets to see your portfolio.</p>
            </div>
        );
    }

    return (
        <div className="mt-6">
            {/* ── Balance Summary Cards ───────────────────────────────── */}
            <div className="flex flex-wrap gap-4 mb-8 justify-center">
                {Object.entries(chainSummaries).map(([chain, summary]) => (
                    <div
                        key={chain}
                        className="bg-gray-900 border border-gray-700 rounded-xl p-5 min-w-[180px] flex-1 max-w-[260px]
                                   hover:border-gray-500 transition-colors"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <img src={summary.icon} alt={chain} className="w-8 h-8 object-contain" />
                            <span className="text-gray-200 font-semibold text-lg">{chain}</span>
                        </div>
                        <div className="text-white text-2xl font-bold font-mono">
                            {loadingBalances ? (
                                <span className="text-gray-500 text-base">Loading...</span>
                            ) : summary.totalBalance !== null ? (
                                `${summary.totalBalance.toFixed(4)} ${summary.symbol}`
                            ) : (
                                <span className="text-red-400 text-base">Error</span>
                            )}
                        </div>
                        <div className="text-gray-500 text-sm mt-1">
                            {summary.walletCount} wallet{summary.walletCount !== 1 ? "s" : ""}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Chain Filter Tabs ───────────────────────────────────── */}
            <div className="flex gap-2 mb-6 justify-center flex-wrap">
                {FILTER_TABS.map((tab) => {
                    const isActive = activeFilter === tab;
                    // Count NFTs per tab for badge
                    const count = tab === "All" ? nfts.length : nfts.filter((n) => n.chainName === tab).length;

                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveFilter(tab)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center gap-2
                                ${isActive
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700"
                                }`}
                        >
                            {tab !== "All" && CHAIN_META[tab]?.icon && (
                                <img src={CHAIN_META[tab].icon} alt={tab} className="w-4 h-4 object-contain" />
                            )}
                            {tab}
                            {!loadingNfts && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-blue-500" : "bg-gray-700"}`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ── NFT Grid ────────────────────────────────────────────── */}
            {loadingNfts ? (
                <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-10 h-10 border-2 border-gray-600 border-t-white rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-400">Loading NFTs from all wallets...</p>
                    <p className="text-gray-600 text-sm mt-1">This may take a moment</p>
                </div>
            ) : filteredNfts.length === 0 ? (
                <div className="text-center py-16">
                    <svg className="w-16 h-16 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                    <p className="text-gray-400 text-lg">
                        {activeFilter === "All"
                            ? "No NFTs found across any wallet."
                            : `No ${activeFilter} NFTs found.`}
                    </p>
                    <p className="text-gray-600 text-sm mt-1">
                        NFTs will appear here once you receive them.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredNfts.map((nft, index) => (
                        <NFTCard
                            key={`${nft.chainName}-${nft.walletIndex}-${nft.tokenId}-${index}`}
                            nft={nft}
                            onClick={setSelectedNft}
                            chainName={nft.chainName}
                            chainIcon={nft.chainIcon}
                            walletIndex={nft.walletIndex}
                        />
                    ))}
                </div>
            )}

            {/* ── NFT Detail Modal ────────────────────────────────────── */}
            {selectedNft && (
                <NFTDetail nft={selectedNft} onClose={() => setSelectedNft(null)} />
            )}
        </div>
    );
};

export default AllAssetsView;
