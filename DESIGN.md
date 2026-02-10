# AVAX Wallet - Professional Design 🎨

A completely redesigned professional wallet interface inspired by Phantom and Solflare.

## 🎯 Design Philosophy

- **Minimalist & Clean**: No emojis, no cartoonish elements
- **Professional**: Dark theme with subtle accents
- **Modern**: Rounded corners, proper spacing, clean typography
- **Premium Feel**: Like a real crypto wallet app

## 🎨 Color Palette

```
Primary Background: #0A0B0D (Deep Black)
Secondary Background: #16171B (Dark Gray)
Border Color: #2A2B30 (Subtle Gray)
Text Primary: #FFFFFF (White)
Text Secondary: #8B8C94 (Gray)
Accent Color: #E84142 (Avalanche Red)
```

## ✨ Key Features

### 1. **Professional Header**
- Circular Avalanche logo (gradient)
- Wallet name and network indicator
- Settings icon (3 dots)

### 2. **Welcome Screen** (No Wallet)
- Clean welcome card
- "Create New Wallet" button (red gradient)
- "Import Wallet" button (outlined)
- Security features showcase

### 3. **Main Wallet View** (With Wallet)
- **Balance Card**: Large balance display with USD conversion
- **Address Chip**: Tap to copy address
- **Quick Actions**: Send, Receive, Swap buttons
- **Assets Section**: List of tokens (currently just AVAX)
- **Network Info**: Shows network and chain ID

### 4. **Settings Modal** (Bottom Sheet)
Accessible via settings icon, includes:

#### Network Switcher
- Toggle between Mainnet and Testnet
- Visual toggle design
- Saves preference

#### Private Key Section
- Show/Hide toggle
- Copy button
- Secure display

#### Recovery Phrase Section
- Show/Hide toggle
- Copy button
- Only shows if wallet has mnemonic

#### Delete Wallet
- Outlined red button
- Confirmation dialog

## 🎯 UI Components

### Buttons
- **Primary**: Red gradient (#E84142)
- **Secondary**: Transparent with border
- **Icon Buttons**: Circular with icons

### Cards
- Background: #16171B
- Border: #2A2B30
- Rounded: 12-20px
- Subtle elevation

### Typography
- **Headers**: 18-24px, weight 600-700
- **Body**: 13-15px, weight 400-500
- **Labels**: 11-13px, weight 500
- **Color**: White primary, Gray secondary

### Icons
- Custom CSS-based icons (no emoji!)
- Minimalist line art style
- Consistent sizing

## 📱 Screens

### 1. Welcome Screen
```
┌─────────────────────────┐
│  [A] AVAX Wallet        │ ← Header
│  Network Name           │
├─────────────────────────┤
│                         │
│  [Welcome Card]         │
│  Welcome to AVAX Wallet │
│  Get started message    │
│                         │
│  [Create New Wallet]    │ ← Primary button
│  [Import Wallet]        │ ← Secondary button
│                         │
│  • Encrypted & Secure   │
│  • Non-Custodial        │
│  • Open Source          │
└─────────────────────────┘
```

### 2. Main Wallet View
```
┌─────────────────────────┐
│  [A] AVAX Wallet    [⋮] │ ← Header + Settings
│  Avalanche Mainnet      │
├─────────────────────────┤
│                         │
│  Total Balance          │
│  12.5000 AVAX          │ ← Large balance
│  ≈ $440.00 USD         │
│  [0x1234...5678] 📋    │ ← Address chip
│                         │
│  [↑Send] [↓Receive] [⇄Swap] │ ← Actions
│                         │
│  Assets                 │
│  ┌───────────────────┐ │
│  │ [A] Avalanche     │ │
│  │     AVAX     12.5 │ │
│  └───────────────────┘ │
│                         │
│  Network Info           │
│  Network: Mainnet       │
│  Chain ID: 43114        │
└─────────────────────────┘
```

### 3. Settings Modal
```
┌─────────────────────────┐
│  Settings           [×] │ ← Modal header
├─────────────────────────┤
│                         │
│  Network                │
│  [Mainnet] [Testnet]   │ ← Toggle
│                         │
│  Private Key     [Show] │
│  ┌─────────────────┐   │
│  │ 0x123...789     │   │
│  │ [Copy]          │   │
│  └─────────────────┘   │
│                         │
│  Recovery Phrase [Show] │
│  ┌─────────────────┐   │
│  │ word1 word2 ... │   │
│  │ [Copy]          │   │
│  └─────────────────┘   │
│                         │
│  [Delete Wallet]       │ ← Danger button
└─────────────────────────┘
```

## 🚀 Features

✅ No emojis - professional icons only
✅ Dark minimalist theme
✅ Network switcher (Mainnet/Testnet)
✅ View private key (with show/hide)
✅ View recovery phrase (with show/hide)
✅ Copy to clipboard functionality
✅ Delete wallet with confirmation
✅ Real-time balance updates
✅ USD price conversion
✅ Professional modal design
✅ Smooth animations
✅ Phantom/Solflare inspired UI

## 🎨 Comparison

### Before (Cartoonish)
- Bright gradients everywhere
- Large emojis (👛🔒⚡💎)
- Colorful cards
- "Fun" but not professional

### After (Professional)
- Subtle dark theme
- Clean line icons
- Minimal color accent (Avalanche red)
- Professional & trustworthy

## 🔧 Technical Details

- **Framework**: React Native + Expo
- **State Management**: React Hooks
- **Storage**: Expo SecureStore (encrypted)
- **Network**: ethers.js v6
- **Design**: Custom StyleSheet (no UI library)
- **Icons**: Pure CSS (no icon fonts)

---

This wallet now looks and feels like a real professional crypto wallet! 🚀
