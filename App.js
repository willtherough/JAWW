// --- TOP OF FILE ---
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  StyleSheet, View, Text, TouchableOpacity, FlatList, ScrollView,
  Modal, Alert, SafeAreaView, StatusBar, Image, Animated,
  Dimensions, Platform, Vibration, PermissionsAndroid, Pressable,
  ActivityIndicator, TextInput, DeviceEventEmitter, ToastAndroid, LogBox, NativeModules 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { useUpdates } from 'expo-updates';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';

// --- DATA & SERVICE IMPORTS ---
import { loadLibrary, saveLibrary, loadProfile, saveProfile, saveTrustedSource, loadTrustedSources as fetchFromDB } from './model/Storage';
import { INITIAL_SEEDS } from './utils/SeedData';
import { TOPICS } from './model/Definitions';
import { MASTER_LIBRARY, funLibrary } from './services/library/';
import { getOrGenerateKeys, signData } from './model/Security';
import { initDB, batchInsertCards, insertOrReplaceCard, insertTransferRecord, getAllCards, getCardById, blockOperator, searchCards, fetchCards, trustNode } from './model/database';
import BluetoothService from './services/BluetoothService';
import { startServer, sendCardInChunks } from './services/PeripheralService'; // <--- ENGINE 4
import { createCard, forkCard } from './model/Schema';

// --- COMPONENT IMPORTS ---
import CardDetailModal from './components/CardDetailModal';
import CreateCardModal from './components/CreateCardModal';
import ScannerModal from './components/ScannerModal';
import TrustedSourcesModal from './components/TrustedSourcesModal';
import OracleModal from './components/OracleModal';
import IdentityModal from './components/IdentityModal';
import Onboarding from './components/Onboarding';
import CardItem from './components/CardItem';

// --- CONFIGURATION ---
LogBox.ignoreLogs(['Cannot read property \'addService\' of null']);

console.log("🛠️ NATIVE MODULES DEBUG 🛠️");
const keys = Object.keys(NativeModules);
console.log("All Modules count:", keys.length);
console.log("SourceGattModule Found:", NativeModules.SourceGattModule ? 'YES' : 'NO');

// --- CONSTANTS ---
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const WHEEL_SIZE = 380; const CENTER = WHEEL_SIZE/2; const RADIUS = (WHEEL_SIZE/2)-10;

// --- UI HELPERS ---
const getCategoryIcon = (category) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('fitness') || cat.includes('health')) return '⚡️'; 
  if (cat.includes('food') || cat.includes('cooking')) return '🍎'; 
  if (cat.includes('education') || cat.includes('history')) return '🧠'; 
  if (cat.includes('professional') || cat.includes('military')) return '🛡️'; 
  if (cat.includes('fun') || cat.includes('survival')) return '⛺️'; 
  return '📦'; 
};

const getRankDisplay = (hops) => {
  if (!hops) return '🟢 ROOKIE';
  if (hops > 50) return '🟣 ELITE';
  if (hops > 20) return '🔵 VETERAN';
  if (hops > 5) return '🟡 SCOUT';
  return '🟢 ROOKIE';
};

// --- PERMISSIONS ---
const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        if (Platform.Version >= 31) {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE, 
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          ]);
          return Object.values(granted).every(status => status === PermissionsAndroid.RESULTS.GRANTED);
        } else {
          const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
      } catch (err) { console.warn(err); return false; }
    }
    return true; 
};

// --- SUB-COMPONENTS (Internal Modals) ---
const TransferRequestModal = ({ visible, request, onAccept, onDeny }) => {
    if (!visible || !request) return null;

    const { requester, card } = request;

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={[styles.modalBox, {borderColor: '#f59e0b'}]}>
                    <Text style={styles.modalTitle}>INCOMING REQUEST</Text>
                    <Text style={styles.textGray}>
                        Operator <Text style={{color: '#f59e0b', fontWeight: 'bold'}}>{requester}</Text> is requesting the following card:
                    </Text>
                    <View style={[styles.card, {backgroundColor: '#222', marginTop: 15}]}>
                        <Text style={styles.cardTitle}>{card.title}</Text>
                        <Text style={{color:'#666', fontSize:10, fontFamily:'Courier'}}>ID: {card.id.substring(0,8)}...</Text>
                    </View>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 20}}>
                        <TouchableOpacity onPress={onDeny} style={[styles.btnOutline, {flex: 1, marginRight: 10, borderColor: '#ff0000', marginTop: 0}]}>
                            <Text style={[styles.btnTextGray, {color: '#ff0000'}]}>DENY</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onAccept} style={[styles.btnPrimary, {flex: 2}]}>
                            <Text style={styles.btnTextBlack}>ACCEPT & SEND</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const ChainModal = ({ visible, card, onClose, currentUserHandle }) => {
    if (!visible || !card) return null;
    const formatDate = (val) => {
        try { return new Date(val).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); } 
        catch (e) { return 'Unknown Date'; }
    };
    const genesisAuthor = card.originalAuthor || (card.genesis ? card.genesis.author_id : card.author);
    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalBox}>
                    <Text style={styles.modalTitle}>CHAIN OF CUSTODY</Text>
                    <ScrollView style={{maxHeight: 400}}>
                        <View style={{flexDirection:'row', marginBottom: 20}}>
                             <View style={{width: 30, alignItems:'center'}}><Text style={{fontSize:16}}>👑</Text><View style={{width: 2, height: 40, backgroundColor: '#333', marginTop: 5}} /></View>
                             <View style={{marginLeft: 10, flex: 1}}><Text style={{color:'#f59e0b', fontWeight:'bold', fontSize:12}}>ORIGIN</Text><Text style={{color:'#fff', fontWeight:'bold', fontSize:16}}>{genesisAuthor}</Text></View>
                        </View>
                        {(card.history || []).map((node, i) => {
                            const isFork = node.action === 'FORKED';
                            const displayUser = node.user || node.user_id || genesisAuthor; 
                            let actionText = `${node.action} by ${displayUser}`;
                            if (node.action === 'CREATED') actionText = `Created by ${displayUser}`;
                            else if (node.action === 'RECEIVED') actionText = `Received from ${displayUser}`;
                            else if (node.action === 'TRANSFER') {
                                const fromUser = node.from || card.genesis.author_id;
                                const toUser = node.user;
                                actionText = (toUser === currentUserHandle) ? `Received from ${fromUser}` : (fromUser === currentUserHandle) ? `Shared with ${toUser}` : `Transferred from ${fromUser} to ${toUser}`;
                            }
                            return (
                                <View key={i} style={{flexDirection:'row', marginBottom: 20}}>
                                    <View style={{width: 30, alignItems:'center'}}><View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: isFork ? '#f59e0b' : '#333', borderWidth:1, borderColor:'#fff'}} /><View style={{width: 2, height: 40, backgroundColor: '#333', marginTop: 5}} /></View>
                                    <View style={{marginLeft: 10, flex: 1}}>
                                        <Text style={{color: isFork ? '#f59e0b' : '#fff', fontWeight:'bold'}}>{actionText}</Text>
                                        <Text style={{color:'#666', fontSize:12, fontFamily:'Courier', marginTop: 2}}>{formatDate(node.date || node.timestamp)}</Text>
                                        {node.note && <Text style={{color:'#ccc', fontSize:12, fontStyle:'italic', marginTop:2}}>"{node.note}"</Text>}
                                    </View>
                                </View>
                            );
                        })}
                        <View style={{flexDirection:'row', marginBottom: 20}}>
                             <View style={{width: 30, alignItems:'center'}}><View style={{width: 12, height: 12, borderRadius: 6, backgroundColor: '#00ff00', borderWidth:1, borderColor:'#fff'}} /></View>
                             <View style={{marginLeft: 10, flex: 1}}><Text style={{color:'#00ff00', fontWeight:'bold', fontSize:12}}>CURRENT HOLDER</Text><Text style={{color:'#fff'}}>Held by You</Text></View>
                        </View>
                    </ScrollView>
                    <TouchableOpacity onPress={onClose} style={styles.btnOutline}><Text style={styles.btnTextGray}>CLOSE LEDGER</Text></TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const RemoteLibraryModal = ({ visible, onClose, catalog, onDownload, isLoading }) => {
    if (!visible) return null;
    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.dossierBox}>
                    <View style={styles.dossierHeader}><Text style={styles.dossierHandle}>REMOTE ARCHIVES</Text><TouchableOpacity onPress={onClose}><Text style={{color:'#666', fontSize: 18}}>×</Text></TouchableOpacity></View>
                    <View style={{padding: 10, backgroundColor: '#001100', borderBottomWidth:1, borderColor:'#222'}}><Text style={{color:'#00ff00', fontSize:10, fontFamily:'Courier'}}>// SORTED BY: RELEVANCE & TRUST //</Text></View>
                    <FlatList 
                        data={catalog}
                        keyExtractor={(item) => item.id}
                        renderItem={({item}) => (
                            <View style={styles.libraryItem}>
                                <View style={{flexDirection:'row', alignItems:'center', flex:1}}>
                                    <Text style={{fontSize:24, marginRight:10}}>{getCategoryIcon(item.topic)}</Text>
                                    <View><Text style={{color:'#fff', fontWeight:'bold'}}>{item.title}</Text><Text style={{color:'#666', fontSize:10, fontFamily:'Courier'}}>HOPS: {item.hops} • {item.topic.toUpperCase()}</Text></View>
                                </View>
                                <TouchableOpacity onPress={() => onDownload(item)} disabled={isLoading} style={styles.btnSmallGreen}><Text style={styles.btnTextBlack}>⬇</Text></TouchableOpacity>
                            </View>
                        )}
                    />
                </View>
            </View>
        </Modal>
    );
};

