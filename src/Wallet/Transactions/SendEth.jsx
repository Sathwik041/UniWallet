import { ethers } from "ethers";
import { useState, useEffect } from "react";


const SendEth=({senderAddress,senderPrivateKey,onClose,selectednet})=>{
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
                const rpcUrl = selectednet === "Mainnet" ? "https://eth-mainnet.g.alchemy.com/v2/gWFPvImhts-OGEUAZyed0" : "https://ethereum-sepolia-rpc.publicnode.com";
                const provider = new ethers.JsonRpcProvider(rpcUrl);

                // Using a flat 21,000 gas limit for standard ETH transfers
                // (MetaMask essentially does this as well, avoiding estimateGas for simple native transfers)
                const gasLimit = 21000n;
                const feeData = await provider.getFeeData();
                
                const gasPrice = feeData.maxFeePerGas || feeData.gasPrice || 0n;
                const estimatedFeeInWei = gasLimit * gasPrice;
                const estimatedFeeInEth = ethers.formatEther(estimatedFeeInWei.toString());
                
                if (!isCancelled) {
                    setGasFee(estimatedFeeInEth);
                }
            } catch (error) {
                console.error("Gas estimation error:", error);
                if (!isCancelled) {
                    setGasError("Unable to estimate gas. Verify recipient & amount.");
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
    }, [recipient, amount, senderAddress, selectednet]);

    const handleSend=async ()=>{
        if(!recipient || !amount){
            alert("Please fill in all fields.");
            return;
        }
        setStatus("sending");
        setErrorMsg("");

        try{
            //Using Sepolia test,or you can Eth mainnet url here to send real ETH 
            
            const rpcUrl= selectednet==="Mainnet" ? "https://eth-mainnet.g.alchemy.com/v2/gWFPvImhts-OGEUAZyed0" : "https://ethereum-sepolia-rpc.publicnode.com";
            const provider=new ethers.JsonRpcProvider(rpcUrl);

            const wallet=new ethers.Wallet(senderPrivateKey,provider);

            const tx=await wallet.sendTransaction({
                to:recipient,
                value:ethers.parseEther(amount),//amount converted to wei

            });
            await tx.wait();
            setTxHash(tx.hash);
            console.log("Transactio Hash:",tx.hash);
            setStatus("success");

        }catch(error){
            console.error("Eth Send Error:",error);
            setStatus("error");
            setErrorMsg(error.message || "FaiLed to Send ETH");
        }

    }


    return (<div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 px-4">
        <div className="bg-gray-900 p-6 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4text-white mb-4 text-center "> Send ETH</h2>

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
                <label className="block text-gray-200 text-sm font-bold mb-2">Amount (ETH)</label>
                <input type="number" value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="0.00"
                className="w-full bg-gray-800 p-2 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"/>
                
                {/* Gas Estimation UI */}
                <div className="mt-2 text-xs min-h-[20px]">
                    {isEstimatingGas && <span className="text-gray-400">Estimating gas fee...</span>}
                    {!isEstimatingGas && gasFee && (
                        <span className="text-gray-400">
                            Estimated Gas Fee: <span className="font-semibold text-blue-400">~{Number(gasFee).toFixed(6)} ETH</span>
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
                    <a href={selectednet === "Mainnet" ? `https://etherscan.io/tx/${txHash}`:`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-blue-400 text-xs underline">
                     View on Etherscan   
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

export default SendEth;