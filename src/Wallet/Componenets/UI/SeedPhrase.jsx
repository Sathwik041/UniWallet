import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { useState } from 'react';
import { copyToClipboard } from '../../utils/copyToClipboard';


const SeedPhrase=({mnemonic,onMnemonicGenerated,disableGeneration=false})=>{
    const [isExpanded,setIsExpanded]=useState(false);

    const MnemonicWords=mnemonic ? mnemonic.split(" "):[];

    const createseed=async()=>{
        const mn=await bip39.generateMnemonic(wordlist);
        setIsExpanded(true);
        if (onMnemonicGenerated) {
            onMnemonicGenerated(mn);
        }
    }



    return(
        <div >
           {!disableGeneration && (
             <div className="flex items-center justify-center " >
                <button onClick={createseed} className="border border-white p-2 rounded-md bg-gray-700 cursor-pointer hover:bg-gray-200 hover:text-black ">Generate Seed Phrase</button>
            </div>
           )}
            <div className="mt-4 text-gray-200 container mx-auto border border-white p-4 rounded-md bg-gray-800 " >
                <div onClick={()=>setIsExpanded(!isExpanded)} className="flex justify-between w-full items-center">
                    <h1 className='text-2xl text-gray-200'>Secret Phrase</h1>
                    <div className='flex gap-6 mr-1 '>
                    { isExpanded && <button onClick={() => copyToClipboard(mnemonic)} className='bg-black p-2 border border-white rounded cursor-pointer '>Copy</button>  }                        <button onClick={()=> setIsExpanded(!isExpanded)}
                        className='bg-black p-2 border border-black rounded cursor-pointer '>{isExpanded ?'v':'>'}</button>
                    </div>
                </div>
                { isExpanded && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {MnemonicWords.map((word,index)=>(
                            <div key={index} className="border border-white p-2 rounded-md bg-gray-700 text-center">
                                <span className="font-bold mr-2">{index + 1}.</span> {word}
                            </div>
                        ))}
                    </div>
                )}
            </div>       
        </div>
    );
}

export default SeedPhrase;