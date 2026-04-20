/**
 * Pure functions to derive wallet addresses from a mnemonic.
 * These mirror the derivation logic in SolanaWallet.jsx and EVMWallet.jsx
 * but only return public addresses (read-only, for the Portfolio view).
 */

import { mnemonicToSeedSync } from "@scure/bip39";
import { HDNodeWallet } from "ethers";
import { derivePath } from "ed25519-hd-key";
import nacl from "tweetnacl";
import bs58 from "bs58";

/**
 * Derive Solana public addresses from a mnemonic.
 * Uses BIP-44 path: m/44'/501'/{index}'/0'
 *
 * @param {string} mnemonic - BIP-39 mnemonic phrase
 * @param {number} count    - Number of wallets to derive
 * @returns {{ publicKey: string, index: number }[]}
 */
export function deriveSolanaAddresses(mnemonic, count) {
    if (!mnemonic || count <= 0) return [];

    const seed = mnemonicToSeedSync(mnemonic, "");
    const seedHex = Buffer.from(seed).toString("hex");
    const addresses = [];

    for (let i = 0; i < count; i++) {
        try {
            const path = `m/44'/501'/${i}'/0'`;
            const derivedSeed = derivePath(path, seedHex).key;
            const keypair = nacl.sign.keyPair.fromSeed(derivedSeed);
            addresses.push({
                publicKey: bs58.encode(keypair.publicKey),
                index: i,
            });
        } catch (error) {
            console.error(`Failed to derive Solana address at index ${i}:`, error);
        }
    }

    return addresses;
}

/**
 * Derive EVM (Ethereum / Monad) public addresses from a mnemonic.
 * Uses BIP-44 path: m/44'/60'/0'/0/{index}
 *
 * @param {string} mnemonic - BIP-39 mnemonic phrase
 * @param {number} count    - Number of wallets to derive
 * @returns {{ publicKey: string, index: number }[]}
 */
export function deriveEVMAddresses(mnemonic, count) {
    if (!mnemonic || count <= 0) return [];

    const seed = mnemonicToSeedSync(mnemonic, "");
    const hdNode = HDNodeWallet.fromSeed(seed);
    const addresses = [];

    for (let i = 0; i < count; i++) {
        try {
            const path = `m/44'/60'/0'/0/${i}`;
            const child = hdNode.derivePath(path);
            addresses.push({
                publicKey: child.address,
                index: i,
            });
        } catch (error) {
            console.error(`Failed to derive EVM address at index ${i}:`, error);
        }
    }

    return addresses;
}
