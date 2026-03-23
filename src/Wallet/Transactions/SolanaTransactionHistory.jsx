import { useState, useEffect } from "react";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const SolanaTransactionHistory = ({ address, onClose, selectednet }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            setError(null);
            try {
                const rpcUrl = selectednet === "Mainnet" 
                    ? "https://solana-mainnet.g.alchemy.com/v2/gWFPvImhts-OGEUAZyed0" 
                    : "https://solana-devnet.g.alchemy.com/v2/gWFPvImhts-OGEUAZyed0"; // Updated devnet URL
                const connection = new Connection(rpcUrl);
                const pubKey = new PublicKey(address);

                const signatures = await connection.getSignaturesForAddress(pubKey, { limit: 15 });
                const sigStrings = signatures.map((tx) => tx.signature);

                if (sigStrings.length === 0) {
                    setTransactions([]);
                    setLoading(false);
                    return;
                }

                const parsedTxs = await connection.getParsedTransactions(sigStrings, {
                    maxSupportedTransactionVersion: 0,
                });

                const formattedTxs = parsedTxs.map((tx, index) => {
                    const signature = signatures[index].signature;
                    const timestamp = signatures[index].blockTime 
                        ? new Date(signatures[index].blockTime * 1000).toLocaleString() 
                        : "Unknown Time";
                    
                    let amountStr = "Unknown";
                    let isReceive = false;
                    let success = tx?.meta?.err === null;

                    // Rough estimation of balance change for the user's account
                    if (tx && tx.meta) {
                        const accountIndex = tx.transaction.message.accountKeys.findIndex(
                            (k) => k.pubkey.toBase58() === address
                        );
                        if (accountIndex !== -1) {
                            const preBalance = tx.meta.preBalances[accountIndex];
                            const postBalance = tx.meta.postBalances[accountIndex];
                            const change = postBalance - preBalance;
                            amountStr = (Math.abs(change) / LAMPORTS_PER_SOL).toFixed(4) + " SOL";
                            isReceive = change > 0;
                        }
                    }

                    return {
                        signature,
                        timestamp,
                        amount: amountStr,
                        isReceive,
                        success
                    };
                });

                setTransactions(formattedTxs);
            } catch (err) {
                console.error("Error fetching Solana history:", err);
                setError("Failed to load transaction history.");
            }
            setLoading(false);
        };

        if (address) {
            fetchHistory();
        }
    }, [address, selectednet]);

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Transaction History</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white font-bold text-xl">&times;</button>
                </div>

                {loading && <p className="text-gray-400 text-center py-4">Loading history...</p>}
                {error && <p className="text-red-400 text-center py-4">{error}</p>}

                {!loading && !error && transactions.length === 0 && (
                    <p className="text-gray-400 text-center py-4">No transactions found for this wallet.</p>
                )}

                {!loading && !error && transactions.length > 0 && (
                    <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-2">
                        {transactions.map((tx) => (
                            <a 
                                key={tx.signature}
                                href={`https://explorer.solana.com/tx/${tx.signature}?cluster=${selectednet === "Mainnet" ? "mainnet-beta" : "devnet"}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-gray-700 p-3 rounded-md border border-gray-600 hover:border-gray-500 transition-colors"
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${tx.isReceive ? "bg-green-900/50" : "bg-gray-700"}`}>
                                            <span className={`flex items-center justify-center ${tx.isReceive ? "text-green-500" : "text-gray-300"}`}>
                                                {tx.isReceive ? (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 5L5 19M5 19V9M5 19H15" /></svg>
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 19L19 5M19 5V15M19 5H9" /></svg>
                                                )}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm">
                                                {tx.isReceive ? "Received" : "Sent"} {tx.amount}
                                            </p>
                                            <p className="text-xs text-gray-400">{tx.timestamp}</p>
                                        </div>
                                    </div>
                                    <div className="text-xs">
                                        <span className={`px-2 py-1 rounded-full ${tx.success ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                                            {tx.success ? "Success" : "Failed"}
                                        </span>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SolanaTransactionHistory;
