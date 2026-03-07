import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { store } from './src/store';
import WelcomeScreen from './src/screens/WelcomeScreen';
import AddEmailScreen from './src/screens/AddEmailScreen';
import EnterOTPScreen from './src/screens/EnterOTPScreen';
import ConnectWalletScreen from './src/screens/ConnectWalletScreen';
import BankDetailsScreen from './src/screens/BankDetailsScreen';
import WalletScreen from './src/screens/WalletScreen';

export type ScreenName =
  | 'Welcome'
  | 'AddEmail'
  | 'EnterOTP'
  | 'ConnectWallet'
  | 'BankDetails'
  | 'Wallet';

export type Navigation = {
  navigate: (screen: ScreenName) => void;
  replace: (screen: ScreenName) => void;
  goBack: () => void;
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('Welcome');
  const [history, setHistory] = useState<ScreenName[]>([]);

  const navigation: Navigation = {
    navigate: (screen: ScreenName) => {
      setHistory((prev) => [...prev, currentScreen]);
      setCurrentScreen(screen);
    },
    replace: (screen: ScreenName) => {
      setCurrentScreen(screen);
    },
    goBack: () => {
      setHistory((prev) => {
        const newHistory = [...prev];
        const previous = newHistory.pop();
        if (previous) setCurrentScreen(previous);
        return newHistory;
      });
    },
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Welcome':
        return <WelcomeScreen navigation={navigation} />;
      case 'AddEmail':
        return <AddEmailScreen navigation={navigation} />;
      case 'EnterOTP':
        return <EnterOTPScreen navigation={navigation} />;
      case 'ConnectWallet':
        return <ConnectWalletScreen navigation={navigation} />;
      case 'BankDetails':
        return <BankDetailsScreen navigation={navigation} />;
      case 'Wallet':
        return <WalletScreen />;
      default:
        return <WelcomeScreen navigation={navigation} />;
    }
  };

  return (
    <Provider store={store}>
      <StatusBar style="dark" />
      {renderScreen()}
    </Provider>
  );
}

// Original App code preserved in App.original.backup.tsx
// Wallet logic now lives in src/screens/WalletScreen.tsx
