import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { useState } from 'react';
import { copyToClipboard } from '../../utils/copyToClipboard';


const SeedPhrase=({mnemonic,onMnemonicGenerated,disableGeneration=false})=>{
    const [isExpanded,setIsExpanded]=useState(false);
    const [seedavailable,setSeedAvailable]=useState(false);
    const [manualInput,setManualInput] =useState("");
    const [error,setError]=useState("");

    const MnemonicWords=mnemonic ? mnemonic.split(" "):[];

    const createseed=async()=>{
        const mn=await bip39.generateMnemonic(wordlist);
        setIsExpanded(true);
        setSeedAvailable(false);
        setError("");
        if (onMnemonicGenerated) {
            onMnemonicGenerated(mn);
        }
    }

    const enableManualMode=()=>{
        setSeedAvailable(true);
        setIsExpanded(false);
        setManualInput("");
        setError("");
        if (onMnemonicGenerated) {
            onMnemonicGenerated("");//clear existing mnemonic when switch to manaul
        }
    };

    const handleManualSubmit= ()=>{
            const cleanedMnemonic =manualInput.trim();
            if(!cleanedMnemonic){
                setError("Please enter a seed phrase.");
                return;
            }

            if(!bip39.validateMnemonic(cleanedMnemonic,wordlist)){
                setError("Invalid seed phrase.Please check your words or spacing.");
                return;
            }

            setError("");
            setIsExpanded(true);
            if(onMnemonicGenerated){
                onMnemonicGenerated(cleanedMnemonic);
            }
    };

    return(
        <div >
           {!disableGeneration && (
             <div className="flex items-center justify-center gap-4 " >
                <button onClick={createseed} className={`border border-white p-2 rounded-md bg-gray-200 cursor-pointer hover:bg-gray-200 hover:text-black ${!seedavailable && mnemonic ? 'bg-gray-600' : 'bg-gray-800'}`}
                >Generate Seed Phrase</button>
                <button onClick={enableManualMode} className={`border border-white p-2 rounded-md bg-gray-200 cursor-pointer hover:bg-gray-200 hover:text-black ${seedavailable ? 'bg-gray-600' : 'bg-gray-800'}`}
                >Have a SeedPhrase?</button>
            </div>
           )}

           {seedavailable && (
            <div className='mt-4 text-gray-200 container mx-auto border border-white p-4 rounded-md bg-gray-800'>
                <h2 className='text-xl text-center mb-4 font-semibold'>Import Existing Seed Phrase</h2>
                <textarea className='w-full bg-gray-800 text-white p-3 rounded border border-gray-600 focus:outline-none focus:border-blue-500 resize-none h-24'
                placeholder='Enter your 12 word seed phrase here...' value={manualInput}
                onChange={(e)=>setManualInput(e.target.value)}/>

                <p className='text-yellow-500 text-xs mt-2 text-center'>⚠️ Caution: Ensure you are in a safe environment. Never share your seed phrase.</p>
                {error && <p className='text-red-500 text-sm mt-2'>{error}</p>}
                <button onClick={handleManualSubmit} className='mt-4 w-full p-4 bg-blue-600 text-white font-bold rounded hover:bg-blue-500 cursor-pointer transition-colors'
                >Validate & Submit</button>
            
            </div>)}

            {mnemonic && !seedavailable && (
                <div className="mt-4 text-gray-200 container mx-auto border border-white p-4 rounded-md bg-gray-800 " >
                <div onClick={()=>setIsExpanded(!isExpanded)} className="flex justify-between w-full items-center">
                    <h1 className='text-2xl text-gray-200'>Secret Phrase</h1>
                    <div className='flex gap-6 mr-1 '>
                    { isExpanded && <button onClick={() => copyToClipboard(mnemonic)} className='bg-black p-2 border border-white rounded cursor-pointer '>Copy</button>  }                        
                    <button onClick={()=> setIsExpanded(!isExpanded)}
                        className='bg-gray-600 p-2 border border-black rounded cursor-pointer '>{isExpanded ?'🔽':'🔼'}</button>
                    </div>
                </div>
                { isExpanded && (
                    <>
                    <p className='text-yellow-500 text-sm mt-4 mb-2 text-center'>⚠️ Warning: Save this phrase securely. If you lose it, you lose your funds forever.</p>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {MnemonicWords.map((word,index)=>(
                            <div key={index} className="border border-white p-2 rounded-md bg-gray-700 text-center">
                                <span className="font-bold mr-2">{index + 1}.</span> {word}
                            </div>
                        ))}
                    </div>
                    </>
                )}

            </div>   
            )}

            {mnemonic && seedavailable && (
                <div className='mt-4 p-4 bg-green-900/30 border border-green-500 rounded text-center animate-fade-in'>
                    <p className='text-green-400 mb-2 font-semibold'>Seed Phrase imported successfully.</p>
                    <p className='text-sm text-gray-400'>Proceed to set your password below</p>
                </div>
            )}
        </div>
    );
};

export default SeedPhrase;