const StatusOrb = ({ status }) => {
    let color = '#333';
    switch(status) {
        case 'BROADCASTING': color = '#00ff00'; break;
        case 'SCANNING': color = '#0088ff'; break; 
        case 'CONNECTING': color = '#f59e0b'; break;
        case 'CONNECTED': color = '#00ff00'; break;
        case 'ERROR': color = '#ff0000'; break;
        default: color = '#333';
    }
    return (<View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: color, shadowColor: color, shadowOpacity: 0.8, shadowRadius: 10, elevation: 5 }} />);
};

const ContextModal = ({ visible, card, onClose, onSave }) => {
    const [note, setNote] = useState('');
    if (!visible) return null;
    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.modalOverlay}><View style={styles.modalBox}><Text style={styles.modalTitle}>ADD CONTEXT (FORK)</Text><TextInput style={styles.contextInput} multiline placeholder="What are you adding?" placeholderTextColor="#444" value={note} onChangeText={setNote}/><TouchableOpacity onPress={() => onSave(note)} style={styles.btnPrimary}><Text style={styles.btnTextBlack}>SIGN & FORK</Text></TouchableOpacity><TouchableOpacity onPress={onClose} style={styles.btnCancel}><Text style={styles.btnTextGray}>CANCEL</Text></TouchableOpacity></View></View>
        </Modal>
    );
};

