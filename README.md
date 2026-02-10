# AVAX Wallet 🚀

A beautiful, classy Avalanche wallet app with full wallet management features.

## ✨ Features

### 🆕 Create Wallet
- Generate a new wallet with a secure 12-word seed phrase
- Automatically saved to secure encrypted storage
- Display seed phrase for backup

### 📥 Import Wallet
- Import existing wallet using:
  - Private key (0x...)
  - 12-word seed phrase
  - 24-word seed phrase

### 💰 Balance Display
- Real-time AVAX balance from Avalanche C-Chain
- Auto-refresh every 10 seconds
- Clean, modern UI

### 🔐 Security Features
- Secure storage using Expo SecureStore
- View private key (with confirmation)
- Copy address/private key to clipboard
- Delete wallet (with confirmation)

### 🎨 Design
- Dark gradient theme (navy to charcoal)
- Glassmorphism effects
- Smooth animations
- Premium look and feel
- Avalanche red theme

## 📱 How to Use

1. **Create New Wallet**
   - Tap "🆕 Create Wallet"
   - Save your 12-word seed phrase (VERY IMPORTANT!)
   - Copy it to a secure location
   - Your wallet is ready!

2. **Import Existing Wallet**
   - Tap "📥 Import Wallet"
   - Enter your private key or seed phrase
   - Tap "Import Wallet"
   - Done!

3. **View Balance**
   - Your AVAX balance displays automatically
   - Tap the address to copy it
   - Balance refreshes every 10 seconds

4. **Manage Wallet**
   - Tap "🔑 View Key" to see/copy your private key
   - Tap "🗑️ Delete" to remove wallet (make sure to backup first!)

## 🚀 Running the App

```bash
# Install dependencies
npm install

# Start Expo
npm start

# Or run directly on web
npm run web

# Or run on Android
npm run android

# Or run on iOS  
npm run ios
```

## ⚠️ Important Security Notes

1. **NEVER share your private key or seed phrase with anyone**
2. **ALWAYS backup your seed phrase** before deleting the app
3. **Store your seed phrase securely** (write it down, don't store digitally)
4. This is a demo app - for production use, add additional security layers

## 🔧 Tech Stack

- React Native + Expo
- TypeScript
- ethers.js (v6)
- Expo SecureStore (encrypted storage)
- Expo Linear Gradient
- Avalanche C-Chain RPC

## 📡 Network

- **Network**: Avalanche C-Chain (Mainnet)
- **Chain ID**: 43114
- **RPC**: https://api.avax.network/ext/bc/C/rpc
- **Explorer**: https://snowtrace.io

## 🎯 Features Comparison

| Feature | Status |
|---------|--------|
| Create Wallet | ✅ |
| Import Wallet (Private Key) | ✅ |
| Import Wallet (Seed Phrase) | ✅ |
| View Balance | ✅ |
| Copy Address | ✅ |
| View Private Key | ✅ |
| Secure Storage | ✅ |
| Delete Wallet | ✅ |
| Auto Balance Refresh | ✅ |
| Beautiful UI | ✅ |
| Send Transactions | ❌ (Coming soon) |
| Transaction History | ❌ (Coming soon) |
| Multiple Wallets | ❌ (Coming soon) |

## 📄 License

MIT

## 🤝 Contributing

Feel free to open issues or submit PRs!

---

Made with ❤️ for the Avalanche ecosystem
