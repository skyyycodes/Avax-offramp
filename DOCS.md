# AVAX Off-Ramp — Technical Documentation

## What This App Does

A non-custodial mobile wallet on the Avalanche C-Chain that lets users pay each other in AVAX. The core off-ramp concept is:

1. **Payer scans a UPI QR code** (or enters an AVAX address directly)
2. **Payer sends AVAX** from their wallet
3. **Recipient receives equivalent INR** via UPI

The app handles the crypto side of this flow — wallet management, balance tracking, and sending AVAX transactions on-chain. The fiat conversion (AVAX → INR disbursement) is an off-chain settlement step.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    App.tsx (monolith)                │
│                                                     │
│  ┌──────────────┐   ┌──────────────┐               │
│  │  State Layer │   │ Logic Layer  │               │
│  │  (hooks)     │   │ (functions)  │               │
│  └──────┬───────┘   └──────┬───────┘               │
│         │                  │                        │
│  ┌──────▼──────────────────▼───────┐               │
│  │          UI Layer               │               │
│  │  Welcome / Wallet / Modals      │               │
│  └─────────────────────────────────┘               │
└─────────────────────────────────────────────────────┘
         │                       │
         ▼                       ▼
 expo-secure-store        ethers.js v6
 (encrypted local)    (Avalanche C-Chain RPC)
```

Everything lives in a single [App.tsx](App.tsx) file (~1,440 lines). No separate component files, no external state manager.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo ~54 |
| Language | TypeScript (strict mode) |
| Blockchain | ethers.js v6 — Avalanche C-Chain |
| Key Storage | expo-secure-store (AES encrypted) |
| QR Generation | react-native-qrcode-svg |
| QR Scanning | expo-camera + CameraView |
| Gradients | expo-linear-gradient |
| Clipboard | expo-clipboard |

---

## Network Configuration

```typescript
// App.tsx:17-30
const NETWORKS = {
  mainnet: {
    name: 'Avalanche Mainnet',
    rpc: 'https://api.avax.network/ext/bc/C/rpc',
    chainId: 43114,
    explorer: 'https://snowtrace.io',
  },
  testnet: {
    name: 'Avalanche Fuji Testnet',
    rpc: 'https://api.avax-test.network/ext/bc/C/rpc',
    chainId: 43113,
    explorer: 'https://testnet.snowtrace.io',
  },
};
```

Network preference is persisted in secure storage under the key `avax_network`. Defaults to mainnet on first launch.

---

## State

```typescript
// Core wallet
wallet        → ethers.HDNodeWallet | ethers.Wallet | null
balance       → string  (formatted AVAX, 4 decimal places)
network       → 'mainnet' | 'testnet'
isLoading     → boolean

// Modal routing
showModal     → boolean
modalType     → 'create' | 'import' | 'settings' | 'receive' | 'send' | null

// Send flow
recipientAddress → string
sendAmount       → string
sendStep         → 'address' | 'amount'
isSending        → boolean
showScanner      → boolean

// Settings
showPrivateKey  → boolean
showSeedPhrase  → boolean
importKey       → string
```

---

## Core Functions

### Wallet Lifecycle

#### `loadWallet()` — [App.tsx:86](App.tsx#L86)
Reads the private key from `expo-secure-store` on app mount. Reconstructs an `ethers.Wallet` instance. If no key is stored, the welcome screen is shown.

#### `createWallet()` — [App.tsx:111](App.tsx#L111)
```typescript
const newWallet = ethers.Wallet.createRandom();
await SecureStore.setItemAsync(WALLET_KEY, newWallet.privateKey);
```
Generates a random HD wallet with a 12-word mnemonic. Only the private key is stored (the mnemonic can be derived from it later via the settings modal).

#### `importWallet()` — [App.tsx:131](App.tsx#L131)
Accepts either a private key (`0x...`) or a BIP-39 seed phrase (12 or 24 words). Detection: if the input contains spaces → treat as mnemonic, else → private key.

```typescript
if (importKey.includes(' ')) {
  importedWallet = ethers.Wallet.fromPhrase(importKey.trim());
} else {
  importedWallet = new ethers.Wallet(importKey.trim());
}
```

#### `deleteWallet()` — [App.tsx:155](App.tsx#L155)
Removes the key from secure storage and resets all wallet state. Shows a confirmation alert first.

---

### Balance

#### `fetchBalance(address)` — [App.tsx:100](App.tsx#L100)
```typescript
const provider = new ethers.JsonRpcProvider(NETWORKS[network].rpc);
const balance = await provider.getBalance(address);
setBalance(parseFloat(ethers.formatEther(balance)).toFixed(4));
```
Called immediately when wallet loads, then on a 10-second interval via `setInterval`. Interval is cleared when the component unmounts or when the wallet/network changes.

USD display: `balance * 35.2` — hardcoded price, not a live feed.

---

### Send Flow (The Off-Ramp Path)

This is the primary user journey for the AVAX → INR off-ramp.

#### Step 1 — Recipient Address

The user either:
- **Types** an Ethereum-format address (`0x...`) manually, or
- **Scans a QR code** using the camera

The QR scan path is key for the UPI off-ramp use case: the user scans a UPI QR code that contains an Avalanche address (the off-ramp operator's receiving address), and it auto-fills the recipient field.

```
User opens Send modal
      │
      ├─ Manual input → types 0x address
      │
      └─ Tap "Scan QR Code"
              │
              ├─ Camera permission? No → requestPermission()
              │
              └─ Yes → CameraView opens → handleQRScanned()
                           │
                           ├─ ethers.isAddress(data) → valid → setRecipientAddress()
                           └─ invalid → Alert "Invalid QR Code"
