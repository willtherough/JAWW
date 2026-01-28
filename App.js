import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  SafeAreaView, View, Text, TouchableOpacity, FlatList, StatusBar, 
  Modal, Alert, Platform, StyleSheet, Dimensions, Pressable, 
  TextInput, ScrollView, ActivityIndicator, PermissionsAndroid, 
  Animated, Vibration 
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import QRCode from 'react-native-qrcode-svg'; 
import Svg, { Path, G, Text as SvgText, Circle } from 'react-native-svg'; 

// --- IMPORTS ---
import TrustedSourcesModal from './components/TrustedSourcesModal'; 
import BluetoothService from './services/BluetoothService';
import { grabCardFromDevice } from './services/Receiver';
import CreateCardModal from './components/CreateCardModal'; 
import ScannerModal from './components/ScannerModal'; 
import OracleModal from './components/OracleModal'; 
import IdentityModal from './components/IdentityModal'; 
import Onboarding from './components/Onboarding';
import { createCard } from './model/Schema';
import { loadLibrary, saveLibrary, loadProfile, saveProfile } from './model/Storage';
import { getOrGenerateKeys, signData, verifySignature } from './model/Security';
// import AuthorizationModal from './components/AuthorizationModal'; // Commented out if not used yet

// --- CONSTANTS ---
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const WHEEL_SIZE = 380; const CENTER = WHEEL_SIZE/2; const RADIUS = (WHEEL_SIZE/2)-10;
const DEFAULT_LIBRARY = [{ id: 'fit-001', title: 'The "Murph"', topic: 'fitness', hops: 55, author: 'COMMAND', body: '1 Mile Run, 100 Pulls, 200 Push, 300 Squat, 1 Mile.', history: [] }];

const CATEGORY_MAP = {
  fitness: ['fitness', 'health', 'home_diy'], food: ['food', 'culinary', 'nutrition'], education: ['education', 'history', 'economics'],
  fun: ['fun', 'technology', 'survival'], professional: ['professional', 'military', 'leadership']
};

// --- UI HELPERS ---
const getCategoryIcon = (category) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('fitness') || cat.includes('health')) return '⚡️'; 
  if (cat.includes('food') || cat.includes('culinary')) return '🍎'; 
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

const getMajorCategory = (sub) => {
    const s = (sub||'').toLowerCase();
    if (CATEGORY_MAP.fitness.includes(s)) return 'fitness';
    if (CATEGORY_MAP.food.includes(s)) return 'food';
    if (CATEGORY_MAP.education.includes(s)) return 'education';
    if (CATEGORY_MAP.fun.includes(s)) return 'fun';
    return 'professional';
};

// --- ALGORITHM: INTEREST RANKING ---
const rankContent = (catalog, myCards) => {
    const myInterests = {};
    myCards.forEach(c => {
        const cat = getMajorCategory(c.topic);
        myInterests[cat] = (myInterests[cat] || 0) + 1;
    });

    return catalog.map(item => {
        const cat = getMajorCategory(item.topic);
        let score = 0;
        if (myInterests[cat]) score += (myInterests[cat] * 2);
        score += (item.hops || 0);
        return { ...item, score };
    }).sort((a, b) => b.score - a.score);
};

// --- HELPER: PERMISSIONS ---
const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT, PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE, PermissionsAndroid.PERMISSIONS.CAMERA]);
        return Object.values(granted).every((status) => status === PermissionsAndroid.RESULTS.GRANTED);
      } catch (err) { return false; }
    }
    return true;
};

