import React, { useState, useEffect } from "react";
import SeedPhrase from "./Componenets/UI/SeedPhrase.jsx";
import SelectToken from "./Componenets/UI/SelectToken.jsx";
import { encryptData, decryptData } from "./utils/cryptoUtils.js";
import useToastStore from "./store/toaststore.js";

export const UniWallet = ({}) => {
    const [mnemonic, setMnemonic] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [vaultState, setVaultState] = useState("LOADING"); // LOADING, NO_WALLET, LOCKED, UNLOCKED
    const [encryptionKey, setEncryptionKey] = useState("");
    const [solanaCount, setSolanaCount] = useState(0);
    const [ethCount, setEthCount] = useState(0);

    // Get showToast from toast store
    const showToast = useToastStore((state) => state.showToast);

    useEffect(() => {
        const encryptedVault = localStorage.getItem("uniwallet_vault");
        if (encryptedVault) {
            setVaultState("LOCKED");
        } else {
            setVaultState("NO_WALLET");
        }
    }, []);

    const createVault = () => {
        if (!password || password !== confirmPassword) {
            showToast("Passwords do not match or are empty", "error");
            return;
        }
        if (!mnemonic) {
             showToast("Please generate a seed phrase first", "error");
             return;
        }

        const encrypted = encryptData({ mnemonic, solanaCount: 0, ethCount: 0 }, password);
        if (encrypted) {
            localStorage.setItem("uniwallet_vault", encrypted);
            setVaultState("UNLOCKED");
            setEncryptionKey(password);
            showToast("Wallet created and encrypted!", "success");
            // Clear passwords from state for security
            setPassword("");
            setConfirmPassword("");
        } else {
            showToast("Encryption failed", "error");
        }
    };

    const unlockVault = () => {
        if (!password) {
            showToast("Incorrect Password", "error");
            return;
        }
        
        const encrypted = localStorage.getItem("uniwallet_vault");
        const data = decryptData(encrypted, password);
        
        if (data && data.mnemonic) {
            setMnemonic(data.mnemonic);
            setSolanaCount(data.solanaCount || 0);
            setEthCount(data.ethCount || 0);
            setVaultState("UNLOCKED");
            setEncryptionKey(password);
            setPassword("");
            showToast("Wallet unlocked successfully", "success");
        } else {
            showToast("Incorrect password", "error");
        }
    };

    const updateWalletCounts = (type, count) => {
        let newSol = solanaCount;
        let newEth = ethCount;
        if (type === 'Solana') { setSolanaCount(count); newSol = count; }
        if (type === 'Ethereum') { setEthCount(count); newEth = count; }

        if (encryptionKey) {
            const encrypted = encryptData({
                mnemonic,
                solanaCount: newSol,
                ethCount: newEth
            }, encryptionKey);
            localStorage.setItem("uniwallet_vault", encrypted);
        }
    };
    
    const lockWallet = () => {
        setMnemonic("");
        setEncryptionKey("");
        setSolanaCount(0);
        setEthCount(0);
        setVaultState("LOCKED");
        setPassword("");
    };

    const clearVault = () => {
        if(window.confirm("Are you sure? This will delete your wallet permanently. Make sure you have backed up your seed phrase!")){
            localStorage.removeItem("uniwallet_vault");
            setMnemonic("");
            setEncryptionKey("");
            setSolanaCount(0);
            setEthCount(0);
            setVaultState("NO_WALLET");
            setPassword("");
            setConfirmPassword("");
            showToast("Wallet reset", "info");
        }
    };

    if (vaultState === "LOADING") {
        return (
            <div className="min-h-screen flex justify-center items-center bg-black bg-opacity-50 text-white text-2xl">
                Loading...
            </div>
        );
    }

    if (vaultState === "LOCKED") {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
                <div className="bg-gray-900 p-8 rounded-lg border border-gray-700 w-full max-w-md shadow-xl">
                    <h2 className="text-2xl mb-6 text-center font-bold">Unlock Your Wallet</h2>
                    <input 
                        type="password" 
                        placeholder="Enter Password" 
                        className="w-full p-3 rounded bg-gray-800 text-white border border-gray-600 mb-6 focus:outline-none focus:border-blue-500"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && unlockVault()}
                    />
                    <button onClick={unlockVault} className="w-full bg-blue-600 py-3 rounded hover:bg-blue-500 font-semibold mb-4 cursor-pointer">
                        Unlock
                    </button>
                    <div className="text-center">
                        <button onClick={clearVault} className="text-red-500 text-sm hover:underline cursor-pointer">
                            Reset Wallet (Delete Data)
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white pb-10">
            <div className="container mx-auto flex justify-between items-center pt-2 px-2">
                <div className="flex items-center">
                    <img src="/Wallet_Img.png" alt="Wallet Logo" className="w-25 h-30 object-contain" />
                    <h1 className="text-2xl font-bold">UNIWALLET</h1>
                </div>
                 
                 {vaultState === "UNLOCKED" && (
                    <button onClick={lockWallet} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm font-medium transition-colors cursor-pointer">
                        Lock Wallet
                    </button>
                 )}
            </div>

            {vaultState === "NO_WALLET" && (
                <div className="container mx-auto px-4 mt-8 max-w-2xl">
                    <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg">
                        <h2 className="text-xl mb-4 text-center font-semibold text-gray-200">Setup New Wallet</h2>
                        <p className="text-gray-400 text-center mb-6 text-sm">Generate a seed phrase and set a password to encrypt it locally.</p>
                        
                        
                        <SeedPhrase mnemonic={mnemonic} onMnemonicGenerated={setMnemonic} />
                        
                        {mnemonic && (
                            <div className="mt-8 pt-6 border-t border-gray-800 flex flex-col items-center max-w-sm mx-auto animate-fade-in">
                                <h3 className="mb-4 font-medium text-lg">Set Encryption Password</h3>
                                <input 
                                    type="password" 
                                    placeholder="New Password" 
                                    className="w-full p-3 rounded bg-gray-800 text-white border border-gray-600 mb-3 focus:outline-none focus:border-green-500"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                 <input 
                                    type="password" 
                                    placeholder="Confirm Password" 
                                    className="w-full p-3 rounded bg-gray-800 text-white border border-gray-600 mb-6 focus:outline-none focus:border-green-500"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                                <button onClick={createVault} className="w-full bg-green-600 py-3 rounded hover:bg-green-500 font-bold text-white shadow-lg transform transition hover:scale-105 cursor-pointer">
                                    Save & Encrypt Wallet
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {vaultState === "UNLOCKED" && (
                <div className="animate-fade-in">
                   {/* Pass disableGeneration to prevent regenerating seed when unlocked */}
                   <SeedPhrase mnemonic={mnemonic} onMnemonicGenerated={setMnemonic} disableGeneration={true} />
                   <SelectToken 
                        mnemonic={mnemonic} 
                        solanaCount={solanaCount} 
                        ethCount={ethCount} 
                        updateWalletCounts={updateWalletCounts} 
                   />
                </div>
            )}
        </div>
    );
};