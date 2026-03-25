import CryptoJS from 'crypto-js';

export const encryptData = (data, password) => {
    try {
        // Generate random 128-bit (16-byte) salt and IV
        const salt = CryptoJS.lib.WordArray.random(128 / 8);
        const iv = CryptoJS.lib.WordArray.random(128 / 8);

        // Derive 256-bit key using PBKDF2
        const key = CryptoJS.PBKDF2(password, salt, {
            keySize: 256 / 32,
            iterations: 100000,
            hasher: CryptoJS.algo.SHA256
        });

        // Encrypt data with the derived key and IV
        const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key, { iv: iv });

        // Store ciphertext, salt, and iv as a JSON string
        return JSON.stringify({
            ciphertext: encrypted.toString(),
            salt: salt.toString(), // implicitly hex encoded
            iv: iv.toString()
        });

    } catch (error) {
        console.error("Encryption Error:", error);
        return null;
    }
};

export const decryptData = (encryptedDataString, password) => {
    try {
        let encryptedObj;
        
        // Attempt to parse new JSON format vault
        try {
            encryptedObj = JSON.parse(encryptedDataString);
            if (!encryptedObj || typeof encryptedObj !== 'object' || !encryptedObj.ciphertext) {
                throw new Error("Not a valid new format JSON vault");
            }
        } catch (_e) {
            // Fallback for old legacy Vaults
            try {
                const bytes = CryptoJS.AES.decrypt(encryptedDataString, password);
                const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
                if (decryptedString) {
                    return JSON.parse(decryptedString);
                }
            } catch (fallbackError) {
                console.error("Fallback decryption failed:", fallbackError);
            }
            return null; // Failed both new and old methods
        }

        const { ciphertext, salt, iv } = encryptedObj;
        if (!ciphertext || !salt || !iv) return null;

        // Parse hex strings back to WordArray
        const saltParsed = CryptoJS.enc.Hex.parse(salt);
        const ivParsed = CryptoJS.enc.Hex.parse(iv);

        // Re-derive the key
        const key = CryptoJS.PBKDF2(password, saltParsed, {
            keySize: 256 / 32,
            iterations: 100000,
            hasher: CryptoJS.algo.SHA256
        });

        // Decrypt
        const bytes = CryptoJS.AES.decrypt(ciphertext, key, { iv: ivParsed });
        const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

        if (!decryptedString) {
            return null;
        }

        return JSON.parse(decryptedString);

    } catch (error) {
        console.error("Decryption Failed:", error);
        return null;
    }
};