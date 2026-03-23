import { useState, useEffect } from "react";
import { ethers } from "ethers";

const EthTransactionHistory = ({ address, onClose, selectednet }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            setError(null);
            try {
                // Using Alchemy's enhanced APIs rather than Etherscan
                const rpcUrl = selectednet === "Mainnet" 
                    ? "https://eth-mainnet.g.alchemy.com/v2/gWFPvImhts-OGEUAZyed0"
                    : "https://eth-sepolia.g.alchemy.com/v2/gWFPvImhts-OGEUAZyed0";

                // Fetch transfers TO the address
                const bodyTo = {
                    jsonrpc: "2.0",
                    id: 1,
                    method: "alchemy_getAssetTransfers",
                    params: [{
                        fromBlock: "0x0",
                        toBlock: "latest",
                        toAddress: address,
                        category: ["external", "erc20"],
                        withMetadata: true,
                        excludeZeroValue: true,
                        maxCount: "0x14"
                    }]
                };

                // Fetch transfers FROM the address
                const bodyFrom = {
                    jsonrpc: "2.0",
                    id: 2,
                    method: "alchemy_getAssetTransfers",
                    params: [{
                        fromBlock: "0x0",
                        toBlock: "latest",
                        fromAddress: address,
                        category: ["external", "erc20"],
                        withMetadata: true,
                        excludeZeroValue: true,
                        maxCount: "0x14"
                    }]
                };

                const [resTo, resFrom] = await Promise.all([
                    fetch(rpcUrl, { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(bodyTo) }),
                    fetch(rpcUrl, { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(bodyFrom) })
                ]);

                const dataTo = await resTo.json();
                const dataFrom = await resFrom.json();

                if (dataTo.error || dataFrom.error) {
                    throw new Error(dataTo.error?.message || dataFrom.error?.message || "Alchemy error");
                }

                const txsTo = (dataTo.result?.transfers || []).map(tx => ({ ...tx, isReceive: true }));
                const txsFrom = (dataFrom.result?.transfers || []).map(tx => ({ ...tx, isReceive: false }));

                let allTxs = [...txsTo, ...txsFrom];
                
                // Sort by block number descending
                allTxs.sort((a, b) => parseInt(b.blockNum, 16) - parseInt(a.blockNum, 16));

                // Take top 15
                allTxs = allTxs.slice(0, 15);

                const formattedTxs = allTxs.map((tx) => {
                    const date = tx.metadata?.blockTimestamp ? new Date(tx.metadata.blockTimestamp).toLocaleString() : "Unknown Time";
                    return {
                        hash: tx.hash,
                        timestamp: date,
                        amount: `${tx.value ? Number(tx.value).toFixed(4) : "0"} ${tx.asset || "ETH"}`,
                        isReceive: tx.isReceive,
                        success: true, // Asset transfers generally represent successful transactions
                        explorerUrl: `https://${selectednet === "Mainnet" ? "" : "sepolia."}etherscan.io/tx/${tx.hash}`
                    };
                });

                setTransactions(formattedTxs);
            } catch (err) {
                console.error("Error fetching Eth history via Alchemy:", err);
                setError("Could not load history. (API error or invalid endpoint)");
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
                        {transactions.map((tx, index) => (
                            <a 
                                key={tx.hash + index}
                                href={tx.explorerUrl}
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

export default EthTransactionHistory;