const HandshakeModal = ({ visible, peer, onClose, onGrab, onBrowse, isLoading }) => {
    if (!visible || !peer) return null;
    const offer = peer.offer || {};
    const hasPayload = !!offer.title;
    const category = offer.topic ? offer.topic.split('/')[1] || offer.topic : 'general';
    const icon = getCategoryIcon(category);
    const sourceName = peer.name || peer.handle || "UNKNOWN SIGNAL";
    const sourceRank = getRankDisplay(offer.hops);
    const lastUpdate = new Date(peer.lastSeen || Date.now()).toLocaleTimeString();

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.dossierBox}>
                    <View style={styles.dossierHeader}>
                        <View><Text style={styles.dossierHandle}>{sourceName.toUpperCase()}</Text><Text style={styles.dossierMeta}>SIG: {peer.rssi}dBm • UPDATED: {lastUpdate}</Text></View>
                        <View style={styles.rankBadge}><Text style={styles.rankText}>{sourceRank}</Text></View>
                    </View>
                    <View style={styles.divider} />
                    {hasPayload ? (
                        <View style={{flex: 1}}>
                            <View style={styles.payloadHeader}>
                                <Text style={styles.payloadIcon}>{icon}</Text>
                                <View style={{marginLeft: 10, flex: 1}}><Text style={styles.payloadTitle}>{offer.title}</Text><Text style={styles.payloadCategory}>{category.toUpperCase()} • HOPS: {offer.hops || 0}</Text></View>
                            </View>
                            <ScrollView style={styles.payloadBodyBox}>
                                <View style={{alignItems: 'center', padding: 20}}>
                                    <Text style={{color: '#666', fontSize: 12, textTransform: 'uppercase', fontFamily: 'Courier'}}>Card Category</Text>
                                    <Text style={{color: '#fff', fontSize: 20, textAlign: 'center', fontFamily: 'Courier', fontWeight: 'bold', marginTop: 5}}>{category.toUpperCase()}</Text>
                                </View>
                            </ScrollView>
                            <Text style={styles.verifText}>AUTHOR: {offer.author || 'ANONYMOUS'} • ID: {offer.id ? offer.id.substring(0,8) : '???'}</Text>
                            <View style={styles.actionGrid}>
                                <TouchableOpacity onPress={() => onGrab(offer)} style={[styles.btnActionPrimary, isLoading && {opacity:0.5}]} disabled={isLoading}>
                                    {isLoading ? <ActivityIndicator color="#000"/> : <Text style={styles.btnTextBlack}>⬇ GRAB CARD</Text>}
                                </TouchableOpacity>
                                <TouchableOpacity onPress={onBrowse} style={styles.btnActionSecondary}><Text style={styles.btnTextGreen}>📂 BROWSE</Text></TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>📡</Text>
                            <Text style={styles.emptyTitle}>PASSIVE SIGNAL</Text>
                            <Text style={styles.emptyText}>This operator is online but not currently broadcasting specific intel.</Text>
                            <TouchableOpacity onPress={onBrowse} style={styles.btnActionSecondary}><Text style={styles.btnTextGreen}>REQUEST FILE ACCESS</Text></TouchableOpacity>
                        </View>
                    )}
                    <TouchableOpacity onPress={onClose} style={styles.closeLink}><Text style={styles.closeLinkText}>DISMISS SIGNAL</Text></TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const migrateAsyncStorageToSQLite = async () => {
    try {
        await initDB();
        const isMigrated = await AsyncStorage.getItem('@migration_complete');
        if (isMigrated === 'true') { console.log(">> Migration already completed. Skipping."); return; }
        console.log(">> Starting AsyncStorage to SQLite migration...");
        const allKeys = await AsyncStorage.getAllKeys();
        const allData = await AsyncStorage.multiGet(allKeys);
        const cardsToMigrate = [];
        for (const [key, value] of allData) {
            try {
                if (!value || !value.startsWith('{')) continue;
                const parsedItem = JSON.parse(value);
                if (parsedItem.id && parsedItem.genesis && parsedItem.genesis.author_id) cardsToMigrate.push(parsedItem);
            } catch (parseError) {}
        }
        if (cardsToMigrate.length > 0) {
            await batchInsertCards(cardsToMigrate);
            console.log(">> Cards successfully migrated to SQLite!");
        }
        await AsyncStorage.setItem('@migration_complete', 'true');
    } catch (error) { console.error(">> FATAL ERROR during migration:", error); }
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cards, setCards] = useState([]);
  const [vaultCards, setVaultCards] = useState([]);
  const [profile, setProfile] = useState({ handle: null, publicKey: null });
  const [activeTab, setActiveTab] = useState('created'); 
  const [activeTopicFilter, setActiveTopicFilter] = useState(null); 
  const [viewMode, setViewMode] = useState('wheel'); 
  const [nearbyDevices, setNearbyDevices] = useState([]);
  const [activePeer, setActivePeer] = useState(null); 
  const [selectedCard, setSelectedCard] = useState(null); 
  const [cardToFork, setCardToFork] = useState(null); 
  const [chainCard, setChainCard] = useState(null); 
  const [isCreateVisible, setIsCreateVisible] = useState(false);
  const [isScannerVisible, setIsScannerVisible] = useState(false); 
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [isOracleVisible, setIsOracleVisible] = useState(false);
  const [isTrustedModalVisible, setIsTrustedModalVisible] = useState(false);
  const [trustedSources, setTrustedSources] = useState([]);
  const [remoteCatalog, setRemoteCatalog] = useState(null);
  const [isBrowseVisible, setIsBrowseVisible] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [sourceState, setSourceState] = useState('IDLE');
  const [isQRVisible, setIsQRVisible] = useState(false); 
  const [isScanning, setIsScanning] = useState(false);
  const [targetPeripheralId, setTargetPeripheralId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [meshSearchQuery, setMeshSearchQuery] = useState('');
  
  
  // --- REFACTOR: RADAR FILTER REF ---
  const [radarFilter, setRadarFilter] = useState(null);
  const radarFilterRef = useRef(null);

  // Keep Ref synced with State
  useEffect(() => {
    radarFilterRef.current = radarFilter;
  }, [radarFilter]);

  const [createInitialData, setCreateInitialData] = useState(null);
  // const { isUpdateAvailable, isUpdatePending, error } = useUpdates();

  // useEffect(() => {
  //  if (isUpdateAvailable) console.log('Update available!');
  //  }, [isUpdateAvailable]);

  // --- GLOBAL EVENT LISTENERS ---
  useEffect(() => {
    const successListener = DeviceEventEmitter.addListener('onTransferSuccess', (event) => {
        Vibration.vibrate([0, 100, 50, 100]); // Physical Feedback
        const msg = `Successfully sent "${event.cardTitle}"`;
        if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.LONG);
        else Alert.alert("Transfer Complete", msg);
    });
    
    const pendingListener = DeviceEventEmitter.addListener('pendingTransfer', (request) => {
        console.log(">> UI: Pending transfer received", request);
        setPendingRequest(request);
    });

    const transferCompleteListener = DeviceEventEmitter.addListener('transferComplete', (data) => {
        console.log(">> UI: Received transfer confirmation", data);
        handleTransferCompletion(data);
    });

    return () => {
      successListener.remove();
      pendingListener.remove();
      transferCompleteListener.remove();
    };
  }, []);

  const handleTransferCompletion = async ({ cardId, recipientHandle }) => {
    try {
        // --- TASK 1: HAPTIC SIGNATURE ---
        // This specific haptic pattern signifies the final "handshake" completion.
        // It's a sharp, cyberpunk-style pulse. On iOS, we use a simple vibration
        // as patterns are not as well supported without extra libraries.
        if (Platform.OS === 'android') {
            Vibration.vibrate([0, 10, 50, 150]);
        } else {
            Vibration.vibrate(); 
        }

        // 1. Log the raw transfer event to the dedicated table
        await insertTransferRecord({
            cardId,
            recipientHandle,
            timestamp: new Date().toISOString(),
        });

        // 2. FETCH FROM DB: Get the card directly from SQLite to avoid stale state
        const card = await getCardById(cardId);

        if (!card) {
            console.warn(`>> UI: Received ACK for a card not in DB: ${cardId}`);
            return;
        }

        // 3. IDEMPOTENCY CHECK: See if this transfer is already logged in the card's history
        const safeHistory = Array.isArray(card.history) ? card.history : [];
        const alreadyExists = safeHistory.some(
            entry => entry.action === 'TRANSFER' && entry.user === recipientHandle
        );

        if (alreadyExists) {
            ToastAndroid.show(`Transfer to ${recipientHandle} already logged.`, ToastAndroid.SHORT);
            return;
        }

        // 4. Create the new history entry
        const transferEntry = {
            action: 'TRANSFER',
            user: recipientHandle,
            from: profile.handle,
            timestamp: new Date().toISOString()
        };

        // 5. Update the card object: history and hops
        const updatedCard = { 
            ...card, 
            history: [...safeHistory, transferEntry],
            // Hops are incremented on the RECEIVER side to be authoritative.
            // We only log the history event here.
            hops: (card.hops || 0)
        };

        // 6. Persist to DB
        await insertOrReplaceCard(updatedCard);
        
        // 7. REFRESH UI FROM SOURCE OF TRUTH
        const freshCards = await getAllCards();
        setCards(freshCards);
        
        const successMsg = "INTEL SYNCED: Influence recorded in the Mesh.";
        if (Platform.OS === 'android') {
            ToastAndroid.show(successMsg, ToastAndroid.LONG);
        } else {
            Alert.alert("Sync Complete", successMsg);
        }
    } catch (error) {
        console.error(">> FATAL ACK ERROR:", error);
    }
};

  const handleToggleRadar = () => {
      setViewMode(prev => prev === 'radar' ? 'wheel' : 'radar');
  };

  // --- BOOT SEQUENCE ---
  useEffect(() => {
    BluetoothService.setOnStateChange((state) => {
        setSourceState(state);
        if (state === 'IDLE' || state === 'ERROR' || state === 'DATA_RECEIVED') setIsLoading(false);
    });

    const boot = async () => {
      try {
        console.log(">> BOOT: Starting Systems...");
        // Removed the old migrateAsyncStorageToSQLite() - we don't need it anymore!

        await initDB();
        
        const permStatus = await requestPermissions();
        setHasPermissions(permStatus);
        
        if (typeof requestRadarPermissions === 'function') await requestRadarPermissions();
        if (!permStatus) { setIsLoading(false); return; }

        startServer(); // ENGINE 4 IGNITION

        const keys = await getOrGenerateKeys();
        if (keys) setProfile(prev => ({ ...prev, publicKey: keys.publicKey }));
        
        const savedProfile = await loadProfile();
        if (savedProfile && savedProfile.handle) {
            setProfile(savedProfile);
            BluetoothService.setHandle(savedProfile.handle);
        } else {
            console.log(">> NO PROFILE FOUND.");
        }

        // --- THE CLEAN SQLITE BOOT SEQUENCE ---
        const existingCards = await getAllCards();
        if (existingCards.length === 0) { 
          console.log(">> BOOT: Empty database. Injecting Civilization Stack directly to SQLite...");
          const fullStack = [...INITIAL_SEEDS, ...MASTER_LIBRARY, ...funLibrary];
          
          // Auto-generate a SYSTEM genesis block for old default cards
          const secureStack = fullStack.map(card => ({
              ...card,
              history: card.history || [],
              genesis: card.genesis || {
                  author_id: "SYSTEM",
                  timestamp: new Date().toISOString(),
                  signature: "SYSTEM_DEFAULT"
              }
          }));

          await batchInsertCards(secureStack); 
          setCards(secureStack);
        } else {
          console.log(`>> BOOT: Loaded ${existingCards.length} cards from SQLite.`);
          setCards(existingCards); 
        }
        // --------------------------------------
        
        const sources = await fetchFromDB(); 
        setTrustedSources(sources);
        setIsLoading(false);
        setIsDbReady(true);
      } catch (error) {
        console.error("Boot failed:", error);
        setIsLoading(false); 
      }
    };
    boot();
  }, []); 

  useEffect(() => {
    if (isDbReady) {
      const fetchVault = async () => {
        const allCards = await getAllCards();
        setVaultCards(allCards);
      };
      fetchVault();
    }
  }, [isDbReady]);

  // --- CLEANER INTERVAL ---
  useEffect(() => {
    const cleaner = setInterval(() => {
        setNearbyDevices(currentDevices => {
            const NOW = Date.now();
            const freshDevices = currentDevices.filter(d => (NOW - d.lastSeen) <= 8000);
            return freshDevices; 
        });
    }, 2000);
    return () => { clearInterval(cleaner); BluetoothService.stopScanning(); };
  }, []);

  // --- LISTEN WHILE BROADCASTING ---
  useEffect(() => {
      if (targetPeripheralId) return;
      if (viewMode === 'radar' || viewMode === 'broadcast') {
          BluetoothService.startScanning(handleDeviceFound);
      } else {
          BluetoothService.stopScanning();
      }
  }, [viewMode, targetPeripheralId]);

  // --- ENGINE 3: BROWSE / REQUEST ---
  const handleBrowse = async () => {
      if (!activePeer) return;
      
      BluetoothService.stopScanning();
      setIsLoading(true);
      Alert.alert("Connecting", "Initiating secure handshake...");

      const result = await BluetoothService.connectAndRequest(activePeer.id, 'CAT', radarFilterRef.current || 'general', profile.handle, profile.publicKey);
      const success = result.success;
      
      setIsLoading(false);
      
      if (success) {
          Alert.alert("Connection Successful", "Request delivered to target.");
      } else {
          Alert.alert("Connection Failed", "Could not reach target device.");
      }
      
      setTimeout(() => {
          BluetoothService.startScanning(handleDeviceFound);
      }, 1000);
  };

  const handleDeviceFound = (device) => {
    if (!device || !device.id) return;

    // --- SILENT HUNTER LOGIC (UPDATED) ---
    const UI_TO_BITMASK = {
        'food': 1, 'education': 2, 'fitness': 3, 'professional': 4, 'fun': 5
    };

    const currentFilter = radarFilterRef.current; // READ FROM REF

    if (targetPeripheralId && device.id === targetPeripheralId) {
          console.log(`>> TARGET ACQUIRED: ${targetPeripheralId}`);
          setTargetPeripheralId(null); 
          BluetoothService.stopScanning(); 
          Alert.alert("Target Found", "Engine 3 Link not yet active.");
          return;
    }

    setNearbyDevices(currentDevices => {
      const index = currentDevices.findIndex(d => d.id === device.id);
      const catMap = { 1: 'general', 2: 'fitness', 3: 'food', 4: 'education', 5: 'fun', 6: 'professional' };
      const topicSlug = catMap[device.category] || 'general';

      const deviceEntry = {
        id: device.id,
        name: device.name || "Unknown Signal",
        offer: { topic: `human/${topicSlug}`, title: device.title || 'Signal Detected' }, 
        rssi: device.rssi,
        lastSeen: Date.now(),
        position: (index > -1) ? currentDevices[index].position : { x: 20 + Math.random() * 60, y: 20 + Math.random() * 60 },
        stableId: device.id,
        packetCount: device.packetCount,
        categoryBitmask: device.categoryBitmask
      };

      if (index > -1) {
        const updated = [...currentDevices];
        updated[index] = deviceEntry;
        return updated;
      } else {
        return [...currentDevices, deviceEntry];
      }
    });
  };

  const toggleBroadcast = async () => {
      if (sourceState === 'BROADCASTING') { 
          await BluetoothService.stopBroadcasting(); 
          setSourceState('IDLE');
          if (viewMode === 'broadcast') setViewMode('wheel'); 
      } else {
          try {
            await BluetoothService.startAdvertising(); // Uses default categories
            setSourceState('BROADCASTING');
            Vibration.vibrate(100);
            if (viewMode === 'wheel') setViewMode('broadcast');
          } catch (e) { 
            Alert.alert("Broadcast Error", "Radio failed to initialize."); 
            setSourceState('ERROR');
          }
      }
  };

  const updateLibrary = async (updatedList) => {
    setCards(updatedList);
    await saveLibrary(updatedList);
  };

  const handleCreateCard = async (c) => {
    try {
      // 1. Create the card object with its genesis block
      const topicPath = `human/${c.topic || 'general'}`;
      const newCard = await createCard(profile.handle, c.title, c.body, topicPath);
      
      newCard.subject = c.subject || null;

      // 3. Sign the genesis block to prove authorship
      const signature = await signData(JSON.stringify(newCard.genesis));
      if (!signature) {
        throw new Error("Failed to sign the card.");
      }
      newCard.genesis.signature = signature;
      
      // 5. DEBUG: Log the card object before inserting
      console.log(">> DBG: Card object before insert:", JSON.stringify(newCard, null, 2));

      // 6. Insert the new, signed card into the SQLite database
      await insertOrReplaceCard(newCard);

      // 7. Update the UI by re-fetching from the source of truth
      const freshCards = await getAllCards();
      setCards(freshCards);
      
      // 8. Close the modal
      setIsCreateVisible(false);
    } catch (error) { 
      alert(`Failed to save card: ${error.message}`); 
    }
  };

  // --- OFFER HANDLER (Triggered from Card Detail) ---
  const handleOfferCard = async () => {
      // Ensure the radio is broadcasting so the scanner (Hunter) can find us.
      await BluetoothService.startAdvertising();
  };

  const processAndSaveIncomingCard = async (incoming, peerName) => {
    if (!incoming || !incoming.id) {
        Alert.alert("Transfer Error", "Received incomplete card data.");
        return;
    }
    
    // 1. Check against the Single Source of Truth (SQLite)
    const local = await getCardById(incoming.id);
    
    if (local) {
        const isHeavier = (incoming.hops || 0) > (local.hops || 0);
        const isNewContent = incoming.body !== local.body;

        if (!isHeavier && !isNewContent) {
            Alert.alert("Redundant Intel", "You already have this version of the card.", [{ text: "OK" }]);
            return; 
        }

        console.log(">> DB: Merging updated card.");
        const stamp = {
            action: 'RECEIVED',
            user: peerName, 
            timestamp: new Date().toISOString(),
            note: `Updated version (Hops: ${incoming.hops})`
        };
        
        const updatedHistory = local.history ? [...local.history] : [];
        if (incoming.history) {
            incoming.history.forEach(h => {
                if (!updatedHistory.some(existing => existing.timestamp === h.timestamp && existing.user === h.user)) {
                    updatedHistory.push(h);
                }
            });
        }
        updatedHistory.push(stamp);

        const mergedCard = { ...incoming, history: updatedHistory, hops: incoming.hops };
        await insertOrReplaceCard(mergedCard);
        Alert.alert("Intel Updated", `Card rank increased to ${incoming.hops}.`);

    } else {
        console.log(">> DB: Adding new card...");
        const stamp = {
            action: 'RECEIVED',
            user: peerName, 
            timestamp: new Date().toISOString(),
            note: `Discovered from ${peerName}`
        };
        
        const newHistory = incoming.history ? [...incoming.history, stamp] : [stamp];
        
        const newCard = {
          ...incoming,
          hops: (incoming.hops || 0) + 1,
          history: newHistory
        };

        await insertOrReplaceCard(newCard);
        Alert.alert("Intel Acquired", `Successfully learned: "${incoming.title}"`);
    }
    
    // 2. Refresh UI from the Single Source of Truth
    const freshCards = await getAllCards();
    setCards(freshCards);
  };



 // --- ENGINE 3: THE GRABBER (Retry Logic + Smart Library) ---
  const handleGrabCard = async (offer, version) => {
      if (isLoading || sourceState === 'CONNECTING') return;
      
      console.log(">> GRAB REQUESTED:", offer.title || "Unknown Intel");
      
      const targetId = activePeer?.id || offer.id;
      const categoryToRequest = radarFilterRef.current || 'general';

      // FIX: Update the UI to show what's being requested
      if (activePeer) {
        setActivePeer(prevPeer => ({
            ...prevPeer,
            offer: { ...prevPeer.offer, topic: `human/${categoryToRequest}` }
        }));
        await new Promise(resolve => setTimeout(resolve, 100)); // Allow UI to update
      }

      setIsLoading(true);
      
      let attempts = 0;
      let success = false;
      let result = null;

      while (attempts < 3 && !success) {
          attempts++;
          if (attempts > 1) console.log(`>> CLIENT: Connection Attempt ${attempts}/3...`);
          result = await BluetoothService.connectAndRequest(targetId, 'CAT', categoryToRequest, profile.handle, profile.publicKey);
          if (result.success) success = true;
          else {
              console.log(">> CLIENT: Busy/Failed. Waiting 1s...");
              await new Promise(resolve => setTimeout(resolve, 1000));
          }
      }

      if (success && result.data) {
          const peerName = result.data.senderHandle || activePeer?.name || "Unknown Source";
          await processAndSaveIncomingCard(result.data, peerName);
      } else {
          if (result && result.error === 'NO_CARDS') {
              Alert.alert("No Intel Found", `The target has no cards in the "${categoryToRequest}" category.`);
          } else {
              Alert.alert("Connection Failed", result.error || "Target did not respond after 3 attempts.");
          }
      }

      setIsLoading(false);
      handleDismiss();
      setTimeout(() => { if (viewMode === 'radar') BluetoothService.startScanning(handleDeviceFound); }, 1000);
  };
 
  const handleBlockOperator = async (card) => {
    try {
      // Fallback: Use genesis ID if it exists, otherwise use the top-level author handle
      const targetId = card.genesis?.author_id || card.author;

      if (!targetId) {
        Alert.alert("Error", "Operator identity unknown. Cannot execute block.");
        return;
      }

      await blockOperator(targetId, card.hash, "Blocked by user");
      
      const freshCards = await getAllCards();
      setCards(freshCards);

      // UX: Keeping the success alert is good for the first test, 
      // though eventually you might want to just let the "disappearing card" speak for itself.
      Alert.alert("Operator Purged", `Identity ${targetId} blocked. Vault sanitized.`);
      
    } catch (error) {
      console.error("Blocking Error:", error);
      Alert.alert("Error", "Failed to execute Burn protocol.");
    }
  };
 
  const broadcastQuestion = useCallback(async (query) => {
    if (!query || query.length === 0) return false;
    try {
      const questionCard = await createCard(profile.handle, `QUESTION: ${query}`, `Seeking answers for: "${query}"`, "human/question");
      const signature = await signData(JSON.stringify(questionCard.genesis));
      questionCard.genesis.signature = signature;
      await insertOrReplaceCard(questionCard);

      // Refresh UI from source of truth
      const freshCards = await getAllCards();
      setCards(freshCards);

      if (sourceState !== 'BROADCASTING') await toggleBroadcast();
      Alert.alert("Question Broadcast", `Your question is on the mesh.`);
      return true; // Indicate success
    } catch (error) {
      console.error("Ask Error:", error);
      return false; // Indicate failure
    }
  }, [profile.handle, sourceState, toggleBroadcast]);

  const handleAskQuestion = useCallback(async () => {
    if (await broadcastQuestion(searchQuery)) {
      setSearchQuery('');
    }
  }, [searchQuery, broadcastQuestion]);

  const handleForkCard = useCallback(async (originalCard, contextNote) => {
    try {
      const newCard = { ...originalCard };
      newCard.id = `${profile.handle}-${Date.now()}`;
      newCard.body = `${originalCard.body}\n\n--- Answer by ${profile.handle} ---\n${contextNote}`;
      newCard.forkedFrom = originalCard.id;
      newCard.genesis = { ...originalCard.genesis, author_id: profile.publicKey, timestamp: new Date().toISOString() };
      const signature = await signData(JSON.stringify(newCard.genesis));
      newCard.genesis.signature = signature;
      await insertOrReplaceCard(newCard);

      // Refresh UI from source of truth
      const freshCards = await getAllCards();
      setCards(freshCards);
      
      if (sourceState !== 'BROADCASTING') await toggleBroadcast();
    } catch (error) {
      console.error("Fork Error:", error);
    }
  }, [profile, sourceState]);
  
  const handleAddTrustedSource = async (sourceData) => {
    try {
        const alreadyExists = trustedSources.some(s => s.uid === sourceData.id);
        if (alreadyExists) {
            Alert.alert("Already Trusted", `Operator "${sourceData.payload.handle}" is already in your network.`);
            return;
        }
        const newTrustedSource = {
          uid: sourceData.id, 
          handle: sourceData.payload.handle,
          publicKey: sourceData.id, 
          timestamp: new Date().toISOString()
        };
        await saveTrustedSource(newTrustedSource);
        setTrustedSources(prev => [...prev, newTrustedSource]);
        Alert.alert("Network Updated", `Secure link established with ${sourceData.payload.handle}.`);
    } catch (e) {
        console.error("Trust Error:", e);
        Alert.alert("Error", "Could not verify source identity.");
    }
  };

  const handleDismiss = () => { setActivePeer(null); };
  const handleRadarConnect = (device) => { setActivePeer(device); };

  const handleAcceptTransfer = async () => {
    if (pendingRequest) {
      await sendCardInChunks(pendingRequest.deviceId, pendingRequest.card);
      setPendingRequest(null);
    }
  };

  const handleDenyTransfer = () => {
    console.log(">> UI: User denied transfer request.");
    setPendingRequest(null);
  };

  const handleMeshSearch = useCallback(async () => {
    if (await broadcastQuestion(meshSearchQuery)) {
      setMeshSearchQuery('');
    }
  }, [meshSearchQuery, broadcastQuestion]);
  
  
  // --- UPDATED: HANDLES THE NEW QR & JSON LOGIC ---
  const handleRealScan = async (dataString) => {
    if (isLoading) return; // Guard against multiple scans
    if (typeof dataString !== 'string') return;
    console.log(">> SCANNER: Data received:", dataString);

    // --- NEW: JAWW v2 CARD TRANSFER URI ---
    if (dataString.startsWith('jaaw://card/')) {
        const parts = dataString.replace('jaaw://card/', '').split('/');
        if (parts.length < 2) {
            Alert.alert("Invalid QR Code", "The JAWW card QR code is malformed.");
            return;
        }
        const targetHandle = parts[0];
        const targetCardId = parts[1];

        Alert.alert(
            "Acquiring Signal", 
            `Hunting for operator "${targetHandle}" to request card...`,
            [{ text: "Cancel", style: "cancel", onPress: () => BluetoothService.stopScanning() }]
        );

        setIsLoading(true); 
        setIsScannerVisible(false); 

        // Use the connectAndRequest function with 'ID' type
        const result = await BluetoothService.connectAndRequest(targetHandle, 'ID', targetCardId, profile.handle, profile.publicKey);
        
        setIsLoading(false);
             
        if (result.success && result.data) {
            await processAndSaveIncomingCard(result.data, targetHandle);
        } else {
            Alert.alert("Connection Failed", result.error || `Could not connect to operator "${targetHandle}". They may be out of range or offline.`);
        }
        return;
    }

    // --- LEGACY: JAWW v1 QR TARGETING ---
    if (dataString.startsWith('JAWW:')) {
        const parts = dataString.split(':');
        const targetHandle = parts[1];
        const targetCardId = parts[2];

        Alert.alert(
            "Acquiring Signal", 
            `Hunting for operator "${targetHandle}"...`,
            [{ text: "Cancel", style: "cancel", onPress: () => BluetoothService.stopScanning() }]
        );

        setIsLoading(true); 
        setIsScannerVisible(false); 

        const result = await BluetoothService.connectAndRequest(targetHandle, 'ID', targetCardId, profile.handle, profile.publicKey);
        
        setIsLoading(false);
             
        if (result.success) {
            await processAndSaveIncomingCard(result.data, targetHandle);
        } else {
            Alert.alert("Connection Failed", `Could not connect to operator "${targetHandle}". They may be out of range or offline.`);
        }
        return;
    }

    // 2. TRY PARSING JSON (Identity Cards & Legacy Heavy Payloads)
    if (dataString.trim().startsWith('{')) {
        try {
            const data = JSON.parse(dataString);
            if (data.type === 'SOURCE_IDENTITY_V1') {
                Alert.alert(
                    "Identity Verified",
                    `Add Operator "${data.payload.handle}" to trusted sources?`,
                    [{ text: "Cancel", style: "cancel" }, { text: "Authorize", onPress: () => handleAddTrustedSource(data) }]
                );
                return;
            }
            if (data.id && data.title && data.body) {
                handleRealScan(`HVY:${dataString}`); 
                return;
            }
        } catch (e) {
            console.log(">> SCANNER: JSON Parse failed, checking legacy formats...");
        }
    }

    // 3. LEGACY FORMATS
    if (dataString.startsWith('SRC:')) {
      const raw = dataString.substring(4);
      const mockObj = { id: raw, payload: { handle: raw, bio: {} } };
      handleAddTrustedSource(mockObj);
    } 
    else if (dataString.startsWith('CRD:')) {
      const parts = dataString.substring(4).split('|');
      if (parts.length === 3) {
        const [cardId, title, author] = parts;
        Alert.alert("Card Offer", `Download "${title}" by ${author}?`, [{ text: "Cancel", style: "cancel" }, { text: "Download", onPress: () => handleGrabCard({ id: cardId, title, author }) }]);
      }
    } 
    else if (dataString.startsWith('HVY:')) {
      try {
        const jsonString = dataString.substring(4);
        const incomingCard = JSON.parse(jsonString);
        const localUser = profile.handle;

        if (!incomingCard.genesis || !incomingCard.genesis.signature) {
          Alert.alert("Security Warning", "Card missing valid signature.");
          return;
        }

        const existingCard = cards.find(c => c.id === incomingCard.id);

        if (existingCard) {
          const lastLocalEntry = existingCard.history[existingCard.history.length - 1];
          const lastIncomingEntry = incomingCard.history[incomingCard.history.length - 1];
          const remoteUser = lastIncomingEntry.user;

          if (lastIncomingEntry.action === 'TRANSFER' && lastIncomingEntry.user === remoteUser && lastLocalEntry.user === localUser) {
              const alreadyExists = existingCard.history.some(h => h.timestamp === lastIncomingEntry.timestamp);
              if (!alreadyExists) {
                  console.log(`>> CONFIRMATION: Logging transfer to ${remoteUser} and incrementing hops.`);
                  const updatedHistory = [...existingCard.history, lastIncomingEntry];
                  const updatedCard = { ...existingCard, history: updatedHistory, hops: (existingCard.hops || 0) + 1 };
                  const newCards = cards.map(c => c.id === updatedCard.id ? updatedCard : c);
                  await updateLibrary(newCards);
                  Alert.alert("Transfer Confirmed", `Your ledger is updated for the transfer to ${remoteUser}.`);
              } else {
                  Alert.alert("No Change", "This transfer is already recorded.");
              }
              return; 
          }
          
          if (remoteUser !== localUser) { 
              if (lastLocalEntry.action === 'TRANSFER' && lastLocalEntry.user === remoteUser) {
                  console.log(`>> CONSOLIDATE: Reclaiming card from ${remoteUser}.`);
                  const updatedHistory = existingCard.history.slice(0, -1);
                  const updatedCard = { ...existingCard, history: updatedHistory };
                  const newCards = cards.map(c => c.id === updatedCard.id ? updatedCard : c);
                  await updateLibrary(newCards);
                  Alert.alert("Ownership Reclaimed", `You have taken the card back from ${remoteUser}.`);
                  return;
              }
              console.log(`>> TRANSFER: Receiving card from ${remoteUser}.`);
              const newEntry = { action: 'TRANSFER', user: localUser, from: remoteUser, timestamp: new Date().toISOString() };
              const updatedCard = { ...existingCard, history: [...existingCard.history, newEntry] };
              const newCards = cards.map(c => c.id === updatedCard.id ? updatedCard : c);
              await updateLibrary(newCards);
              Alert.alert("Card Received", `Took possession of card from ${remoteUser}.`);
          } else {
             if (lastIncomingEntry.timestamp > lastLocalEntry.timestamp) {
                 console.log(">> STATE SYNC: Updating ledger from remote.");
                 const updatedCard = { ...existingCard, history: incomingCard.history };
                 const newCards = cards.map(c => c.id === updatedCard.id ? updatedCard : c);
                 await updateLibrary(newCards);
                 Alert.alert("Ledger Synced", "Card history has been updated.");
             } else {
                 Alert.alert("No Change", "Card is already up-to-date.");
             }
          }
        } else {
          console.log(">> NEW CARD: Processing new card...");
          const lastOwner = incomingCard.history[incomingCard.history.length - 1].user;
          const newEntry = { action: 'TRANSFER', user: localUser, from: lastOwner, timestamp: new Date().toISOString() };
          const newHistory = [...incomingCard.history, newEntry];
          const newCard = { ...incomingCard, history: newHistory, hops: (incomingCard.hops || 0) + 1 };
          await updateLibrary([newCard, ...cards]);
          Alert.alert("Transfer Complete", `Intel received from ${lastOwner}.`);
        }
      } catch (e) {
        console.error("HVY Scan Error:", e);
        Alert.alert("Error", "Corrupt Data Packet.");
      }
    }
    else {
      Alert.alert("Unknown Data", dataString.substring(0, 50) + "...");
    }
  };
  
  const handleOnboardingComplete = useCallback(async (p) => { 
      console.log(">> ONBOARDING: Creating Identity for", p.handle);
      try {
        const keys = await getOrGenerateKeys(); 
        if (!keys) throw new Error("Key Generation Failed");
        const publicProfile = { ...p, publicKey: keys.publicKey, interests: p.interests || [] };
        await saveProfile(publicProfile); 
        setProfile(publicProfile); 
        BluetoothService.setHandle(publicProfile.handle);
        Alert.alert("Welcome, Operator", "Identity established.");
      } catch (e) { 
          console.error(">> ONBOARDING ERROR:", e);
          Alert.alert("Security Error", "Could not establish Identity."); 
      }
  }, []);

  const handleTrustNode = async (authorId) => {
    if (!authorId) {
      Alert.alert("Cannot Trust", "Author identity is unknown.");
      return;
    }

    try {
      await trustNode(authorId);
      // Refresh UI from source of truth
      const freshCards = await getAllCards();
      setCards(freshCards);
      Alert.alert("Source Trusted", `Operator is now a verified source.`);
    } catch (error) {
      console.error(">> UI Error trusting node:", error);
      Alert.alert("Error", "Could not trust this source.");
    }
  };

  const handleRequestReview = (cardToReview) => {
    const reviewCardData = {
      ...cardToReview,
      title: `REVIEW: ${cardToReview.title}`,
    };
    setCreateInitialData(reviewCardData);
    setSelectedCard(null);
    setIsCreateVisible(true);
  };

  const handleClearLibrary = async () => {
    await saveLibrary([]);
    setCards([]);
    Alert.alert("Debug", "Card library has been cleared.");
  };

  // --- Wheel State & Logic ---
  const [isWheelShrunk, setIsWheelShrunk] = useState(true);

  const { currentWheelSize, currentCenter, currentRadius } = useMemo(() => {
      const size = isWheelShrunk ? 150 : 380;
      return {
          currentWheelSize: size,
          currentCenter: size / 2,
          currentRadius: (size / 2) - 10,
      };
  }, [isWheelShrunk]);

  const handleWheelTap = (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      // When expanded, the wheel is always full size, so we use its center
      const expandedCenter = 380 / 2; 
      const dx = locationX - expandedCenter, dy = locationY - expandedCenter;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      const centerTapRadius = 55; // Center radius for the expanded wheel
      if (dist < centerTapRadius) { 
        setIsProfileVisible(true); 
        setIsWheelShrunk(true); // Collapse wheel on center tap
        return; 
      }
      
      if (isWheelShrunk) return;

      let angle = Math.atan2(dy, dx) * (180/Math.PI) + 90; 
      if (angle < 0) angle += 360;
      const target = SECTIONS[Math.floor(angle/72) % 5].id;
      setActiveTopicFilter(activeTopicFilter === target ? null : target);
      setIsWheelShrunk(true); // Collapse wheel after selection
  };
   
  const polarToCartesian = (cx, cy, r, ang) => { const a = (ang-90)*Math.PI/180; return {x:cx+r*Math.cos(a), y:cy+r*Math.sin(a)}; }
  const describeArc = (x, y, r, start, end) => {
      const s = polarToCartesian(x,y,r,end); const e = polarToCartesian(x,y,r,start); const f = end-start<=180?"0":"1";
      return ["M",s.x,s.y,"A",r,r,0,f,0,e.x,e.y,"L",x,y,"L",s.x,s.y].join(" ");
  }
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (sourceState === 'BROADCASTING') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [sourceState]);
  const expertise = React.useMemo(() => {
    const s = {};
    vaultCards.forEach(c => {
      const cardTopic = c.topic ? c.topic.replace('human/', '') : 'general';
      s[cardTopic] = (s[cardTopic] || 0) + 5 + ((c.hops || 1) - 1) * 2;
    });
    return s;
  }, [vaultCards]);

  const SECTIONS = TOPICS.filter(t => t.id !== 'general').map((t, i) => ({
    id: t.id,
    label: t.label.toUpperCase().substring(0, 4),
    angle: i * (360 / (TOPICS.length - 1)),
  }));

 // === THE ORACLE WIRING (SQLite FTS5 + Race Condition Shield) ===
  React.useEffect(() => {
    let isMounted = true; // Protects against out-of-order async returns

    const loadVaultData = async () => {
      try {
        let results = [];
        const query = searchQuery ? searchQuery.trim() : "";
        
        // Bundle the current UI filters so the database respects the active view
        const currentFilters = { 
            activeTab, 
            activeTopicFilter, 
            profileHandle: profile?.handle || 'unknown'
        };

        if (query.length > 0) {
          // Search WITH context (Tab and Topic)
          results = await searchCards(query, currentFilters);
        } else {
          // Standard Boot / Filter Load (Using LIMIT/OFFSET)
          results = await fetchCards(20, 0, currentFilters);
        }

        // Only update the UI if this is the most recent keystroke/query
        if (isMounted) {
          setCards(results); 
        }
      } catch (error) {
        console.error(">> ORACLE ERROR: SQLite Search failed:", error);
      }
    };

    // Debounce the search by 300ms to prevent database spam while typing
    const delayDebounceFn = setTimeout(() => {
      // Don't fetch if the DB isn't ready yet (The Titanium Chassis rule)
      if (isDbReady) {
        loadVaultData();
      } // 🟢 FIXED: The missing bracket is restored
    }, 300);

    // Cleanup function runs when the user types a new letter
    return () => {
      clearTimeout(delayDebounceFn); // Kill the old timer
      isMounted = false;             // Mark the old query as invalid
    };
  }, [searchQuery, activeTab, activeTopicFilter, profile?.handle, isDbReady]);

