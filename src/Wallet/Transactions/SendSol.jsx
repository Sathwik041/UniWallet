
import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import { useState, useEffect } from "react";

const SendSol=({senderAddress,senderPrivateKey,onClose,selectednet})=>{
    const [recipient,setRecipient]=useState("");
    const [amount,setAmount]=useState("");
    const [status,setStatus]=useState("idle");//idle,sending,success,error
    const [txHash,setTxHash]=useState("");
    const [errorMsg,setErrorMsg]=useState("");
    const [gasFee, setGasFee] = useState(null);
    const [isEstimatingGas, setIsEstimatingGas] = useState(false);
    const [gasError, setGasError] = useState("");

    useEffect(() => {
        let isCancelled = false;

        const estimateGas = async () => {
            if (!recipient || !amount || isNaN(amount) || Number(amount) <= 0) {
                setGasFee(null);
                setGasError("");
                setIsEstimatingGas(false);
                return;
            }

            setIsEstimatingGas(true);
            setGasError("");

            try {
                const rpcUrl = selectednet === "Mainnet" ? "https://api.mainnet-beta.solana.com" : "https://solana-mainnet.g.alchemy.com/v2/gWFPvImhts-OGEUAZyed0";
                const connection = new Connection(rpcUrl);

                const secretKey = bs58.decode(senderPrivateKey);
                const fromkeypair = Keypair.fromSecretKey(secretKey);
                
                let toPublicKey;
                try {
                    toPublicKey = new PublicKey(recipient);
                } catch (err) {
                    throw new Error("Invalid recipient address");
                }

                const transaction = new Transaction().add(
                    SystemProgram.transfer({
                        fromPubkey: fromkeypair.publicKey,
                        toPubkey: toPublicKey,
                        lamports: parseFloat(amount) * LAMPORTS_PER_SOL, 
                    })
                );

                const { blockhash } = await connection.getLatestBlockhash('confirmed');
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = fromkeypair.publicKey;

                let feeInLamports = await transaction.getEstimatedFee(connection);
                
                if (feeInLamports === null) {
                    // Fallback: A standard transaction on Solana costs exactly 5000 lamports per signature
                    feeInLamports = 5000;
                }
                
                const feeInSol = feeInLamports / LAMPORTS_PER_SOL;
                
                if (!isCancelled) {
                    setGasFee(feeInSol);
                }
            } catch (error) {
                console.error("Solana fee estimation error:", error);
                if (!isCancelled) {
                    setGasError("Unable to estimate fee. Verify recipient & amount.");
                    setGasFee(null);
                }
            } finally {
                if (!isCancelled) {
                    setIsEstimatingGas(false);
                }
            }
        };

        const timeoutId = setTimeout(() => {
            estimateGas();
        }, 500);

        return () => {
            isCancelled = true;
            clearTimeout(timeoutId);
        };
    }, [recipient, amount, senderPrivateKey, selectednet]);

    const handleSend=async ()=>{
        if(!recipient || !amount){
            alert("Please fill in all fields.");
            return;
        }
        setStatus("sending");
        setErrorMsg("");

        try{
            //Connect to Devnet,or you can SOL mainnet url here to send real SOL
            const rpcUrl= selectednet==="Mainnet" ? "https://api.mainnet-beta.solana.com" : "https://api.devnet.solana.com";
            const connection=new Connection(rpcUrl);

            //Decode Privatekey/SecretKey as in Solana it is a base58 string
            const secretKey=bs58.decode(senderPrivateKey);
            const fromkeypair=Keypair.fromSecretKey(secretKey);
            
            const toPublicKey=new PublicKey(recipient);

            //create transaction
            const transaction=new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey:fromkeypair.publicKey,
                    toPubkey:toPublicKey,
                    lamports: parseFloat(amount) *LAMPORTS_PER_SOL, 
                })
            );

            //send Transaction
            const signature=await sendAndConfirmTransaction(connection,transaction,[fromkeypair]);
            

            console.log("Transaction Signaure:", signature);
            setTxHash(signature);
            setStatus("success");

        }catch(error){
            console.error("SOL Send Error:",error);
            setStatus("error");
            setErrorMsg(error.message || "Failed to Send SOL");
        }

    }


    return (<div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 px-4">
        <div className="bg-gray-900 p-6 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4text-white mb-4 text-center "> Send SOL ({selectednet})</h2>

            {/* From Address ,is Locked */}
            <div className="mb-4">
                <label className="block text-gray-400 text-sm font-bold mb-2">From</label>
                <input type="text" value={senderAddress} disabled
                className="w-full bg-gray-800 p-2 text-gray-500 rounded border border-gray-600 cursor-not-allowed"/>
            </div>

            {/* To Address */}
            <div className="mb-4">
                <label className="block text-gray-200 text-sm font-bold mb-2">To</label>
                <input type="text" value={recipient} onChange={(e)=>setRecipient(e.target.value)} placeholder="Recipient Address"
                className="w-full bg-gray-800 p-2 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500 "/>
            </div>

            {/* Amount */}
            <div className="mb-4">
                <label className="block text-gray-200 text-sm font-bold mb-2">Amount (SOL)</label>
                <input type="number" value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="0.00"
                className="w-full bg-gray-800 p-2 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"/>
                
                {/* Gas Estimation UI */}
                <div className="mt-2 text-xs min-h-[20px]">
                    {isEstimatingGas && <span className="text-gray-400">Estimating gas fee...</span>}
                    {!isEstimatingGas && gasFee && (
                        <span className="text-gray-400">
                            Estimated Gas Fee: <span className="font-semibold text-blue-400">~{Number(gasFee).toFixed(6)} SOL</span>
                        </span>
                    )}
                    {!isEstimatingGas && gasError && (
                        <span className="text-red-400">{gasError}</span>
                    )}
                </div>
            </div>    

            {/* status Message */}
            {status==="sending" && <p className="text-yellow-400 mb-4 text-center">Sending...</p>}
            {status==="success" && (
                <div className="mb-4 text-center">
                    <p className="text-green-400">Transaction Sent!</p>
                    <a href={selectednet === "Mainnet" ? `https://explorer.solana.com/tx/${txHash}?cluster=mainnet`:`https://explorer.solana.com/tx/${txHash}?cluster=devnet`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-blue-400 text-xs underline">
                     View on Explorer  
                    </a>
                </div>
            )}
            {status==="error" && <p>{errorMsg}</p>}

            {/* SendButton */}
            <div className="flex justify-between gap-4">
                <button onClick={onClose}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded cursor-pointer">
                    Cancel
                </button> 
                <button onClick={handleSend} disabled={status==="sending"}
                className={`flex-1 font-bold py-2 px-4 rounded cursor-pointer
                ${status==="sending" ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 text-white"}
                `}>
                    Send
                </button>
            </div>
        </div>
       
    </div>);

}

export default SendSol;