// --- SUB-COMPONENTS (MODALS) ---
const ChainModal = ({ visible, card, onClose }) => {
    if (!visible || !card) return null;
    
    // 1. GENESIS DATA
    const genesisAuthor = card.originalAuthor || (card.genesis ? card.genesis.author_id : card.author);

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalBox}>
                    <Text style={styles.modalTitle}>CHAIN OF CUSTODY</Text>
                    
                    <ScrollView style={{maxHeight: 400}}>
                        {/* 1. HEADER: ORIGIN */}
                        <View style={{flexDirection:'row', marginBottom: 20}}>
                             <View style={{width: 30, alignItems:'center'}}>
                                 <Text style={{fontSize:16}}>👑</Text>
                                 <View style={{width: 2, height: 40, backgroundColor: '#333', marginTop: 5}} />
                             </View>
                             <View style={{marginLeft: 10, flex: 1}}>
                                 <Text style={{color:'#f59e0b', fontWeight:'bold', fontSize:12}}>ORIGIN</Text>
                                 <Text style={{color:'#fff', fontWeight:'bold', fontSize:16}}>{genesisAuthor}</Text>
                             </View>
                        </View>

                        {/* 2. THE PATH */}
                        {(card.history || []).map((node, i) => {
                            const isFork = node.action === 'FORKED';
                            const isRelay = node.action === 'RELAY_RECEIVED';
                            
                            return (
                                <View key={i} style={{flexDirection:'row', marginBottom: 20}}>
                                    <View style={{width: 30, alignItems:'center'}}>
                                        <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: isFork ? '#f59e0b' : '#333', borderWidth:1, borderColor:'#fff'}} />
                                        <View style={{width: 2, height: 40, backgroundColor: '#333', marginTop: 5}} />
                                    </View>
                                    <View style={{marginLeft: 10, flex: 1}}>
                                        <Text style={{color: isFork ? '#f59e0b' : '#fff', fontWeight:'bold'}}>
                                            {isFork ? `⑂ FORKED by ${node.user}` : (isRelay ? `⬇️ RELAYED by ${node.user}` : `${node.action} by ${node.user}`)}
                                        </Text>
                                        <Text style={{color:'#666', fontSize:10}}>{node.date}</Text>
                                        {node.note && (
                                            <Text style={{color:'#ccc', fontSize:12, fontStyle:'italic', marginTop:2}}>"{node.note}"</Text>
                                        )}
                                    </View>
                                </View>
                            );
                        })}

                        {/* 3. FOOTER: CURRENT HOLDER */}
                        <View style={{flexDirection:'row', marginBottom: 20}}>
                             <View style={{width: 30, alignItems:'center'}}>
                                 <View style={{width: 12, height: 12, borderRadius: 6, backgroundColor: '#00ff00', borderWidth:1, borderColor:'#fff'}} />
                             </View>
                             <View style={{marginLeft: 10, flex: 1}}>
                                 <Text style={{color:'#00ff00', fontWeight:'bold', fontSize:12}}>CURRENT HOLDER</Text>
                                 <Text style={{color:'#fff'}}>Held by You</Text>
                             </View>
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
                    <View style={styles.dossierHeader}>
                        <Text style={styles.dossierHandle}>REMOTE ARCHIVES</Text>
                        <TouchableOpacity onPress={onClose}><Text style={{color:'#666', fontSize: 18}}>×</Text></TouchableOpacity>
                    </View>
                    <View style={{padding: 10, backgroundColor: '#001100', borderBottomWidth:1, borderColor:'#222'}}>
                         <Text style={{color:'#00ff00', fontSize:10, fontFamily:'Courier'}}>// SORTED BY: RELEVANCE & TRUST //</Text>
                    </View>
                    <FlatList 
                        data={catalog}
                        keyExtractor={(item) => item.id}
                        renderItem={({item}) => (
                            <View style={styles.libraryItem}>
                                <View style={{flexDirection:'row', alignItems:'center', flex:1}}>
                                    <Text style={{fontSize:24, marginRight:10}}>{getCategoryIcon(item.topic)}</Text>
                                    <View>
                                        <Text style={{color:'#fff', fontWeight:'bold'}}>{item.title}</Text>
                                        <Text style={{color:'#666', fontSize:10, fontFamily:'Courier'}}>HOPS: {item.hops} • {item.topic.toUpperCase()}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => onDownload(item)} disabled={isLoading} style={styles.btnSmallGreen}>
                                    <Text style={styles.btnTextBlack}>⬇</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    />
                    {isLoading && (
                        <View style={{position:'absolute', bottom: 20, alignSelf:'center', backgroundColor:'#000', padding:10, borderRadius:20, flexDirection:'row'}}>
                            <ActivityIndicator color="#00ff00" /><Text style={{color:'#00ff00', marginLeft:10, fontWeight:'bold'}}>DOWNLOADING...</Text>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
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
                        <View>
                            <Text style={styles.dossierHandle}>{sourceName.toUpperCase()}</Text>
                            <Text style={styles.dossierMeta}>SIG: {peer.rssi}dBm • UPDATED: {lastUpdate}</Text>
                        </View>
                        <View style={styles.rankBadge}><Text style={styles.rankText}>{sourceRank}</Text></View>
                    </View>
                    <View style={styles.divider} />
                    {hasPayload ? (
                        <View style={{flex: 1}}>
                            <View style={styles.payloadHeader}>
                                <Text style={styles.payloadIcon}>{icon}</Text>
                                <View style={{marginLeft: 10, flex: 1}}>
                                    <Text style={styles.payloadTitle}>{offer.title}</Text>
                                    <Text style={styles.payloadCategory}>{category.toUpperCase()} • HOPS: {offer.hops || 0}</Text>
                                </View>
                            </View>
                            <ScrollView style={styles.payloadBodyBox}>
                                <Text style={styles.payloadBodyText}>{offer.body || "No textual content provided in this packet."}</Text>
                            </ScrollView>
                            <Text style={styles.verifText}>AUTHOR: {offer.author || 'ANONYMOUS'} • ID: {offer.id ? offer.id.substring(0,8) : '???'}</Text>
                            <View style={styles.actionGrid}>
                                <TouchableOpacity onPress={() => onGrab(offer)} style={[styles.btnActionPrimary, isLoading && {opacity:0.5}]} disabled={isLoading}>
                                    {isLoading ? <ActivityIndicator color="#000"/> : <Text style={styles.btnTextBlack}>⬇ GRAB CARD</Text>}
                                </TouchableOpacity>
                                <TouchableOpacity onPress={onBrowse} style={styles.btnActionSecondary}>
                                    <Text style={styles.btnTextGreen}>📂 BROWSE</Text>
                                </TouchableOpacity>
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

// --- MAIN APP COMPONENT ---
export default function App() {
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cards, setCards] = useState([]);
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
  const [isDownloading, setIsDownloading] = useState(false);
  const [remoteCatalog, setRemoteCatalog] = useState(null);
  const [isBrowseVisible, setIsBrowseVisible] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState(null); // The request object
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isQRVisible, setIsQRVisible] = useState(false); // Toggle for QR code in modal

  // --- LOGIC: PERMISSIONS ---
  // --- GATEKEEPER LOGIC ---
  
  // 1. Simulate an Incoming Request (For testing UI)
  const triggerSimulatedRequest = () => {
      setIncomingRequest({
          peerId: 'Unknown-Peer-X99',
          peerName: 'RANGER-7',
          topic: 'survival', // They want to see your survival cards
          trustLevel: 'VERIFIED'
      });
      Vibration.vibrate([0, 500, 200, 500]); // Tactical alert pattern
  };

 // --- BROADCASTER: GRANT ACCESS ---
  const handleAuthorize = async () => {
      if (!incomingRequest) return;
      
      const peerName = incomingRequest.peerName;
      console.log(`>> AUTHORIZING ${peerName}`);
      
      // 1. Change OUR signal to "AUTH:PeerName"
      // This acts as the key for the other user to unlock the door
      const authSignal = `AUTH:${peerName}`;
      
      try {
        await BluetoothService.stopBroadcasting(); // Reset radio
        setTimeout(async () => {
            await BluetoothService.startBroadcasting(authSignal, null);
            Alert.alert("ACCESS GRANTED", `Channel open for ${peerName}.`);
        }, 500);
      } catch (e) {
          console.error(e);
      }

      setIncomingRequest(null);
  };

  // 3. Handle Denial
  const handleDeny = () => {
      Alert.alert("ACCESS DENIED", "Connection terminated by host.");
      setIncomingRequest(null);
  };
  const requestRadarPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE
        ]);
        return granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED &&
               granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
               granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) { return false; }
    }
    return true; 
  };

  // --- BROWSER: SUCCESS HANDLER ---
  const handleAccessGranted = (hostDevice) => {
      console.log(">> HANDSHAKE COMPLETE. DOWNLOADING CATALOG.");
      
      // Stop signaling "REQ" so we don't spam
      BluetoothService.stopBroadcasting();
      
      // Simulate fetching the catalog now that we are "Connected"
      // (In a real GATT app, this is where we'd read the specific characteristic)
      setTimeout(() => {
          const baseTopic = 'survival'; // Derived from context
          const mockCatalog = [
              { id: 'rem-1', title: 'Restricted Map', topic: 'survival', hops: 0, author: hostDevice.name },
              { id: 'rem-2', title: 'Water Codes', topic: 'survival', hops: 0, author: hostDevice.name },
          ];
          setRemoteCatalog(mockCatalog);
          setIsLoading(false);
          setIsBrowseVisible(true); // Open the library
      }, 1000);
  };

  const updateLibrary = (newCards) => { setCards(newCards); saveLibrary(newCards); };
  
  const loadTrustedSources = async () => {
    try {
      const storedSources = await AsyncStorage.getItem('trusted_sources');
      if (storedSources) setTrustedSources(JSON.parse(storedSources));
    } catch (e) { console.error(e); }
  };

  // --- ROBUST SIGNAL HANDLER ---
  const handleDeviceFound = (device) => {
    // DEBUG: Print everything the radio hears
    if (device.name) console.log(">> SCANNED:", device.name);

    // 1. FILTER NOISE
    if (!device || !device.id) return;
    
    let resolvedName = device.name || device.localName;
    // FIX: Allow signals with status updates or offers to pass, even if name is missing
    if (!resolvedName && !device.status && !device.offer) return; 

    // 2. CHECK FOR "REQ" SIGNALS (The Handshake)
    if (resolvedName && resolvedName.startsWith('REQ:')) {
        if (viewMode === 'broadcast' && !incomingRequest) {
             const parts = resolvedName.split('@'); 
             const reqTopic = parts[0].replace('REQ:', '');
             const reqHandle = parts[1] || 'Unknown';
             
             console.log(">> INTERCEPTED REQUEST FROM:", reqHandle);
             
             setIncomingRequest({
                 peerId: device.id,
                 peerName: reqHandle,
                 topic: reqTopic,
                 trustLevel: 'VERIFIED'
             });
        }
        return; // Don't draw REQ signals on radar
    }

    // 3. CHECK FOR "AUTH" SIGNALS (The Response)
    if (resolvedName && resolvedName.startsWith('AUTH:') && activePeer) {
        const authorizedTo = device.name.replace('AUTH:', '');
        if (authorizedTo === profile.handle) {
             handleAccessGranted(device);
        }
        return; // Don't draw AUTH signals on radar
    }

    // 4. VISUALIZER
    setNearbyDevices(currentDevices => {
      const index = currentDevices.findIndex(d => d.id === device.id);
      const existing = index > -1 ? currentDevices[index] : null;
      let finalPosition = existing ? existing.position : { x: 10 + Math.random() * 80, y: 10 + Math.random() * 80 };

      // --- RESOLVE IDENTITY ---
      // Priority: 1. New Name Signal | 2. Existing Name | 3. Author from Offer | 4. Unknown
      let resolvedName = device.name; // Might be undefined for progress updates
      
      // SAFEGUARD: Ensure we don't accidentally treat a status message as a name
      if (resolvedName && resolvedName.startsWith('Receiving:')) resolvedName = null;

      if (!resolvedName) {
          if (existing) resolvedName = existing.name;
          // Fallback: If we have an offer but no name, use the author
          if ((!resolvedName || resolvedName === 'Unknown Signal') && device.offer) {
              if (device.offer.relayedBy) resolvedName = device.offer.relayedBy;
              else if (device.offer.author) resolvedName = device.offer.author !== 'Unknown' ? device.offer.author : resolvedName;
          }
          if (!resolvedName) resolvedName = "Unknown Signal";
      }

      // PRIORITIZE SERVICE DATA (The "Offer")
      // Merge new offer with existing offer to prevent flickering
      let offerData = device.offer || (existing && existing.offer && existing.offer.title !== "Scanning..." ? existing.offer : { title: "Scanning...", hops: 0, topic: 'general' });

      // Fallback: Check for JSON in the name (Legacy/Debug)
      if (!device.offer && device.name && device.name.includes('{')) {
         try { 
             const parsed = JSON.parse(device.name);
             offerData = parsed;
             resolvedName = parsed.author || resolvedName;
         } catch(e) {}
      }

      const deviceEntry = {
          id: device.id,
          name: resolvedName,
          status: device.status, // Capture "Receiving: X%"
          rssi: device.rssi,
          lastSeen: Date.now(),
          offer: offerData,
          position: finalPosition,
          _rawDevice: device._raw || device 
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

  // --- BROWSER: INITIATE REQUEST (WITH HARD RESET) ---
  const handleBrowse = async () => {
      if (!activePeer) return;
      
      const targetTopic = activePeer.offer?.topic ? activePeer.offer.topic.split('/')[1] || 'general' : 'general';
      
      console.log(`>> SIGNALING REQUEST: ${targetTopic} TO ${activePeer.name}`);
      setIsLoading(true);

      const requestSignal = `REQ:${targetTopic}@${profile.handle}`;
      
      try {
          // STEP 1: KILL THE RADIO (Forces name refresh)
          await BluetoothService.stopBroadcasting();
          
          // STEP 2: WAIT 500ms (Crucial for Android Bluetooth Stack)
          setTimeout(async () => {
              // STEP 3: START SIGNALING
              await BluetoothService.startBroadcasting(requestSignal, null);
              Alert.alert("REQUEST SENT", "Waiting for host approval...");
          }, 500);
          
      } catch (e) {
          Alert.alert("Error", "Radio busy.");
          setIsLoading(false);
      }
  };

  // --- BOOT SEQUENCE ---
  useEffect(() => {
    const boot = async () => {
      const permStatus = await requestPermissions();
      await requestRadarPermissions(); 
      setHasPermissions(permStatus);
      if (!permStatus) return;

      const keys = await getOrGenerateKeys();
      if (keys) setProfile(prev => ({ ...prev, publicKey: keys.publicKey }));
      
      const savedProfile = await loadProfile();
      if (savedProfile && savedProfile.handle) {
          console.log(">> PROFILE LOADED:", savedProfile.handle);
          setProfile(prev => ({ ...prev, ...savedProfile }));
      } else {
          console.log(">> NO PROFILE FOUND. INITIALIZING ONBOARDING.");
      }

      let savedCards = await loadLibrary(); 
      if (!savedCards || savedCards.length === 0) { 
        savedCards = DEFAULT_LIBRARY; 
        await saveLibrary(savedCards); 
      }
      setCards(savedCards); 
      loadTrustedSources();
      setIsLoading(false);
    };
    boot();

    // CLEANER: Removes devices not seen in 8 seconds
    const cleaner = setInterval(() => {
        const NOW = Date.now();
        setNearbyDevices(prev => {
            if (prev.length === 0) return prev; // Optimization: Don't re-render if empty
            const filtered = prev.filter(d => (NOW - d.lastSeen) < 8000);
            return filtered.length === prev.length ? prev : filtered;
        }); 
    }, 2000);

    // CLEANUP
    return () => { 
        clearInterval(cleaner); 
        BluetoothService.stopScanning(); 
    };
  }, []);

  // --- TASK 1: PRE-PACKAGING LISTENER ---
  useEffect(() => {
      if (!profile.handle) return;
      const allCards = [...cards].filter(c => c.title);
      const bestCard = allCards.sort((a, b) => (b.hops || 0) - (a.hops || 0))[0];
      BluetoothService.prepareBroadcast(profile.handle, bestCard || null);
  }, [cards, profile.handle]);

  // --- FIX: KEEP SCANNING IN BROADCAST MODE ---
  // --- FIX: LISTEN WHILE BROADCASTING ---
  useEffect(() => {
      // We must scan in 'radar' mode (to find people) 
      // AND 'broadcast' mode (to hear the "REQ:" signal)
      if (viewMode === 'radar' || viewMode === 'broadcast') {
          console.log(">> RADIO ACTIVE: Scanning for Signals...");
          BluetoothService.startScanning(handleDeviceFound);
      } else {
          // Only stop scanning if we are on the Wheel or viewing a card
          BluetoothService.stopScanning();
      }
  }, [viewMode]);

  const handleCreateCard = async (c) => {
    try {
      const newCard = await createCard(profile.handle, c.title, c.body, `human/${c.topic || 'general'}`);
      const signature = await signData(JSON.stringify(newCard.genesis));
      newCard.genesis.signature = signature;
      updateLibrary([newCard, ...cards]);
      setIsCreateVisible(false);
    } catch (error) { alert(error.message); }
  };

  const handleGrabCard = async (offer, version) => {
      if (!activePeer) return; 
      
      console.log(">> INITIATING TRANSFER FROM:", activePeer.name);
      setIsDownloading(true); 

      // --- OPTIMIZATION: DIRECT SAVE ---
      // If we already received the full card via Broadcast Chunks, don't try to connect.
      const incoming = activePeer.offer;
      if (incoming && incoming.title && (incoming.body || incoming.body_json)) {
          // 1. CHECK DUPLICATE
          const existingIndex = cards.findIndex(c => c.id === incoming.id);
          
          if (existingIndex >= 0) {
             console.log(">> DUPLICATE DETECTED. SMART UPSERT.");
             const existingCard = cards[existingIndex];
             const updatedCard = {
                 ...existingCard,
                 lastReceived: new Date().toISOString(),
                 confirmations: (existingCard.confirmations || 0) + 1
                 // CRITICAL: DO NOT INCREMENT HOPS ON DUPLICATE
             };
             const newCards = [...cards];
             newCards[existingIndex] = updatedCard;
             updateLibrary(newCards);
             
             setIsDownloading(false);
             setActivePeer(null);
             Alert.alert("UPDATED", `Metadata refreshed for "${updatedCard.title}"`);
             return;
          }

          // 2. NEW CARD (Add Chain Stub)
          const relayName = incoming.relayedBy || activePeer.name || 'Unknown Relay';
          const newCard = { ...incoming, received_at: new Date().toISOString(), hops: (incoming.hops || 0) + 1, history: [...(incoming.history || []), { date: new Date().toISOString(), user: profile.handle, action: 'RELAY_RECEIVED', from: relayName }] };
          
          updateLibrary([newCard, ...cards]);
          setIsDownloading(false);
          setActivePeer(null);
          setTimeout(() => { Alert.alert("INTEL ACQUIRED", `Securely saved: "${newCard.title}"`); }, 500);
          return;
      }

      try {
        grabCardFromDevice(activePeer._rawDevice, (progress) => console.log(`>> Transfer Progress: ${progress}%`), async (card, error) => {
            setIsDownloading(false); 
            if (error) { Alert.alert("Download Failed", "Signal interrupted."); return; }
            if (card) {
                const exists = cards.find(c => c.id === card.id);
                if (exists) { Alert.alert("Redundant Intel", "You already possess this card."); return; }
                const newCard = { ...card, received_at: new Date().toISOString(), hops: (card.hops || 0) + 1, history: [...(card.history || []), { date: new Date().toISOString().split('T')[0], user: profile.handle, action: 'DOWNLOADED' }] };
                updateLibrary([newCard, ...cards]);
                setActivePeer(null);
                setTimeout(() => { Alert.alert("DOWNLOAD COMPLETE", `Securely saved: "${newCard.title}"`); }, 500);
            }
        });
      } catch (err) { setIsDownloading(false); Alert.alert("Error", "Bluetooth service unavailable."); }
  };

  const handleForkCard = async (originalCard, contextNote) => {
      const payload = { action: 'FORK', parent_id: originalCard.id, note: contextNote };
      const signature = await signData(payload);
      const newCard = { 
          ...originalCard, 
          id: Date.now().toString(), 
          author: profile.handle, 
          originalAuthor: originalCard.originalAuthor || originalCard.author, // Track origin
          forkedFrom: originalCard.id, // Track parent
          created_at: new Date().toISOString(), 
          history: [...(originalCard.history || []), { date: new Date().toISOString().split('T')[0], user: profile.handle, action: 'FORKED', note: contextNote, signature: signature }] 
      };
      console.log(">> FORK AUDIT:", JSON.stringify(newCard, null, 2));
      updateLibrary([newCard, ...cards]);
      setCardToFork(null); setSelectedCard(null); 
  };

  const handleAddTrustedSource = async (newSource) => {
    const existingIndex = trustedSources.findIndex(s => s.id === newSource.id);
    let updatedList = [...trustedSources];
    if (existingIndex >= 0) {
      const record = updatedList[existingIndex];
      // Check for Diff
      const roleChanged = record.role !== newSource.role;
      const handleChanged = record.handle !== newSource.handle;
      const bioChanged = JSON.stringify(record.bio) !== JSON.stringify(newSource.bio);

      if (!roleChanged && !handleChanged && !bioChanged) return; // No changes needed

      const auditEntry = { timestamp: new Date().toISOString(), action: 'PROFILE_UPDATE', changes: { prev_role: roleChanged ? record.role : null }, signature: newSource.signature || 'UNSIGNED_UPDATE' };
      updatedList[existingIndex] = { ...record, ...newSource, history: [...(record.history || []), auditEntry] };
      Alert.alert("IDENTITY UPDATED", `Operator ${newSource.handle} updated profile.`);
    } else {
      updatedList.push({ ...newSource, history: [{ timestamp: new Date().toISOString(), action: 'INITIAL_CONTACT', note: 'First Handshake' }] });
    }
    setTrustedSources(updatedList);
    try { await AsyncStorage.setItem('trusted_sources', JSON.stringify(updatedList)); } catch (e) {}
  };

  const handleDismiss = () => {
    setActivePeer(null);
    setIsDownloading(false);
  };

  const handleRadarConnect = (device) => {
    setActivePeer(device);
  };
  
  const handleRealScan = async (dataString) => {
      try {
          const scannedData = (typeof dataString === 'string') ? JSON.parse(dataString) : dataString;
          if (scannedData.type === 'SOURCE_IDENTITY_V1') {
              const newSource = { id: scannedData.id, handle: scannedData.payload.handle, role: scannedData.payload.role, bio: scannedData.payload.bio || {}, trustLevel: 1, dateAdded: new Date().toISOString() };
              await handleAddTrustedSource(newSource); 
              Alert.alert("LINK ESTABLISHED", `Operator ${newSource.handle} added to Trusted Ledger.`);
              setIsScannerVisible(false);
              return;
          }
          if (scannedData.type === 'standard' || scannedData.type === 'card' || (scannedData.title && scannedData.body)) {
              const alreadyExists = cards.find(c => c.id === scannedData.id);
              if (alreadyExists) { Alert.alert("Duplicate Intel", "Already in library."); setIsScannerVisible(false); return; }
              const newCard = { ...scannedData, received_at: new Date().toISOString(), hops: (scannedData.hops || 0) + 1 };
              updateLibrary([newCard, ...cards]);
              setIsScannerVisible(false);
              setTimeout(() => { Alert.alert("INTEL ACQUIRED", `Saved: "${newCard.title}"`); }, 500);
          } else { Alert.alert("Unknown Format", "QR code invalid."); setIsScannerVisible(false); }
      } catch (e) { Alert.alert("Read Error", "Could not interpret QR data."); setIsScannerVisible(false); }
  };

  // --- ANIMATION: PULSE EFFECT ---
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isBroadcasting) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isBroadcasting]);

  const toggleBroadcast = async () => {
      // 1. If we are already broadcasting, STOP.
      if (isBroadcasting) { 
          await BluetoothService.stopBroadcasting(); 
          setIsBroadcasting(false);
          // Optional: Return to wheel if you want, or stay on radar
          if (viewMode === 'broadcast') setViewMode('wheel'); 
      } else {
          // 2. If we are starting, PICK A CARD to serve.
          try {
            // 3. Start the Hardware (Uses Pre-Packaged Data)
            await BluetoothService.startBroadcasting(profile.handle);
            setIsBroadcasting(true);
            Vibration.vibrate(100); // Tactical Feedback
            
            // 4. If we were on the wheel, jump to the broadcast monitor
            if (viewMode === 'wheel') setViewMode('broadcast');
          } catch (e) { 
            Alert.alert("Broadcast Error", "Radio failed to initialize."); 
          }
      }
  };

  const expertise = React.useMemo(() => {
    const s = {};
    cards.forEach(c => { const m = getMajorCategory(c.topic); s[m] = (s[m]||0) + 5 + ((c.hops||1)-1)*2; });
    return s;
  }, [cards]);

  const SECTIONS = [ {id:'food',label:'FOOD',angle:0}, {id:'education',label:'EDU',angle:72}, {id:'fitness',label:'FIT',angle:144}, {id:'professional',label:'PRO',angle:216}, {id:'fun',label:'FUN',angle:288} ];

  const handleWheelTap = (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const dx = locationX - CENTER, dy = locationY - CENTER;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 55) { setIsProfileVisible(true); return; }
      let angle = Math.atan2(dy, dx) * (180/Math.PI) + 90; 
      if (angle < 0) angle += 360;
      const target = SECTIONS[Math.floor(angle/72) % 5].id;
      setActiveTopicFilter(activeTopicFilter === target ? null : target);
  };
   
  const polarToCartesian = (cx, cy, r, ang) => { const a = (ang-90)*Math.PI/180; return {x:cx+r*Math.cos(a), y:cy+r*Math.sin(a)}; }
  const describeArc = (x, y, r, start, end) => {
      const s = polarToCartesian(x,y,r,end); const e = polarToCartesian(x,y,r,start); const f = end-start<=180?"0":"1";
      return ["M",s.x,s.y,"A",r,r,0,f,0,e.x,e.y,"L",x,y,"L",s.x,s.y].join(" ");
  }

  const filteredCards = React.useMemo(() => {
    let l = cards;
    const getAuthor = (c) => c.author || (c.genesis && c.genesis.author_id);
    l = l.filter(c => activeTab === 'created' ? getAuthor(c) === profile.handle : getAuthor(c) !== profile.handle);
    if (activeTopicFilter) l = l.filter(c => getMajorCategory(c.topic) === activeTopicFilter);
    return l.sort((a,b) => (b.hops||0) - (a.hops||0));
  }, [cards, activeTopicFilter, activeTab, profile]);

  const handleOnboardingComplete = useCallback(async (p) => { 
      try {
        const keys = await getOrGenerateKeys(); 
        if (!keys) throw new Error("Key Generation Failed");
        // SECURITY: Only save public data to AsyncStorage. Keys stay in SecureStore.
        const publicProfile = { ...p, publicKey: keys.publicKey, interests: p.interests || [] };
        await saveProfile(publicProfile); 
        setProfile(publicProfile); 
      } catch (e) { Alert.alert("Security Error", "Could not establish Identity."); }
  }, []);

  if (isLoading) return <View style={styles.center}><Text style={styles.textGreen}>Loading Protocols...</Text></View>;
  if (!hasPermissions) return <View style={styles.center}><TouchableOpacity onPress={requestPermissions}><Text style={styles.textGreen}>GRANT ACCESS</Text></TouchableOpacity></View>;
  if (!profile.handle) return <Onboarding visible={true} onComplete={handleOnboardingComplete} />;

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
              
              {/* --- NEW DEBUG TRIGGER --- */}
              <TouchableOpacity onPress={triggerSimulatedRequest} style={{marginTop: 40, padding: 10, backgroundColor:'#222', borderRadius: 5, borderWidth:1, borderColor:'#f59e0b'}}>
                  <Text style={{color:'#f59e0b', fontSize: 10, fontWeight:'bold'}}>⚠ SIMULATE INCOMING REQUEST</Text>
              </TouchableOpacity>
              {/* ------------------------- */}

              <TouchableOpacity onPress={toggleBroadcast} style={styles.btnOutline}><Text style={styles.textGray}>STOP SIGNAL</Text></TouchableOpacity>
          </View>
      ) : viewMode === 'radar' ? (
          <View style={{flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center', paddingBottom: 120}}>
              <View style={styles.radarBox}>
                  <View style={styles.gridLineVertical} />
                  <View style={styles.gridLineHorizontal} />
                 <Animated.View style={[styles.gridCenter, { transform: [{ scale: pulseAnim }] }, isBroadcasting && { backgroundColor: '#00ff00', shadowColor: '#00ff00', shadowRadius: 10, shadowOpacity: 0.8 }]} />
                  {nearbyDevices.map((item) => {
                      const pos = item.position || {x:50, y:50}; 
                      const category = item.offer && item.offer.topic ? item.offer.topic.split('/')[1] || item.offer.topic : 'UNKNOWN';
                      const icon = getCategoryIcon(category);
                      return (
                        <TouchableOpacity key={item.id} style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, width: 60, height: 60, alignItems: 'center', justifyContent: 'center' }} onPress={() => handleRadarConnect(item)}>
                          <View style={styles.radarBlip}><View style={{width: 6, height: 6, backgroundColor: '#fff', borderRadius: 3}}/></View>
                          <Text numberOfLines={1} style={{ position: 'absolute', top: 35, width: 90, textAlign: 'center', color: '#00ff00', fontSize: 9, fontFamily: 'Courier', fontWeight: 'bold', backgroundColor:'rgba(0,0,0,0.6)' }}>
                              {item.name ? item.name.toUpperCase() : 'SIGNAL'}
                          </Text>
                          <Text numberOfLines={1} style={{ position: 'absolute', top: 54, width: 100, textAlign: 'center', color: '#00aa00', fontSize: 8, fontFamily: 'Courier', fontWeight: 'bold' }}>
                             {item.status ? item.status : (item.offer && item.offer.title && item.offer.title !== 'Scanning...' ? item.offer.title : `[${icon} ${category.toUpperCase()}]`)}
                          </Text>
                        </TouchableOpacity>
                      );
                  })}
              </View>
              <TouchableOpacity onPress={toggleBroadcast} style={[styles.btnPrimary, { marginTop: 20, width: '80%' }, isBroadcasting && { backgroundColor: '#003300', borderColor: '#00ff00', borderWidth: 1 }]}>
                  <Text style={[styles.btnTextBlack, isBroadcasting && { color: '#00ff00' }]}>{isBroadcasting ? 'STOP BROADCAST' : 'START BROADCAST'}</Text>
              </TouchableOpacity>
              <Text style={{color: '#004400', marginTop: 20, fontFamily: 'Courier', fontSize: 10}}>// TACTICAL SCANNER: ACTIVE //</Text>
          </View>
      ) : (
          <>
            <View style={{ alignItems: 'center', marginTop: 10 }}>
                <Pressable onPress={handleWheelTap} style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
                    <Svg height={WHEEL_SIZE} width={WHEEL_SIZE}>
                        <Circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="#333" />
                        {SECTIONS.map((s) => {
                            const isSelected = activeTopicFilter === s.id;
                            const path = describeArc(CENTER, CENTER, RADIUS - 5, s.angle + 2, s.angle + 70);
                            const labelPos = polarToCartesian(CENTER, CENTER, RADIUS - 40, s.angle + 36);
                            return (
                                <G key={s.id}>
                                    <Path d={path} fill={expertise[s.id]?'#336633':'#1a1a1a'} stroke={isSelected?'#fff':'none'} />
                                    <SvgText x={labelPos.x} y={labelPos.y} fill="#fff" fontSize="12" textAnchor="middle">{s.label}</SvgText>
                                </G>
                            );
                        })}
                        <Circle cx={CENTER} cy={CENTER} r={55} fill="#000" stroke="#333" />
                        <SvgText x={CENTER} y={CENTER} fill="#fff" fontSize={14} textAnchor="middle">{profile.handle.toUpperCase()}</SvgText>
                    </Svg>
                </Pressable>
            </View>
            <View style={styles.tabContainer}>
                <TouchableOpacity onPress={() => setActiveTab('created')} style={[styles.tab, activeTab==='created' && styles.activeTab]}><Text style={styles.tabText}>MY KNOWLEDGE</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('learned')} style={[styles.tab, activeTab==='learned' && styles.activeTab]}><Text style={styles.tabText}>LEARNED</Text></TouchableOpacity>
            </View>
            <FlatList data={filteredCards} keyExtractor={i=>i.id} renderItem={({item}) => (
                <TouchableOpacity onPress={()=>setSelectedCard(item)} style={styles.card}>
                    <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        {item.forkedFrom && <Text style={{color:'#f59e0b', fontSize:14, fontWeight:'bold'}}>⑂</Text>}
                    </View>
                    <Text style={{color:'#00ff00', fontSize:10}}>HOPS: {item.hops}</Text>
                </TouchableOpacity>
            )} />
          </>
      )}

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => setIsOracleVisible(true)} style={styles.footBtn}><Text style={styles.footText}>ORACLE</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setIsScannerVisible(true)} style={styles.footBtn}><Text style={styles.footText}>SCAN QR</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setIsCreateVisible(true)} style={styles.footBtnMain}><Text style={styles.footTextMain}>+ CREATE</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setViewMode(viewMode==='radar'?'wheel':'radar')} style={styles.footBtn}><Text style={styles.footText}>RADAR</Text></TouchableOpacity>
      </View>

      <ContextModal visible={!!cardToFork} card={cardToFork} onClose={() => setCardToFork(null)} onSave={(n) => handleForkCard(cardToFork, n)} />
      <ChainModal visible={!!chainCard} card={chainCard} onClose={() => setChainCard(null)} />
      <HandshakeModal 
          visible={!!activePeer && !isBrowseVisible} 
          peer={activePeer} 
          isLoading={isDownloading}
          onClose={handleDismiss} 
          onGrab={(offer) => handleGrabCard(offer, 'standard')} 
          onBrowse={handleBrowse}
      />
      <RemoteLibraryModal 
          visible={isBrowseVisible}
          catalog={remoteCatalog || []}
          onClose={() => setIsBrowseVisible(false)}
          isLoading={isDownloading}
          onDownload={(item) => handleGrabCard(item, 'standard')}
      />      
      <CreateCardModal visible={isCreateVisible} onClose={()=>setIsCreateVisible(false)} onSave={handleCreateCard} />
      <ScannerModal visible={isScannerVisible} onClose={()=>setIsScannerVisible(false)} onScanSuccess={handleRealScan} />
      <TrustedSourcesModal visible={isTrustedModalVisible} onClose={() => setIsTrustedModalVisible(false)} sources={trustedSources} onAddSource={handleAddTrustedSource} />
      <OracleModal visible={isOracleVisible} onClose={()=>setIsOracleVisible(false)} library={cards} />
      <IdentityModal visible={isProfileVisible} onClose={()=>setIsProfileVisible(false)} profile={profile} library={cards} onReset={async()=>{await AsyncStorage.clear();}} />
      <Modal visible={!!selectedCard} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
                {/* 0. CALCULATE CONTEXT */}
                {/* Get the LATEST fork note (reverse history to find the most recent action) */}
                {(() => {
                    const forkNote = selectedCard?.history?.slice().reverse().find(h => h.action === 'FORKED')?.note;
                    return (
                        <>
                {/* HEADER */}
                <View style={{alignItems:'center', marginBottom:10}}>
                    <View style={{flexDirection:'row', alignItems:'center'}}>
                        <Text style={styles.modalTitle}>{selectedCard?.title}</Text>
                        {selectedCard?.forkedFrom && (
                            <View style={{backgroundColor:'#f59e0b', paddingHorizontal:6, paddingVertical:2, borderRadius:4, marginLeft:8}}>
                                <Text style={{color:'#000', fontSize:10, fontWeight:'bold'}}>⑂ FORKED</Text>
                            </View>
                        )}
                    </View>
                    <Text style={{color:'#888', fontSize:12, fontFamily:'Courier'}}>
                        {selectedCard?.forkedFrom 
                            ? `Original Author: ${selectedCard?.originalAuthor || 'Unknown'}`
                            : `By ${selectedCard?.author || 'Unknown'}`
                        }
                    </Text>
                </View>

                <Text style={styles.cardBody}>{selectedCard?.body}</Text>

                {/* PROBLEM 1 FIX: DISPLAY FORK CONTEXT */}
                {forkNote && (
                    <View style={{marginTop: 15, padding: 10, backgroundColor: '#222', borderLeftWidth: 3, borderLeftColor: '#f59e0b', borderRadius: 4}}>
                        <Text style={{color: '#f59e0b', fontSize: 10, fontWeight: 'bold', marginBottom: 5, fontFamily: 'Courier'}}>CURATOR'S NOTE</Text>
                        <Text style={{color: '#ccc', fontStyle: 'italic', fontSize: 12}}>"{forkNote}"</Text>
                    </View>
                )}
                
                {/* QR CODE TOGGLE AREA */}
                {isQRVisible && (
                  <View style={{ alignItems: 'center', marginVertical: 20 }}>
                    {selectedCard && <QRCode value={JSON.stringify(selectedCard)} size={150}/>}
                    <TouchableOpacity onPress={() => setIsQRVisible(false)} style={{marginTop:10}}><Text style={{color:'#666', fontSize:10}}>HIDE QR</Text></TouchableOpacity>
                  </View>
                )}
                
                {/* PROBLEM 2 FIX: BUTTON LAYOUT */}
                <View style={{flexDirection:'row', gap: 10, marginTop: 20}}>
                    <TouchableOpacity onPress={() => { setChainCard(selectedCard); setSelectedCard(null); }} style={[styles.btnSmallOutline, {flex:1}]}>
                        <Text style={styles.btnTextGray}>⛓ CHAIN OF CUSTODY</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity onPress={() => setIsQRVisible(!isQRVisible)} style={[styles.btnSmallOutline, {flex:1, borderColor: isQRVisible ? '#00ff00' : '#666'}]}>
                        <Text style={[styles.btnTextGray, isQRVisible && {color:'#00ff00'}]}>🏁 SHARE QR</Text>
                    </TouchableOpacity>
                </View>

                {selectedCard?.author !== profile.handle && (
                    <TouchableOpacity onPress={() => { setCardToFork(selectedCard); setSelectedCard(null); }} style={[styles.btnSmallGreen, {marginTop: 10}]}>
                        <Text style={styles.btnTextBlack}>+ ADD CONTEXT (FORK)</Text>
                    </TouchableOpacity>
                )}
                
                <TouchableOpacity onPress={() => { setSelectedCard(null); setIsQRVisible(false); }} style={styles.btnCancel}>
                    <Text style={styles.btnTextGray}>CLOSE</Text>
                </TouchableOpacity>
                        </>
                    );
                })()}
            </View>
          </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  textGreen: { color: '#00ff00' },
  textGray: { color: '#666' },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#222', paddingHorizontal: 15, paddingBottom: 15, paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight : 0) + 15 },
  broadcastBtnCompact: { backgroundColor: '#222', padding: 8, borderRadius: 5, borderWidth: 1, borderColor: '#333' },
  broadcastText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  headerRank: { color: '#666', fontWeight: 'bold', fontFamily: 'Courier', maxWidth: 120, textAlign: 'right' },
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#222' },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderColor: '#00ff00' },
  tabText: { color: '#fff', fontWeight: 'bold', fontSize: 10 },
  card: { backgroundColor: '#111', padding: 15, borderRadius: 8, marginHorizontal: 20, marginBottom: 10, borderLeftWidth: 3, borderColor: '#333' },
  cardTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cardBody: { color: '#ccc', lineHeight: 20 },
  footer: { position: 'absolute', bottom: 0, width: '100%', flexDirection: 'row', padding: 15, paddingBottom: 60, backgroundColor: '#000', borderTopWidth: 1, borderColor: '#222' },
  footBtn: { flex: 1, alignItems: 'center' },
  footBtnMain: { flex: 1, alignItems: 'center', backgroundColor: '#003300', borderRadius: 5, padding: 10, borderWidth: 1, borderColor: '#00ff00' },
  footText: { color: '#666', fontSize: 10 },
  footTextMain: { color: '#00ff00', fontSize: 10, fontWeight: 'bold' },
  radarBox: { width: '90%', height: '60%', backgroundColor: '#001100', borderWidth: 2, borderColor: '#003300', position: 'relative', borderRadius: 10, overflow: 'hidden' },
  gridLineVertical: { position: 'absolute', width: 1, height: '100%', backgroundColor: 'rgba(0, 255, 0, 0.1)', left: '50%' },
  gridLineHorizontal: { position: 'absolute', width: '100%', height: 1, backgroundColor: 'rgba(0, 255, 0, 0.1)', top: '50%' },
  gridCenter: { position: 'absolute', width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0, 255, 0, 0.3)', top: '50%', left: '50%', transform: [{translateX: -10}, {translateY: -10}] },
  radarBlip: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#00ff00', borderWidth: 2, borderColor: '#fff', shadowColor:'#00ff00', shadowRadius: 10, shadowOpacity: 1, alignItems:'center', justifyContent:'center' },
  btnPrimary: { backgroundColor: '#00ff00', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  btnOutline: { borderWidth: 1, borderColor: '#666', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  btnSmallGreen: { backgroundColor: '#005500', padding: 10, borderRadius: 5, borderWidth: 1, borderColor: '#00ff00' },
  btnSmallOutline: { borderWidth: 1, borderColor: '#666', padding: 10, borderRadius: 5 },
  btnCancel: { alignItems: 'center', padding: 10, marginTop: 10 },
  btnTextBlack: { color: '#000', fontWeight: 'bold' },
  btnTextGray: { color: '#666', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#222', padding: 25, borderRadius: 12, width: '90%' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  contextInput: { backgroundColor: '#333', color: '#fff', padding: 10, height: 100, borderRadius: 5, marginBottom: 20 },
  hsCardTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
  dossierBox: { backgroundColor: '#111', width: '90%', maxHeight: '80%', borderRadius: 12, borderWidth: 1, borderColor: '#333', padding: 0, overflow: 'hidden' },
  dossierHeader: { backgroundColor: '#001100', padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#003300' },
  dossierHandle: { color: '#fff', fontSize: 18, fontWeight: 'bold', fontFamily: 'Courier', letterSpacing: 1 },
  dossierMeta: { color: '#666', fontSize: 10, fontFamily: 'Courier', marginTop: 4 },
  rankBadge: { backgroundColor: '#003300', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: '#00ff00' },
  rankText: { color: '#00ff00', fontSize: 10, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#222' },
  payloadHeader: { flexDirection: 'row', padding: 20, alignItems: 'center' },
  payloadIcon: { fontSize: 32 },
  payloadTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  payloadCategory: { color: '#f59e0b', fontSize: 10, fontWeight: 'bold', marginTop: 2 },
  payloadBodyBox: { backgroundColor: '#050505', marginHorizontal: 20, padding: 15, borderRadius: 5, height: 150, borderWidth: 1, borderColor: '#222' },
  payloadBodyText: { color: '#ccc', fontFamily: 'Courier', fontSize: 12, lineHeight: 18 },
  verifText: { color: '#444', fontSize: 10, textAlign: 'center', marginVertical: 10, fontFamily: 'Courier' },
  actionGrid: { flexDirection: 'row', gap: 10, padding: 20 },
  btnActionPrimary: { flex: 1, backgroundColor: '#00ff00', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnActionSecondary: { flex: 1, backgroundColor: '#111', borderWidth: 1, borderColor: '#00ff00', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnTextGreen: { color: '#00ff00', fontWeight: 'bold', fontSize: 12 },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 20, opacity: 0.5 },
  emptyTitle: { color: '#fff', fontWeight: 'bold', marginBottom: 10 },
  emptyText: { color: '#666', textAlign: 'center', marginBottom: 20, fontSize: 12 },
  closeLink: { padding: 15, alignItems: 'center', backgroundColor: '#000' },
  closeLinkText: { color: '#666', fontSize: 12, fontWeight: 'bold' },
  libraryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#222', backgroundColor: '#050505' },
});