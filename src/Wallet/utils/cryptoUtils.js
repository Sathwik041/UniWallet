import CryptoJS from 'crypto-js';

export const encryptData=(data,password)=>{
    try{
        return CryptoJS.AES.encrypt(JSON.stringify(data), password).toString();

    }catch(error){
        console.error("Encryption Error:", error);
        return null;
    }
};

export const decryptData=(encryptedData,password)=>{
    try{
        const bytes=CryptoJS.AES.decrypt(encryptedData,password);
        const decryptedString=bytes.toString(CryptoJS.enc.Utf8);
        if(!decryptedString){
            return null;
        }
        return JSON.parse(decryptedString);

    }catch(error){
        console.error("Decryption Failed:", error);
        return null;
    }
};