# UniWallet 👛

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Ethereum](https://img.shields.io/badge/Ethereum-3C3C3D?style=for-the-badge&logo=Ethereum&logoColor=white)
![Solana](https://img.shields.io/badge/Solana-14F195?style=for-the-badge&logo=solana&logoColor=white)

UniWallet is a unified, secure, and modern HD (Hierarchical Deterministic) crypto wallet built with React. Designed for seamless interactions across multiple blockchains, it currently supports both **Ethereum** and **Solana** networks. UniWallet puts you in complete control by generating and encrypting your seed phrases entirely local to your device.

## ✨ Features

- **Multi-Chain Support**: Generate and manage both Ethereum (EVM) and Solana wallets from a single master seed phrase.
- **Hierarchical Deterministic (HD)**: Derive multiple accounts/addresses seamlessly.
- **Local Vault Encryption**: Your keys, your crypto. The mnemonic seed is encrypted using AES and stored locally. Never transmitted over the internet.
- **Network Switching**: Instantly toggle between Mainnet and Testnet environments for testing and real transactions.
- **Send Transactions**: Built-in mechanisms to securely sign and broadcast transactions on both Solana and Ethereum networks.
- **Modern UI/UX**: Sleek, dark-mode-first aesthetic built with Tailwind CSS, featuring subtle animations and real-time Toast notifications.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS
- **Blockchain Libraries**:
  - `ethers.js` (EVM & Ethereum integration)
  - `@solana/web3.js` (Solana integration)
- **Cryptography & Wallet**: 
  - `bip39` & `@scure/bip39` (Mnemonic seed generation)
  - `ed25519-hd-key` & `bs58` (Solana key derivations)
  - `crypto-js` (Local AES encryption)
- **State Management**: `zustand` (For toast notifications & global state)

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed (version 16+ recommended).

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/UniWallet.git
   cd UniWallet
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start the development server
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## 🔐 Security & Architecture

UniWallet prioritizes security by ensuring zero server-side storage of sensitive data. 
- **Vault Creation**: When you create a wallet, the generated mnemonic is securely encrypted with your chosen password.
- **Storage**: The encrypted blob is stored in the browser's `localStorage` as `uniwallet_vault`.
- **Unlocking**: The wallet is decrypted temporarily in memory when you provide your password. Locking or refreshing the page clears it from memory.

## 📝 Usage

1. **Setup New Wallet**: Click "Generate Seed Phrase", securely back up your 12-word mnemonic, and set a strong password.
2. **Unlock Wallet**: Use your password to unlock the encrypted vault.
3. **Manage Accounts**: Add new Solana or Ethereum addresses.
4. **Network**: Use the top right dropdown to switch between "Mainnet" and "Testnet".
5. **Send Funds**: Select a token and enter the recipient address and amount to broadcast a transaction.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