```

#### `handleQRScanned({ data })` — [App.tsx:198](App.tsx#L198)
```typescript
if (ethers.isAddress(data)) {
  setRecipientAddress(data);
} else {
  Alert.alert('Invalid QR Code', 'The scanned QR code does not contain a valid address');
}
```

Currently only validates Ethereum-format addresses. A UPI QR code (`upi://pay?pa=...`) would fail this check — see [Gaps](#gaps--what-needs-to-be-built) below.

#### `validateAndProceedToAmount()` — [App.tsx:208](App.tsx#L208)
Validates the address with `ethers.isAddress()` and advances `sendStep` to `'amount'`.

#### Step 2 — Amount

User enters an AVAX amount. "MAX" button fills the full balance. Available balance is shown inline.

#### `sendTransaction()` — [App.tsx:216](App.tsx#L216)
```typescript
const provider = new ethers.JsonRpcProvider(NETWORKS[network].rpc);
const walletWithProvider = wallet.connect(provider);
const tx = await walletWithProvider.sendTransaction({
  to: recipientAddress,
  value: ethers.parseEther(sendAmount),
});
```
Validates amount > 0, checks balance, shows confirmation dialog, then broadcasts the transaction. On success, shows the tx hash (first 10 chars) and refreshes balance.

---

### Receive Flow

#### `openModal('receive')` — [App.tsx:617](App.tsx#L617)
Renders a `QRCode` component with `value={wallet.address}`. The user's Avalanche address is encoded as a QR that a sender can scan. Also shows the full address as tappable text that copies to clipboard.

---

## Full User Flows

### Flow 1: First-Time Setup
```
App launch
  → loadWallet() → no key in SecureStore
  → Welcome screen shown
  → "Create New Wallet" → createWallet()
      → ethers.Wallet.createRandom()
      → private key saved to SecureStore
      → wallet state set
  → Wallet view rendered
  → fetchBalance() called immediately
  → 10s interval started
```

### Flow 2: Send AVAX (Core Off-Ramp)
```
Wallet view → tap "Send"
  → openModal('send')
      → sendStep = 'address'
      → recipientAddress = ''
      → sendAmount = ''

ADDRESS STEP:
  Option A — Manual:
    → type 0x address in TextInput
    → tap "Next"
    → validateAndProceedToAmount()
    → sendStep = 'amount'

  Option B — QR Scan (UPI Off-Ramp path):
    → tap "Scan QR Code"
    → camera permission check
    → CameraView renders full screen
    → user points at QR code
    → handleQRScanned({ data })
    → ethers.isAddress(data) check
    → recipientAddress set
    → scanner closes
    → sendStep still 'address'
    → tap "Next" → sendStep = 'amount'

AMOUNT STEP:
  → type AVAX amount (or tap MAX)
  → tap "Send"
  → sendTransaction()
      → validate amount > 0
      → check amount <= balance
      → Alert.alert("Confirm Transaction", ...)
      → user taps "Send" in dialog
      → wallet.connect(provider).sendTransaction(...)
      → tx broadcast to Avalanche C-Chain
      → Alert shows tx hash
      → fetchBalance() refreshes
      → modal closes
```

### Flow 3: Show Receive Address
```
Wallet view → tap "Receive"
  → openModal('receive')
  → QRCode renders wallet.address as QR
  → User shows QR to payer (or shares address)
  → Payer scans and sends AVAX
```

### Flow 4: Import Existing Wallet
```
Welcome screen → "Import Wallet"
  → openModal('import')
  → user pastes private key or seed phrase
  → tap "Import Wallet"
  → importWallet()
      → detect: spaces? → fromPhrase() : new Wallet()
      → save private key to SecureStore
      → wallet state set
  → Wallet view rendered
```

---

## File Structure

```
Avax-offramp/
├── App.tsx          ← Entire app: state, logic, UI, styles
├── index.ts         ← Expo entry point (registerRootComponent)
├── app.json         ← Expo config (name, bundle IDs, icons)
├── package.json     ← Dependencies
├── tsconfig.json    ← TypeScript: strict, extends expo base
├── DESIGN.md        ← UI design spec and color palette
├── README.md        ← User-facing feature list
├── DOCS.md          ← This file
└── assets/
    ├── icon.png
    ├── splash-icon.png
    ├── adaptive-icon.png
    └── favicon.png
```