// === 1. THE IRON GATE (MUST BE FIRST) ===
  if (!isDbReady) { 
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000'}}>
        <Text style={{color: '#00ff00', fontFamily: 'monospace'}}>Booting Sovereign Engine...</Text>
      </View>
    ); 
  }
  
  if (isLoading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000'}}>
        <Text style={{color: '#00ff00', fontFamily: 'monospace'}}>Loading Protocols...</Text>
      </View>
    );
  }

  // === 2. PERMISSIONS & ONBOARDING ===
  if (!hasPermissions) return <View style={styles.center}><TouchableOpacity onPress={requestPermissions}><Text style={styles.textGreen}>GRANT ACCESS</Text></TouchableOpacity></View>;
  if (!profile.handle) return <Onboarding visible={true} onComplete={handleOnboardingComplete} />;

  const isBroadcasting = sourceState === 'BROADCASTING';

  // === 3. THE MAIN UI RENDER ===
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={toggleBroadcast} style={[styles.broadcastBtnCompact, isBroadcasting && {backgroundColor:'#003300', borderColor:'#00ff00'}]}>
            <Text style={styles.broadcastText}>{isBroadcasting ? '(( ON AIR ))' : '📡 BROADCAST'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSmallOutline} onPress={() => setIsTrustedModalVisible(true)}><Text style={styles.btnTextGray}>TRUSTED</Text></TouchableOpacity>
        <Text style={styles.headerRank}>OP: {profile.handle.substring(0,8).toUpperCase()}</Text>
      </View>

      {viewMode === 'broadcast' ? (
          <View style={{flex: 1, alignItems:'center', justifyContent:'center'}}>
              <Text style={{color:'#00ff00', fontSize: 24, fontWeight:'bold'}}>BROADCASTING</Text>
              <Text style={{color:'#666', fontSize:12, marginTop: 10, fontFamily: 'Courier'}}>BEACON ACTIVE • DISCOVERABLE</Text>
              <ActivityIndicator color="#00ff00" style={{marginTop: 20}} />
              <TouchableOpacity onPress={toggleBroadcast} style={styles.btnOutline}><Text style={styles.textGray}>STOP SIGNAL</Text></TouchableOpacity>
          </View>
      ) : viewMode === 'radar' ? (
          <View style={{flex: 1, padding: 20, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 10, paddingBottom: 120}}>
            <View style={{width: '100%', marginTop: 20, marginBottom: 20}}>
              <Text style={styles.meshSearchLabel}>Broadcast a Question to the Mesh</Text>
              <View style={{flexDirection: 'row', padding:10, alignItems: 'center', width: '100%'}}>
                <TextInput
                  style={styles.meshSearchInput}
                  placeholder="Ask around..."
                  placeholderTextColor="#666"
                  value={meshSearchQuery}
                  onChangeText={setMeshSearchQuery}
                  onSubmitEditing={handleMeshSearch}
                />
                <TouchableOpacity onPress={handleMeshSearch} style={styles.flareButton}>
                  <Text style={styles.flareButtonText}>FLARE</Text>
                </TouchableOpacity>
              </View>
            </View>
              <View style={styles.radarBox}>
                  <View style={styles.gridLineVertical} />
                  <View style={styles.gridLineHorizontal} />
                  <View style={styles.gridCenter}><StatusOrb status={sourceState} /></View>
                  {nearbyDevices.map((item) => {
                      const pos = item.position || {x:50, y:50}; 
                      const category = item.offer && item.offer.topic ? item.offer.topic.split('/')[1] || item.offer.topic : 'UNKNOWN';
                      return (
                        <TouchableOpacity key={item.stableId} style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, width: 60, height: 60, alignItems: 'center', justifyContent: 'center' }} onPress={() => handleRadarConnect(item)}>
                          <View style={styles.radarBlip}><View style={{width: 6, height: 6, backgroundColor: '#fff', borderRadius: 3}}/></View>
                          <Text numberOfLines={1} style={{ position: 'absolute', top: 35, width: 90, textAlign: 'center', color: '#00ff00', fontSize: 9, fontFamily: 'Courier', fontWeight: 'bold', backgroundColor:'rgba(0,0,0,0.6)' }}>
                              {item.name ? item.name.toUpperCase() : 'SIGNAL'}
                          </Text>
                          <Text numberOfLines={1} style={{ position: 'absolute', top: 54, width: 100, textAlign: 'center', color: '#00aa00', fontSize: 8, fontFamily: 'Courier', fontWeight: 'bold' }}>
                             {item.status ? item.status : (item.offer && item.offer.title && item.offer.title !== 'Scanning...' ? item.offer.title : `[${getCategoryIcon(category)} ${category.toUpperCase()}]`)}
                          </Text>
                        </TouchableOpacity>
                      );
                  })}
              </View>
              <TouchableOpacity onPress={toggleBroadcast} style={[styles.btnPrimary, { marginTop: 20, width: '80%' }, isBroadcasting && { backgroundColor: '#003300', borderColor: '#00ff00', borderWidth: 1 }]}>
                  <Text style={[styles.btnTextBlack, isBroadcasting && { color: '#00ff00' }]}>{isBroadcasting ? 'STOP BROADCAST' : 'START BROADCAST'}</Text>
              </TouchableOpacity>
              <View style={styles.filterButtonContainer}>
                  {SECTIONS.map(s => (
                      <TouchableOpacity 
                          key={s.id}
                          onPress={() => {
                              const newFilter = radarFilter === s.id ? null : s.id;
                              setRadarFilter(newFilter);
                              radarFilterRef.current = newFilter;
                          }}
                          style={[styles.filterButton, radarFilter === s.id && styles.filterButtonActive]}
                      >
                          <Text style={styles.filterButtonText}>{s.label}</Text>
                      </TouchableOpacity>
                  ))}
              </View>
              <Text style={{color: '#004400', marginTop: 20, fontFamily: 'Courier', fontSize: 10}}>// TACTICAL SCANNER: ACTIVE //</Text>
          </View>
      ) : (
          <>
            <View style={{minHeight: 60, alignItems: 'center' }}>
                {/* 1. Resting State Button (replaces the old shrink/expand text) */}
                <TouchableOpacity
                    onPress={() => setIsWheelShrunk(v => !v)}
                    style={styles.wheelToggleButton}
                >
                    <Text style={styles.wheelToggleText}>
                        {activeTopicFilter ? 'FILTER: ' + activeTopicFilter.toUpperCase() : 'SELECT CATEGORY'}
                    </Text>
                    <Text style={styles.wheelToggleIcon}>{isWheelShrunk ? '▼' : '▲'}</Text>
                </TouchableOpacity>

                {/* 2. Expanded, Floating Wheel */}
                {!isWheelShrunk && (
                    <View style={styles.wheelContainer}>
                        <Pressable onPress={handleWheelTap} style={{ width: 380, height: 380 }}>
                            <Svg height={380} width={380}>
                                <Circle cx={190} cy={190} r={180} fill="none" stroke="#333" />
                                {SECTIONS.map((s) => {
                                    const isSelected = activeTopicFilter === s.id;
                                    const path = describeArc(190, 190, 180 - 5, s.angle + 2, s.angle + 70);
                                    const labelPos = polarToCartesian(190, 190, 180 - 40, s.angle + 36);
                                    return (
                                        <G key={s.id}>
                                            <Path d={path} fill={expertise[s.id]?'#336633':'#1a1a1a'} stroke={isSelected?'#fff':'none'} />
                                            <SvgText x={labelPos.x} y={labelPos.y} fill="#fff" fontSize="12" textAnchor="middle">{s.label}</SvgText>
                                        </G>
                                    );
                                })}
                                <Circle cx={190} cy={190} r={55} fill="#000" stroke="#333" />
                                <SvgText x={190} y={190} fill="#fff" fontSize={14} textAnchor="middle">{profile.handle.toUpperCase()}</SvgText>
                            </Svg>
                        </Pressable>
                    </View>
                )}
            </View>
            <View style={styles.tabContainer}>
                <TouchableOpacity onPress={() => setActiveTab('created')} style={[styles.tab, activeTab==='created' && styles.activeTab]}><Text style={styles.tabText}>MY KNOWLEDGE</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('learned')} style={[styles.tab, activeTab==='learned' && styles.activeTab]}><Text style={styles.tabText}>LEARNED</Text></TouchableOpacity>
            </View>
            <FlatList 
    data={cards} 
    keyExtractor={i => i.id} 
    renderItem={({ item }) => {
        const title = item.title || "";
        const titlePrefix = title.startsWith("QUESTION:") ? "[ ? ] " : "";
        const augmentedItem = { ...item, title: `${titlePrefix}${title}` };
        return (
            <CardItem
                item={augmentedItem}
                onPress={() => setSelectedCard(item)}
                onLongPress={() => {
                    Alert.alert(
                        "Remove Intel?",
                        `Delete "${item.title}" from your library?`,
                        [
                            { text: "Cancel", style: "cancel" },
                            {
                                text: "Delete",
                                style: "destructive",
                                onPress: async () => {
                                    // Filter out this specific card
                                    const newLibrary = cards.filter(c => c.id !== item.id);
                                    setCards(newLibrary);
                                    await saveLibrary(newLibrary);
                                }
                            }
                        ]
                    );
                }}
                onTrustNode={handleTrustNode}
            />
        );
    }} 
    ListEmptyComponent={
        searchQuery.length > 0 ? (
          <View style={{ padding: 40, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#888', marginBottom: 20, fontSize: 16 }}>
              I guess I got nothing...
            </Text>
            <TouchableOpacity 
              onPress={handleAskQuestion} 
              style={{ paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#1a1a1a', borderRadius: 8, borderWidth: 1, borderColor: '#00ff00' }}
            >
              <Text style={{ color: '#00ff00', fontWeight: 'bold', fontSize: 16 }}>
                📡 Ask around...
              </Text>
            </TouchableOpacity>
          </View>
        ) : null
      }
/>
          </>
      )}

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => setIsOracleVisible(true)} style={styles.footBtn}><Text style={styles.footText}>ORACLE</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setIsScannerVisible(true)} style={styles.footBtn}><Text style={styles.footText}>SCAN QR</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setIsCreateVisible(true)} style={styles.footBtnMain}><Text style={styles.footTextMain}>+ CREATE</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setViewMode(viewMode==='radar'?'wheel':'radar')} style={styles.footBtn}><Text style={styles.footText}>RADAR</Text></TouchableOpacity>
      </View>

      <ContextModal visible={!!cardToFork} card={cardToFork} onClose={() => setCardToFork(null)} onSave={(n) => handleForkCard(cardToFork, n)} />
      <ChainModal visible={!!chainCard} card={chainCard} onClose={() => setChainCard(null)} currentUserHandle={profile.handle} />
      <HandshakeModal 
          visible={!!activePeer && !isBrowseVisible} 
          peer={activePeer} 
          isLoading={isLoading} // Use global loading state
          onClose={handleDismiss} 
          onGrab={(offer) => handleGrabCard(offer, 'standard')} 
          onBrowse={handleBrowse}
      />
      <RemoteLibraryModal 
          visible={isBrowseVisible}
          catalog={remoteCatalog || []}
          onClose={() => setIsBrowseVisible(false)}
          isLoading={sourceState === 'CONNECTING'}
          onDownload={(item) => handleGrabCard(item, 'standard')}
      />      
      <CreateCardModal 
    visible={isCreateVisible} 
    onClose={() => {
        setIsCreateVisible(false);
        setCreateInitialData(null); // Clear data when closing
    }} 
    onSave={handleCreateCard}
    initialData={createInitialData} // <--- PASS THE DATA HERE
