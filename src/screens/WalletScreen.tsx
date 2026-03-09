import 'react-native-get-random-values';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { ethers } from 'ethers';
import * as SecureStore from 'expo-secure-store';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import CustomButton from '../components/CustomButton';
import WalletHeader, { type WalletTab } from '../components/WalletHeader';
import {
  setTransactions,
  mergeNewTransactions,
  setLoading,
  selectTransactions,
  selectTransactionsLoading,
  selectLastBlock,
  type TransactionItem,
} from '../store/transactionsSlice';

const { width, height } = Dimensions.get('window');

const WALLET_KEY = 'avax_wallet_key';
const NETWORK_KEY = 'avax_network';

const NETWORKS = {
  mainnet: {
    name: 'Avalanche Mainnet',
    rpc: 'https://api.avax.network/ext/bc/C/rpc',
    chainId: 43114,
    explorer: 'https://snowtrace.io',
    apiUrl: 'https://api.snowtrace.io/api',
  },
  testnet: {
    name: 'Avalanche Fuji Testnet',
    rpc: 'https://api.avax-test.network/ext/bc/C/rpc',
    chainId: 43113,
    explorer: 'https://testnet.snowtrace.io',
    apiUrl: 'https://api-testnet.snowtrace.io/api',
  },
};

export default function WalletScreen() {
  const dispatch = useAppDispatch();
  const [wallet, setWallet] = useState<ethers.HDNodeWallet | ethers.Wallet | null>(null);
  const [balance, setBalance] = useState<string>('0.00');
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'import' | 'settings' | 'receive' | 'send' | 'transfer' | null>(null);
  const [importKey, setImportKey] = useState('');
  const [network, setNetwork] = useState<'mainnet' | 'testnet'>('mainnet');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showSeedPhrase, setShowSeedPhrase] = useState(false);

  const [recipientAddress, setRecipientAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [sendStep, setSendStep] = useState<'address' | 'amount'>('address');
  const [permission, requestPermission] = useCameraPermissions();
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<WalletTab>('summary');

  const transactions = useAppSelector((state) =>
    selectTransactions(state, wallet?.address ?? '', network)
  );
  const transactionsLoading = useAppSelector((state) =>
    selectTransactionsLoading(state, wallet?.address ?? '', network)
  );
  const lastBlock = useAppSelector((state) =>
    selectLastBlock(state, wallet?.address ?? '', network)
  );

  useEffect(() => {
    loadWallet();
    loadNetwork();
  }, []);

  useEffect(() => {
    if (wallet) {
      fetchBalance(wallet.address);
      const interval = setInterval(() => {
        fetchBalance(wallet.address);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [wallet, network]);

  useEffect(() => {
    if (wallet && (activeTab === 'transactions' || activeTab === 'summary')) {
      fetchTransactions(wallet.address);
    }
  }, [wallet, network, activeTab]);

  const loadNetwork = async () => {
    try {
      const savedNetwork = await SecureStore.getItemAsync(NETWORK_KEY);
      if (savedNetwork === 'testnet' || savedNetwork === 'mainnet') {
        setNetwork(savedNetwork);
      }
    } catch (error) {
      console.error('Error loading network:', error);
    }
  };

  const saveNetwork = async (newNetwork: 'mainnet' | 'testnet') => {
    try {
      await SecureStore.setItemAsync(NETWORK_KEY, newNetwork);
      setNetwork(newNetwork);
    } catch (error) {
      console.error('Error saving network:', error);
    }
  };

  const loadWallet = async () => {
    try {
      const storedKey = await SecureStore.getItemAsync(WALLET_KEY);
      if (storedKey) {
        const wallet = new ethers.Wallet(storedKey);
        setWallet(wallet);
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBalance = async (address: string) => {
    try {
      const provider = new ethers.JsonRpcProvider(NETWORKS[network].rpc);
      const balance = await provider.getBalance(address);
      const formattedBalance = ethers.formatEther(balance);
      setBalance(parseFloat(formattedBalance).toFixed(4));
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const fetchTransactions = async (address: string) => {
    if (!address) return;
    const hasCache = transactions.length > 0;
    const fetchOnlyNew = hasCache && lastBlock > 0;

    if (!hasCache) {
      dispatch(setLoading({ address, network, loading: true }));
    }

    try {
      const apiUrl = NETWORKS[network].apiUrl;
      let url = `${apiUrl}?module=account&action=txlist&address=${address}&sort=desc`;
      if (fetchOnlyNew) {
        url += `&startblock=${lastBlock + 1}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.status === '1' && Array.isArray(data.result)) {
        const walletLower = address.toLowerCase();
        const items: TransactionItem[] = data.result.map((tx: any) => {
          const isSent = tx.from?.toLowerCase() === walletLower;
          return {
            hash: tx.hash,
            from: tx.from,
            to: tx.to || '',
            value: tx.value || '0',
            timeStamp: tx.timeStamp,
            blockNumber: tx.blockNumber,
            type: isSent ? 'sent' : 'received',
          };
        });

        if (fetchOnlyNew && items.length > 0) {
          dispatch(mergeNewTransactions({ address, network, newTransactions: items }));
        } else if (!fetchOnlyNew) {
          dispatch(setTransactions({ address, network, transactions: items }));
        }
      } else if (!hasCache) {
        dispatch(setTransactions({ address, network, transactions: [] }));
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      if (!hasCache) {
        dispatch(setTransactions({ address, network, transactions: [] }));
      }
    } finally {
      dispatch(setLoading({ address, network, loading: false }));
    }
  };

  const createWallet = async () => {
    try {
      setIsLoading(true);
      const newWallet = ethers.Wallet.createRandom();
      await SecureStore.setItemAsync(WALLET_KEY, newWallet.privateKey);
      setWallet(newWallet);
      setShowModal(false);
      Alert.alert(
        'Wallet Created',
        'Your new wallet has been created successfully. Please backup your seed phrase from Settings.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error creating wallet:', error);
      Alert.alert('Error', 'Failed to create wallet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const importWallet = async () => {
    try {
      setIsLoading(true);
      let importedWallet: ethers.HDNodeWallet | ethers.Wallet;

      if (importKey.includes(' ')) {
        importedWallet = ethers.Wallet.fromPhrase(importKey.trim());
      } else {
        importedWallet = new ethers.Wallet(importKey.trim());
      }

      await SecureStore.setItemAsync(WALLET_KEY, importedWallet.privateKey);
      setWallet(importedWallet);
      setShowModal(false);
      setImportKey('');
      Alert.alert('Success', 'Wallet imported successfully!');
    } catch (error) {
      console.error('Error importing wallet:', error);
      Alert.alert('Error', 'Invalid private key or seed phrase. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteWallet = () => {
    Alert.alert(
      'Delete Wallet',
      'Are you sure? Make sure you have backed up your private key or seed phrase!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await SecureStore.deleteItemAsync(WALLET_KEY);
              setWallet(null);
              setBalance('0.00');
              setShowModal(false);
              Alert.alert('Wallet Deleted', 'Your wallet has been removed from this device.');
            } catch (error) {
              console.error('Error deleting wallet:', error);
            }
          },
        },
      ]
    );
  };

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', `${label} copied to clipboard`);
  };

  const openModal = (type: 'create' | 'import' | 'settings' | 'receive' | 'send' | 'transfer') => {
    setModalType(type);
    setShowModal(true);
    setShowPrivateKey(false);
    setShowSeedPhrase(false);
    if (type === 'send') {
      setSendStep('address');
      setRecipientAddress('');
      setSendAmount('');
      setShowScanner(false);
    }
  };

  const handleQRScanned = ({ data }: { data: string }) => {
    setShowScanner(false);
    if (ethers.isAddress(data)) {
      setRecipientAddress(data);
    } else {
      Alert.alert('Invalid QR Code', 'The scanned QR code does not contain a valid address');
    }
  };

  const validateAndProceedToAmount = () => {
    if (!ethers.isAddress(recipientAddress)) {
      Alert.alert('Invalid Address', 'Please enter a valid Ethereum address');
      return;
    }
    setSendStep('amount');
  };

  const sendTransaction = async () => {
    if (!wallet || !recipientAddress || !sendAmount) return;

    const amount = parseFloat(sendAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (amount > parseFloat(balance)) {
      Alert.alert('Insufficient Balance', 'You do not have enough AVAX');
      return;
    }

    Alert.alert(
      'Confirm Transaction',
      `Send ${sendAmount} AVAX to\n${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setIsSending(true);
            try {
              const provider = new ethers.JsonRpcProvider(NETWORKS[network].rpc);
              const walletWithProvider = wallet.connect(provider);

              const tx = await walletWithProvider.sendTransaction({
                to: recipientAddress,
                value: ethers.parseEther(sendAmount),
              });

              Alert.alert('Transaction Sent', `Transaction hash:\n${tx.hash.slice(0, 10)}...`, [
                {
                  text: 'OK',
                  onPress: () => {
                    setShowModal(false);
                    setRecipientAddress('');
                    setSendAmount('');
                    fetchBalance(wallet.address);
                    fetchTransactions(wallet.address);
                  },
                },
              ]);
            } catch (error: any) {
              console.error('Transaction error:', error);
              Alert.alert('Transaction Failed', error.message || 'Failed to send transaction');
            } finally {
              setIsSending(false);
            }
          },
        },
      ]
    );
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.lightBackground]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingTextDark}>Loading Wallet...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.background, styles.lightBackground]}>
        <StatusBar style="dark" />

        <WalletHeader
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onMenuPress={wallet ? () => openModal('settings') : undefined}
        />

        {activeTab === 'summary' ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {!wallet ? (
            <View style={styles.welcomeContainer}>
              <View style={styles.welcomeCard}>
                <Text style={styles.welcomeTitle}>Welcome to AVAX Wallet</Text>
                <Text style={styles.welcomeDescription}>
                  Create a new wallet or import an existing one to get started
                </Text>
              </View>

              <CustomButton
                title="Create New Wallet"
                onPress={() => openModal('create')}
                style={styles.primaryButton}
              />

              <TouchableOpacity style={styles.secondaryButton} onPress={() => openModal('import')}>
                <Text style={styles.secondaryButtonText}>Import Wallet</Text>
              </TouchableOpacity>

              <View style={styles.securityInfo}>
                <View style={styles.securityItem}>
                  <View style={styles.securityIconContainer}>
                    <View style={styles.securityIconDot} />
                  </View>
                  <Text style={styles.securityText}>Encrypted & Secure</Text>
                </View>
                <View style={styles.securityItem}>
                  <View style={styles.securityIconContainer}>
                    <View style={styles.securityIconDot} />
                  </View>
                  <Text style={styles.securityText}>Non-Custodial</Text>
                </View>
                <View style={styles.securityItem}>
                  <View style={styles.securityIconContainer}>
                    <View style={styles.securityIconDot} />
                  </View>
                  <Text style={styles.securityText}>Open Source</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.walletContainer}>
              <View style={styles.summarySection}>
                <View style={styles.summaryHeader}>
                  <Text style={styles.summaryTitle}>Your Collective Summary</Text>
                  <TouchableOpacity>
                    <Text style={styles.summaryInfoIcon}>ⓘ</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.summaryAmount}>${(parseFloat(balance) * 35.2).toFixed(2)}</Text>
                <Text style={styles.summaryAvax}>{balance} AVAX</Text>

                <TouchableOpacity
                  style={styles.addressChipLight}
                  onPress={() => copyToClipboard(wallet.address, 'Address')}
                >
                  <Text style={styles.addressTextDark}>{formatAddress(wallet.address)}</Text>
                  <View style={styles.copyIconDark}>
                    <View style={styles.copyIconSquareDark} />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionCapsule} onPress={() => {}}>
                  <View style={styles.capsuleIconCard}>
                    <View style={styles.capsuleIconCardChip} />
                  </View>
                  <Text style={styles.actionCapsuleText}>UPI Pay</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCapsule}
                  onPress={() => openModal('transfer')}
                >
                  <Text style={styles.capsuleIconTransfer}>⇄</Text>
                  <Text style={styles.actionCapsuleText}>Transfer Funds</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionCapsuleCircle} onPress={() => {}}>
                  <Text style={styles.capsuleIconExport}>↓</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitleDark}>Transactions</Text>

                {transactionsLoading && transactions.length === 0 ? (
                  <Text style={styles.transactionsEmptyText}>Loading transactions...</Text>
                ) : transactions.length === 0 ? (
                  <Text style={styles.transactionsEmptyText}>No transactions yet</Text>
                ) : (
                  transactions.slice(0, 10).map((tx) => (
                    <View key={tx.hash} style={styles.transactionRow}>
                      <View style={[
                        styles.transactionRowIcon,
                        tx.type === 'sent' ? styles.transactionRowIconSent : styles.transactionRowIconReceived,
                      ]}>
                        <Text style={styles.transactionRowIconArrow}>
                          {tx.type === 'sent' ? '↑' : '↓'}
                        </Text>
                      </View>
                      <View style={styles.transactionRowContent}>
                        <Text style={styles.transactionRowTitle}>
                          {tx.type === 'sent' ? 'Sent' : 'Received'}
                        </Text>
                        <Text style={styles.transactionRowSubtitle}>
                          {tx.type === 'sent' ? 'Paid' : 'Received'} • {new Date(parseInt(tx.timeStamp, 10) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                      <Text style={[
                        styles.transactionRowAmount,
                        tx.type === 'sent' ? styles.transactionRowAmountSent : styles.transactionRowAmountReceived,
                      ]}>
                        {tx.type === 'sent' ? '-' : '+'}
                        {parseFloat(ethers.formatEther(tx.value)).toFixed(4)} AVAX
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}
        </ScrollView>
        ) : activeTab === 'transactions' ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {!wallet ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Connect a wallet to view transactions</Text>
            </View>
          ) : transactionsLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Loading transactions...</Text>
            </View>
          ) : transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No transactions yet</Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {transactions.map((tx) => (
                <View key={tx.hash} style={styles.transactionItem}>
                  <View style={[
                    styles.transactionIconCircle,
                    tx.type === 'sent' ? styles.transactionIconSent : styles.transactionIconReceived,
                  ]}>
                    <Text style={styles.transactionIconText}>
                      {tx.type === 'sent' ? '↑' : '↓'}
                    </Text>
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionType}>
                      {tx.type === 'sent' ? 'Sent' : 'Received'}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {new Date(parseInt(tx.timeStamp, 10) * 1000).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.transactionAmount,
                      tx.type === 'sent' ? styles.transactionAmountSent : styles.transactionAmountReceived,
                    ]}
                  >
                    {tx.type === 'sent' ? '-' : '+'}
                    {parseFloat(ethers.formatEther(tx.value)).toFixed(4)} AVAX
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
        ) : (
        <View style={styles.emptyTabContent} />
        )}
      </View>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  {(modalType === 'send' || modalType === 'receive') ? (
                    <TouchableOpacity
                      onPress={() => setModalType('transfer')}
                      style={styles.modalBackButton}
                    >
                      <Text style={styles.modalBackText}>← Back</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.modalClosePlaceholder} />
                  )}
                </View>
                <Text style={[styles.modalTitle, styles.modalTitleDark]}>
                  {modalType === 'create' && 'Create New Wallet'}
                  {modalType === 'import' && 'Import Wallet'}
                  {modalType === 'settings' && 'Settings'}
                  {modalType === 'transfer' && 'Transfer Funds'}
                  {modalType === 'send' && 'Send'}
                  {modalType === 'receive' && 'Receive'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowModal(false);
                    if (modalType === 'send') {
                      setSendStep('address');
                      setRecipientAddress('');
                      setSendAmount('');
                    }
                  }}
                  style={styles.modalClose}
                >
                  <View style={styles.modalCloseIcon} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >
                {modalType === 'create' && (
                  <View style={styles.modalBody}>
                    <Text style={styles.modalDescription}>
                      Create a new wallet with a secure 12-word recovery phrase. Make sure to back it
                      up safely.
                    </Text>
                    <CustomButton title="Create Wallet" onPress={createWallet} />
                  </View>
                )}

                {modalType === 'import' && (
                  <View style={styles.modalBody}>
                    <Text style={styles.modalDescription}>
                      Import your wallet using a private key or 12/24 word recovery phrase
                    </Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Enter private key or recovery phrase"
                      placeholderTextColor="#9CA3AF"
                      value={importKey}
                      onChangeText={setImportKey}
                      multiline
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <CustomButton title="Import Wallet" onPress={importWallet} />
                  </View>
                )}

                {modalType === 'settings' && wallet && (
                  <View style={styles.modalBody}>
                    <View style={styles.settingSection}>
                      <Text style={styles.settingTitle}>Network</Text>
                      <View style={styles.networkSelector}>
                        <TouchableOpacity
                          style={[styles.networkOption, network === 'mainnet' && styles.networkOptionActive]}
                          onPress={() => saveNetwork('mainnet')}
                        >
                          <Text
                            style={[
                              styles.networkOptionText,
                              network === 'mainnet' && styles.networkOptionTextActive,
                            ]}
                          >
                            Mainnet
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.networkOption, network === 'testnet' && styles.networkOptionActive]}
                          onPress={() => saveNetwork('testnet')}
                        >
                          <Text
                            style={[
                              styles.networkOptionText,
                              network === 'testnet' && styles.networkOptionTextActive,
                            ]}
                          >
                            Testnet
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.settingSection}>
                      <View style={styles.settingHeader}>
                        <Text style={styles.settingTitle}>Private Key</Text>
                        <TouchableOpacity onPress={() => setShowPrivateKey(!showPrivateKey)}>
                          <Text style={styles.settingToggle}>
                            {showPrivateKey ? 'Hide' : 'Show'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      {showPrivateKey && (
                        <View style={styles.keyContainer}>
                          <Text style={styles.keyText}>{wallet.privateKey}</Text>
                          <TouchableOpacity
                            style={styles.copyButton}
                            onPress={() => copyToClipboard(wallet.privateKey, 'Private key')}
                          >
                            <Text style={styles.copyButtonText}>Copy</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    {('mnemonic' in wallet && wallet.mnemonic) && (
                      <View style={styles.settingSection}>
                        <View style={styles.settingHeader}>
                          <Text style={styles.settingTitle}>Recovery Phrase</Text>
                          <TouchableOpacity onPress={() => setShowSeedPhrase(!showSeedPhrase)}>
                            <Text style={styles.settingToggle}>
                              {showSeedPhrase ? 'Hide' : 'Show'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        {showSeedPhrase && (
                          <View style={styles.keyContainer}>
                            <Text style={styles.keyText}>{wallet.mnemonic.phrase}</Text>
                            <TouchableOpacity
                              style={styles.copyButton}
                              onPress={() =>
                                copyToClipboard(wallet.mnemonic!.phrase, 'Recovery phrase')
                              }
                            >
                              <Text style={styles.copyButtonText}>Copy</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )}

                    <TouchableOpacity style={styles.deleteButton} onPress={deleteWallet}>
                      <Text style={styles.deleteButtonText}>Delete Wallet</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {modalType === 'transfer' && wallet && (
                  <View style={styles.modalBody}>
                    <Text style={styles.transferModalDescription}>
                      Choose how you want to transfer funds
                    </Text>
                    <View style={styles.transferOptions}>
                      <TouchableOpacity
                        style={styles.transferOption}
                        onPress={() => {
                          setModalType('send');
                          setSendStep('address');
                          setRecipientAddress('');
                          setSendAmount('');
                          setShowScanner(false);
                        }}
                      >
                        <View style={[styles.actionIconContainer, styles.transferOptionIcon]}>
                          <View style={[styles.actionIconSend, styles.actionIconSendDark]} />
                        </View>
                        <View style={styles.transferOptionTextBlock}>
                          <Text style={styles.transferOptionText}>Send</Text>
                          <Text style={styles.transferOptionSubtext}>Send AVAX to another address</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.transferOption}
                        onPress={() => setModalType('receive')}
                      >
                        <View style={[styles.actionIconContainer, styles.transferOptionIcon]}>
                          <View style={[styles.actionIconReceive, styles.actionIconReceiveDark]} />
                        </View>
                        <View style={styles.transferOptionTextBlock}>
                          <Text style={styles.transferOptionText}>Receive</Text>
                          <Text style={styles.transferOptionSubtext}>Receive AVAX via QR code</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {modalType === 'receive' && wallet && (
                  <View style={styles.modalBody}>
                    <View style={styles.qrContainer}>
                      <QRCode
                        value={wallet.address}
                        size={240}
                        backgroundColor="#FFFFFF"
                        color="#000000"
                      />
                    </View>
                    <Text style={styles.receiveTitle}>Your Wallet Address</Text>
                    <TouchableOpacity
                      style={styles.receiveAddressContainer}
                      onPress={() => copyToClipboard(wallet.address, 'Address')}
                    >
                      <Text style={styles.receiveAddress}>{wallet.address}</Text>
                      <View style={styles.receiveAddressCopy}>
                        <View style={styles.copyIconSquare} />
                      </View>
                    </TouchableOpacity>
                    <Text style={styles.receiveDescription}>
                      Scan this QR code or tap the address above to copy it
                    </Text>
                  </View>
                )}

                {modalType === 'send' && wallet && (
                  <View style={styles.modalBody}>
                    {sendStep === 'address' ? (
                      <>
                        <Text style={styles.sendLabel}>Recipient Address</Text>
                        <TextInput
                          style={styles.sendInput}
                          placeholder="0x..."
                          placeholderTextColor="#9CA3AF"
                          value={recipientAddress}
                          onChangeText={setRecipientAddress}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />

                        <TouchableOpacity
                          style={styles.scanButton}
                          onPress={() => {
                            if (permission?.granted) {
                              setShowScanner(true);
                            } else {
                              requestPermission();
                            }
                          }}
                        >
                          <Text style={styles.scanButtonText}>Scan QR Code</Text>
                        </TouchableOpacity>

                        <CustomButton title="Next" onPress={validateAndProceedToAmount} />
                      </>
                    ) : (
                      <>
                        <Text style={styles.sendLabel}>Send To</Text>
                        <View style={styles.sendToContainer}>
                          <Text style={styles.sendToAddress}>
                            {formatAddress(recipientAddress)}
                          </Text>
                          <TouchableOpacity onPress={() => setSendStep('address')}>
                            <Text style={styles.sendToEdit}>Edit</Text>
                          </TouchableOpacity>
                        </View>

                        <Text style={styles.sendLabel}>Amount (AVAX)</Text>
                        <TextInput
                          style={styles.sendInput}
                          placeholder="0.00"
                          placeholderTextColor="#9CA3AF"
                          value={sendAmount}
                          onChangeText={setSendAmount}
                          keyboardType="decimal-pad"
                        />

                        <View style={styles.balanceInfo}>
                          <Text style={styles.balanceInfoText}>Available: {balance} AVAX</Text>
                          <TouchableOpacity onPress={() => setSendAmount(balance)}>
                            <Text style={styles.maxButton}>MAX</Text>
                          </TouchableOpacity>
                        </View>

                        <CustomButton
                          title={isSending ? 'Sending...' : 'Send'}
                          onPress={sendTransaction}
                          disabled={isSending}
                        />
                      </>
                    )}
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showScanner}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowScanner(false)}
      >
        <View style={styles.scannerContainer}>
          <CameraView style={styles.camera} facing="back" onBarcodeScanned={handleQRScanned}>
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerHeader}>
                <TouchableOpacity
                  onPress={() => setShowScanner(false)}
                  style={styles.scannerClose}
                >
                  <Text style={styles.scannerCloseText}>✕ Close</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.scannerFrame}>
                <View style={styles.scannerCorner} />
              </View>
              <Text style={styles.scannerText}>Scan QR Code</Text>
            </View>
          </CameraView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  background: { flex: 1 },
  lightBackground: { backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#8B8C94', fontWeight: '500' },
  loadingTextDark: { fontSize: 16, color: '#6B7280', fontWeight: '500' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logoContainer: { marginRight: 12 },
  logoGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#FFFFFF' },
  headerTitleDark: { color: '#1A1A1A' },
  headerSubtitle: { fontSize: 12, color: '#8B8C94', marginTop: 2 },
  headerSubtitleDark: { color: '#6B7280' },
  settingsButton: { padding: 8 },
  settingsIcon: { flexDirection: 'row', gap: 3 },
  settingsIconDark: {},
  settingsDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#6B7280' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  emptyTabContent: { flex: 1, backgroundColor: '#FFFFFF' },
  emptyState: {
    flex: 1,
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: { fontSize: 14, color: '#6B7280' },
  transactionsList: { paddingBottom: 40 },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  transactionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionIconSent: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
  transactionIconReceived: { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
  transactionIconText: { fontSize: 18, fontWeight: '700', color: '#374151' },
  transactionDetails: { flex: 1 },
  transactionType: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 2 },
  transactionDate: { fontSize: 13, color: '#6B7280' },
  transactionAmount: { fontSize: 14, fontWeight: '600' },
  transactionAmountSent: { color: '#EF4444' },
  transactionAmountReceived: { color: '#22C55E' },
  transactionsEmptyText: { fontSize: 14, color: '#6B7280', paddingVertical: 16 },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  transactionRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionRowIconSent: { backgroundColor: '#F3F4F6' },
  transactionRowIconReceived: { backgroundColor: '#F3F4F6' },
  transactionRowIconArrow: { fontSize: 16, fontWeight: '700', color: '#374151' },
  transactionRowContent: { flex: 1 },
  transactionRowTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 2 },
  transactionRowSubtitle: { fontSize: 13, color: '#6B7280' },
  transactionRowAmount: { fontSize: 15, fontWeight: '600' },
  transactionRowAmountSent: { color: '#1A1A1A' },
  transactionRowAmountReceived: { color: '#22C55E' },
  welcomeContainer: { flex: 1, paddingTop: 40 },
  welcomeCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 30,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryButton: { marginBottom: 16 },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  secondaryButtonText: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  securityInfo: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 },
  securityItem: { alignItems: 'center' },
  securityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  securityIconDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E84142' },
  securityText: { fontSize: 11, color: '#6B7280' },
  walletContainer: { flex: 1, paddingTop: 20 },
  balanceCard: {
    backgroundColor: '#16171B',
    borderRadius: 20,
    padding: 30,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2A2B30',
  },
  summarySection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  summaryTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginRight: 8 },
  summaryInfoIcon: { fontSize: 14, color: '#6B7280' },
  summaryAmount: { fontSize: 36, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  summaryAvax: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
  balanceLabel: { fontSize: 13, color: '#8B8C94', marginBottom: 8, fontWeight: '500' },
  balanceAmount: { fontSize: 42, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  balanceUSD: { fontSize: 16, color: '#8B8C94', marginBottom: 20 },
  addressChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0B0D',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  addressText: { fontSize: 13, color: '#FFFFFF', fontWeight: '500', marginRight: 8 },
  addressChipLight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addressTextDark: { fontSize: 13, color: '#1A1A1A', fontWeight: '500', marginRight: 8 },
  copyIcon: { width: 16, height: 16, justifyContent: 'center', alignItems: 'center' },
  copyIconDark: { width: 16, height: 16, justifyContent: 'center', alignItems: 'center' },
  copyIconSquare: { width: 12, height: 12, borderWidth: 1.5, borderColor: '#8B8C94', borderRadius: 3 },
  copyIconSquareDark: { width: 12, height: 12, borderWidth: 1.5, borderColor: '#6B7280', borderRadius: 3 },
  actionsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 32 },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 12,
  },
  actionCapsule: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  actionCapsuleCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsuleIconCard: {
    width: 22,
    height: 14,
    borderWidth: 1.5,
    borderColor: '#374151',
    borderRadius: 3,
    padding: 2,
  },
  capsuleIconCardChip: {
    width: 8,
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 1,
  },
  capsuleIconTransfer: { fontSize: 18, color: '#374151', fontWeight: '600' },
  capsuleIconExport: { fontSize: 20, color: '#374151', fontWeight: '600' },
  actionCapsuleText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  actionButton: { alignItems: 'center' },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#16171B',
    borderWidth: 1,
    borderColor: '#2A2B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionIconSend: {
    width: 20,
    height: 20,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
    marginLeft: 4,
    marginBottom: 4,
  },
  actionIconReceive: {
    width: 20,
    height: 20,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
    marginRight: 4,
    marginTop: 4,
  },
  actionIconSwap: {
    width: 20,
    height: 20,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#FFFFFF',
  },
  actionText: { fontSize: 13, color: '#8B8C94', fontWeight: '500' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 16 },
  sectionTitleDark: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 16 },
  assetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#16171B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2B30',
  },
  assetItemLight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  assetLeft: { flexDirection: 'row', alignItems: 'center' },
  assetIcon: { marginRight: 12 },
  assetIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assetIconText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  assetName: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginBottom: 2 },
  assetNameDark: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 2 },
  assetSymbol: { fontSize: 13, color: '#8B8C94' },
  assetSymbolDark: { fontSize: 13, color: '#6B7280' },
  assetRight: { alignItems: 'flex-end' },
  assetBalance: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginBottom: 2 },
  assetBalanceDark: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 2 },
  assetValue: { fontSize: 13, color: '#8B8C94' },
  assetValueDark: { fontSize: 13, color: '#6B7280' },
  networkCard: {
    backgroundColor: '#16171B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2B30',
    marginBottom: 24,
  },
  networkInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  networkLabel: { fontSize: 13, color: '#8B8C94' },
  networkLabelDark: { fontSize: 13, color: '#6B7280' },
  networkValue: { fontSize: 13, color: '#FFFFFF', fontWeight: '500' },
  networkValueDark: { fontSize: 13, color: '#1A1A1A', fontWeight: '500' },
  networkCardLight: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: { maxHeight: height * 0.85 },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalHeaderLeft: { minWidth: 60, alignItems: 'flex-start' },
  modalBackButton: { padding: 4 },
  modalBackText: { fontSize: 16, color: '#7C3AED', fontWeight: '600' },
  modalClosePlaceholder: { width: 32, height: 32 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A', flex: 1, textAlign: 'center' },
  modalTitleDark: { color: '#1A1A1A' },
  modalClose: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  modalCloseIcon: {
    width: 20,
    height: 2,
    backgroundColor: '#6B7280',
    transform: [{ rotate: '45deg' }],
    position: 'absolute',
  },
  transferModalDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 24,
  },
  transferOptions: { gap: 16 },
  transferOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  transferOptionIcon: {
    backgroundColor: '#1A1A1A',
    borderWidth: 0,
    marginRight: 16,
  },
  transferOptionTextBlock: { flex: 1 },
  transferOptionText: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },
  transferOptionSubtext: { fontSize: 13, color: '#6B7280' },
  actionIconSendDark: { borderColor: '#FFFFFF' },
  actionIconReceiveDark: { borderColor: '#FFFFFF' },
  modalScrollContent: { paddingBottom: 40 },
  modalBody: { padding: 20 },
  modalDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    color: '#1A1A1A',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  settingSection: { marginBottom: 24 },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  settingToggle: { fontSize: 14, color: '#E84142', fontWeight: '500' },
  networkSelector: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 4,
    marginTop: 12,
  },
  networkOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  networkOptionActive: { backgroundColor: '#E84142' },
  networkOptionText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  networkOptionTextActive: { color: '#FFFFFF' },
  keyContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  keyText: { fontSize: 12, color: '#6B7280', lineHeight: 18, marginBottom: 12 },
  copyButton: {
    backgroundColor: '#E84142',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  copyButtonText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  deleteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E84142',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  deleteButtonText: { fontSize: 15, fontWeight: '600', color: '#E84142' },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 30,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignSelf: 'center',
  },
  receiveTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 16, textAlign: 'center' },
  receiveAddressContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  receiveAddress: { flex: 1, fontSize: 12, color: '#1A1A1A', fontWeight: '500' },
  receiveAddressCopy: { marginLeft: 12, width: 16, height: 16, justifyContent: 'center', alignItems: 'center' },
  receiveDescription: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 18 },
  sendLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 },
  sendInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    color: '#1A1A1A',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  scanButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  scanButtonText: { fontSize: 14, fontWeight: '500', color: '#1A1A1A' },
  sendToContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sendToAddress: { fontSize: 14, color: '#1A1A1A', fontWeight: '500' },
  sendToEdit: { fontSize: 14, color: '#E84142', fontWeight: '500' },
  balanceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceInfoText: { fontSize: 13, color: '#6B7280' },
  maxButton: { fontSize: 13, fontWeight: '600', color: '#E84142' },
  scannerContainer: { flex: 1, backgroundColor: '#000000' },
  camera: { flex: 1 },
  scannerOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  scannerHeader: { paddingTop: 60, paddingHorizontal: 20 },
  scannerClose: { alignSelf: 'flex-start' },
  scannerCloseText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
  scannerFrame: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scannerCorner: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 12,
  },
  scannerText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600', textAlign: 'center', marginBottom: 100 },
});