---

## Storage Keys

| Key | Store | Value |
|---|---|---|
| `avax_wallet_key` | expo-secure-store | Raw private key string (`0x...`) |
| `avax_network` | expo-secure-store | `'mainnet'` or `'testnet'` |

Private key is stored in plaintext within the encrypted secure store. On Android this is backed by the Android Keystore system; on iOS by the Keychain.

---

## UI Structure

```
App
├── LinearGradient background (#0A0B0D → #16171B)
├── Header
│   ├── Logo (red circle "A") + "AVAX Wallet" + network name
│   └── Settings button (3 dots) [only when wallet exists]
├── ScrollView
│   ├── [No wallet] Welcome Screen
│   │   ├── Welcome card
│   │   ├── "Create New Wallet" (red gradient button)
│   │   ├── "Import Wallet" (outlined button)
│   │   └── Security badges (Encrypted, Non-Custodial, Open Source)
│   │
│   └── [With wallet] Wallet View
│       ├── Balance Card
│       │   ├── "{balance} AVAX" (42px font)
│       │   ├── "≈ ${balance * 35.2} USD" (hardcoded price)
│       │   └── Address chip (tap to copy)
│       ├── Actions row: Send | Receive | Swap (Swap = no-op)
│       ├── Assets section (AVAX row)
│       └── Network info card (name + chain ID)
│
└── Modals (slide-up)
    ├── create   → single "Create Wallet" button
    ├── import   → text input + "Import Wallet" button
    ├── settings → network toggle, private key, seed phrase, delete
    ├── receive  → QR code + full address (tap to copy)
    └── send     → step 1: address input + scan QR | step 2: amount input
```

---

## Color Palette

| Token | Hex | Usage |
|---|---|---|
| Background | `#0A0B0D` | App background, address chip bg |
| Surface | `#16171B` | Cards, modals |
| Border | `#2A2B30` | Card borders, dividers |
| Text Primary | `#FFFFFF` | Headings, balance |
| Text Secondary | `#8B8C94` | Labels, subtitles |
| Accent | `#E84142` | Avalanche red — buttons, logo, asset icon |
| Accent Dark | `#C8373D` | Button gradient end |
| Input Placeholder | `#4A4B50` | TextInput placeholder |

---

## Gaps & What Needs to Be Built

The current implementation is the crypto wallet side only. To complete the AVAX → INR off-ramp, the following pieces are missing:

### 1. UPI QR Parsing
`handleQRScanned` currently rejects anything that isn't an Ethereum address. A real UPI QR contains a URI like:
```
upi://pay?pa=merchant@upi&pn=Merchant+Name&am=500&cu=INR
```
The app needs to:
- Parse the UPI URI to extract the payee VPA and INR amount
- Convert the INR amount to AVAX using a live price feed
- Pre-fill the AVAX send amount automatically
- Route the AVAX payment to the off-ramp operator's address (not the UPI VPA)

### 2. Live AVAX/INR Price Feed
The USD price is hardcoded at `35.2`. Need a real price API (CoinGecko, Chainlink, etc.) to calculate how much AVAX to send for a given INR amount.

### 3. Off-Ramp Operator Backend
The actual fiat disbursement requires a backend service that:
- Monitors the Avalanche C-Chain for incoming AVAX to the operator's address
- On confirmation, triggers a UPI payment to the merchant's VPA
- Handles rate locking, slippage, and settlement finality

### 4. Transaction History
No transaction log is shown. Users cannot verify past payments.

### 5. Gas Estimation
`sendTransaction` sends raw AVAX with no explicit gas parameters. ethers.js estimates gas automatically, but users see no fee breakdown before confirming.

### 6. Swap Button
The "Swap" action button in the wallet view is a no-op — no handler attached.

### 7. WalletConnect
`@walletconnect/ethereum-provider` and related packages are in `package.json` but not used anywhere in the code.

---

## Running Locally

```bash
# Install dependencies
npm install

# Start Expo dev server
npm start

# Android
npm run android

# iOS
npm run ios

# Web (limited functionality — camera/SecureStore may not work)
npm run web
```

Requires Expo Go on the device, or a native build via `eas build`.

---

## Security Notes

- Private keys are stored in `expo-secure-store` — encrypted at rest, never leaves the device
- No biometric lock on app open
- Private key is displayed in plaintext in the Settings modal when "Show" is tapped — acceptable for a demo, not for production
- No transaction signing confirmation beyond the native `Alert.alert` dialog
- The seed phrase is only accessible if the wallet was created via `createRandom()` (HD wallet); imported private-key wallets have no mnemonic
