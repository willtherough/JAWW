import 'react-native-get-random-values';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, FlatList, ScrollView,
  Modal, Alert, SafeAreaView, StatusBar, Image, Animated,
  Dimensions, Platform, Vibration, PermissionsAndroid, Pressable,
  ActivityIndicator, TextInput, DeviceEventEmitter, ToastAndroid, LogBox, NativeModules,
  AppState, InteractionManager
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
import { getOrGenerateKeys, signData, verifyChain } from './model/Security';
import { initDB, batchInsertCards, insertOrReplaceCard, insertTransferRecord, getAllCards, getCardById, blockOperator, searchCards, fetchCards, getCategoryForSubject, trustNode, getOperatorStats, deleteCard, quarantineCard, runQuery, queueCardForUmpire, getPendingUmpireSyncs, markUmpireQueueAsSynced } from './model/database';
import BluetoothService from './services/BluetoothService';
import { startServer, sendCardInChunks, initiateHandshake, sendSyncPingBack } from './services/PeripheralService'; // <--- ENGINE 4
import { setAdvertisedCard } from './services/BroadcastState';
import { createCard, forkCard, buildLedgerEntry } from './model/Schema';

// --- COMPONENT IMPORTS ---
import CardDetailModal from './components/CardDetailModal';
import CreateCardModal from './components/CreateCardModal';
import ScannerModal from './components/ScannerModal';
import RosettaScannerModal from './components/RosettaScannerModal';
import TrustedSourcesModal from './components/TrustedSourcesModal';
import OracleModal from './components/OracleModal';
import IdentityModal from './components/IdentityModal';
import Onboarding from './components/Onboarding';
import CardItem from './components/CardItem';
import UmpireEventModal from './components/UmpireEventModal';
import TacticalScanner from './components/TacticalScanner';
import FlareBeacon from './components/FlareBeacon';
import QRCode from 'react-native-qrcode-svg';
import SyncStatusScreen from './components/SyncStatusScreen';
import AnimatedQRTransfer from './components/AnimatedQRTransfer';
import AirGapScanner from './components/AirGapScanner';
import UmpireDashboardService from './services/UmpireDashboardService';

const decodeVaultBitmask = (bitmask) => {
  if (!bitmask) return null;
  const tags = [];

  // Reverse the bitwise shift (1 << (catVal - 1))
  if (bitmask & (1 << 0)) tags.push('[ FOOD ]');
  if (bitmask & (1 << 1)) tags.push('[ EDUCATION ]');
  if (bitmask & (1 << 2)) tags.push('[ FITNESS ]');
  if (bitmask & (1 << 3)) tags.push('[ PROFESSIONAL ]');
  if (bitmask & (1 << 4)) tags.push('[ FUN ]');

  return tags.length > 0 ? tags.join(' ') : null;
};


// --- CONFIGURATION ---
LogBox.ignoreLogs(['Cannot read property \'addService\' of null']);

console.log("🛠️ NATIVE MODULES DEBUG 🛠️");
const keys = Object.keys(NativeModules);
console.log("All Modules count:", keys.length);
console.log("SourceGattModule Found:", NativeModules.SourceGattModule ? 'YES' : 'NO');

// --- CONSTANTS ---
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const WHEEL_SIZE = 380; const CENTER = WHEEL_SIZE / 2; const RADIUS = (WHEEL_SIZE / 2) - 10;

// --- COMPILE-TIME METADATA ---
export const IS_MILITARY = process.env.EXPO_PUBLIC_APP_VARIANT === 'military';

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

const generateLedgerHash = (historyArray) => {
  if (!historyArray || historyArray.length === 0) return '0';

  const historyString = JSON.stringify(
    historyArray.map(h => ({
      action: h.action || 'legacy_action',
      from: h.from || h.fromKey || '',
      to: h.to || h.userKey || '',
      signature: h.signature || ''
    })).sort((a, b) => {
      // BUG FIX: Removed Code Assist's nested backticks that created literal strings.
      // We are now evaluating the actual data variables to sort deterministically.
      const aStr = `${a.action}->${a.from}->${a.to}->${a.signature}`;
      const bStr = `${b.action}->${b.from}->${b.to}->${b.signature}`;
      return aStr.localeCompare(bStr);
    })
  );

  let hash = 0;
  for (let i = 0; i < historyString.length; i++) {
    const char = historyString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return String(hash);
};

const calculateTrueHops = (historyArray) => {
  if (!historyArray || !Array.isArray(historyArray) || historyArray.length === 0) {
    return 0;
  }

  const nodeDepths = new Map();
  let maxDepth = 0;

  historyArray.forEach(entry => {
    let currentDepth = 1;
    const senderKey = entry.fromKey || entry.from || entry.sender_id || entry.author;
    const receiverKey = entry.toKey || entry.to || entry.receiver_id || entry.userKey || entry.user;

    if (entry.action === 'CREATED' || entry.action === 'GENESIS') {
      currentDepth = 1;
      if (receiverKey) nodeDepths.set(receiverKey, currentDepth);
    } else {
      const parentDepth = nodeDepths.get(senderKey) || 0;
      currentDepth = parentDepth + 1;
      if (receiverKey) nodeDepths.set(receiverKey, currentDepth);
    }

    if (currentDepth > maxDepth) maxDepth = currentDepth;
  });

  return maxDepth > 0 ? maxDepth : historyArray.length;
};

export const mergeAndSortLedgers = (localHistory, incomingHistory) => {
  // Ensure both inputs are valid arrays
  const safeLocal = Array.isArray(localHistory) ? localHistory : [];
  const safeIncoming = Array.isArray(incomingHistory) ? incomingHistory : [];

  const combinedHistory = [...safeLocal, ...safeIncoming];
  const uniqueEntries = new Map();

  // Rule 2: Filter out exact duplicates using the signature string as the unique ID
  combinedHistory.forEach(entry => {
    if (entry && entry.signature) {
      if (!uniqueEntries.has(entry.signature)) {
        uniqueEntries.set(entry.signature, entry);
      }
    }
  });

  // Rule 2: Deterministically Sort the final combined array chronologically by the timestamp field
  const sortedHistory = Array.from(uniqueEntries.values()).sort((a, b) => {
    const timeA = new Date(a.timestamp || 0).getTime();
    const timeB = new Date(b.timestamp || 0).getTime();

    // If timestamps are perfectly identical, fallback to a string comparison 
    // of the signatures to guarantee a 100% deterministic zipper across all devices.
    if (timeA === timeB) {
      return a.signature.localeCompare(b.signature);
    }

    return timeA - timeB;
  });

  return sortedHistory;
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
        <View style={[styles.modalBox, { borderColor: '#f59e0b' }]}>
          <Text style={styles.modalTitle}>INCOMING REQUEST</Text>
          <Text style={styles.textGray}>
            Operator <Text style={{ color: '#f59e0b', fontWeight: 'bold' }}>{requester}</Text> is requesting the following card:
          </Text>
          <View style={[styles.card, { backgroundColor: '#222', marginTop: 15 }]}>
            <Text style={styles.cardTitle}>{card.title || "Subject Request"}</Text>
            <Text style={{ color: '#666', fontSize: 10, fontFamily: 'Courier' }}>ID: {card.id ? card.id.substring(0, 8) : "UNK"}...</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
            <TouchableOpacity onPress={onDeny} style={[styles.btnOutline, { flex: 1, marginRight: 10, borderColor: '#ff0000', marginTop: 0 }]}>
              <Text style={[styles.btnTextGray, { color: '#ff0000' }]}>DENY</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onAccept} style={[styles.btnPrimary, { flex: 2 }]}>
              <Text style={styles.btnTextBlack}>ACCEPT & SEND</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const formatKey = (key) => {
  if (!key || key === 'Unknown') return 'UNKNOWN';
  if (key === 'Local Generation') return 'LOCAL GENERATION';
  if (key.length > 20) return `${key.substring(0, 8)}...${key.substring(key.length - 8)}`;
  return key;
};

const ChainModal = ({ visible, card, onClose, currentUserHandle }) => {
  if (!visible || !card) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { maxHeight: '80%', width: '90%' }]}>
          <Text style={styles.modalTitle}>CHAIN OF CUSTODY</Text>
          <ScrollView style={{ width: '100%', maxHeight: 500 }} contentContainerStyle={{ paddingBottom: 20 }}>
            {card.history && card.history.map((entry, index) => {
              const isGenesis = index === 0 || entry.action === 'CREATE';
              const isFork = entry.action === 'FORK' || entry.action === 'FORKED';
              const isSubmitted = entry.action === 'SUBMITTED';
              const isAnswered = entry.action === 'ANSWERED';
              const isAskedMesh = entry.action === 'ASKED_MESH';
              const isRespondedMesh = entry.action === 'RESPONDED_MESH';

              let actionLabel = "Transferred to";
              let actionColor = "#38BDF8";
              let iconName = isGenesis ? "hexagon" : (isFork ? "edit-3" : "arrow-down-circle");

              if (isGenesis) {
                actionLabel = card.topic === 'human/question' ? "Asked by" : "Created by";
                actionColor = "#10B981";
              } else if (isFork) {
                actionLabel = (card.topic === 'human/answer' || card.topic === 'human/question') ? "Answered by" : "Forked by";
                actionColor = "#F59E0B";
              } else if (isSubmitted) {
                actionLabel = `Submitted to JAWW Event: ${entry.event || 'Mission'}`;
                actionColor = "#A855F7";
                iconName = "shield";
              } else if (isAskedMesh) {
                actionLabel = "Asked the mesh";
                actionColor = "#F59E0B";
                iconName = "message-circle";
              } else if (isRespondedMesh || isAnswered) {
                actionLabel = "Responded to the mesh";
                actionColor = "#F59E0B";
                iconName = "message-square";
              }

              const fromKey = entry.from || entry.sender_id || entry.fromKey || "Local Generation";
              const toKey = entry.to || entry.receiver_id || entry.userKey || entry.user || entry.handle;

              // Determine the focal handle based on the action flow
              // --- DETERMINISTIC IDENTITY RESOLUTION ---
              // Check every possible field where a decentralized handle might be stored
              let displayUser = entry.operator_handle ||
                entry.senderHandle ||
                entry.user ||
                entry.handle ||
                (entry.from && entry.from.length < 20 ? entry.from : null) ||
                "UNKNOWN OPERATOR";

              // Specific overrides for Mesh/Umpire actions
              if (isAskedMesh || isSubmitted || isRespondedMesh) {
                displayUser = entry.senderHandle ||
                  entry.operator_handle ||
                  (entry.from && entry.from.length < 20 ? entry.from : "UNKNOWN OPERATOR");
              } else if (!isGenesis && !isFork) {
                // Default TRANSFER block: Prioritize the recipient!
                displayUser = entry.recipientHandle ||
                  (entry.to && entry.to.length < 20 ? entry.to : null) ||
                  "UNKNOWN OPERATOR";
              }

              return (
                <View key={index} style={styles.timelineNode}>
                  {index !== 0 && (
                    <Feather name="arrow-down" size={20} color="#475569" style={{ marginBottom: 12 }} />
                  )}

                  <View style={styles.entryCard}>
                    <Feather name={iconName} size={20} color={actionColor} style={{ marginBottom: 8 }} />

                    <Text style={[styles.historyAction, { color: actionColor }]}>
                      {actionLabel.toUpperCase()}
                    </Text>
                    <Text style={styles.historyUser}>
                      {displayUser}
                    </Text>

                    <View style={styles.keyContainer}>
                      {isFork || isGenesis ? (
                        <Text style={styles.historyKey}>KEY: {formatKey(fromKey)}</Text>
                      ) : (
                        <>
                          {isSubmitted && <Text style={[styles.historyKey, { color: '#A855F7', marginBottom: 4 }]}>UMPIRED BY: {entry.umpire || entry.user || entry.handle || 'UNKNOWN'}</Text>}
                          <Text style={styles.historyKey}>FROM: {entry.senderHandle || (entry.from && entry.from.length < 20 ? entry.from : 'UNKNOWN')}</Text>
                          <Text style={styles.historyKey}>PUBLIC KEY: {formatKey(entry.fromKey || entry.sender_id || (entry.from && entry.from.length > 20 ? entry.from : ''))}</Text>
                          <Text style={styles.historyKey}>TO:   {entry.recipientHandle || entry.user || entry.handle || (entry.to && entry.to.length < 20 ? entry.to : 'UNKNOWN')}</Text>
                          <Text style={styles.historyKey}>PUBLIC KEY: {formatKey(entry.to || entry.userKey || entry.receiver_id || '')}</Text>
                        </>
                      )}
                    </View>

                    <Text style={styles.historyDate}>
                      {new Date(entry.timestamp).toLocaleString()}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
          <TouchableOpacity onPress={onClose} style={[styles.btnOutline, { marginTop: 10 }]}><Text style={styles.btnTextGray}>CLOSE LEDGER</Text></TouchableOpacity>
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
          <View style={styles.dossierHeader}><Text style={styles.dossierHandle}>REMOTE ARCHIVES</Text><TouchableOpacity onPress={onClose}><Text style={{ color: '#666', fontSize: 18 }}>×</Text></TouchableOpacity></View>
          <View style={{ padding: 10, backgroundColor: '#001100', borderBottomWidth: 1, borderColor: '#222' }}><Text style={{ color: '#00ff00', fontSize: 10, fontFamily: 'Courier' }}>// SORTED BY: RELEVANCE & TRUST //</Text></View>
          <FlatList
            data={catalog}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.libraryItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontSize: 24, marginRight: 10 }}>{getCategoryIcon(item.topic)}</Text>
                  <View><Text style={{ color: '#fff', fontWeight: 'bold' }}>{item.title}</Text><Text style={{ color: '#666', fontSize: 10, fontFamily: 'Courier' }}>HOPS: {item.hops} • {item.topic.toUpperCase()}</Text></View>
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
  switch (status) {
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
      <View style={styles.modalOverlay}><View style={styles.modalBox}><Text style={styles.modalTitle}>OPERATOR RESPONSE (FORK)</Text><TextInput style={styles.contextInput} multiline placeholder="What are you adding?" placeholderTextColor="#444" value={note} onChangeText={setNote} /><TouchableOpacity onPress={() => onSave(note)} style={styles.btnPrimary}><Text style={styles.btnTextBlack}>SIGN & FORK</Text></TouchableOpacity><TouchableOpacity onPress={onClose} style={styles.btnCancel}><Text style={styles.btnTextGray}>CANCEL</Text></TouchableOpacity></View></View>
    </Modal>
  );
};

const HandshakeModal = ({ visible, peer, category, onClose, onGrab, onBrowse, isLoading }) => {
  if (!visible || !peer) return null;
  const offer = peer.offer || {};
  const hasPayload = !!offer.title;

  // SAFEGUARD: Ensure topic parsing never crashes the render
  const safeTopic = offer.topic || 'human/general';
  const displayCategory = category === 'resolving...'
    ? 'resolving...'
    : category || safeTopic.split('/')[1] || safeTopic;

  const icon = getCategoryIcon(displayCategory);
  const sourceName = peer.name || peer.handle || "UNKNOWN SIGNAL";
  const sourceRank = getRankDisplay(offer.hops);
  const lastUpdate = new Date(peer.lastSeen || Date.now()).toLocaleTimeString();
  const vaultTags = decodeVaultBitmask(peer.categoryBitmask);

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
            // FIX: Removed flex: 1 and replaced with width 100% to prevent layout collapse
            <View style={{ width: '100%' }}>
              <View style={styles.payloadHeader}>
                <Text style={styles.payloadIcon}>{icon}</Text>
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.payloadTitle}>{offer.title}</Text>
                  <Text style={styles.payloadCategory}>{(displayCategory || 'GENERAL').toUpperCase()} • HOPS: {offer.hops || 0}</Text>
                </View>
              </View>
              <ScrollView style={styles.payloadBodyBox}>
                {displayCategory === 'resolving...' ? (
                  <View style={{ alignItems: 'center', padding: 20 }}>
                    <ActivityIndicator color="#00ff00" />
                    <Text style={{ color: '#666', fontSize: 12, textTransform: 'uppercase', fontFamily: 'Courier', marginTop: 10 }}>RESOLVING CATEGORY...</Text>
                  </View>
                ) : category ? (
                  <View style={{ alignItems: 'center', padding: 20 }}>
                    <Text style={{ color: '#666', fontSize: 12, textTransform: 'uppercase', fontFamily: 'Courier' }}>Card Category</Text>
                    <Text style={{ color: '#fff', fontSize: 20, textAlign: 'center', fontFamily: 'Courier', fontWeight: 'bold', marginTop: 5 }}>{displayCategory.toUpperCase()}</Text>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', padding: 20 }}>
                    <Text style={{ color: '#666', fontSize: 12, textAlign: 'center', fontFamily: 'Courier', paddingHorizontal: 10 }}>You can add your own context to this card or your own spin by pushing 'Fork' in the card.</Text>
                  </View>
                )}
              </ScrollView>
              {/* STEP 1: The Anonymous Text Swap */}
              <Text style={styles.verifText}>
                {offer.id
                  ? `AUTHOR: ${offer.author || 'ANONYMOUS'} • ID: ${offer.id.substring(0, 8)}`
                  : "Check the JAWW default cards for useful info."}
              </Text>

              {/* STEP 2: The Vault Bitmask UI */}
              {vaultTags && (
                <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 5 }}>
                  <Text style={{ color: '#00ff00', fontSize: 10, fontFamily: 'Courier', fontWeight: 'bold' }}>
                    VAULT CONTAINS: {vaultTags}
                  </Text>
                </View>
              )}

              <View style={styles.actionGrid}>
                <TouchableOpacity onPress={() => onGrab(offer)} style={[styles.btnActionPrimary, isLoading && { opacity: 0.5 }]} disabled={isLoading}>
                  {isLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnTextBlack}>⬇ GRAB CARD</Text>}
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
      } catch (parseError) { }
    }
    if (cardsToMigrate.length > 0) {
      await batchInsertCards(cardsToMigrate);
      console.log(">> Cards successfully migrated to SQLite!");
    }
    await AsyncStorage.setItem('@migration_complete', 'true');
  } catch (error) { console.error(">> FATAL ERROR during migration:", error); }
};