/>
      <ScannerModal visible={isScannerVisible} onClose={()=>setIsScannerVisible(false)} onScanSuccess={handleRealScan} />
      <TrustedSourcesModal visible={isTrustedModalVisible} onClose={() => setIsTrustedModalVisible(false)} sources={trustedSources} onAddSource={handleAddTrustedSource} />
      <OracleModal 
    visible={isOracleVisible} 
    onClose={() => setIsOracleVisible(false)} 
    masterLibrary={MASTER_LIBRARY}
    funLibrary={funLibrary}
    onSelect={(card) => {
        setIsOracleVisible(false);
        setTimeout(() => setSelectedCard(card), 100);
    }}
    // This handler makes the footer buttons work
    onNavigate={(mode) => {
        setIsOracleVisible(false); // Close Oracle first
        setTimeout(() => {
            if (mode === 'scan') setIsScannerVisible(true);
            if (mode === 'create') setIsCreateVisible(true);
            if (mode === 'radar') setViewMode('radar');
        }, 200);
    }}
/>
      <IdentityModal visible={isProfileVisible} onClose={()=>setIsProfileVisible(false)} profile={profile} library={cards} onReset={async()=>{await AsyncStorage.clear();}} onClearLibrary={handleClearLibrary} />
      <CardDetailModal 
    visible={!!selectedCard} 
    card={selectedCard} 
    onClose={() => setSelectedCard(null)}
    onFork={(c) => { setCardToFork(c); setSelectedCard(null); }}
    onChain={() => { setChainCard(selectedCard); setSelectedCard(null); }}
    currentUserHandle={profile.handle}
    onRequestReview={handleRequestReview}

    // --- THE ENHANCE FUNCTION ---
    onEnhance={(cardToCopy) => {
        setCreateInitialData(cardToCopy); // 1. Copy the text
        setSelectedCard(null);            // 2. Close the reader
        setIsCreateVisible(true);         // 3. Open the editor
    }}
    onBlockOperator={handleBlockOperator}
