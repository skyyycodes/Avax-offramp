# AVAX Off-Ramp (AvaPay)

An Expo + React Native mobile app for onboarding users and enabling non-custodial AVAX wallet operations as part of a UPI off-ramp experience.

This repository currently includes:

- A multi-step onboarding UI flow (email, OTP, wallet selection)
- A wallet dashboard with balance, transaction history, and transfer actions
- Local key management (create/import/delete wallet)
- Avalanche Mainnet/Fuji network switching

## Table of Contents

- [Overview](#overview)
- [Current Product Status](#current-product-status)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [App Flow](#app-flow)
- [Background Operations](#background-operations)
- [Wallet and Blockchain Details](#wallet-and-blockchain-details)
- [State Management](#state-management)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Configuration](#configuration)
- [Security Notes](#security-notes)
- [Compliance and Tax Considerations](#compliance-and-tax-considerations)
- [Legal Disclaimer](#legal-disclaimer)
- [Known Gaps and Roadmap](#known-gaps-and-roadmap)

## Overview

`Avax-offramp` is a prototype mobile app for crypto-to-fiat off-ramp UX on Avalanche.

The intended user story is:

1. User completes onboarding
2. User connects or creates an AVAX wallet
3. User can scan/send/receive for payment flows
4. Transaction activity is visible in-app

The wallet logic is non-custodial and runs on-device, using `ethers` with keys stored in `expo-secure-store`.

## Current Product Status

This project is a working frontend + wallet prototype, not a complete off-ramp product.

Implemented and functional:

- Wallet creation/import/delete
- Balance fetch from Avalanche RPC
- Send AVAX transaction
- QR-based receive flow
- Transaction list fetch from Snowtrace API
- Mainnet/Testnet switch persisted in secure storage

Partially implemented or placeholder:

- Onboarding screens do not yet call backend services (email/OTP are UI-only)
- UPI Pay action exists in UI but no integrated logic yet
- Card/Billing/History tabs are present in header but not populated
- `BankDetailsScreen` exists but is not currently wired into navigation flow

## Features

### Onboarding UX

- `WelcomeScreen`: product intro and entry point
- `AddEmailScreen`: email input step
- `EnterOTPScreen`: 4-digit OTP input UI
- `ConnectWalletScreen`: wallet provider selection UI
- Transition to wallet dashboard after connect action

### Wallet Management

- Create random wallet using `ethers.Wallet.createRandom()`
- Import wallet from:
  - Private key (`0x...`)
  - Seed phrase (12/24 words)
- Persist private key in secure storage
- View/copy private key and mnemonic (if available)
- Delete wallet from device with confirmation

### Blockchain Operations

- Fetch AVAX balance via Avalanche RPC
- Auto-refresh balance every 10 seconds
- Send AVAX to another address
- QR scan for recipient address (camera)
- Generate QR code for receive address
- Fetch and cache wallet transactions by network/address

### Network Support

- Avalanche Mainnet (`43114`)
- Avalanche Fuji Testnet (`43113`)
- Per-device network preference persistence

## Tech Stack

- React Native `0.81.5`
- Expo SDK `54`
- TypeScript (strict mode)
- Redux Toolkit + React Redux
- ethers.js `v6`
- expo-secure-store
- expo-camera
- react-native-qrcode-svg
- expo-clipboard
- react-native-svg + svg transformer

## Project Structure

```text
.
|-- App.tsx
|-- App.original.backup.tsx
|-- index.ts
|-- app.json
|-- eas.json
|-- metro.config.js
|-- package.json
|-- tsconfig.json
|-- src/
|   |-- components/
|   |   |-- CustomButton.tsx
|   |   `-- WalletHeader.tsx
|   |-- screens/
|   |   |-- WelcomeScreen.tsx
|   |   |-- AddEmailScreen.tsx
|   |   |-- EnterOTPScreen.tsx
|   |   |-- ConnectWalletScreen.tsx
|   |   |-- BankDetailsScreen.tsx
|   |   `-- WalletScreen.tsx
|   `-- store/
|       |-- index.ts
|       `-- transactionsSlice.ts
`-- assets/
```

Notes:

- `App.tsx` handles simple in-memory screen navigation and Redux provider setup.
- `App.original.backup.tsx` preserves an older monolithic version for reference.

## App Flow

### Navigation Flow (Current)

`Welcome -> AddEmail -> EnterOTP -> ConnectWallet -> Wallet`

Navigation is custom and local (not React Navigation), using `currentScreen` + `history` in `App.tsx`.

### Wallet Dashboard Tabs

Defined tabs in header:

- `Summary`
- `Transactions`
- `Card`
- `Billing`
- `History`

Current rendering behavior:

- `Summary`: wallet overview + quick actions + recent transactions
- `Transactions`: full transaction list for active address/network
- `Card`, `Billing`, `History`: placeholder/empty content

## Background Operations

This section explains what happens behind the scenes in a production-grade crypto-to-fiat off-ramp flow.

### End-to-End Pipeline

1. Client request initiation:
   The client sends an off-ramp request with amount, destination rail (for example UPI), and authenticated user context.

2. Identity and policy checks:
   The backend validates KYC status, sanction-screening status, transaction limits, and risk flags before allowing settlement.

3. Crypto transfer authorization:
   The user signs a transaction from their wallet, and funds move on-chain to a controlled settlement address or escrow flow.

4. Blockchain confirmation and finality:
   The backend waits for network confirmations, validates transaction integrity, and marks the payment as eligible for fiat payout.

5. Quote lock and fee computation:
   The service applies pricing logic (AVAX/INR rate, spread, network fee, platform fee) and stores a deterministic quote snapshot.

6. Fiat payout execution:
   A payout instruction is created to the banking/payment partner; status updates are tracked through webhook callbacks and retries.

7. Reconciliation and ledgering:
   On-chain transaction, quote, payout reference, and final status are reconciled into an audit trail record.

8. User notification and reporting:
   The client receives settlement status, and compliance exports are prepared for reporting obligations.

### Background Services Needed

- Wallet/signing service boundaries (or purely client-side signing)
- Quote and pricing service
- Compliance and risk engine
- Payout orchestration service
- Reconciliation service
- Event pipeline for alerts, retries, and audit logs

## Wallet and Blockchain Details

### Storage Keys

- `avax_wallet_key`: stored private key
- `avax_network`: selected network (`mainnet` or `testnet`)

### Network Config

- Mainnet RPC: `https://api.avax.network/ext/bc/C/rpc`
- Fuji RPC: `https://api.avax-test.network/ext/bc/C/rpc`
- Mainnet explorer API: `https://api.snowtrace.io/api`
- Testnet explorer API: `https://api-testnet.snowtrace.io/api`

### Transaction Caching

`transactionsSlice` caches transaction lists by:

- Lowercased wallet address
- Network

It also tracks:

- `lastBlockByKey` for incremental fetches
- `loadingByKey` for per-wallet loading states

## State Management

Redux is used for transaction state only.

- Store setup: `src/store/index.ts`
- Slice: `src/store/transactionsSlice.ts`

Local component state in `WalletScreen.tsx` handles:

- Wallet instance
- Balance/loading
- Modal state
- Send flow state (address, amount, scanner, step)
- Settings toggles (show key/seed)
- Active dashboard tab

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Xcode (for iOS simulator)
- Android Studio (for Android emulator)
- Expo CLI via `npx expo` (no global install required)

### Install

```bash
npm install
```

### Run

```bash
npm start
```

Then choose a target from the Expo prompt (iOS, Android, or web).

Direct platform commands:

```bash
npm run ios
npm run android
npm run web
```

## Scripts

From `package.json`:

- `npm start`: Start Expo dev server
- `npm run android`: Native Android run
- `npm run ios`: Native iOS run
- `npm run web`: Run on web target

## Configuration

### Expo App Metadata

Defined in `app.json`:

- App name: `AVAX Wallet`
- Slug: `Avax-offramp`
- iOS bundle: `com.avaxwallet.app`
- Android package: `com.avaxwallet.app`
- New architecture: enabled

### TypeScript

- `strict: true` in `tsconfig.json`

### SVG Support

`metro.config.js` configures `react-native-svg-transformer` so `.svg` files are handled as source modules.

## Security Notes

This app handles real private keys and signs transactions. Keep these points in mind:

1. Never share private keys or seed phrases.
2. Back up wallet recovery phrase before app deletion.
3. Use testnet for development and trial transfers.
4. Treat this repo as a prototype; add stronger production controls before launch.

Recommended production hardening:

- Biometric re-auth before sensitive actions
- Session locking and inactivity timeout
- Root/jailbreak detection
- API key protections and backend verification
- Signed release builds and secure CI/CD secrets handling

## Compliance and Tax Considerations

This project can be extended to international operations, but implementation must remain lawful and reportable in every jurisdiction where users are served.

### Important

- Do not use this product design to hide income, conceal beneficial ownership, or evade taxes.
- If you plan cross-border operations, use licensed legal and tax advisors in each target jurisdiction.

### What to Implement for Lawful Operations

1. KYC and customer due diligence:
   Collect and verify legal identity, residency, and beneficial ownership information before enabling off-ramp access.

2. AML/CFT controls:
   Add sanctions screening, suspicious-activity monitoring, velocity limits, and rule-based case management.

3. Recordkeeping and traceability:
   Store complete transaction lineage: user, wallet address, quote, conversion rate, payout beneficiary, payout reference, and timestamps.

4. Reporting readiness:
   Build exports and internal records required by local law and international exchange frameworks where applicable.

5. Jurisdiction-aware policy engine:
   Apply per-country transaction rules, thresholds, and restrictions at request time.

6. Travel-rule-ready architecture (where required):
   Support secure originator/beneficiary data exchange with regulated counterparties when legal thresholds apply.

### Engineering Workstream: How to Make It Possible

1. Identity and onboarding:
   Integrate a KYC provider, add residency capture, sanctions checks, and risk scoring.

2. Compliance data model:
   Create immutable audit tables for quote events, on-chain events, payout events, and review decisions.

3. Risk decision service:
   Implement pre-transaction policy checks, transaction monitoring, and manual-review queues.

4. Payout integrations:
   Integrate regulated banking/payment partners and add idempotent payout APIs with retry and reversal handling.

5. Reporting layer:
   Generate regulator/audit exports, retention policies, and internal reconciliation dashboards.

6. Controls and governance:
   Add role-based access, tamper-evident logs, key management controls, and scheduled compliance audits.

### International Entity Structuring Note

If the business uses multiple legal entities or offshore entities, this must be for lawful operational reasons and fully disclosed to tax/regulatory authorities. Structuring should be designed by licensed professionals, not by product documentation.

## Legal Disclaimer

- This repository and documentation are for technical implementation guidance only.
- Nothing here is tax, legal, accounting, or investment advice.
- Users and operators are responsible for complying with local laws, filings, and payment-network requirements.
- Consult qualified legal/tax professionals before launch in any jurisdiction.

