    import { useState } from "react";
import SolanaWallet from "../SolanaWallet";
import EthWallet from "../EthWallet";

const SelectToken=({mnemonic,solanaCount,ethCount,updateWalletCounts})=>{
    const [selected,setSelected]=useState("Solana");
    const [open,setOpen]=useState(false);
   

    const Selectchain=(token)=>{
        setSelected(token);
        setOpen(false);
    }

    const handleCreateWallet=()=>{
        if(selected==="Solana"){
            updateWalletCounts("Solana",solanaCount+1);
        }else if(selected==="Ethereum"){
            updateWalletCounts("Ethereum",ethCount+1);
        }
    };

    return(
        <div >
            <div className="my-8 text-gray-200 flex flex-col md:flex-row justify-between p-4 gap-4">
                <h1 className='text-3xl text-center md:text-left'>{selected} Wallets</h1>
                <div className="flex justify-center md:justify-end gap-4 md:gap-10">
                    <div className="relative">
                        {/* switching between mainnet and testnet Wallets */}
                        <div onClick={()=>setOpen(!open)}
                        className="border border-white bg-gray-800 p-3 rounded-md cursor-pointer flex items-center gap-2">
                            {selected}
                            <span>{open ? "🔻":"🔺"}</span>
                        </div>
                        {open && (<div className="absolute top-full left-0 mt-2 w-full bg-gray-800 border border-white p-2 rounded-md cursor-pointer flex flex-col gap-2 z-10">
                            {["Solana","Ethereum"].map((token)=>(
                                <div key={token} onClick={() => Selectchain(token)} className="hover:bg-gray-700 p-1 rounded">
                                    {token}
                                    {selected===token && ' ✔️'}
                                </div>
                            ))}
                        </div>)}
                    </div>
                    <button onClick={handleCreateWallet}
                    className="border border-white p-2 rounded-md bg-gray-700 cursor-pointer hover:bg-gray-200 hover:text-black ">
                        Create Wallet
                    </button>
                </div>
            </div>
            {selected === "Solana" && <SolanaWallet mnemonic={mnemonic} walletCount={solanaCount}/>}
            {selected === "Ethereum" && <EthWallet mnemonic={mnemonic} walletCount={ethCount}/>}
        </div>

    );
}

export default SelectToken;