const broadcastGossipSync = (card, myHandle) => {
  try {
    if (!card || !card.history) return;
    const handles = new Set();
    card.history.forEach(e => {
      if (e.senderHandle) handles.add(e.senderHandle);
      if (e.recipientHandle) handles.add(e.recipientHandle);
    });
    const uniqueHandles = [...handles].filter(h => h && h !== myHandle && h !== "Unknown" && h !== "Unknown Operator");
    if (uniqueHandles.length > 0) {
      BluetoothService.pingTargetsForSync(card.id, uniqueHandles, myHandle);
    }
  } catch (err) {
    console.error(">> GOSSIP EXCEPTION:", err);
  }
};

// --- MAIN APP COMPONENT ---
export default function App() {

  const handleEndEvent = () => {
    Alert.alert(
      "Terminate Event?",
      "This will close the connection and drop all participants.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Event",
          style: "destructive",
          onPress: async () => {
            try {
              // 1. Wipe database memory
              await AsyncStorage.removeItem('@jaww_active_event_id');
              await AsyncStorage.removeItem('@jaww_event_start');

              // --- PHASE 3 TEARDOWN ---
              await AsyncStorage.removeItem('@jaww_active_event_state');
              await AsyncStorage.removeItem('@jaww_is_umpire_mode');

              // 2. Kill the radio if Host
              if (isUmpireMode) {
                BluetoothService.stopBroadcasting();
              }

              // 3. Update the UI
              setIsOracleVisible(false);
              setActiveUmpireEvent(null);
              setEventOverMessage("EVENT TERMINATED.");
              setTimeout(() => setEventOverMessage(null), 5000);

            } catch (e) {
              console.error(">> EVENT END FAILED:", e);
              Alert.alert("Error", "Could not cleanly sever the connection.");
            }
          }
        }
      ]
    );
  };

  const [showSyncFlare, setShowSyncFlare] = useState(false);
  const [isHostDashboardVisible, setIsHostDashboardVisible] = useState(false); // For Step 2
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
  const [isContextModalVisible, setIsContextModalVisible] = useState(false);
  const [chainCard, setChainCard] = useState(null);
  const [isCreateVisible, setIsCreateVisible] = useState(false);
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [airGapPayload, setAirGapPayload] = useState(null);
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [isOracleVisible, setIsOracleVisible] = useState(false);
  const [isRosettaVisible, setIsRosettaVisible] = useState(false);
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
  const [activePeerCategory, setActivePeerCategory] = useState(null);
  const [isUmpireMode, setIsUmpireMode] = useState(false);
  const [gamePhase, setGamePhase] = useState('INIT');
  const [eventStartTime, setEventStartTime] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [submittedEventTimes, setSubmittedEventTimes] = useState([]);
  const [activeUmpireEvent, setActiveUmpireEvent] = useState(null);
  const [isUmpireEventModalVisible, setIsUmpireEventModalVisible] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isHostQRVisible, setIsHostQRVisible] = useState(false);
  const [activeConnections, setActiveConnections] = useState([]);
  const [eventOverMessage, setEventOverMessage] = useState(null);
  const [lastSeenUmpireId, setLastSeenUmpireId] = useState(null);
  const [isSyncScreenVisible, setIsSyncScreenVisible] = useState(false);
  const [groceryList, setGroceryList] = useState([]);
  const [syncBadges, setSyncBadges] = useState({}); // Holds { cardId: numberOfNewEntries }

  // NEW: Unified JitterSync Engine State
  const [isJitterSyncActive, setIsJitterSyncActive] = useState(false);
  const jitterSyncLockRef = useRef(false);
  const jitterSyncDebounceRef = useRef(null);

  /**
   * THE PLUMBING: Universal Mesh Engine Trigger
   * Centralizes all mesh broadcast logic for SQLite mutations.
   * Features a debounce and lock to prevent Double-Fire loops.
   */
  const triggerJitterSync = useCallback(async (cardToSync, delayMs = 1500) => {
    if (!cardToSync || !cardToSync.id) return;

    // Clear any pending debounced syncs for this specific card
    if (jitterSyncDebounceRef.current) {
      clearTimeout(jitterSyncDebounceRef.current);
    }

    jitterSyncDebounceRef.current = setTimeout(async () => {
      // Prevent overlapping concurrent syncs
      if (jitterSyncLockRef.current) {
          console.log(`>> JITTER-SYNC: Engine busy, dropping redundant broadcast for ${cardToSync.id}`);
          return;
      }
      
      try {
        jitterSyncLockRef.current = true;
        setIsJitterSyncActive(true);
        console.log(`\n>> JITTER-SYNC: Igniting broadcast sequence for Card ID: ${cardToSync.id}`);

        // 1. Fetch fresh profile for identity
        const myProfile = await loadProfile();
        const myHandle = myProfile?.handle || "Unknown Operator";

        // 2. Arm the Background Broadcast (GATT Advertiser)
        await BluetoothService.armQuestionBroadcast(cardToSync);
        
        // 3. Trigger targeted gossip to known peers in the ledger
        broadcastGossipSync(cardToSync, myHandle);

        // 4. Temporarily show sync flare in UI
        setShowSyncFlare(true);
        setTimeout(() => setShowSyncFlare(false), 3000);

      } catch (error) {
        console.error(">> JITTER-SYNC: Engine Failure:", error);
      } finally {
        jitterSyncLockRef.current = false;
        setIsJitterSyncActive(false);
      }
    }, delayMs); // Debounce window
  }, []);

  // --- RENDER-THROTTLE REFS FOR RADAR ---
  const deviceBufferRef = useRef(new Map());
  const updateIntervalRef = useRef(null);


  // --- REFACTOR: RADAR FILTER REF ---
  const [radarFilter, setRadarFilter] = useState(null);
  const radarFilterRef = useRef(null);

  // NEW: Synchronous lock to prevent the GATT Bomb
  const umpireSyncLockRef = useRef(new Set());

  // --- SHADOW HOP SYNCHRONIZER ---
  // This effect monitors when the app is brought to the foreground.
  // It refreshes the UI cards from the DB without crashing the background thread.
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      // ONLY trigger if the app is truly transitioning from background/inactive to active
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log(">> UI: Foreground detected. Synchronizing Shadow Hops from SQLite...");
        try {
          const freshCards = await getAllCards();
          setCards(freshCards);
        } catch (err) {
          console.error(">> UI: Failed to sync shadow hops:", err);
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const resolveCategory = async () => {
      if (activePeer && activePeer.subject) {
        setActivePeerCategory('resolving...');
        const category = await getCategoryForSubject(activePeer.subject);
        setActivePeerCategory(category);
      } else {
        setActivePeerCategory(null);
      }
    };

    resolveCategory();
  }, [activePeer]);

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
    const statsListener = DeviceEventEmitter.addListener('statsReceived', (stats) => {
      console.log(">> UI: Stats received", stats);
      setLeaderboard(prev => {
        const existing = prev.find(p => p.handle === stats.handle);
        if (existing) {
          return prev.map(p => p.handle === stats.handle ? stats : p);
        }
        return [...prev, stats];
      });
    });

    // ==========================================
    // UMPIRE MODE: INGESTION, LEDGER & UI NOTIFY
    // ==========================================
    const umpireDataListener = DeviceEventEmitter.addListener('umpireDataReceived', async (data) => {
      const { card, sender, timestamp } = data;

      if (card) {
        try {
          // --- THE SHIELD: Verify the Escrow Signature ---
          if (!verifyChain(card)) {
            console.error(">> UMPIRE SECURITY: Incoming payload failed cryptographic verification. Dropping packet.");
            return; // Terminate execution if hashes do not align
          }

          const hostEventId = await AsyncStorage.getItem('@jaww_active_event_id');
          const currentProfile = await loadProfile();
          const eventName = card.subject || "Mission";

          if (hostEventId) card.event_id = hostEventId;

          // 🔒 SAVE THE EXACT PAYLOAD AS RECEIVED (No artificial block generation)
          await insertOrReplaceCard(card);

          // Trigger UI update
          setCards(prev => {
            const filtered = prev.filter(c => c.id !== card.id);
            return [card, ...filtered];
          });

          console.log(`>> UMPIRE: Successfully ingested verified card from ${sender}`);

          const safeTimestamp = timestamp ? new Date(parseInt(timestamp, 10)).toISOString() : new Date().toISOString();

          // NATIVE WRITE-BEFORE-SEND INGESTION
          // We trust the fully encrypted Escrow payload minted natively by the Sender!
          // Save Cryptographic state

          // Save SQL Telemetry
          await insertTransferRecord({
            cardId: card.id,
            recipientHandle: currentProfile?.handle || 'Umpire',
            timestamp: safeTimestamp
          });

          // UPDATE THE UMPIRE LEADERBOARD UI DYNAMICALLY
          setLeaderboard(prev => {
            const existing = prev.find(p => p.handle === sender);
            if (existing) {
              return prev.map(p => p.handle === sender ? {
                ...p,
                authoredCount: (p.authoredCount || 0) + 1,
                expertiseScore: (p.expertiseScore || 0) + (card.hops || 1)
              } : p);
            }
            return [...prev, {
              handle: sender,
              authoredCount: 1,
              expertiseScore: card.hops || 1,
              totalVaultSize: 1,
              domainDominance: card.topic ? card.topic.replace('human/', '').toUpperCase() : 'MISSION'
            }];
          });

          // --- UI DEBOUNCE TO PREVENT ANDROID CRASH ---
          console.log(">> UI: Background Umpire Sync Debouncing...");
          InteractionManager.runAfterInteractions(async () => {
            try {
              const freshCards = await getAllCards();
              setCards(freshCards);

              if (Platform.OS === 'android') {
                ToastAndroid.show(`New card submitted for ${eventName.toUpperCase()}!`, ToastAndroid.LONG);
              }
            } catch (e) { }
          });
        } catch (error) {
          console.error(">> UMPIRE INGESTION: Failed to process incoming intel.", error);
        }
      }
    });

    // ==========================================
    // THE ZERO-CLICK MESH PING (Automated Genesis Hunt)
    // ==========================================
    const syncPingListener = DeviceEventEmitter.addListener('onSyncPingReceived', async (data) => {
      const { cardId, senderHandle } = data;

      console.log(`>> MESH: Caught background ping from ${senderHandle}. Waking up the Bouncer...`);

      try {
        // 1. Check if we actually own this card before we waste radio power
        const localCard = await getCardById(cardId);
        if (!localCard) {
          console.log(`>> MESH: Card not found locally. Ignoring ping.`);
          return;
        }

        // 2. Fire the Phase 1 Security Challenge!
        // initiateMeshSync internally handles the nonce and sends the REQ:CHALLENGE
        await BluetoothService.initiateMeshSync(senderHandle, localCard);

      } catch (error) {
        console.error(">> MESH: Background Handshake Failed", error);
      }
    });

    const meshSyncReceivedListener = DeviceEventEmitter.addListener('meshSyncReceived', async (data) => {
      const { cardId, contentHash, genesisSignature, incomingHistory } = data;
      console.log(`>> MESH SYNC: Received sync request for ${cardId}`);

      try {
        const localCard = await getCardById(cardId);
        if (!localCard) {
          console.log(">> MESH SYNC: Gatekeeper Failed: Card not found locally.");
          return;
        }
        if (localCard.hash !== contentHash) {
          console.log(">> MESH SYNC: Gatekeeper Failed: Divergent Cards (Content Hash Mismatch).");
          return;
        }
        if (localCard.history[0]?.signature !== genesisSignature) {
          console.log(">> MESH SYNC: Gatekeeper Failed: Divergent Cards (Genesis Signature Mismatch).");
          return;
        }

        console.log(">> MESH SYNC: Gatekeeper Passed. Merging...");
        const mergedHistory = mergeAndSortLedgers(localCard.history, incomingHistory);

        const updatedCard = {
          ...localCard,
          history: mergedHistory,
          hops: calculateTrueHops(mergedHistory),
          hop_count: calculateTrueHops(mergedHistory)
        };

        await insertOrReplaceCard(updatedCard);

        // Ping back the fully merged ledger to the initiator
        await sendSyncPingBack(cardId, mergedHistory);

        InteractionManager.runAfterInteractions(async () => {
          const freshCards = await getAllCards();
          setCards(freshCards);
          if (Platform.OS === 'android') {
            ToastAndroid.show("Mesh Sync Received & Merged!", ToastAndroid.SHORT);
          }
        });
      } catch (error) {
        console.error(">> MESH SYNC ERROR (Receiver):", error);
      }
    });

    // This catches both Will's and Neo's Final Seal Events
    const meshSyncCompleteListener = DeviceEventEmitter.addListener('meshSyncComplete', async (data) => {
      const { cardId, mergedHistory, added: passedAdded, title: passedTitle } = data;

      try {
        // Guarantee we have the local card for the Title and exact math
        const localCard = await getCardById(cardId);
        if (!localCard) return;

        const title = passedTitle || localCard.title;

        // If Will's old code fired this, 'added' might be missing. Let's calculate it safely.
        const oldLength = localCard.history ? localCard.history.length : 0;
        const newLength = mergedHistory ? mergedHistory.length : (oldLength + (passedAdded || 0));
        const added = passedAdded !== undefined ? passedAdded : Math.max(0, newLength - oldLength);

        if (added > 0) {
          // 1. Show the Toast message
          if (Platform.OS === 'android') {
            ToastAndroid.show(`Ledger Updated for ${title}!`, ToastAndroid.LONG);
          }
          Vibration.vibrate([0, 100, 50, 100]);

          // 2. Set the transient badge state (+X entries)
          setSyncBadges(prev => ({ ...prev, [cardId]: added }));

          // 3. Clear the badge after 5 seconds
          setTimeout(() => {
            setSyncBadges(prev => {
              const newState = { ...prev };
              delete newState[cardId];
              return newState;
            });
          }, 5000);
        }

        // 4. THE DYNAMIC DEPTH SORT
        // Fetch all cards and sort them by the highest number of ledger entries
        const freshCards = await getAllCards();
        freshCards.sort((a, b) => (b.hops || 0) - (a.hops || 0));

        setCards(freshCards);
      } catch (error) {
        console.error(">> MESH SYNC UI ERROR:", error);
      }
    });

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

    // This catches both the Challenge responses AND the Ledger payloads
    const meshPayloadListener = DeviceEventEmitter.addListener('onMeshPayloadReceived', async (data) => {
      const { payload, remoteDeviceAddress } = data;

      try {
        // ==========================================
        // TRACK A: THE BOUNCER & GATEKEEPER
        // ==========================================
        if (payload.startsWith('ACK:CHALLENGE:')) {
          const parts = payload.split(':');
          const signature = parts[2];
          const publicKey = parts[3];

          // Decode the metadata Neo sent
          const remoteTitle = Buffer.from(parts[4] || '', 'base64').toString('utf8');
          const remoteTopic = Buffer.from(parts[5] || '', 'base64').toString('utf8');
          const remoteCreator = Buffer.from(parts[6] || '', 'base64').toString('utf8');

          const remoteHandle = parts[7]
            ? Buffer.from(parts[7], 'base64').toString('utf8')
            : remoteCreator || "Unknown Operator";

          console.log(`>> IDENTITY: Registering ${remoteHandle} for UI resolution...`);

          await registerPeerIdentity(remoteHandle, publicKey);

          console.log(">> BOUNCER: Checking ID at the door...");
          const isValid = await verifySignature(global.lastSentNonce, signature, publicKey);
          if (!isValid) {
            console.error(">> BOUNCER: Identity Spoof Detected! Killing connection.");
            return;
          }

          console.log(">> BOUNCER: Identity Verified! Checking Card Metadata...");

          // Pull Will's local version of the card
          const localCard = await getCardById(global.pendingSyncCardId);

          // --- THE STRICT MATCH GATEKEEPER ---
          if (localCard.title !== remoteTitle ||
            localCard.classification !== remoteTopic ||
            localCard.creator !== remoteCreator) {

            console.error(">> GATEKEEPER: Divergent Card Metadata. Sync Aborted.");
            console.log(`Local: ${localCard.title} | Remote: ${remoteTitle}`);

            if (Platform.OS === 'android') {
              ToastAndroid.show("Sync Aborted: Metadata mismatch", ToastAndroid.SHORT);
            }
            return; // Burn the bridge.
          }

          console.log(">> GATEKEEPER: Metadata Match 1:1. Compiling Inventory...");

          // Extract Will's current signatures
          const localLedger = localCard.history || [];
          const mySignatures = localLedger.map(entry => entry.signature);

          // Ask Neo for the Delta
          await BluetoothService.requestDelta(remoteDeviceAddress, global.pendingSyncCardId, mySignatures);
          return; // End Track A. Wait for Neo's reply.
        }

        // ==========================================
        // TRACK B: THE ZIPPER (Data Merging)
        // ==========================================
        if (payload.startsWith('ACK:DELTA_PAYLOAD:')) {
          console.log(`>> MESH: Received Delta payload (${payload.length} bytes). Processing zipper...`);

          // This merges the NEW incoming ledger entries with Will's local ledger
          const syncResult = await BluetoothService.processIncomingZipper(payload);

          if (syncResult.success) {
            console.log(">> MESH: Zipper successful! Sending return ping to finalize...");

            await BluetoothService.sendReturnPing(remoteDeviceAddress, syncResult.finalLedger);

            const freshCards = await getAllCards();
            setCards(freshCards);

            Vibration.vibrate([0, 100, 50, 100]);
            if (Platform.OS === 'android') {
              ToastAndroid.show("Mesh Sync Complete!", ToastAndroid.SHORT);
            }
          }
          return; // End Track B. Sync complete.
        }
      } catch (error) {
        console.error(">> MESH: Payload processing failed", error);
      }
    });

    // ==========================================
    // VECTOR 3: THE TETHERED WEB CONSOLE INTERCEPTOR
    // ==========================================
    const webSubmitListener = DeviceEventEmitter.addListener('umpireWebCardReceived', async (payload) => {
      try {
        const currentProfile = await loadProfile();
        const { publicKey } = await getOrGenerateKeys();
        const authorHandle = currentProfile?.handle || 'Umpire';

        // 1. Physically construct the JAWW Card State
        const newCard = await createCard(
          publicKey,
          payload.title,
          payload.body,
          payload.topic || 'General',
          payload.subject || payload.title,
          authorHandle,
          'CREATE'
        );

        // 2. Map to Umpire Event History if active
        const activeEventId = await AsyncStorage.getItem('@jaww_active_event_id');
        if (activeEventId) newCard.event_id = activeEventId;

        // 3. Lock it into the Local SQL Database
        await insertOrReplaceCard(newCard);
        const freshCards = await getAllCards();
        setCards(freshCards);

        // 4. Command the Hardware Radio to Broadcast the asset
        setAdvertisedCard(newCard);
        const broadcastSubject = payload.title || 'Intel';
        await BluetoothService.startAdvertising(broadcastSubject.substring(0, 10), true);
        setSourceState('BROADCASTING');

        console.log(">> WEB CONSOLE: Desktop Intel accepted! JAWW Beacon Active.");
        if (Platform.OS === 'android') {
          ToastAndroid.show("Web Command Received. Radar Active.", ToastAndroid.SHORT);
        }
      } catch (error) {
        console.error(">> WEB CONSOLE ERROR:", error);
      }
    });

    return () => {
      statsListener.remove();
      umpireDataListener.remove();
      syncPingListener.remove();
      meshSyncReceivedListener.remove();
      meshSyncCompleteListener.remove();
      successListener.remove();
      pendingListener.remove();
      transferCompleteListener.remove();
      meshPayloadListener.remove();
      webSubmitListener.remove();
    };
  }, []);

  useEffect(() => {
    const validationListener = DeviceEventEmitter.addListener('validateTransfer', async ({ header, onValidationComplete }) => {
      try {
        const localCard = await getCardById(header.id);
        let isRedundant = false;

        if (localCard) {
          // Recalculate the local state key
          const localLedgerHash = generateLedgerHash(localCard.history);

          // THE ULTIMATE REDUNDANCY CHECK:
          // If the content is the same AND the history triad math is the same, it's a duplicate.
          if (localCard.hash === header.contentHash && localLedgerHash === header.ledgerHash) {
            console.log(">> VALIDATION: State Keys match perfectly. Marking Redundant.");
            isRedundant = true;
          } else {
            console.log(">> VALIDATION: Card is new or updated. Sending ACK.");
          }
        } else {
          console.log(`>> DB: No card found for ID [${header.id}]. Accepting new card.`);
        }

        onValidationComplete(isRedundant);
      } catch (e) {
        console.error(">> VALIDATION ERROR:", e);
        onValidationComplete(false); // Default to accepting if check fails
      }
    });

    const abortListener = DeviceEventEmitter.addListener('transferAborted', ({ reason }) => {
      Alert.alert("Transfer Cancelled", reason);
    });

    return () => {
      validationListener.remove();
      abortListener.remove();
    };
  }, []);

  useEffect(() => {
    if (isUmpireMode && gamePhase === 'STRETCH') {
      BluetoothService.startAdvertising(null, true, eventStartTime);
    } else if (!isUmpireMode) {
      // Revert to normal broadcasting if umpire mode is turned off
      if (sourceState === 'BROADCASTING') {
        BluetoothService.startAdvertising();
      }
    }
  }, [isUmpireMode, gamePhase, eventStartTime]);

  const handleTransferCompletion = async ({ cardId, recipientHandle, recipientPublicKey, timestamp, eventName, isUmpire }) => {
    try {
      const isoTimestamp = new Date(parseInt(timestamp, 10)).toISOString();

      // 1. DYNAMIC IDENTITY LOADING
      const { publicKey: trueSenderKey } = await getOrGenerateKeys();
      const currentProfile = await loadProfile();
      const trueSenderHandle = currentProfile?.handle || 'Unknown Sender';

      // 2. RESOLVE THE UMPIRE'S TRUE PUBLIC KEY
      let finalRecipientKey = recipientPublicKey;
      if (isUmpire && recipientPublicKey === 'UMPIRE_MODE') {
        try {
          // Look up Neo's actual cryptographic key from when you scanned into the event
          const dbKeys = await runQuery(`SELECT publicKey FROM trusted_sources WHERE handle = ?`, [recipientHandle]);
          if (dbKeys && dbKeys.length > 0) {
            finalRecipientKey = dbKeys[0].publicKey;
          } else {
            console.warn(`>> SECURITY: Host ${recipientHandle} not found in trusted sources.`);
            finalRecipientKey = `UNVERIFIED_HOST_${recipientHandle}`;
          }
        } catch (e) {
          console.error(">> SECURITY: Failed to resolve Umpire key.", e);
        }
      }

      if (!trueSenderKey || !finalRecipientKey) return;

      // 3. SQL TELEMETRY (Raw Transfer Record)
      await insertTransferRecord({
        cardId,
        recipientHandle,
        recipientPublicKey: finalRecipientKey,
        timestamp: isoTimestamp,
        senderHandle: trueSenderHandle,
        senderPublicKey: trueSenderKey
      });

      // 4. THE CRYPTOGRAPHIC LEDGER ENGINE
      const card = await getCardById(cardId);
      if (card) {
        const safeHistory = Array.isArray(card.history) ? card.history : [];

        // SPAM FILTER (Now takes Action into account for rigorous Deduplication of Syncs)
        let entryAction = 'SHARED';
        if (isUmpire) {
          entryAction = 'SUBMITTED';
        } else if (card.topic && card.topic.includes('question')) {
          entryAction = 'ASKED_MESH';
        } else if (card.topic && card.topic.includes('answer')) {
          entryAction = 'RESPONDED_MESH';
        }

        // PRE-FLIGHT RECEIPT CHECK (Sender Side)
        // Check if we have EVER sent this card to this specific user in the past.
        const alreadyExists = safeHistory.some(
          entry => entry.to === finalRecipientKey && entry.from === trueSenderKey && entry.action === entryAction
        );

        if (!alreadyExists) {
          const lastSignedEntry = [...safeHistory].reverse().find(e => e.signature);
          const previousSignature = lastSignedEntry ? lastSignedEntry.signature : card.genesis.signature;
          const messageToSign = previousSignature + finalRecipientKey;
          const newSignature = await signData(messageToSign);

          // 👇 THE PERFECT LEDGER ENTRY 👇
          const universalEntry = buildLedgerEntry({
            action: entryAction,
            fromKey: trueSenderKey,
            toKey: finalRecipientKey,
            senderHandle: trueSenderHandle,
            recipientHandle: recipientHandle,
            signature: newSignature,
            timestamp: isoTimestamp
          });

          // If Umpire Mode, tag the event name (e.g., "Workouts")
          if (isUmpire && eventName) {
            universalEntry.event = eventName;
            universalEntry.umpire = recipientHandle;
          }

          const newHistory = [...safeHistory, universalEntry];
          const calculatedHops = calculateTrueHops(newHistory);

          const syncedCard = {
            ...card,
            history: newHistory,
            hops: calculatedHops,
            hop_count: calculatedHops
          };

          await insertOrReplaceCard(syncedCard);

          console.log(`>> DB: Ledger sealed for ${recipientHandle}. Total Hops: ${calculatedHops}`);
          
          // --- PHASE 1 PLUMBING: TRIGGER JITTER SYNC ---
          triggerJitterSync(syncedCard);
        }
      }

      // 5. THE CRASH BARRICADE & FOREGROUND UI UPDATE
      if (isUmpire) {
        console.log(">> UI: Background Sync complete. Debouncing UI re-render to prevent Bluetooth crash...");
        // Debounce the heavy UI state update so it doesn't collide with the aggressive GATT loop
        InteractionManager.runAfterInteractions(async () => {
          try {
            const freshCards = await getAllCards();
            setCards(freshCards);

            if (cardId === selectedCard?.id) {
              const updatedCard = freshCards.find(c => c.id === cardId);
              if (updatedCard) setSelectedCard(updatedCard);
            }
          } catch (e) { /* ignore */ }
        });
        return;
      }

      InteractionManager.runAfterInteractions(async () => {
        try {
          const freshCards = await getAllCards();
          setCards(freshCards);

          if (Platform.OS === 'android') {
            Vibration.vibrate([0, 10, 50, 150]);
            ToastAndroid.show("INTEL SYNCED: Influence recorded in the Mesh.", ToastAndroid.LONG);
          }
        } catch (e) { }
      });
    } catch (error) {
      console.error(">> FATAL TRANSFER ERROR:", error);
    }
  };

  // --- PHASE 4: GATT STORM SIMULATOR ---
  const runGattStressTest = async () => {
    console.log(">> SIMULATION: Initiating Asynchronous GATT Storm...");
    for (let i = 0; i < 50; i++) {
        // Delay 20ms between packets (simulating ~50 packets per second)
        await new Promise(resolve => setTimeout(resolve, 20)); 
        
        // Simulate receiving 50 concurrent "Zero-Click" Sync Pings
        DeviceEventEmitter.emit('onDeviceRequest', `REQ:SYNC_PING:TEST_CARD_${i}:SIMULATED_USER_${i}:ALL`);
        
        // Simulate receiving 50 concurrent Handshake Challenges
        DeviceEventEmitter.emit('onDeviceRequest', `REQ:CHALLENGE:TEST_CARD_${i}:SIMULATED_USER_${i}:1234NONCE5678`);
    }
    console.log(">> SIMULATION: Storm Complete.");
    Alert.alert("Storm Complete", "100 asynchronous fake GATT packets injected. Check console logs.");
  };

  const handleToggleRadar = () => {
    setViewMode(prev => prev === 'radar' ? 'wheel' : 'radar');
  };

  // --- PHASE 5: ROSETTA RECEIPT ENGINE ---
  const handleRosettaScan = async (receipt) => {
    setIsRosettaVisible(false);
    
    if (receipt && receipt.items && receipt.items.length > 0) {
      // Process the first item as a proof of concept for the stress test
      const firstItem = receipt.items[0];
      
      Alert.alert(
        "Receipt OCR Data Acquired",
        `Parsed line item:\nStore: ${receipt.store}\nItem: "${firstItem.rawText}"\nPrice: $${firstItem.price}`,
        [
          { text: "Dismiss", style: "cancel" },
          { 
            text: "Map to 'Walnuts' (Master Card)", 
            onPress: () => {
              // 1. Create the ROSETTA_MAP Translation Card
              const translationCard = {
                title: `Rosetta: ${receipt.store} -> ${firstItem.rawText}`,
                topic: 'human/general',
                subject: `ROSETTA_MAP:${receipt.store.toUpperCase()}:${firstItem.rawText.toUpperCase()}`,
                body: "Walnuts" // Points to the Master Card ID/Title
              };
              handleCreateCard(translationCard);

              // 2. Create the PURCHASE Card for the Fridge / Mesh Economy
              setTimeout(() => {
                const purchaseCard = {
                  title: `Purchase: Walnuts`,
                  topic: 'human/finance',
                  subject: `PURCHASE:WALNUTS`,
                  body: JSON.stringify({
                    store: receipt.store,
                    rawText: firstItem.rawText,
                    price: firstItem.price,
                    quantity: firstItem.quantity,
                    date: receipt.date
                  })
                };
                handleCreateCard(purchaseCard);
                
                Alert.alert("Rosetta Pipeline Complete", `Created Translation and Purchase records. These are now broadcasting via the mesh! Check your FRIDGE tab.`);
              }, 1000); // 1-second delay to ensure nonce generation doesn't collide
            }
          }
        ]
      );
    }
  };

  const handleAddToGroceryList = (card) => {
    setGroceryList(prev => [...prev, card]);
    Alert.alert("Added to Grocery List", `${card.title} has been added to your Oracle Grocery List.`);
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

        await initDB();

        const permStatus = await requestPermissions();
        setHasPermissions(permStatus);

        if (!permStatus) {
          setIsLoading(false);
          return;
        }

        startServer();

        // 1. Get cryptographic keys first as the root of identity.
        const keys = await getOrGenerateKeys();

        // 2. Load the user's saved profile data (handle, etc.).
        const savedProfile = await loadProfile();

        // 3. Atomically combine the absolute truth (current keys) with saved data.
        const completeProfile = {
          ...savedProfile,
          publicKey: keys?.publicKey
        };

        // 4. Set the final, hydrated profile state in a single, atomic update.
        setProfile(completeProfile);

        // 5. Inform services that need the handle.
        if (completeProfile.handle) {
          BluetoothService.setHandle(completeProfile.handle);

          // 👇 TURN THE KEY HERE 👇
          BluetoothService.startAutomatedGenesisHunt(completeProfile.handle);
        } else {
          console.log(">> NO PROFILE FOUND. Onboarding required.");
        }

        // --- PHASE 3: STATE RECOVERY (RESUME) ---
        const savedEventStateStr = await AsyncStorage.getItem('@jaww_active_event_state');
        const savedUmpireMode = await AsyncStorage.getItem('@jaww_is_umpire_mode');

        if (savedEventStateStr) {
            console.log(">> BOOT RECOVERY: Active Mission detected. Restoring UI state...");
            try {
                const parsedState = JSON.parse(savedEventStateStr);
                setActiveUmpireEvent(parsedState);
                setIsOracleVisible(true); // Forces the dashboard to open

                if (savedUmpireMode === 'true') {
                    setIsUmpireMode(true);
                    setGamePhase('STRETCH'); // Resumes Umpire broadcast behaviors
                    console.log(">> BOOT RECOVERY: Host Privileges Restored.");
                }
            } catch (e) {
                console.error(">> BOOT RECOVERY FAILED:", e);
            }
        }

        // --- Load cards and other resources ---
        const existingCards = await getAllCards();
        const fullStack = [...INITIAL_SEEDS, ...MASTER_LIBRARY, ...funLibrary];
        if (existingCards.length < fullStack.length) { // Force re-inject if new seeds are added
          console.log(">> BOOT: Missing cards detected. Re-injecting Civilization Stack...");

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
          console.log(`>> BOOT: Loaded ${existingCards.length} cards from SQLite. Commencing Integrity Audit...`);
          
          let validCards = [];
          for (const card of existingCards) {
            // PHASE 2: LEDGER INTEGRITY VERIFICATION
            
            // 1. Verify Cryptographic Signatures
            const isCryptoValid = verifyChain(card);
            let isDagValid = true;

            // 2. Verify DAG Parent Integrity
            if (card.parent_id && card.parent_hash) {
              const parentCard = await getCardById(card.parent_id);
              if (parentCard && parentCard.hash !== card.parent_hash) {
                console.error(`>> SECURITY: DAG Hash mismatch! Parent hash was altered. Card ${card.id} is invalid.`);
                isDagValid = false;
              }
              // Note: If parentCard is missing, we consider it an "Orphan" but not explicitly corrupted.
              // It is allowed to exist in a mesh system pending parent arrival.
            }

            if (isCryptoValid && isDagValid) {
              validCards.push(card);
            } else {
              console.error(`>> BOOT SECURITY ALERT: Invalid ledger found for Card ${card.id}. Quarantining...`);
              await quarantineCard(card);
            }
          }
          
          console.log(`>> BOOT: Integrity Audit Complete. ${validCards.length}/${existingCards.length} passed.`);
          setCards(validCards);
        }

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

    // 👇 KILL THE ENGINE ON APP CLOSE 👇
    return () => {
      BluetoothService.stopAutomatedGenesisHunt();
    };
  }, []);

  // --- AUTOMATED HUNT YIELD MONITOR ---
  useEffect(() => {
    const isManualOperationActive =
      isScannerVisible ||
      isOracleVisible ||
      isCreateVisible ||
      isUmpireEventModalVisible ||
      isHostQRVisible ||
      isSyncScreenVisible ||
      isBrowseVisible ||
      isLoading || // 👈 This keeps the brakes on while the "Connecting..." spinner is up
      !!activePeer ||
      !!pendingRequest;

    if (isManualOperationActive) {
      BluetoothService.pauseAutomatedHunt();
    } else {
      // Add a small delay so the radio can "settle" before resuming the hunt
      setTimeout(() => {
        BluetoothService.resumeAutomatedHunt();
      }, 2000);
    }
  }, [
    isScannerVisible, isOracleVisible, isCreateVisible,
    isUmpireEventModalVisible, isHostQRVisible, isSyncScreenVisible,
    isBrowseVisible, isLoading, activePeer, pendingRequest
  ]);

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

  useEffect(() => {
    let statsInterval;

    const setupParticipantSync = async () => {
      const activeEventId = await AsyncStorage.getItem('@jaww_active_event_id');
      if (!activeEventId) return;

      const event = await runQuery('SELECT * FROM events WHERE id = ?', [activeEventId]);
      const isUmpire = event.length > 0 && event[0].is_umpire === 1;

      if (!isUmpire) {
        // We are a participant
        /* statsInterval = setInterval(async () => {
            const eventStartTime = await AsyncStorage.getItem('@jaww_event_start');
            const parts = activeEventId.split(':');
            const hostHandle = parts[1];

            // Find umpire in nearby devices
            const umpireDevice = nearbyDevices.find(d => d.name === hostHandle);

            if (umpireDevice) {
                console.log(`>> PARTICIPANT: Sending stats to umpire ${hostHandle}`);
                const stats = await getOperatorStats(profile.handle, eventStartTime);
                BluetoothService.transferStats(umpireDevice.id, { ...stats, handle: profile.handle });
            } else {
                console.log(">> PARTICIPANT: Umpire not found in nearby devices.");
            }
        }, 300000); // 5 minutes
        */
      }
    };

    if (isDbReady) {
      setupParticipantSync();
    }

    return () => {
      if (statsInterval) {
        clearInterval(statsInterval);
      }
    };
  }, [isDbReady, profile.handle, nearbyDevices]);

  // --- LISTEN WHILE BROADCASTING ---
  useEffect(() => {
    if (targetPeripheralId) {
      BluetoothService.startScanning(handleDeviceFound);
      return () => BluetoothService.stopScanning();
    }

    if (viewMode === 'radar' || viewMode === 'broadcast' || activeUmpireEvent) {
      if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);
      BluetoothService.startScanning(handleDeviceFound);
      updateIntervalRef.current = setInterval(processDeviceBuffer, 1000);

      return () => {
        BluetoothService.stopScanning();
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
          updateIntervalRef.current = null;
        }
        processDeviceBuffer();
      };
    } else {
      BluetoothService.stopScanning();
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      return undefined;
    }
  }, [viewMode, targetPeripheralId, handleDeviceFound, processDeviceBuffer, activeUmpireEvent]);


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

  const processDeviceBuffer = useCallback(() => {
    if (deviceBufferRef.current.size === 0) return;

    const newDevices = new Map(deviceBufferRef.current);
    deviceBufferRef.current.clear();

    setNearbyDevices(currentDevices => {
      const updatedDevices = new Map(currentDevices.map(d => [d.id, d]));

      newDevices.forEach(device => {
        const existing = updatedDevices.get(device.id);
        const catMap = { 1: 'food', 2: 'education', 3: 'fitness', 4: 'professional', 5: 'fun', 0: 'general' };
        const topicSlug = catMap[device.category] || 'general';

        updatedDevices.set(device.id, {
          ...device,
          lastSeen: Date.now(),
          position: existing ? existing.position : { x: 20 + Math.random() * 60, y: 20 + Math.random() * 60 },
          offer: { topic: `human/${topicSlug}`, title: device.subject ? `[ ${device.subject.toUpperCase()} ]` : 'Signal Detected' },
        });
      });

      return Array.from(updatedDevices.values());
    });
  }, []);

  const handleDeviceFound = useCallback(async (device) => {
    if (!device || !device.id) return;

    // 1. LOG UMPIRE MAC FOR MANUAL OVERRIDE
    if (device.isUmpire) setLastSeenUmpireId(device.id);

    // 2. IDENTITY CHECK (Using Synchronous Lock)
    if (device.isUmpire && !umpireSyncLockRef.current.has(device.id)) {

      const fullHostHandle = activeUmpireEvent?.id?.split(':')[1];

      // 3. THE GATEKEEPER
      const isHandleMatch = activeUmpireEvent && device.subject && device.name && fullHostHandle &&
        fullHostHandle.startsWith(device.name);
      const isSubjectMatch = activeUmpireEvent && device.subject && activeUmpireEvent.subject.startsWith(device.subject);

      // --- DIAGNOSTIC LOGS ---
      console.log(`[JITTER SYNC DIAGNOSTICS] Radar evaluating incoming beacon...`);
      console.log(`  - Umpire Beacon: ${device.isUmpire}`);
      console.log(`  - Sync Lock Free: ${!umpireSyncLockRef.current.has(device.id)}`);
      console.log(`  - Mission Active: ${!!activeUmpireEvent}`);
      console.log(`  - Beacon Has Subject: ${!!device.subject}`);
      console.log(`  - Beacon Has Handle: ${!!device.name}`);
      console.log(`  - Host Handle Valid: ${!!fullHostHandle}`);
      console.log(`  - Handle Match: ${isHandleMatch} (Host: ${fullHostHandle}, Beacon: ${device.name})`);
      console.log(`  - Subject Match: ${isSubjectMatch} (Mission: ${activeUmpireEvent?.subject}, Beacon: ${device.subject})`);

      if (isHandleMatch && isSubjectMatch) {

        // ---> THE TITANIUM LOCK: Instantly block the next radar ping <---
        umpireSyncLockRef.current.add(device.id);

        console.log(`[JITTER SYNC] Gatekeeper Approved. Checking Queue...`);

        getPendingUmpireSyncs(activeUmpireEvent.subject).then(pendingCardIds => {
          if (pendingCardIds && pendingCardIds.length > 0) {

            const jitterDelay = Math.floor(Math.random() * (8000 - 2000 + 1) + 2000);
            console.log(`[JITTER SYNC] Target locked. Deploying 1 transfer thread in ${jitterDelay}ms...`);

            setTimeout(async () => {
              try {
                const upgradedCards = [];
                const isoTimestamp = new Date().toISOString();
                const keys = await getOrGenerateKeys();

                for (const id of pendingCardIds) {
                  const cardData = await getCardById(id);
                  if (!cardData) continue;

                  // UMPIRE ESCROW WRITE-BEFORE-SEND
                  const safeHistory = Array.isArray(cardData.history) ? cardData.history : [];
                  let lastSignedEntry = [...safeHistory].reverse().find(e => e.signature);
                  let previousSignature = lastSignedEntry ? lastSignedEntry.signature : cardData.genesis?.signature;

                  const targetPublicKey = activeUmpireEvent?.umpirePublicKey || `UNVERIFIED_HOST_${activeUmpireEvent?.umpireHandle || 'Unknown'}`;
                  const messageToSign = previousSignature + targetPublicKey;
                  const newSignature = await signData(messageToSign);

                  const universalEntry = buildLedgerEntry({
                    action: 'SUBMITTED',
                    fromKey: keys.publicKey,
                    toKey: targetPublicKey,
                    senderHandle: profile.handle || "Unknown",
                    recipientHandle: activeUmpireEvent?.umpireHandle || "Umpire",
                    signature: newSignature,
                    timestamp: isoTimestamp,
                    event: activeUmpireEvent?.subject || "Mission"
                  });

                  const finalHistory = [...safeHistory, universalEntry];
                  const calculatedHops = calculateTrueHops(finalHistory);

                  const finalizedCard = {
                    ...cardData,
                    history: finalHistory,
                    hops: calculatedHops,
                    hop_count: calculatedHops
                  };

                  await insertOrReplaceCard(finalizedCard);
                  upgradedCards.push(finalizedCard);
                }

                if (upgradedCards.length > 0) {
                  const result = await BluetoothService.sendUmpirePayload(
                    device.id,
                    upgradedCards,
                    profile.handle,
                    activeUmpireEvent?.umpireHandle || 'Umpire',
                    activeUmpireEvent?.subject
                  );

                  if (result && result.success) {
                    await markUmpireQueueAsSynced(pendingCardIds);
                    console.log(`[JITTER SYNC] Transmission complete. Queue crossed off.`);
                    setShowSyncFlare(true);
                    setTimeout(() => setShowSyncFlare(false), 3000);
                  }
                }
              } catch (error) {
                console.error("[JITTER SYNC] Transfer Failed:", error);
              } finally {
                // ---> UNLOCK: Safe to scan again <---
                umpireSyncLockRef.current.delete(device.id);
              }
            }, jitterDelay);
          } else {
            console.log("[JITTER SYNC] Queue is empty. Releasing lock.");
            // No cards to send, release the lock
            umpireSyncLockRef.current.delete(device.id);
          }
        }).catch(err => {
          console.error("[JITTER SYNC] Queue check failed:", err);
          umpireSyncLockRef.current.delete(device.id);
        });
      }
    }

    if (targetPeripheralId && device.id === targetPeripheralId) {
      setTargetPeripheralId(null);
      BluetoothService.stopScanning();
      return;
    }

    deviceBufferRef.current.set(device.id, device);
  }, [profile.handle, activeUmpireEvent, targetPeripheralId]);

  const toggleBroadcast = async () => {
    if (sourceState === 'BROADCASTING') {
      await BluetoothService.stopBroadcasting();
      setSourceState('IDLE');
      setIsSyncScreenVisible(false); // <--- Safety catch to hide modal
      if (viewMode === 'broadcast') setViewMode('wheel');
    } else {
      try {
        await BluetoothService.startAdvertising(); // Uses default categories
        setSourceState('BROADCASTING');
        Vibration.vibrate(100);

        setIsSyncScreenVisible(true); // <--- BOOM! Trigger the Lore Screen

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

  // --- NEW: EVENT CARD HANDLER ---
  const handleOpenEventCard = () => {
    if (activeUmpireEvent && activeUmpireEvent.subject) {
      // Pre-fill the modal with the Umpire's exact subject string
      setCreateInitialData({ subject: activeUmpireEvent.subject });
      setIsCreateVisible(true);
    }
  };

  const handleCreateCard = async (c) => {
    try {
      // 1. Prepare the topic path
      const topicPath = `human/${c.topic || 'general'}`;

      // 2. Generate and SIGN the card (Wait for this to complete!)
      const signedCard = await createCard(
        profile.publicKey,
        c.title,
        c.body,
        topicPath,
        c.subject,
        profile.handle
      );

      // 3. Apply the Event Stamp if we are in a mission
      const activeEventId = await AsyncStorage.getItem('@jaww_active_event_id');
      if (activeEventId) {
        signedCard.event_id = activeEventId;
      }

      // 4. Save the fully formed card to SQLite
      await insertOrReplaceCard(signedCard);

      // --- PHASE 1 PLUMBING: TRIGGER JITTER SYNC ---
      triggerJitterSync(signedCard);

      // 5. THE FIX: Only queue for Umpire once we are 100% sure we have signedCard.id
      if (activeUmpireEvent && activeUmpireEvent.subject && signedCard.id) {
        await queueCardForUmpire(signedCard.id, activeUmpireEvent.subject);
        console.log(`>> QUEUED: ${signedCard.title} for Umpire Sync.`);
      }

      // 6. Refresh UI
      const freshCards = await getAllCards();
      setCards(freshCards);
      setVaultCards(freshCards);
      setIsCreateVisible(false);
      setRefreshTrigger(t => t + 1);

    } catch (error) {
      console.error(">> CREATE ERROR:", error);
      Alert.alert("Error", `Failed to save intel: ${error.message}`);
    }
  };

  // --- OFFER HANDLER (Triggered from Card Detail) ---
  const handleOfferCard = async (card) => {
    // THE IRON GATE: Is Military Environment Active?
    if (typeof IS_MILITARY !== 'undefined' && IS_MILITARY) {
      console.log(">> EMCON: Rerouting data to Zero-Emission Optical Transfer array.");
      setAirGapPayload(card);
      return;
    }

    console.log("\n=======================================");
    console.log(">> DEBUG 1 (UI): handleOfferCard Triggered");
    console.log(">> DEBUG 1 (UI): Card Title:", card.title);
    console.log(">> DEBUG 1 (UI): Card Subject:", card.subject);
    console.log(">> DEBUG 1 (UI): Card Topic:", card.topic);

    setAdvertisedCard(card);

    const subjectToBroadcast = card.subject || card.topic || 'Intel';
    console.log(">> DEBUG 1 (UI): Fallback Subject determined as:", subjectToBroadcast);
    console.log("=======================================\n");

    await BluetoothService.startAdvertising(subjectToBroadcast);
  };

  const processAndSaveIncomingCard = async (incomingCard, senderHandle, timestamp) => {
    // --- THE LEAN CHAIN VERIFICATION ---
    if (!verifyChain(incomingCard)) {
      console.error(">> SECURITY ALERT: Incoming card failed chain verification. Aborting.");
      Alert.alert("Transfer Failed", "The received intel appears to be corrupted or tampered with. The transfer has been rejected.");
      return;
    }

    // 1. THE SHIELD: Validate incoming payload integrity
    if (!incomingCard || !incomingCard.id || !Array.isArray(incomingCard.history) || incomingCard.history.length === 0) {
      Alert.alert("Transfer Corrupted", "Received card with invalid or missing history. Aborting.");
      return;
    }

    // Gatekeeper: Ensure all parties have public keys before proceeding.
    if (!profile.publicKey || !incomingCard.senderPublicKey) {
      console.error(">> SECURITY ALERT: Missing public key in incoming card. Aborting save.");
      Alert.alert("Transfer Failed", "Missing security credentials from sender or receiver.");
      return;
    }

    try {
      const localCard = await getCardById(incomingCard.id);
      let cardToSave = null;
      let alertMessage = "";

      if (localCard) {
        // --- HASH MISMATCH: VARIANT DETECTION ---
        // If hashes don't match, it's a Fork or Review. Treat as a new 'Variant' node.
        if (incomingCard.hash !== localCard.hash) {
          // 1. The Lineage Stamp: Record the parent before creating a new ID.
          incomingCard.parent_id = localCard.id;
          incomingCard.parent_hash = localCard.hash;

          // 2. The Variant Split (New ID): Create a new ID to prevent overwriting the original.
          incomingCard.id = `${localCard.id}_variant_${incomingCard.hash.substring(0, 6)}`;
          incomingCard.title = `↳ [VARIANT] ${localCard.title}`;

          let entryAction = 'SHARED';
          if (incomingCard.topic && incomingCard.topic.includes('question')) {
            entryAction = 'ASKED_MESH';
          } else if (incomingCard.topic && incomingCard.topic.includes('answer')) {
            entryAction = 'RESPONDED_MESH';
          }

          // 3. Route to New Entry Logic: Process this variant as a brand-new card.
          // 🚨 As per protocol, we DO NOT generate local history. We accept the cryptographically signed history exactly as it is.
          const finalHistory = incomingCard.history || [];

          cardToSave = {
            ...incomingCard,
            history: finalHistory,
            hops: calculateTrueHops(finalHistory)
          }; alertMessage = 'Intel Variant Acquired: ' + incomingCard.title;

        } else {
          // --- TRUE ARRAY MERGE (For Concurrent Divergence) ---

          // 1. The True Merge (Deduplication)
          // --- TRUE ARRAY MERGE (For Concurrent Divergence) ---

          // 1. The True Merge (Deduplication) & Chronological Sort
          const mergedHistory = mergeAndSortLedgers(localCard.history, incomingCard.history);

          // 2. The Redundancy Check
          if (mergedHistory.length <= localCard.history.length) {
            Alert.alert("Redundant Intel", "Your ledger is already up-to-date.");
            return;
          }

          // 3. Hop Recalculation (Correct & Idempotent)
          cardToSave = {
            ...localCard,
            history: mergedHistory,
            hops: calculateTrueHops(mergedHistory)
          };
          alertMessage = "Ledger Synced: Concurrent history merged.";
        }
      } else {
        // --- NEW ENTRY LOGIC (Strict Cryptographic Passthrough) ---
        // 🚨 We NO LONGER append unsigned "shadow" blocks.
        // We accept the Sender's cryptographically signed history exactly as it is.

        const finalHistory = incomingCard.history || [];
        const calculatedHops = calculateTrueHops(finalHistory);

        cardToSave = {
          ...incomingCard,
          history: finalHistory,
          hops: calculatedHops,
          hop_count: calculatedHops // Feed both columns to bypass the schema ghost
        };
        alertMessage = `Intel Acquired: "${cardToSave.title}"`;
      }

      if (cardToSave) {
        // Stamp event ID if active
        const activeEventId = await AsyncStorage.getItem('@jaww_active_event_id');
        if (activeEventId) {
          cardToSave.event_id = activeEventId;
        }

        // Save to DB and refresh UI
        await insertOrReplaceCard(cardToSave);

        broadcastGossipSync(cardToSave, profile?.handle);

        // --- UI DEBOUNCE TO PREVENT ANDROID CRASH ---
        console.log(">> UI: Background P2P Sync Debouncing...");
        InteractionManager.runAfterInteractions(async () => {
          try {
            const freshCards = await getAllCards();
            setCards(freshCards);
            if (cardToSave.topic !== 'human/question') {
              // Suppress Android toast if it's a question, because we pop a modal
              if (Platform.OS === 'android') {
                ToastAndroid.show(alertMessage, ToastAndroid.LONG);
              } else {
                Alert.alert("Transfer Complete", alertMessage);
              }
            } else {
              setCardToFork(cardToSave);
            }
          } catch (e) { }
        });
      }

    } catch (error) {
      console.error(">> FATAL: processAndSaveIncomingCard Error:", error);
      Alert.alert("Save Error", "Could not process incoming intel.");
    }
  };

  // --- ENGINE 3: THE GRABBER (Retry Logic + Smart Library) ---
  const handleGrabCard = async (offer, version) => {
    if (isLoading || sourceState === 'CONNECTING') return;

    console.log(">> GRAB REQUESTED:", offer.title || "Unknown Intel");

    const targetId = activePeer?.id || offer.id;

    // Extract the ACTUAL category of the card on the radar, fallback to filter
    let categoryToRequest = 'general';
    if (offer && offer.topic) {
      categoryToRequest = offer.topic.replace('human/', '');
    } else if (radarFilterRef.current) {
      categoryToRequest = radarFilterRef.current;
    }

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
      const peerName = activePeer?.name || "Unknown Source";
      await processAndSaveIncomingCard(result.data.card, peerName, result.data.timestamp);
    } else {
      if (result && result.isRedundant) {
        Alert.alert("Redundant Intel", "Redundant card. Everything is updated.");
      } else if (result && result.error === 'NO_CARDS') {
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
      const questionCard = await createCard(profile.publicKey, `QUESTION: ${query}`, `Seeking answers for: "${query}"`, "human/question", query, profile.handle);
      await insertOrReplaceCard(questionCard);

      const freshCards = await getAllCards();
      setCards(freshCards);

      handleOfferCard(questionCard);

      Alert.alert("Question Broadcast", `Your question is on the mesh.`);
      return true;
    } catch (error) {
      console.error("Ask Error:", error);
      return false;
    }
  }, [profile]);

  const handleAskQuestion = useCallback(async () => {
    if (await broadcastQuestion(searchQuery)) {
      setSearchQuery('');
    }
  }, [searchQuery, broadcastQuestion]);

  const handleForkCard = useCallback(async (originalCard, contextNote) => {
    if (!originalCard || !contextNote || contextNote.trim() === '') {
      Alert.alert("Empty Response", "You cannot broadcast a blank message to the mesh.");
      return;
    }
    try {
      const newCard = await forkCard(originalCard, contextNote, profile);

      // --- THE AMNESIA FIX ---
      const isAnsweringQuestion = originalCard.topic === 'human/question';

      if (isAnsweringQuestion) {
        newCard.topic = 'human/answer'; // Prevents the Asker from being auto-prompted
        let baseTitle = originalCard.title.replace('QUESTION: ', '').trim();
        newCard.title = `RE: ${baseTitle}`;
      }

      // Strictly obey the 20-byte limit for the radio broadcast ("RE: " = 4 chars, leaving 16)
      newCard.subject = `RE: ${originalCard.title.substring(0, 16)}`;

      await insertOrReplaceCard(newCard);

      // --- PHASE 1 PLUMBING: TRIGGER JITTER SYNC ---
      triggerJitterSync(newCard);

      const freshCards = await getAllCards();
      setCards(freshCards);
      setCardToFork(null);

      Alert.alert("Fork Successful", "Your response has been added to the mesh.");

    } catch (error) {
      console.error("Fork Error:", error);
      Alert.alert("Error", `Could not fork the card: ${error.message}`);
    }
  }, [profile]);

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
        timestamp: new Date().toISOString(),
        profile_json: JSON.stringify(sourceData.payload || {})
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
      const { deviceId, card, requester: recipientHandle, requesterPublicKey: recipientKey } = pendingRequest;

      console.log(`>> ESCROW: Pre-signing transfer to ${recipientHandle}...`);

      const myProfile = await loadProfile();
      const keys = await getOrGenerateKeys();
      const isoTimestamp = new Date().toISOString();
      const safeHistory = Array.isArray(card.history) ? card.history : [];

      const lastSignedEntry = [...safeHistory].reverse().find(e => e.signature);
      const previousSignature = lastSignedEntry ? lastSignedEntry.signature : card.genesis?.signature;

      const targetPublicKey = recipientKey || "Unknown";
      const messageToSign = previousSignature + targetPublicKey;
      const newSignature = await signData(messageToSign);

      const universalEntry = buildLedgerEntry({
        action: 'SHARED',
        fromKey: keys.publicKey,
        toKey: targetPublicKey,
        senderHandle: myProfile.handle || "Unknown",
        recipientHandle: recipientHandle || "Unknown",
        signature: newSignature,
        timestamp: isoTimestamp
      });

      // 2. Build the Escrow Card (Stale Card + New Signature)
      const newHistory = [...safeHistory, universalEntry];
      const calculatedHops = calculateTrueHops(newHistory);

      const escrowCard = {
        ...card,
        history: newHistory,
        hops: calculatedHops,
        hop_count: calculatedHops
      };

      // 3. SECURE ESCROW: Write ledger immediately before transmission
      await insertOrReplaceCard(escrowCard);
      console.log(`>> DB: Escrow committed to SQLite for ${recipientHandle}.`);

      const freshCards = await getAllCards();
      setCards(freshCards);

      global.lastSignedPayload = escrowCard;

      // 4. Generate the header hashes based on the NEW ESCROW card
      const ledgerHash = generateLedgerHash(escrowCard.history);

      console.log(`>> HANDSHAKE: Initiating for card ${escrowCard.id} with ledger hash ${ledgerHash}`);

      // 5. Send the ESCROW CARD to the GATT Server
      await initiateHandshake(global.lastSignedPayload, {
        type: 'HEADER',
        id: escrowCard.id,
        contentHash: escrowCard.hash, // contentHash stays the same
        ledgerHash: ledgerHash        // ledgerHash reflects the new hop
      });

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

  const fireMeshFlare = async (flareText) => {
    try {
      const timestamp = new Date().toISOString();
      const { publicKey } = await getOrGenerateKeys();
      const profile = await loadProfile();
      const authorHandle = profile?.handle || 'Unknown_Operator';

      // 1. Create the Card
      const newCard = await createCard(
        publicKey,
        flareText,
        `Flare broadcast at ${timestamp}. Seeking intel on the attached subject.`,
        'human/question',
        flareText,
        authorHandle,
        'QUESTION'
      );

      // 3. Save it to local database
      await insertOrReplaceCard(newCard);

      console.log(`>> FLARE CREATED: ${flareText}`);

      // 4. Set as active broadcast card and start advertising
      setAdvertisedCard(newCard);
      const subjectToBroadcast = newCard.subject || newCard.topic || 'Intel';
      // Truncate subject to a safe length for BLE advertising, consistent with carousel
      await BluetoothService.startAdvertising(subjectToBroadcast.substring(0, 10));

      // 5. Update UI and give feedback
      if (sourceState !== 'BROADCASTING') {
        setSourceState('BROADCASTING');
      }
      const freshCards = await getAllCards();
      setCards(freshCards);
      Vibration.vibrate(200);
      if (Platform.OS === 'android') {
        ToastAndroid.show("Flare broadcast to the mesh.", ToastAndroid.SHORT);
      } else {
        Alert.alert("Flare Fired", "Your question is being broadcast to the mesh.");
      }

    } catch (error) {
      console.error(">> FLARE FAILED:", error);
      Alert.alert("Flare Failed", "Could not broadcast to the mesh.");
    }
  };


  // --- UPDATED: HANDLES THE NEW QR & JSON LOGIC ---
  const handleRealScan = async (dataString) => {
    if (isLoading) return; // Guard against multiple scans
    if (typeof dataString !== 'string') return;
    console.log(">> SCANNER: Data received:", dataString);

    // --- NEW: UMPIRE EVENT CHECK-IN ---
    if (dataString.startsWith('JAWW-UMPIRE:')) {
      const parts = dataString.split(':');

      // Payload format: JAWW-UMPIRE:umpireHandle:subject:startTime:umpirePublicKey
      if (parts.length >= 4) {
        const umpireHandle = parts[1];
        const eventSubject = parts[2];
        const startTime = parts[3];
        const umpirePublicKey = parts[4] || "UnknownKey";
        const eventId = `JAWW-UMPIRE:${umpireHandle}:${startTime}`;

        Alert.alert(
          "Intelligence Event Detected",
          `Umpire: ${umpireHandle}\nMission Focus: ${eventSubject}\n\nDo you want to opt into this sweep?`,
          [
            { text: "Cancel", style: "cancel", onPress: () => setIsScannerVisible(false) },
            {
              text: "Join Event",
              onPress: async () => {
                try {
                  // 1. Set the Active State for the session
                  await AsyncStorage.setItem('@jaww_event_start', startTime);
                  await AsyncStorage.setItem('@jaww_active_event_id', eventId);

                  // 2. Create the permanent Folder in the Oracle Engine
                  await runQuery(
                    `INSERT OR IGNORE INTO events (id, name, timestamp, my_authored_count, my_network_reach) VALUES (?, ?, ?, ?, ?)`,
                    [eventId, `Mission: ${eventSubject}`, parseInt(startTime, 10), 0, 0]
                  );

                  // 3. Set the UI State
                  const participantState = {
                    id: eventId,
                    umpireHandle,
                    umpirePublicKey,
                    subject: eventSubject,
                    startTime
                  };
                  setActiveUmpireEvent(participantState);

                  // --- PHASE 3: STATE SNAPSHOT ---
                  await AsyncStorage.setItem('@jaww_active_event_state', JSON.stringify(participantState));

                  setIsScannerVisible(false);
                  Alert.alert("Opted In", `Your app will now securely queue intel regarding "${eventSubject}".`);
                } catch (e) {
                  console.error(">> EVENT CHECK-IN FAILED:", e);
                  Alert.alert("Check-In Failed", "Could not create the event folder.");
                }
              }
            }
          ]
        );
      } else {
        Alert.alert("Invalid Event QR", "The event QR code is malformed.");
      }
      return; // Halt further scan processing
    }

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
        await processAndSaveIncomingCard(result.data.card, targetHandle, result.data.timestamp);
      } else {
        if (result && result.isRedundant) {
          Alert.alert("Redundant Intel", "Redundant card. Everything is updated.");
        } else if (result && result.error === 'NO_CARDS') {
          Alert.alert("No Intel Found", `The target has no cards in the category.`);
        } else {
          Alert.alert("Connection Failed", result?.error || "Target did not respond.");
        }
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

      if (result.success && result.data) {
        await processAndSaveIncomingCard(result.data.card, targetHandle, result.data.timestamp);
      } else {
        if (result && result.isRedundant) {
          Alert.alert("Redundant Intel", "Redundant card. Everything is updated.");
        } else if (result && result.error === 'NO_CARDS') {
          Alert.alert("No Intel Found", `The target has no cards in the category.`);
        } else {
          Alert.alert("Connection Failed", result?.error || "Target did not respond.");
        }
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
      Alert.alert(
        "Legacy Protocol Detected",
        "This QR code uses the JAWW v1 protocol, which lacks Escrow Signatures. Please ask the sender to generate a new v2 QR code to ensure cryptographic integrity."
      );
      return;
    }
    else {
      Alert.alert("Unknown Data", dataString.substring(0, 50) + "...");
    }
  };

  const [isSyncing, setIsSyncing] = useState(false); // Add this at the top of your App component

  const handleAutoSync = async (cardId) => {
    if (isSyncing) return; // Prevent double-triggering

    try {
      setIsSyncing(true);
      const card = await getCardById(cardId);
      if (!card) {
        setIsSyncing(false);
        return;
      }

      const myProfile = await loadProfile();
      const myHandle = myProfile?.handle || "Unknown";

      const ledgerHandles = card.history
        .flatMap(entry => [entry.author, entry.senderHandle, entry.recipientHandle, entry.user])
        .filter(handle => handle && handle !== myHandle);

      const uniqueTargets = [...new Set(ledgerHandles)];

      if (uniqueTargets.length === 0) {
        if (Platform.OS === 'android') ToastAndroid.show("No other operators in ledger.", ToastAndroid.SHORT);
        setIsSyncing(false);
        return;
      }

      console.log(`>> MESH: Auto-Sync targeting: ${uniqueTargets.join(', ')}`);

      await BluetoothService.startAdvertising().catch(() => { });
      setIsSyncScreenVisible(true);

      await BluetoothService.pingTargetsForSync(card.id, uniqueTargets, myHandle);

      // Reset sync state after a delay or when screen closes
      setTimeout(() => setIsSyncing(false), 5000);

    } catch (error) {
      console.error(">> MESH: Auto-Sync Failed", error);
      setIsSyncing(false);
    }
  };

  const handleOnboardingComplete = useCallback(async (p) => {
    console.log(">> ONBOARDING: Creating Identity for", p.handle);
    try {
      const keys = await getOrGenerateKeys();
      if (!keys) throw new Error("Key Generation Failed");
      const publicProfile = { ...p, publicKey: keys.publicKey };
      await saveProfile(publicProfile);
      setProfile(publicProfile);
      BluetoothService.setHandle(publicProfile.handle);
      Alert.alert("Welcome, Operator", "Identity established.");
    } catch (e) {
      console.error(">> ONBOARDING ERROR:", e);
      Alert.alert("Security Error", "Could not establish Identity.");
    }
  }, []);

  const handleNewUmpireOperation = async () => {
    const startTime = Date.now();
    const eventId = `JAWW-EVENT:${profile.handle}:${startTime}`;
    const eventName = `Hosted Assembly @ ${new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    try {
      // 1. Set active state for the session
      await AsyncStorage.setItem('@jaww_active_event_id', eventId);

      // 2. Create the permanent Folder in the Oracle Engine, flagging it as an Umpire event
      await runQuery(
        `INSERT OR IGNORE INTO events (id, name, timestamp, is_umpire) VALUES (?, ?, ?, ?)`,
        [eventId, eventName, Math.floor(startTime / 1000), 1]
      );

      // 3. Update state to trigger the QR modal (which will be built in Phase 2)
      setActiveUmpireEvent({ id: eventId, name: eventName });

      // We can also close the profile modal if it's open
      setIsProfileVisible(false);
      setIsUmpireEventModalVisible(true);

    } catch (e) {
      console.error(">> UMPIRE EVENT CREATION FAILED:", e);
      Alert.alert("Error", "Could not create umpire event folder.");
    }
  };

  const handleEndUmpireEvent = () => {
    handleEndEvent();
    setIsUmpireEventModalVisible(false);
  };

  const handleBeginUmpireBroadcast = async (modalSubject) => {
    setIsUmpireEventModalVisible(false);

    // 1. Update the Host's active state to remember its own mission
    const finalEventState = { ...activeUmpireEvent, subject: modalSubject };
    setActiveUmpireEvent(finalEventState);
    
    // --- PHASE 3: STATE SNAPSHOT ---
    await AsyncStorage.setItem('@jaww_active_event_state', JSON.stringify(finalEventState));
    await AsyncStorage.setItem('@jaww_is_umpire_mode', 'true');

    // 2. Blast the exact subject passed from the Modal UI
    BluetoothService.startAdvertising(modalSubject, true, activeUmpireEvent.id.split(':')[2]);
  };

  // --- NEW: LEAVE EVENT LOGIC ---
  const handleLeaveEvent = async () => {
    const subject = activeUmpireEvent?.subject || 'Mission';

    // 1. Clear the active event state
    setActiveUmpireEvent(null);
    setLastSeenUmpireId(null);
    
    // --- PHASE 3 TEARDOWN ---
    await AsyncStorage.removeItem('@jaww_active_event_state');
    await AsyncStorage.removeItem('@jaww_is_umpire_mode');

    // 2. Trigger the 10-second fade-out message
    setEventOverMessage(`JAWW EVENT: ${subject.toUpperCase()} is over! Check the Oracle folder for the event cards!`);
    setTimeout(() => {
      setEventOverMessage(null);
    }, 10000); // 10 seconds
  };

  // --- NEW: MANUAL SUBMIT OVERRIDE ---
  const manualUmpireSubmit = async (card) => {
    if (!lastSeenUmpireId) {
      Alert.alert("Radar Searching...", "Scanning for the Host's signal. Please ensure their broadcast is active, wait a few seconds, and try again.");
      return;
    }
    try {
      if (Platform.OS === 'android') ToastAndroid.show("Initiating manual transfer...", ToastAndroid.SHORT);

      // --- 1. WRITE-BEFORE-SEND ESCROW LOGIC ---
      const keys = await getOrGenerateKeys();
      const isoTimestamp = new Date().toISOString();
      const safeHistory = Array.isArray(card.history) ? card.history : [];

      // Find the last valid signature to chain off of
      let lastSignedEntry = [...safeHistory].reverse().find(e => e.signature);
      let previousSignature = lastSignedEntry ? lastSignedEntry.signature : card.genesis?.signature;

      const targetPublicKey = activeUmpireEvent?.umpirePublicKey || `UNVERIFIED_HOST_${activeUmpireEvent?.umpireHandle || 'Unknown'}`;

      // Cryptographically bind the history to the new recipient
      const messageToSign = previousSignature + targetPublicKey;
      const newSignature = await signData(messageToSign);

      const universalEntry = buildLedgerEntry({
        action: 'SUBMITTED',
        fromKey: keys.publicKey,
        toKey: targetPublicKey,
        senderHandle: profile.handle || "Unknown",
        recipientHandle: activeUmpireEvent?.umpireHandle || "Umpire",
        signature: newSignature,
        timestamp: isoTimestamp,
        event: activeUmpireEvent?.subject || "Mission"
      });

      const finalHistory = [...safeHistory, universalEntry];
      const calculatedHops = calculateTrueHops(finalHistory);

      const finalizedCard = {
        ...card,
        history: finalHistory,
        hops: calculatedHops,
        hop_count: calculatedHops // Satisfy SQLite bindings
      };

      // 🔒 LOCK STATE TO LOCAL DB BEFORE TRANSMITTING
      await insertOrReplaceCard(finalizedCard);

      // --- 2. TRANSMIT THE SEALED PAYLOAD ---
      const result = await BluetoothService.sendUmpirePayload(lastSeenUmpireId, [finalizedCard], profile.handle);

      if (result && result.success) {
        await markUmpireQueueAsSynced([card.id]);
        Alert.alert("Success", "Intel manually submitted to Umpire!");
      } else {
        Alert.alert("Transfer Failed", "Could not connect to Umpire. Are you out of range?");
      }
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

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

  const handleRequestReview = async (cardToReview) => {
    try {
      const newCard = await forkCard(cardToReview, "Requesting network review for this card.", profile);
      await insertOrReplaceCard(newCard);
      const freshCards = await getAllCards();
      setCards(freshCards);
      setSelectedCard(null);
      Alert.alert("Review Requested", "Your request has been added to the mesh.");
      handleOfferCard(newCard);
    } catch (error) {
      console.error("Review Request Error:", error);
      Alert.alert("Error", `Could not request review: ${error.message}`);
    }
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
    const dist = Math.sqrt(dx * dx + dy * dy);

    const centerTapRadius = 55; // Center radius for the expanded wheel
    if (dist < centerTapRadius) {
      setIsProfileVisible(true);
      setIsWheelShrunk(true); // Collapse wheel on center tap
      return;
    }

    if (isWheelShrunk) return;

    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    const target = SECTIONS[Math.floor(angle / 72) % 5].id;
    setActiveTopicFilter(activeTopicFilter === target ? null : target);
    setIsWheelShrunk(true); // Collapse wheel after selection
  };

  const polarToCartesian = (cx, cy, r, ang) => { const a = (ang - 90) * Math.PI / 180; return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }; }
  const describeArc = (x, y, r, start, end) => {
    const s = polarToCartesian(x, y, r, end); const e = polarToCartesian(x, y, r, start); const f = end - start <= 180 ? "0" : "1";
    return ["M", s.x, s.y, "A", r, r, 0, f, 0, e.x, e.y, "L", x, y, "L", s.x, s.y].join(" ");
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
          profileHandle: profile?.publicKey || 'unknown'
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
  }, [searchQuery, activeTab, activeTopicFilter, profile?.publicKey, isDbReady]);

  // --- PHASE 3: THE SMART CAROUSEL LOOP ---
  useEffect(() => {
    let carouselInterval = null;
    let isActive = true; // Safe unmount flag
    const isCarouselMode = viewMode === 'broadcast';

    const startCarousel = async () => {
      // Grab cards that the user explicitly toggled "Feature This Intel" on
      const allUserCards = (await getAllCards()).filter(c => c.is_broadcast_enabled === 1);

      if (!isActive) return;

      if (!allUserCards || allUserCards.length === 0) {
        console.log(">> CAROUSEL: No featured cards to broadcast.");
        // When in broadcast mode but no cards are featured, we might want a default advertisement.
        // For now, it just won't broadcast anything from the carousel.
        return;
      }

      let currentIndex = 0;

      const initialCard = allUserCards[currentIndex];
      setAdvertisedCard(initialCard);
      await BluetoothService.startAdvertising(initialCard.subject || initialCard.title.substring(0, 10));
      console.log(`>> CAROUSEL: Broadcasting initial card: ${initialCard.title}`);

      currentIndex = (currentIndex + 1) % allUserCards.length;

      carouselInterval = setInterval(async () => {
        const currentCard = allUserCards[currentIndex];

        setAdvertisedCard(currentCard);
        await BluetoothService.startAdvertising(currentCard.subject || currentCard.title.substring(0, 10));

        console.log(`>> CAROUSEL: Broadcasting next card: ${currentCard.title}`);

        currentIndex = (currentIndex + 1) % allUserCards.length;
      }, 60000);
    };

    if (isCarouselMode) {
      startCarousel();
    }

    return () => {
      isActive = false;
      if (carouselInterval) {
        clearInterval(carouselInterval);
        console.log(">> CAROUSEL: Broadcast loop stopped.");
        // When leaving broadcast mode, we should explicitly stop advertising
        // if the carousel was the one managing it.
        BluetoothService.stopBroadcasting();
      }
    };
  }, [viewMode]);

  const filteredDevices = useMemo(() => {
    // 1. Identify any incoming Flare Answers. These ALWAYS pierce the filter.
    const answers = nearbyDevices.filter(d => d.subject && d.subject.startsWith('RE:'));

    if (!radarFilter) {
      // No filter? Show answers at the top, then everything else.
      const others = nearbyDevices.filter(d => !(d.subject && d.subject.startsWith('RE:')));
      return [...answers, ...others];
    }

    // 2. If a standard filter is active, apply bitmask logic ONLY to non-answer cards.
    const UI_TO_BITMASK = { 'food': 1, 'education': 2, 'fitness': 3, 'professional': 4, 'fun': 5 };
    const catVal = UI_TO_BITMASK[radarFilter];

    if (!catVal) return nearbyDevices;

    const filterBit = 1 << (catVal - 1);
    const filteredOthers = nearbyDevices.filter(d => {
      const isAnswer = d.subject && d.subject.startsWith('RE:');
      if (isAnswer) return false; // Already grabbed above
      return (d.categoryBitmask || 0) & filterBit;
    });

    // 3. Return the priority answers first, followed by the filtered standard nodes.
    return [...answers, ...filteredOthers];
  }, [nearbyDevices, radarFilter]);

  useEffect(() => {
    if (radarFilter && filteredDevices.length === 0 && nearbyDevices.length > 0) {
      Alert.alert(
        "Channel Empty",
        `Nobody in the local mesh is broadcasting ${radarFilter.toUpperCase()} intel right now... dropping back to all channels.`
      );
      setRadarFilter(null);
    }
  }, [filteredDevices, radarFilter, nearbyDevices]);

  // === 1. THE IRON GATE (MUST BE FIRST) ===
  if (!isDbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#00ff00', fontFamily: 'monospace' }}>Booting Sovereign Engine...</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#00ff00', fontFamily: 'monospace' }}>Loading Protocols...</Text>
      </View>
    );
  }


  // === 2. PERMISSIONS & ONBOARDING ===
  if (!hasPermissions) return <View style={styles.center}><TouchableOpacity onPress={requestPermissions}><Text style={styles.textGreen}>GRANT ACCESS</Text></TouchableOpacity></View>;
  if (!profile.handle || !profile.publicKey) return <Onboarding visible={true} onComplete={handleOnboardingComplete} />;

  // Check if the user has authored any cards.
  const hasAuthoredIntel = vaultCards.some(card => card.genesis.author_id === profile.publicKey);

  // === 3. THE GATEKEEPER UI ===
  if (!hasAuthoredIntel) {
    return (
      <View style={{ flex: 1, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <StatusBar barStyle="light-content" />
        <Text style={{ color: '#ff0000', fontFamily: 'Courier', fontWeight: 'bold', fontSize: 18, textAlign: 'center', marginBottom: 20 }}>
          // ACCESS RESTRICTED //
        </Text>
        <Text style={{ color: '#ccc', fontFamily: 'Courier', fontSize: 16, textAlign: 'center', marginBottom: 40, lineHeight: 24 }}>
          Your Armory is empty. You must mint at least one piece of Intel to unlock the Mesh.
        </Text>
        <TouchableOpacity
          onPress={() => setIsCreateVisible(true)}
          style={{
            paddingHorizontal: 20,
            paddingVertical: 15,
            backgroundColor: '#003300',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#00ff00'
          }}
        >
          <Text style={{ color: '#00ff00', fontWeight: 'bold', fontSize: 16, fontFamily: 'Courier' }}>
            [ + MINT FIRST INTEL ]
          </Text>
        </TouchableOpacity>

        {/* We must render the modal here so the button can open it */}
        <CreateCardModal
          visible={isCreateVisible}
          onClose={() => {
            setIsCreateVisible(false);
            setCreateInitialData(null); // Clear data when closing
          }}
          onSave={handleCreateCard}
          initialData={createInitialData}
        />
      </View>
    );
  }

  const isBroadcasting = sourceState === 'BROADCASTING';

  // === 3. THE MAIN UI RENDER ===
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={toggleBroadcast} style={[styles.broadcastBtnCompact, isBroadcasting && { backgroundColor: '#003300', borderColor: '#00ff00' }]}>
          <Text style={styles.broadcastText}>{isBroadcasting ? '(( ON AIR ))' : '📡 SYNC'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSmallOutline} onPress={() => setIsTrustedModalVisible(true)}><Text style={styles.btnTextGray}>TRUSTED</Text></TouchableOpacity>
        <Text style={styles.headerRank}>OP: {profile.handle.substring(0, 8).toUpperCase()}</Text>
      </View>

      {viewMode === 'broadcast' ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#00ff00', fontSize: 24, fontWeight: 'bold' }}>LEDGER SYNC</Text>
          <Text style={{ color: '#666', fontSize: 12, marginTop: 10, fontFamily: 'Courier' }}>BEACON ACTIVE • DISCOVERABLE</Text>
          <ActivityIndicator color="#00ff00" style={{ marginTop: 20 }} />
          <TouchableOpacity onPress={toggleBroadcast} style={styles.btnOutline}><Text style={styles.textGray}>STOP SIGNAL</Text></TouchableOpacity>
        </View>
      ) : viewMode === 'radar' ? (
        <View style={{ flex: 1 }}>
          <TacticalScanner devices={filteredDevices} onNodeTap={handleRadarConnect} isScanning={isScanning} />
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <FlareBeacon onFireFlare={fireMeshFlare} isBroadcasting={isBroadcasting} />
          </View>
        </View>
      ) : (
        <>
          <View style={{ minHeight: 60, alignItems: 'center' }}>
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
                          <Path d={path} fill={expertise[s.id] ? '#336633' : '#1a1a1a'} stroke={isSelected ? '#fff' : 'none'} />
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
            <TouchableOpacity onPress={() => setActiveTab('created')} style={[styles.tab, activeTab === 'created' && styles.activeTab]}><Text style={styles.tabText}>MY KNOWLEDGE</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('learned')} style={[styles.tab, activeTab === 'learned' && styles.activeTab]}><Text style={styles.tabText}>LEARNED</Text></TouchableOpacity>
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
                  activeUmpireEvent={activeUmpireEvent}
                  manualUmpireSubmit={manualUmpireSubmit}
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
                            await deleteCard(item.id);
                            const freshCards = await getAllCards();
                            setCards(freshCards);
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

      {/* --- NEW: HOST QR RECALL MODAL --- */}
      <Modal visible={isHostQRVisible} transparent={true} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.95)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: '#38BDF8', fontSize: 24, fontWeight: 'bold', fontFamily: 'Courier', marginBottom: 10 }}>ACTIVE EVENT</Text>
          <Text style={{ color: '#9CA3AF', fontSize: 16, textAlign: 'center', marginBottom: 30 }}>
            Mission: {activeUmpireEvent?.subject}
          </Text>

          <View style={{ padding: 20, backgroundColor: '#0F172A', borderRadius: 16, borderWidth: 2, borderColor: '#38BDF8' }}>
            <QRCode
              value={activeUmpireEvent?.id ? `JAWW-UMPIRE:${activeUmpireEvent.id.split(':')[1]}:${activeUmpireEvent.subject}:${activeUmpireEvent.id.split(':')[2]}:${profile?.publicKey || 'UnknownKey'}` : 'PENDING'}
              size={250}
              color="#F8FAFC"
              backgroundColor="#0F172A"
            />
          </View>

          <TouchableOpacity
            onPress={() => setIsHostQRVisible(false)}
            style={{ marginTop: 40, paddingVertical: 15, paddingHorizontal: 40, backgroundColor: '#334155', borderRadius: 8, borderWidth: 1, borderColor: '#475569' }}
          >
            <Text style={{ color: '#FFF', fontWeight: 'bold', fontFamily: 'Courier' }}>CLOSE RADAR</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* --- NEW: EVENT OVER MESSAGE --- */}
      {eventOverMessage && (
        <View style={{ backgroundColor: '#1E293B', padding: 12, borderRadius: 8, marginBottom: 15, marginHorizontal: 20, borderWidth: 1, borderColor: '#38BDF8', alignItems: 'center' }}>
          <Text style={{ color: '#38BDF8', fontWeight: 'bold', textAlign: 'center', fontFamily: 'Courier' }}>{eventOverMessage}</Text>
        </View>
      )}

      {/* --- TACTICAL EVENT ACTION BAR (INTEGRATED BOX) --- */}
      {activeUmpireEvent && !eventOverMessage && (
        <View style={{ width: '95%', alignSelf: 'center', marginBottom: 20 }}>

          <View style={{
            backgroundColor: '#1E293B',
            padding: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#475569',
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 3,
          }}>
            {/* 1. INTERNAL STATUS HEADER */}
            <Text style={{
              color: '#94A3B8',
              fontSize: 10,
              fontFamily: 'Courier',
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: 12, // Spacing before buttons
              letterSpacing: 1.2,
              borderBottomWidth: 1,
              borderBottomColor: '#334155', // Subtle divider
              paddingBottom: 8
            }}>
              {activeUmpireEvent.id?.split(':')[1] === profile?.handle
                ? `HOSTING JAWW EVENT: ${activeUmpireEvent.subject?.toUpperCase()}!`
                : `JAWW EVENT: ${activeUmpireEvent.subject?.toUpperCase()}!`}
            </Text>

            {/* 2. BUTTON TRAY */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>

              {/* PRIMARY ACTION: Intel Button (Global) */}
              <TouchableOpacity
                onPress={handleOpenEventCard}
                style={{
                  flex: 1,
                  backgroundColor: '#0EA5E9',
                  paddingVertical: 12,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: '#38BDF8',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Feather name="target" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 11, fontFamily: 'Courier' }}>+ INTEL</Text>
              </TouchableOpacity>

              {/* NEW: TETHERED WEB CONSOLE BUTTON (Global) */}
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const url = await UmpireDashboardService.startServer();
                    Alert.alert(
                      "TACTICAL OPSEC: WEB CONSOLE",
                      "To prevent data leakage to cloud providers, follow these protocols:\n\n" +
                      "1. THE AIR-GAP: Disconnect your laptop from all Wi-Fi. Connect directly to your phone via USB cable or Personal Hotspot.\n\n" +
                      "2. INCOGNITO ONLY: You must open a Private / Incognito window. This disables browser spyware (like Grammarly) and history tracking.\n\n" +
                      "3. NO CLOUD: Do not draft intel in Google Docs. Type directly into the console.\n\n" +
                      `LAPTOP URL:\n${url}`,
                      [{ text: "I UNDERSTAND", style: "destructive" }]
                    );
                  } catch (e) {
                    Alert.alert("Server Error", e.message);
                  }
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#0F172A',
                  paddingVertical: 12,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: '#38BDF8',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Feather name="monitor" size={18} color="#38BDF8" style={{ marginRight: 6 }} />
                <Text style={{ color: '#38BDF8', fontWeight: 'bold', fontSize: 11, fontFamily: 'Courier' }}>LAPTOP</Text>
              </TouchableOpacity>

              {/* VIEW A: UMPIRE CONTROLS (Only for Host) */}
              {activeUmpireEvent.id?.split(':')[1] === profile?.handle && (
                <View style={{ flexDirection: 'row', flex: 2, gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => setIsHostQRVisible(true)}
                    style={{
                      backgroundColor: '#334155',
                      width: 44,
                      height: 44,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: '#475569',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <Feather name="maximize" size={18} color="#FFF" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setIsHostDashboardVisible(true)}
                    style={{
                      flex: 1,
                      backgroundColor: '#F59E0B',
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: '#FCD34D',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <Feather name="bar-chart-2" size={16} color="#FFF" />
                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 9, fontFamily: 'Courier', marginTop: 2 }}>DB</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleEndEvent}
                    style={{
                      flex: 1,
                      backgroundColor: '#EF4444',
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: '#F87171',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <Feather name="x-square" size={16} color="#FFF" />
                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 9, fontFamily: 'Courier', marginTop: 2 }}>END</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* VIEW B: PARTICIPANT CONTROLS (Only for Non-Hosts) */}
              {activeUmpireEvent.id?.split(':')[1] !== profile?.handle && (
                <TouchableOpacity
                  onPress={handleLeaveEvent}
                  style={{
                    flex: 1,
                    backgroundColor: '#EF4444',
                    paddingVertical: 12,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: '#F87171',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Feather name="log-out" size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 11, fontFamily: 'Courier' }}>LEAVE</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => setIsOracleVisible(true)} style={styles.footBtn}><Text style={styles.footText}>ORACLE</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setIsScannerVisible(true)} style={styles.footBtn}><Text style={styles.footText}>SCAN QR</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setIsCreateVisible(true)} style={styles.footBtnMain}><Text style={styles.footTextMain}>+ CREATE</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setViewMode(viewMode === 'radar' ? 'wheel' : 'radar')} style={styles.footBtn}><Text style={styles.footText}>RADAR</Text></TouchableOpacity>
        <TouchableOpacity onPress={runGattStressTest} style={[styles.footBtn, {borderColor: '#f00'}]}><Text style={[styles.footText, {color: '#f00'}]}>STRESS</Text></TouchableOpacity>
      </View>

      <ContextModal visible={!!cardToFork} card={cardToFork} onClose={() => setCardToFork(null)} onSave={(n) => handleForkCard(cardToFork, n)} />
      <ChainModal visible={!!chainCard} card={chainCard} onClose={() => setChainCard(null)} currentUserHandle={profile.handle} />
      <HandshakeModal
        visible={!!activePeer && !isBrowseVisible}
        peer={activePeer}
        category={activePeerCategory}
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
      {IS_MILITARY ? (
        <AirGapScanner
          visible={isScannerVisible}
          onClose={() => setIsScannerVisible(false)}
          onTransferComplete={handleRealScan}
        />
      ) : (
        <ScannerModal
          visible={isScannerVisible}
          onClose={() => setIsScannerVisible(false)}
          onScanSuccess={handleRealScan}
        />
      )}
      
      <RosettaScannerModal
        visible={isRosettaVisible}
        onClose={() => setIsRosettaVisible(false)}
        onScanComplete={handleRosettaScan}
      />

      {/* Military Air-Gap Transmitter Modal */}
      {IS_MILITARY && (
        <Modal visible={!!airGapPayload} transparent={true} animationType="fade">
          <AnimatedQRTransfer
            payload={airGapPayload}
            onClose={() => setAirGapPayload(null)}
          />
        </Modal>
      )}
      <TrustedSourcesModal
        visible={isTrustedModalVisible}
        onClose={() => setIsTrustedModalVisible(false)}
        sources={trustedSources}
        cards={vaultCards}
        onFilterBySource={(pubKey) => {
          setSearchQuery(`source:${pubKey}`);
          setIsTrustedModalVisible(false);
        }}
        onAddSource={handleAddTrustedSource}
      />
      <OracleModal
        visible={isOracleVisible}
        onClose={() => setIsOracleVisible(false)}
        masterLibrary={MASTER_LIBRARY}
        funLibrary={funLibrary}
        groceryList={groceryList}
        onSelect={(card) => {
          setIsOracleVisible(false);
          setTimeout(() => setSelectedCard(card), 100);
        }}
        onEndEvent={handleEndEvent}
        refreshTrigger={refreshTrigger}
        // This handler makes the footer buttons work
        onNavigate={(route) => {
          setIsOracleVisible(false); // Close Oracle first
          setTimeout(() => {
            if (route === 'scan') { setIsScannerVisible(true); }
            if (route === 'create') { setIsCreateVisible(true); }
            if (route === 'radar') { setViewMode('radar'); }
            if (route === 'scan_receipt') { setIsRosettaVisible(true); }
          }, 200);
        }}
      />
      <IdentityModal
        visible={isProfileVisible}
        onClose={() => setIsProfileVisible(false)}
        profile={profile}
        library={cards}
        onReset={async () => { await AsyncStorage.clear(); }}
        onClearLibrary={handleClearLibrary}
        onStartNewEvent={handleNewUmpireOperation}
      />
      <UmpireEventModal
        visible={isUmpireEventModalVisible}
        onClose={() => setIsUmpireEventModalVisible(false)}
        event={activeUmpireEvent}
        onBegin={handleBeginUmpireBroadcast}
        onEnd={handleEndUmpireEvent}
        leaderboard={leaderboard}
      />
      <CardDetailModal
        visible={!!selectedCard}
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        onFork={(c) => { setCardToFork(c); setSelectedCard(null); }}
        onChain={() => { setChainCard(selectedCard); setSelectedCard(null); }}
        currentUserHandle={profile.handle}
        onRequestReview={handleRequestReview}
        onMeshSync={handleAutoSync}

        // --- THE ENHANCE FUNCTION ---
        onEnhance={(cardToCopy) => {
          setCreateInitialData(cardToCopy); // 1. Copy the text
          setSelectedCard(null);            // 2. Close the reader
          setIsCreateVisible(true);         // 3. Open the editor
        }}
        onBlockOperator={handleBlockOperator}
        onOffer={handleOfferCard}
        onAddToGroceryList={handleAddToGroceryList}
      />
      <TransferRequestModal
        visible={!!pendingRequest}
        request={pendingRequest}
        onAccept={handleAcceptTransfer}
        onDeny={handleDenyTransfer}
      />

      {/* --- SUCCESS FLARE ANIMATION --- */}
      {showSyncFlare && (
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.8)' }]}>
          <Animated.View style={{ backgroundColor: '#10B981', padding: 30, borderRadius: 20, alignItems: 'center', borderWidth: 2, borderColor: '#34D399' }}>
            <Feather name="check-circle" size={60} color="#FFF" />
            <Text style={{ color: '#FFF', fontWeight: 'bold', marginTop: 15, fontFamily: 'Courier', fontSize: 18 }}>PAYLOAD SECURED</Text>
            <Text style={{ color: '#D1FAE5', marginTop: 5, fontFamily: 'Courier', fontSize: 12 }}>Umpire has received your intel.</Text>
          </Animated.View>
        </View>
      )}

      {/* --- NEW: HOST DASHBOARD MODAL --- */}
      <Modal visible={isHostDashboardVisible} transparent={true} animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.95)', paddingTop: 60, paddingHorizontal: 20 }}>

          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ color: '#F59E0B', fontSize: 24, fontWeight: 'bold', fontFamily: 'Courier' }}>LIVE DASHBOARD</Text>
            <TouchableOpacity onPress={() => setIsHostDashboardVisible(false)}>
              <Feather name="x-circle" size={28} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Event Intel Stats */}
          <View style={{ backgroundColor: '#1E293B', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#334155', marginBottom: 20 }}>
            <Text style={{ color: '#F8FAFC', fontFamily: 'Courier', fontSize: 16, marginBottom: 10 }}>Mission: {activeUmpireEvent?.subject}</Text>
            <Text style={{ color: '#10B981', fontFamily: 'Courier', fontSize: 14 }}>
              Total Intel Secured: {cards.filter(c => c.event_id === activeUmpireEvent?.id).length}
            </Text>
          </View>

          {/* Live Leaderboard */}
          <Text style={{ color: '#94A3B8', fontFamily: 'Courier', fontWeight: 'bold', marginBottom: 10, letterSpacing: 1 }}>ACTIVE OPERATORS</Text>
          <FlatList
            data={leaderboard}
            keyExtractor={(item) => item.handle}
            renderItem={({ item }) => (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#0F172A', padding: 15, borderRadius: 6, marginBottom: 8, borderWidth: 1, borderColor: '#334155' }}>
                <Text style={{ color: '#38BDF8', fontWeight: 'bold', fontFamily: 'Courier' }}>{item.handle}</Text>
                <View style={{ flexDirection: 'row', gap: 15 }}>
                  <Text style={{ color: '#10B981', fontFamily: 'Courier' }}>Intel: {item.authoredCount}</Text>
                  <Text style={{ color: '#F59E0B', fontFamily: 'Courier' }}>Score: {item.expertiseScore}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={{ color: '#64748B', fontFamily: 'Courier', textAlign: 'center', marginTop: 20 }}>Waiting for operator pings...</Text>}
          />
        </View>
      </Modal>
      <SyncStatusScreen
        isVisible={isSyncScreenVisible}
        onClose={async () => {
          setIsSyncScreenVisible(false); // Closes the screen
          await BluetoothService.stopBroadcasting().catch(() => { }); // Turns off the Beacon
        }}
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
  }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  btnTextGreen: { color: '#00ff00', fontFamily: 'Courier', fontSize: 12, fontWeight: 'bold' },
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
  dossierBox: { backgroundColor: '#111', borderRadius: 12, padding: 0, overflow: 'hidden', maxHeight: '80%', width: '100%', borderWidth: 1, borderColor: '#333' },
  dossierHeader: { padding: 15, borderBottomWidth: 1, borderColor: '#333', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a1a' },
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
  libraryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#222' },
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
  timelineNode: {
    alignItems: 'center',
    marginBottom: 16, // Increased spacing between nodes
    width: '100%',
  },
  entryCard: {
    width: '95%',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#475569', // Clear, static border
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  historyAction: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  historyUser: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 12,
    textAlign: 'center',
  },
  keyContainer: {
    alignItems: 'flex-start', // Left-align content
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 6,
    width: '100%',
    marginBottom: 8,
  },
  historyKey: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
});