import 'react-native-get-random-values';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, ScrollView, Alert, TextInput, Modal, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import * as SecureStore from 'expo-secure-store';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';

const { width, height } = Dimensions.get('window');

const WALLET_KEY = 'avax_wallet_key';
const NETWORK_KEY = 'avax_network';

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

export default function App() {
  const [wallet, setWallet] = useState<ethers.HDNodeWallet | ethers.Wallet | null>(null);
  const [balance, setBalance] = useState<string>('0.00');
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'import' | 'settings' | 'receive' | 'send' | null>(null);
  const [importKey, setImportKey] = useState('');
  const [network, setNetwork] = useState<'mainnet' | 'testnet'>('mainnet');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showSeedPhrase, setShowSeedPhrase] = useState(false);
  
  // Send transaction states
  const [recipientAddress, setRecipientAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [sendStep, setSendStep] = useState<'address' | 'amount'>('address');
  const [permission, requestPermission] = useCameraPermissions();
  const [isSending, setIsSending] = useState(false);

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

  const openModal = (type: 'create' | 'import' | 'settings' | 'receive' | 'send') => {
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
    // Check if it's a valid Ethereum address
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
      <View style={styles.container}>
        <LinearGradient colors={['#0A0B0D', '#16171B']} style={styles.background}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading Wallet...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0B0D', '#16171B']} style={styles.background}>
        <StatusBar style="light" />
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['#E84142', '#E84142']}
                style={styles.logoGradient}
              >
                <Text style={styles.logoText}>A</Text>
              </LinearGradient>
            </View>
            <View>
              <Text style={styles.headerTitle}>AVAX Wallet</Text>
              <Text style={styles.headerSubtitle}>{NETWORKS[network].name}</Text>
            </View>
          </View>
          {wallet && (
            <TouchableOpacity onPress={() => openModal('settings')} style={styles.settingsButton}>
              <View style={styles.settingsIcon}>
                <View style={styles.settingsDot} />
                <View style={styles.settingsDot} />
                <View style={styles.settingsDot} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {!wallet ? (
            /* Welcome Screen */
            <View style={styles.welcomeContainer}>
              <View style={styles.welcomeCard}>
                <Text style={styles.welcomeTitle}>Welcome to AVAX Wallet</Text>
                <Text style={styles.welcomeDescription}>
                  Create a new wallet or import an existing one to get started
                </Text>
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => openModal('create')}
              >
                <LinearGradient
                  colors={['#E84142', '#C8373D']}
                  style={styles.primaryButtonGradient}
                >
                  <Text style={styles.primaryButtonText}>Create New Wallet</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => openModal('import')}
              >
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
            /* Main Wallet View */
            <View style={styles.walletContainer}>
              {/* Balance Card */}
              <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Total Balance</Text>
                <Text style={styles.balanceAmount}>{balance} AVAX</Text>
                <Text style={styles.balanceUSD}>≈ ${(parseFloat(balance) * 35.2).toFixed(2)} USD</Text>
                
                <TouchableOpacity 
                  style={styles.addressChip}
                  onPress={() => copyToClipboard(wallet.address, 'Address')}
                >
                  <Text style={styles.addressText}>{formatAddress(wallet.address)}</Text>
                  <View style={styles.copyIcon}>
                    <View style={styles.copyIconSquare} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Actions */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity style={styles.actionButton} onPress={() => openModal('send')}>
                  <View style={styles.actionIconContainer}>
                    <View style={styles.actionIconSend} />
                  </View>
                  <Text style={styles.actionText}>Send</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={() => openModal('receive')}>
                  <View style={styles.actionIconContainer}>
                    <View style={styles.actionIconReceive} />
                  </View>
                  <Text style={styles.actionText}>Receive</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton}>
                  <View style={styles.actionIconContainer}>
                    <View style={styles.actionIconSwap} />
                  </View>
                  <Text style={styles.actionText}>Swap</Text>
                </TouchableOpacity>
              </View>

              {/* Assets Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Assets</Text>
                
                <View style={styles.assetItem}>
                  <View style={styles.assetLeft}>
                    <View style={styles.assetIcon}>
                      <LinearGradient
                        colors={['#E84142', '#E84142']}
                        style={styles.assetIconGradient}
                      >
                        <Text style={styles.assetIconText}>A</Text>
                      </LinearGradient>
                    </View>
                    <View>
                      <Text style={styles.assetName}>Avalanche</Text>
                      <Text style={styles.assetSymbol}>AVAX</Text>
                    </View>
                  </View>
                  <View style={styles.assetRight}>
                    <Text style={styles.assetBalance}>{balance}</Text>
                    <Text style={styles.assetValue}>${(parseFloat(balance) * 35.2).toFixed(2)}</Text>
                  </View>
                </View>
              </View>

              {/* Network Info */}
              <View style={styles.networkCard}>
                <View style={styles.networkInfo}>
                  <Text style={styles.networkLabel}>Network</Text>
                  <Text style={styles.networkValue}>{NETWORKS[network].name}</Text>
                </View>
                <View style={styles.networkInfo}>
                  <Text style={styles.networkLabel}>Chain ID</Text>
                  <Text style={styles.networkValue}>{NETWORKS[network].chainId}</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </LinearGradient>

      {/* Modals */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {modalType === 'create' && 'Create New Wallet'}
                  {modalType === 'import' && 'Import Wallet'}
                  {modalType === 'settings' && 'Settings'}
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)} style={styles.modalClose}>
                  <View style={styles.modalCloseIcon} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {modalType === 'create' && (
                  <View style={styles.modalBody}>
                    <Text style={styles.modalDescription}>
                      Create a new wallet with a secure 12-word recovery phrase. Make sure to back it up safely.
                    </Text>
                    <TouchableOpacity style={styles.modalButton} onPress={createWallet}>
                      <LinearGradient
                        colors={['#E84142', '#C8373D']}
                        style={styles.modalButtonGradient}
                      >
                        <Text style={styles.modalButtonText}>Create Wallet</Text>
                      </LinearGradient>
                    </TouchableOpacity>
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
                      placeholderTextColor="#4A4B50"
                      value={importKey}
                      onChangeText={setImportKey}
                      multiline
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity style={styles.modalButton} onPress={importWallet}>
                      <LinearGradient
                        colors={['#E84142', '#C8373D']}
                        style={styles.modalButtonGradient}
                      >
                        <Text style={styles.modalButtonText}>Import Wallet</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}

                {modalType === 'settings' && wallet && (
                  <View style={styles.modalBody}>
                    {/* Network Selector */}
                    <View style={styles.settingSection}>
                      <Text style={styles.settingTitle}>Network</Text>
                      <View style={styles.networkSelector}>
                        <TouchableOpacity
                          style={[
                            styles.networkOption,
                            network === 'mainnet' && styles.networkOptionActive,
                          ]}
                          onPress={() => saveNetwork('mainnet')}
                        >
                          <Text style={[
                            styles.networkOptionText,
                            network === 'mainnet' && styles.networkOptionTextActive,
                          ]}>
                            Mainnet
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.networkOption,
                            network === 'testnet' && styles.networkOptionActive,
                          ]}
                          onPress={() => saveNetwork('testnet')}
                        >
                          <Text style={[
                            styles.networkOptionText,
                            network === 'testnet' && styles.networkOptionTextActive,
                          ]}>
                            Testnet
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Private Key */}
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

                    {/* Seed Phrase */}
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
                              onPress={() => copyToClipboard(wallet.mnemonic!.phrase, 'Recovery phrase')}
                            >
                              <Text style={styles.copyButtonText}>Copy</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Delete Wallet */}
                    <TouchableOpacity style={styles.deleteButton} onPress={deleteWallet}>
                      <Text style={styles.deleteButtonText}>Delete Wallet</Text>
                    </TouchableOpacity>
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
                          placeholderTextColor="#4A4B50"
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

                        <TouchableOpacity 
                          style={styles.modalButton} 
                          onPress={validateAndProceedToAmount}
                        >
                          <LinearGradient
                            colors={['#E84142', '#C8373D']}
                            style={styles.modalButtonGradient}
                          >
                            <Text style={styles.modalButtonText}>Next</Text>
                          </LinearGradient>
                        </TouchableOpacity>
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
                          placeholderTextColor="#4A4B50"
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

                        <TouchableOpacity 
                          style={styles.modalButton} 
                          onPress={sendTransaction}
                          disabled={isSending}
                        >
                          <LinearGradient
                            colors={['#E84142', '#C8373D']}
                            style={styles.modalButtonGradient}
                          >
                            <Text style={styles.modalButtonText}>
                              {isSending ? 'Sending...' : 'Send'}
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* QR Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowScanner(false)}
      >
        <View style={styles.scannerContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={handleQRScanned}
          >
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
  container: {
    flex: 1,
    backgroundColor: '#0A0B0D',
  },
  background: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8B8C94',
    fontWeight: '500',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    marginRight: 12,
  },
  logoGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8B8C94',
    marginTop: 2,
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    flexDirection: 'row',
    gap: 3,
  },
  settingsDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8B8C94',
  },
  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  // Welcome Screen
  welcomeContainer: {
    flex: 1,
    paddingTop: 40,
  },
  welcomeCard: {
    backgroundColor: '#16171B',
    borderRadius: 16,
    padding: 30,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#2A2B30',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeDescription: {
    fontSize: 14,
    color: '#8B8C94',
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryButton: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2A2B30',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  securityInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  securityItem: {
    alignItems: 'center',
  },
  securityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#16171B',
    borderWidth: 1,
    borderColor: '#2A2B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  securityIconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E84142',
  },
  securityText: {
    fontSize: 11,
    color: '#8B8C94',
  },
  // Wallet View
  walletContainer: {
    flex: 1,
    paddingTop: 20,
  },
  balanceCard: {
    backgroundColor: '#16171B',
    borderRadius: 20,
    padding: 30,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2A2B30',
  },
  balanceLabel: {
    fontSize: 13,
    color: '#8B8C94',
    marginBottom: 8,
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  balanceUSD: {
    fontSize: 16,
    color: '#8B8C94',
    marginBottom: 20,
  },
  addressChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0B0D',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  addressText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
    marginRight: 8,
  },
  copyIcon: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyIconSquare: {
    width: 12,
    height: 12,
    borderWidth: 1.5,
    borderColor: '#8B8C94',
    borderRadius: 3,
  },
  // Actions
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
  },
  actionButton: {
    alignItems: 'center',
  },
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
  actionText: {
    fontSize: 13,
    color: '#8B8C94',
    fontWeight: '500',
  },
  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
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
  assetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assetIcon: {
    marginRight: 12,
  },
  assetIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assetIconText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  assetName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  assetSymbol: {
    fontSize: 13,
    color: '#8B8C94',
  },
  assetRight: {
    alignItems: 'flex-end',
  },
  assetBalance: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  assetValue: {
    fontSize: 13,
    color: '#8B8C94',
  },
  // Network Card
  networkCard: {
    backgroundColor: '#16171B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2B30',
    marginBottom: 24,
  },
  networkInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  networkLabel: {
    fontSize: 13,
    color: '#8B8C94',
  },
  networkValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: height * 0.85,
  },
  modalContent: {
    backgroundColor: '#16171B',
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
    borderBottomColor: '#2A2B30',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalClose: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseIcon: {
    width: 20,
    height: 2,
    backgroundColor: '#8B8C94',
    transform: [{ rotate: '45deg' }],
    position: 'absolute',
  },
  modalBody: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 14,
    color: '#8B8C94',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalInput: {
    backgroundColor: '#0A0B0D',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#2A2B30',
    marginBottom: 20,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  modalButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  modalButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Settings
  settingSection: {
    marginBottom: 24,
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  settingToggle: {
    fontSize: 14,
    color: '#E84142',
    fontWeight: '500',
  },
  networkSelector: {
    flexDirection: 'row',
    backgroundColor: '#0A0B0D',
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
  networkOptionActive: {
    backgroundColor: '#E84142',
  },
  networkOptionText: {
    fontSize: 14,
    color: '#8B8C94',
    fontWeight: '500',
  },
  networkOptionTextActive: {
    color: '#FFFFFF',
  },
  keyContainer: {
    backgroundColor: '#0A0B0D',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2B30',
  },
  keyText: {
    fontSize: 12,
    color: '#8B8C94',
    lineHeight: 18,
    marginBottom: 12,
  },
  copyButton: {
    backgroundColor: '#E84142',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  copyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E84142',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E84142',
  },
  // Receive Modal
  qrContainer: {
    alignItems: 'center',
    marginVertical: 30,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignSelf: 'center',
  },
  receiveTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  receiveAddressContainer: {
    backgroundColor: '#0A0B0D',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2B30',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  receiveAddress: {
    flex: 1,
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  receiveAddressCopy: {
    marginLeft: 12,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiveDescription: {
    fontSize: 13,
    color: '#8B8C94',
    textAlign: 'center',
    lineHeight: 18,
  },
  // Send Modal
  sendLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  sendInput: {
    backgroundColor: '#0A0B0D',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#2A2B30',
    marginBottom: 16,
  },
  scanButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2A2B30',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  scanButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  sendToContainer: {
    backgroundColor: '#0A0B0D',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2B30',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sendToAddress: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  sendToEdit: {
    fontSize: 14,
    color: '#E84142',
    fontWeight: '500',
  },
  balanceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceInfoText: {
    fontSize: 13,
    color: '#8B8C94',
  },
  maxButton: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E84142',
  },
  // Scanner
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scannerHeader: {
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  scannerClose: {
    alignSelf: 'flex-start',
  },
  scannerCloseText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scannerFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerCorner: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 12,
  },
  scannerText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 100,
  },
});
