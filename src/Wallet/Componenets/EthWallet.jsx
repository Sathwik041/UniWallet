import { mnemonicToSeedSync } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { ethers, HDNodeWallet } from "ethers";


import { useState, useEffect } from "react";
import SendEth from "../Transactions/SendEth";
import { copyToClipboard } from "../utils/copyToClipboard";



function createWallet(mnemonic, index) {
    // Convert Mnemonic to Seed, seed is 64 bytes of key data
    const seed = mnemonicToSeedSync(mnemonic, wordlist);
    const path = `m/44'/60'/${index}/0'`;

    const hdNode = HDNodeWallet.fromSeed(seed);
    const child = hdNode.derivePath(path);

    return {
        publicKey: child.address,
        privateKey: child.privateKey,
        index,
    };
}

const EthWallet = ({ mnemonic, walletCount, selectednet }) => {
    const [wallets, setWallets] = useState([]);
    const[visibleIndex,setVisibleIndex]=useState(null);
    const[sendingWalletIndex,setSendingWalletIndex]=useState(null);
    const[balances,setBalances]=useState({});

    useEffect(() => {
        if (walletCount > 0) {
            if (mnemonic && walletCount>=0) {
                if(wallets.length<walletCount){
                    const newWallets=[...wallets];
                    for(let i=wallets.length;i<walletCount;i++){
                        newWallets.push(createWallet(mnemonic,i));
                    }
                    setWallets(newWallets);
                }
            }        
        }
    }, [walletCount, mnemonic]);

    const fetchBalance=async(address)=>{
        try{
            const rpcUrl= selectednet==="Mainnet" ? "https://eth-mainnet.g.alchemy.com/v2/gWFPvImhts-OGEUAZyed0" : "https://ethereum-sepolia-rpc.publicnode.com";
            const provider=new ethers.JsonRpcProvider(rpcUrl);
            const balanceWei= await provider.getBalance(address);
            const balanceEth=ethers.formatEther(balanceWei);
            setBalances(prev=>({...prev,[address]: balanceEth}));
        }catch(error){
            console.error("Failed to fetch balance:",error);
            setBalances(prev=>({...prev,[address]: "Error"}));
        }
    };

    useEffect(()=>{
        wallets.forEach(wallet=>{fetchBalance(wallet.publicKey)});
    },[wallets,selectednet])

    


    return ( mnemonic && walletCount > 0 && 
        <div className="px-4 md:px-20 bg-black rounded-lg shadow-lg m-4">
            <h2 className="text-xl font-bold text-center text-gray-200 mb-2">Generated Eth Wallets</h2>
            {wallets.map((wallet, index) => (
                <div key={index} className="mb-4 p-4 bg-gray-900 rounded-lg flex flex-col gap-2">
                    <div className="text-gray-200 text-3xl font-bold"><img src="/eth-icon.svg" alt="Ethereum" className="inline-block  w-12 h-8" />
                     Wallet {index + 1}</div>
                    <div className="border border-white mt-2 p-3 rounded-md bg-gray-700 flex justify-between items-center" >
                            <h2>Balance</h2>
                            <div className="flex items-center gap-2">
                                 <span className="font-mono">{balances[wallet.publicKey] ? `${balances[wallet.publicKey]} ETH` : "Loading..."}</span>
                                 <button onClick={()=>fetchBalance(wallet.publicKey)} className="text-xl hover:text-gray-300 cursor-pointer" title="Refresh Balance">
                                    ↻
                                 </button>
                            </div>
                    </div>
                    <button className="border border-white  p-2 min-w rounded-md bg-gray-700 cursor-pointer hover:bg-gray-200 hover:text-black" 
                    onClick={()=>setSendingWalletIndex(index)}>
                        Send</button>

                    <div onClick={() => copyToClipboard(wallet.publicKey)} className="cursor-pointer mt-2 flex flex-col" >
                        <label className="text-green-400 mb-2" >Publickey :</label>
                        <code className="break-all">{wallet.publicKey}</code>
                        </div>
                        <div onClick={() => copyToClipboard(wallet.privateKey)} className="cursor-pointer mt-2 flex flex-col">
                        <label className="text-red-400 mb-2" >Privatekey :</label>
                        <div className="flex flex-col md:flex-row justify-between gap-2">
                        <code className="break-all">{visibleIndex === index ? wallet.privateKey : "•".repeat(64)}</code>
                        <button className="border border-white p-2 rounded-md bg-gray-700 cursor-pointer hover:bg-gray-200 hover:text-black shrink-0" 
                        onClick={(e) => {
                        e.stopPropagation(e);
                        setVisibleIndex(visibleIndex === index ? null : index)}}>    
                            {visibleIndex === index ? "Hide" : "Show"}
                        </button>
                        </div>
                        </div>
                </div>
            ))}
            {sendingWalletIndex!==null && (
                <SendEth senderAddress={wallets[sendingWalletIndex].publicKey} 
                senderPrivateKey={wallets[sendingWalletIndex].privateKey}
                onClose={()=>setSendingWalletIndex(null)}
                selectednet={selectednet}
                 />
            )}
        </div>
    );
};

export default EthWallet;