/>
      <TransferRequestModal 
        visible={!!pendingRequest}
        request={pendingRequest}
        onAccept={handleAcceptTransfer}
        onDeny={handleDenyTransfer}
      />
    </SafeAreaView>
  );
}

// --- STYLESHEET (UNCHANGED) ---
const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#050505',
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) / 4 : 0,
      paddingBottom: Platform.OS === 'android' ? 20 : 0
    },  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  textGreen: { color: '#00ff00', fontSize: 20, fontFamily: 'Courier', fontWeight: 'bold' },
  textGray: { color: '#ccc', fontSize: 14, lineHeight: 20 },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, paddingTop: 60, backgroundColor: '#111' },
  headerRank: { color: '#00ff00', fontSize: 16, fontFamily: 'Courier', fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'space-around', padding: 20, backgroundColor: '#111', paddingBottom: 40 },
  btnPrimary: { backgroundColor: '#00ff00', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnOutline: { borderWidth: 1, borderColor: '#666', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  btnSmallOutline: { borderWidth: 1, borderColor: '#444', padding: 8, borderRadius: 4 },
  btnSmallGreen: { backgroundColor: '#00ff00', padding: 8, borderRadius: 4, alignItems: 'center' },
  btnCancel: { marginTop: 15, padding: 10, alignItems: 'center' },
  btnTextBlack: { color: '#000', fontWeight: 'bold', fontFamily: 'Courier' },
  btnTextGray: { color: '#888', fontFamily: 'Courier', fontSize: 12 },
  btnTextGreen: { color: '#00ff00', fontFamily: 'Courier', fontSize: 12, fontWeight:'bold' },
  broadcastBtnCompact: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, backgroundColor: '#222', borderWidth: 1, borderColor: '#444' },
  broadcastText: { color: '#00ff00', fontSize: 10, fontFamily: 'Courier', fontWeight: 'bold' },
  footBtn: { padding: 10 },
  footText: { color: '#666', fontSize: 12, fontFamily: 'Courier', fontWeight: 'bold' },
  footBtnMain: {
    backgroundColor: '#003300', 
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#00ff00',     // Neon Green Border
    alignItems: 'center',
    justifyContent: 'center',
  },
  footTextMain: { color: '#00ff00', fontWeight: 'bold', fontSize: 14 },
  radarBox: { width: 250, height: 250, borderRadius: 125, borderWidth: 1, borderColor: '#333', position: 'relative', overflow: 'hidden', backgroundColor: '#0a0a0a' },
  gridLineVertical: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, backgroundColor: '#222' },
  gridLineHorizontal: { position: 'absolute', left: 0, right: 0, top: '50%', height: 1, backgroundColor: '#222' },
  gridCenter: { position: 'absolute', top: '50%', left: '50%', marginTop: -10, marginLeft: -10 },
  radarBlip: { width: 10, height: 10, backgroundColor: 'rgba(0, 255, 0, 0.3)', borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#333' },
  tab: { flex: 1, padding: 15, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#00ff00' },
  tabText: { color: '#fff', fontFamily: 'Courier', fontSize: 12, fontWeight: 'bold' },
  card: { backgroundColor: '#111', margin: 10, padding: 15, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#00ff00' },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  cardBody: { color: '#ccc', fontSize: 14, lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 20, borderWidth: 1, borderColor: '#333' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 10, fontFamily: 'Courier' },
  dossierBox: { backgroundColor: '#111', borderRadius: 12, padding: 0, overflow: 'hidden', maxHeight: '80%', width: '100%', borderWidth:1, borderColor:'#333' },
  dossierHeader: { padding: 15, borderBottomWidth: 1, borderColor: '#333', flexDirection:'row', justifyContent:'space-between', alignItems:'center', backgroundColor:'#1a1a1a' },
  dossierHandle: { color: '#fff', fontSize: 20, fontWeight: 'bold', fontFamily: 'Courier' },
  dossierMeta: { color: '#666', fontSize: 10, marginTop: 4, fontFamily: 'Courier' },
  rankBadge: { backgroundColor: '#003300', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: '#00ff00' },
  rankText: { color: '#00ff00', fontSize: 10, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#222', width: '100%' },
  payloadHeader: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#0a0a0a' },
  payloadIcon: { fontSize: 32 },
  payloadTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  payloadCategory: { color: '#f59e0b', fontSize: 10, fontWeight: 'bold', marginTop: 2 },
  payloadBodyBox: { padding: 15, backgroundColor: '#111', minHeight: 100 },
  payloadBodyText: { color: '#ccc', fontSize: 14, lineHeight: 22, fontFamily: 'Courier' },
  verifText: { color: '#444', fontSize: 10, textAlign: 'center', padding: 10, fontFamily: 'Courier' },
  actionGrid: { flexDirection: 'row', padding: 15, gap: 10, borderTopWidth: 1, borderColor: '#222' },
  btnActionPrimary: { flex: 2, backgroundColor: '#00ff00', padding: 12, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  btnActionSecondary: { flex: 1, borderWidth: 1, borderColor: '#00ff00', padding: 12, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  closeLink: { padding: 15, alignItems: 'center', borderTopWidth: 1, borderColor: '#222' },
  closeLinkText: { color: '#666', fontSize: 12, fontWeight: 'bold' },
  emptyState: { alignItems: 'center', padding: 30 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { color: '#fff', fontWeight: 'bold', marginBottom: 5 },
  emptyText: { color: '#666', textAlign: 'center', fontSize: 12, marginBottom: 20 },
  contextInput: { backgroundColor: '#000', color: '#fff', padding: 10, borderRadius: 5, height: 100, textAlignVertical: 'top', marginBottom: 10, borderWidth: 1, borderColor: '#333' },
  libraryItem: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:15, borderBottomWidth:1, borderColor:'#222' },
  filterButtonContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '80%', marginTop: 15 },
  filterButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, backgroundColor: '#222', borderWidth: 1, borderColor: '#444' },
  filterButtonActive: { backgroundColor: '#003300', borderColor: '#00ff00' },
  filterButtonText: { color: '#00ff00', fontSize: 10, fontFamily: 'Courier', fontWeight: 'bold' },
  wheelToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginVertical: 10,
  },
  wheelToggleText: {
      color: '#00ff00',
      fontFamily: 'Courier',
      fontWeight: 'bold',
      marginRight: 10,
  },
  wheelToggleIcon: {
      color: '#00ff00',
      fontSize: 12,
  },
  wheelContainer: {
      position: 'absolute',
      top: 5,
      alignSelf: 'center',
      zIndex: 100,
      backgroundColor: 'rgba(5, 5, 5, 0.95)',
      borderRadius: 190,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.8,
      shadowRadius: 20,
      elevation: 20,
  },
  meshSearchInput: {
    flex: 1,
    backgroundColor: '#111',
    color: '#00ff00',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#333',
    fontFamily: 'Courier',
    marginRight: 10,
  },
  flareButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#003300',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#00ff00',
  },
  flareButtonText: {
    color: '#00ff00',
    fontFamily: 'Courier',
    fontWeight: 'bold',
  },
  meshSearchLabel: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Courier',
    textAlign: 'center',
    marginBottom: 10,
  },
});