import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type TransactionItem = {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  blockNumber?: string;
  type: 'sent' | 'received';
};

type TransactionsState = {
  byKey: Record<string, TransactionItem[]>;
  lastBlockByKey: Record<string, number>;
  loadingByKey: Record<string, boolean>;
};

const initialState: TransactionsState = {
  byKey: {},
  lastBlockByKey: {},
  loadingByKey: {},
};

function getCacheKey(address: string, network: string): string {
  return `${address.toLowerCase()}_${network}`;
}

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    setTransactions: (
      state,
      action: PayloadAction<{
        address: string;
        network: string;
        transactions: TransactionItem[];
      }>
    ) => {
      const key = getCacheKey(action.payload.address, action.payload.network);
      state.byKey[key] = action.payload.transactions;
      const maxBlock = action.payload.transactions.reduce((max, tx) => {
        const block = tx.blockNumber ? parseInt(tx.blockNumber, 10) : 0;
        return Math.max(max, block);
      }, 0);
      if (maxBlock > 0) {
        state.lastBlockByKey[key] = maxBlock;
      }
      state.loadingByKey[key] = false;
    },
    mergeNewTransactions: (
      state,
      action: PayloadAction<{
        address: string;
        network: string;
        newTransactions: TransactionItem[];
      }>
    ) => {
      const key = getCacheKey(action.payload.address, action.payload.network);
      const existing = state.byKey[key] || [];
      const existingHashes = new Set(existing.map((t) => t.hash));
      const toAdd = action.payload.newTransactions.filter((t) => !existingHashes.has(t.hash));
      if (toAdd.length > 0) {
        const merged = [...toAdd, ...existing].sort(
          (a, b) => parseInt(b.timeStamp, 10) - parseInt(a.timeStamp, 10)
        );
        state.byKey[key] = merged;
        const maxBlock = merged.reduce((max, tx) => {
          const block = tx.blockNumber ? parseInt(tx.blockNumber, 10) : 0;
          return Math.max(max, block);
        }, 0);
        if (maxBlock > 0) {
          state.lastBlockByKey[key] = maxBlock;
        }
      }
      state.loadingByKey[key] = false;
    },
    setLoading: (
      state,
      action: PayloadAction<{
        address: string;
        network: string;
        loading: boolean;
      }>
    ) => {
      const key = getCacheKey(action.payload.address, action.payload.network);
      state.loadingByKey[key] = action.payload.loading;
    },
    clearTransactions: (
      state,
      action: PayloadAction<{ address: string; network: string }>
    ) => {
      const key = getCacheKey(action.payload.address, action.payload.network);
      delete state.byKey[key];
      delete state.lastBlockByKey[key];
      delete state.loadingByKey[key];
    },
  },
});

export const {
  setTransactions,
  mergeNewTransactions,
  setLoading,
  clearTransactions,
} = transactionsSlice.actions;

export const selectTransactions = (state: { transactions: TransactionsState }, address: string, network: string) =>
  state.transactions.byKey[getCacheKey(address, network)] || [];

export const selectLastBlock = (state: { transactions: TransactionsState }, address: string, network: string) =>
  state.transactions.lastBlockByKey[getCacheKey(address, network)] || 0;

export const selectTransactionsLoading = (state: { transactions: TransactionsState }, address: string, network: string) =>
  state.transactions.loadingByKey[getCacheKey(address, network)] ?? false;

export default transactionsSlice.reducer;
