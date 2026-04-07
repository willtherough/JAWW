import { BleManager } from 'react-native-ble-plx';
import BLEAdvertiser from 'react-native-ble-advertiser';
import { PermissionsAndroid, Platform, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import { getAllTopics, getAllCards } from '../model/database';
import { signData, getOrGenerateKeys } from '../model/Security';
import { getAdvertisedCard, setAdvertisedCard, clearAdvertisedCard } from './BroadcastState';
import { loadProfile } from '../model/Storage';

const SOURCE_UUID = '00001101-0000-1000-8000-00805F9B34FB';
const COMPANY_ID = 0x00FF;
const UNIQUE_KEY_STORAGE = 'SOURCE_UNIQUE_KEY';

// ENGINE 4 UUIDs
export const TRANSFER_SERVICE_UUID = 'baba0001-1234-5678-9abc-def012345678';
export const TRANSFER_CHAR_UUID = 'baba0002-1234-5678-9abc-def012345678';

const MTU = 512;

const truncateToSafeBytes = (str, maxBytes) => {
  if (!str) return '';
  const buffer = Buffer.from(str, 'utf8');
  if (buffer.length <= maxBytes) return str;
  let sliceEnd = maxBytes;
  while (sliceEnd > 0 && (buffer[sliceEnd] & 0xC0) === 0x80) { sliceEnd--; }
  return buffer.slice(0, sliceEnd).toString('utf8');
};

    class BluetoothService {
        constructor() {
            this.manager = new BleManager();
            this.peerCache = new Map();
            this.uniqueKey = null;
            this.isBroadcasting = false;
            this.foundDevices = new Map();
            this.onStateChangeCallback = null;
            this.userHandle = null;
            this.incomingBuffer = "";
            this.questionBroadcastTimer = null;

            // --- 1. AUTOMATED MESH STATE (Added to constructor) ---
            this.isRadarActive = false;
            this.automatedSyncInterval = null;
            this.huntCooldowns = new Map();
        }

        // --- 2. RADAR YIELD CONTROLS (Added as class methods) ---
        
        // Call this when the user opens the Scanner, Dashboard, or manual search
        pauseAutomatedHunt() {
            console.log(">> RADAR YIELD: Manual operation detected. Pausing background hunt.");
            this.isRadarActive = true;
        }

        // Call this when the user returns to the main feed
        resumeAutomatedHunt() {
            console.log(">> RADAR YIELD: Manual operation finished. Resuming background hunt.");
            this.isRadarActive = false;
        }

        // --- THE PRIORITY CAROUSEL ---
        async getHighestPriorityCard() {
            try {
                const allCards = await getAllCards();
                const activeCards = allCards.filter(c => c.hops && c.hops > 0);
                
                if (activeCards.length === 0) return null;

                activeCards.sort((a, b) => {
                    const timeA = this.huntCooldowns.get(a.id) || 0;
                    const timeB = this.huntCooldowns.get(b.id) || 0;
                    
                    // 1. Least recently broadcasted goes to the front.
                    if (timeA !== timeB) {
                        return timeA - timeB; 
                    }
                    
                    // 2. If tied (e.g., app just booted), heaviest cards go first.
                    return b.hops - a.hops; 
                });

                const targetCard = activeCards[0];
                
                // Tag it with the current time so it goes to the bottom of the list next time
                this.huntCooldowns.set(targetCard.id, Date.now());
                
                return targetCard;

            } catch (e) {
                console.error(">> MESH: Priority Queue calculation failed", e);
                return null;
            }
        }

        startAutomatedGenesisHunt(myHandle) {
            if (this.automatedSyncInterval) clearInterval(this.automatedSyncInterval);

            console.log(">> GENESIS HUNT: Engine Started. Duty Cycle: 10s ON / 45s OFF.");

            this.automatedSyncInterval = setInterval(async () => {
                if (this.isRadarActive) {
                    console.log(">> GENESIS HUNT: Skipped cycle (Radar Yield is active).");
                    return;
                }

                const targetCard = await this.getHighestPriorityCard();
                if (!targetCard) return;

                console.log(`>> GENESIS HUNT: Active Window Open. Hunting for updates to [${targetCard.title}] (Depth: ${targetCard.hops})...`);

                const pingString = `REQ:SYNC_PING:${targetCard.id}:${myHandle}:ALL`;
                
                await setAdvertisedCard({ id: targetCard.id, pingPayload: pingString }); 

                setTimeout(async () => {
                    if (this.isRadarActive) return; 
                    console.log(">> GENESIS HUNT: 10s window closed. Going dark for 45s...");
                    await clearAdvertisedCard(); 
                }, 10000); 

            }, 55000); 
        }

        stopAutomatedGenesisHunt() {
            if (this.automatedSyncInterval) {
                clearInterval(this.automatedSyncInterval);
                this.automatedSyncInterval = null;
                console.log(">> GENESIS HUNT: Engine completely shut down.");
            }
        }

        _safeStopDeviceScan() {
            try {
                this.manager.stopDeviceScan();
            } catch (e) {
                console.warn(">> BleManager.stopDeviceScan() failed:", e);
            }
        }

        setHandle(handle) {
            this.userHandle = handle;
        }

        async initialize() {
            if (this.uniqueKey) return;
            try {
                let key = await AsyncStorage.getItem(UNIQUE_KEY_STORAGE);
                if (!key) {
                    key = Math.floor(Math.random() * 0xFFFFFFFF).toString(16).toUpperCase().padStart(8, '0');
                    await AsyncStorage.setItem(UNIQUE_KEY_STORAGE, key);
                }
                this.uniqueKey = key;
                BLEAdvertiser.setCompanyId(COMPANY_ID);
            } catch (e) { console.warn(">> INIT FAILED:", e); }
        }

        setOnStateChange(callback) { this.onStateChangeCallback = callback; }
        updateState(newState) { if (this.onStateChangeCallback) this.onStateChangeCallback(newState); }

        async armQuestionBroadcast(card) {
            console.log(">> HOOK: Arming question broadcast...");
            if (this.questionBroadcastTimer) {
                clearTimeout(this.questionBroadcastTimer);
            }
            
            setAdvertisedCard(card);

            if (this.isBroadcasting) {
                await this.stopBroadcasting();
            }
            await this.startAdvertising();

            this.questionBroadcastTimer = setTimeout(() => {
                console.log(">> HOOK: 30s timer expired. Disarming question broadcast.");
                this.disarmQuestionBroadcast();
            }, 30000);
        }

        async disarmQuestionBroadcast() {
            if (this.questionBroadcastTimer) {
                clearTimeout(this.questionBroadcastTimer);
                this.questionBroadcastTimer = null;
            }
            clearAdvertisedCard();
            if (this.isBroadcasting) {
                await this.stopBroadcasting();
            }
            await this.startAdvertising();
        }

        async requestPermissions() {
            if (Platform.OS === 'android') {
                if (Platform.Version >= 31) {
                    const granted = await PermissionsAndroid.requestMultiple([
                        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
                        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
                    ]);
                    return Object.values(granted).every(status => status === PermissionsAndroid.RESULTS.GRANTED);
                } else {
                    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
                    return granted === 'granted';
                }
            }
            return true;
        }

        async startAdvertising(customSubject = null, isUmpire = false, eventStartTime = null) {
            this._safeStopDeviceScan(); 
            await this.initialize();
            
            if (this.isBroadcasting) {
                await this.stopBroadcasting(true); 
            }

            this.updateState('BROADCASTING');

            const allTopics = await getAllTopics();

            const categoryBitmask = allTopics.reduce((mask, topic) => {
                const cleanTopic = (topic || '').replace('human/', '').toLowerCase();
                let catVal = 0;
                if (cleanTopic.includes('food')) catVal = 1;
                else if (cleanTopic.includes('education')) catVal = 2;
                else if (cleanTopic.includes('fitness')) catVal = 3;
                else if (cleanTopic.includes('professional')) catVal = 4;
                else if (cleanTopic.includes('fun')) catVal = 5;

                return catVal ? mask | (1 << (catVal - 1)) : mask;
            }, 0);

            const packetCount = 20;
            const advertisedCard = getAdvertisedCard();
            const subject = customSubject ? truncateToSafeBytes(customSubject, 20) : null; 
            
            const isQuestionArmed = advertisedCard && advertisedCard.title && advertisedCard.title.startsWith("QUESTION:");

            let handlePortion = this.userHandle;
            if (!handlePortion) {
                console.error(">> BROADCAST ABORTED: Valid Operator Handle Required.");
                this.updateState('ERROR');
                return;
            }

        // 1. THE SCOPE FIX: Use 'this.userHandle' (not 'handle')
            // 2. THE REDUNDANCY FIX: Don't append the subject twice for Umpires
            if (isUmpire) {
                const shortHandle = this.userHandle ? this.userHandle.substring(0, 4) : "Node";
                // Result: U:Neo:Workouts
                handlePortion = `U:${shortHandle}:${subject || 'General'}`;
            } else if (isQuestionArmed) {
                handlePortion = `?${handlePortion}`;
            }
            
            // Only append the pipe separator for standard (non-umpire) cards
            const combinedString = (isUmpire || !subject) ? handlePortion : `${handlePortion}|${subject}`;
            const safeString = truncateToSafeBytes(combinedString, 16);
            const handleBytes = [...Buffer.from(safeString, 'utf8')];

            const payload =[74, 87, categoryBitmask, packetCount, ...handleBytes];
            
            try {
                await BLEAdvertiser.broadcast(SOURCE_UUID, payload, {
                    advertiseMode: BLEAdvertiser.ADVERTISE_MODE_LOW_LATENCY,
                    txPowerLevel: BLEAdvertiser.ADVERTISE_TX_POWER_HIGH,
                    connectable: true,
                    includeDeviceName: false,
                });
                this.isBroadcasting = true;
                console.log(`>> IRONCLAD V2: ON. Payload length: ${payload.length}`);
            } catch (e) {
                console.error(">> IRONCLAD BROADCAST FAIL:", e);
                this.updateState('ERROR');
            }
        }

        async stopBroadcasting(silent = false) {
            try {
                await BLEAdvertiser.stopBroadcast();
                this.isBroadcasting = false;
                if (!silent) {
                    this.updateState('IDLE');
                    console.log(">> LIGHTHOUSE: OFF");
                }
            } catch (e) { }
        }

        async startScanning(onDeviceFound) {
            const hasPerms = await this.requestPermissions();
            if (!hasPerms) return;

            console.log(">> RADAR: Scanning...");
            this.foundDevices.clear();

            this.manager.startDeviceScan([], { allowDuplicates: true, scanMode: 1 }, (error, device) => {
                if (error || !device) return;

                const identity = this._parseIdentity(device);
                if (identity) {
                    this.peerCache.set(identity.handle, { deviceId: identity.uid, timestamp: Date.now() });
                    onDeviceFound({
                        id: identity.uid,
                        name: identity.handle,
                        subject: identity.subject,
                        rssi: device.rssi,
                        categoryBitmask: identity.categoryBitmask,
                        packetCount: identity.packetCount,
                        isQuestion: identity.isQuestion,
                        isUmpire: identity.isUmpire,
                    });
                }
            });
        }

        async scanForTarget(targetHandle, onTargetFound) {
            const hasPerms = await this.requestPermissions();
            if (!hasPerms) {
                onTargetFound(null);
                return;
            }

            console.log(`>> HUNTER: Scanning specifically for handle "${targetHandle}"...`);
            
            const huntTimeout = setTimeout(() => {
                console.log(">> HUNTER: Timeout. Target not found.");
                this._safeStopDeviceScan();
                onTargetFound(null);
            }, 15000);

            this.manager.startDeviceScan(
                [], 
                { allowDuplicates: true, scanMode: 1 }, 
                (error, device) => {
                    if (error || !device) return;

                    const identity = this._parseIdentity(device);
                    if (identity) {
                        this.peerCache.set(identity.handle, { deviceId: identity.uid, timestamp: Date.now() });
                        if (identity.handle.trim() === targetHandle.trim()) {
                            console.log(">> HUNTER: Target Acquired!");
                            clearTimeout(huntTimeout); 
                            this._safeStopDeviceScan();
                            onTargetFound(identity.uid); 
                        }
                    }
                }
            );
        }

        stopScanning() {
            this._safeStopDeviceScan();
            console.log(">> RADAR/HUNTER: OFF");
        }

        async getDeviceId(handle) {
            if (!handle) return null;
            if (handle.includes(':')) return handle;

            const searchHandle = handle.toLowerCase().trim();

            // 1. Case-insensitive cache check
            for (const [cachedHandle, data] of this.peerCache.entries()) {
                if (cachedHandle.toLowerCase().trim() === searchHandle && (Date.now() - data.timestamp) < 60000) {
                    return data.deviceId;
                }
            }

            console.log(`>> RESOLVER: ${handle} is stale or not in cache. Performing quick scan...`);
            return new Promise(resolve => {
                const quickScanTimeout = setTimeout(() => {
                    this._safeStopDeviceScan();
                    console.log(`>> RESOLVER: 4-second scan timeout reached. Could not find ${handle}.`);
                    resolve(null);
                }, 4000); // Bumped to 4 seconds for reliability

                this._safeStopDeviceScan(); // Clear radio before starting

                this.manager.startDeviceScan([], { allowDuplicates: true, scanMode: 1 }, (error, device) => {
                    if (error || !device) return;
                    const identity = this._parseIdentity(device);
                    if (identity && identity.handle) {
                        this.peerCache.set(identity.handle, { deviceId: identity.uid, timestamp: Date.now() });
                        
                        // 2. Case-insensitive match check
                        if (identity.handle.toLowerCase().trim() === searchHandle) {
                            console.log(`>> RESOLVER: Target Acquired -> ${identity.handle} (${identity.uid})`);
                            clearTimeout(quickScanTimeout);
                            this._safeStopDeviceScan();
                            resolve(identity.uid);
                        }
                    }
                });
            });
        }

        async initiateMeshSync(targetHandleOrId, card) {
            const targetDeviceId = await this.getDeviceId(targetHandleOrId);

            if (!targetDeviceId) {
                console.log(`>> MESH SYNC: Could not resolve handle "${targetHandleOrId}". Peer may be offline.`);
                return { success: false, error: 'Peer_Offline' };
            }

            console.log(`>> MESH SYNC: Connecting to ${targetDeviceId} (${targetHandleOrId})...`);
            this.updateState('CONNECTING');
            this.incomingBuffer = "";

            let device = null;
            let characteristicMonitor = null;
            let cleanedUp = false;

            const cleanup = async () => {
                if (cleanedUp) return;
                cleanedUp = true;
                console.log(">> MESH SYNC CLEANUP: Tearing down connection...");

                characteristicMonitor = null;

                if (device && device.id) {
                    try {
                        const isConnected = await device.isConnected().catch(() => false);
                        if (isConnected) {
                            await device.cancelConnection();
                        }
                    } catch (e) {}
                }
                this.updateState('IDLE');
            };

            return new Promise(async (resolve) => {
                const connectionTimeout = setTimeout(() => {
                    cleanup();
                    resolve({ success: false, error: 'Timeout' });
                }, 60000);

                try {
                    try { await this.manager.stopDeviceScan(); } catch (e) {}
                    
                    device = await this.manager.connectToDevice(targetDeviceId, { timeout: 15000 });
                    await new Promise(r => setTimeout(r, 1000));
                    
                    try { await device.requestMTU(512); } catch (e) {}
                    await new Promise(r => setTimeout(r, 500));
                    await new Promise(r => setTimeout(r, 1000));
                    await device.discoverAllServicesAndCharacteristics();

                    // --- 1. POPULATE SENDER IDENTITY & HASH ---
                    const myProfile = await loadProfile();
                    const myHandle = myProfile?.handle;
                    if (!myHandle) throw new Error("Operator Handle Required");
                    const cardHash = card.content_hash || card.hash || "0";

                    const cleanServiceUUID = TRANSFER_SERVICE_UUID.toLowerCase();
                    const cleanCharUUID = TRANSFER_CHAR_UUID.toLowerCase();
                    const services = await device.services();
                    let targetService = services.find(s => String(s.uuid).toLowerCase().includes(cleanServiceUUID));

                    if (!targetService) {
                        clearTimeout(connectionTimeout);
                        await cleanup();
                        resolve({ success: false, error: 'Target Invalid' });
                        return;
                    }

                    await new Promise(resolve => setTimeout(resolve, 500)); 

                    // --- 2. THE LISTENER (KEEP THIS!) ---
                    // This waits for the "ACK" (Return Ping) from the other phone
                    characteristicMonitor = device.monitorCharacteristicForService(
                        targetService.uuid,
                        cleanCharUUID,
                        async (error, char) => {
                            if (error || !char?.value) return;
                            
                            let chunk = Buffer.from(char.value, 'base64').toString('utf8');
                            const combinedBuffer = this.incomingBuffer + chunk;
                            
                            if (combinedBuffer.includes('__EOF__')) {
                                console.log(">> MESH SYNC: EOF Received. Processing return ping...");
                                const finalData = combinedBuffer.replace('__EOF__', '');
                                this.incomingBuffer = ""; 
                                
                                if (finalData.startsWith('ACK:SYNC_LEDGER:')) {
                                    try {
                                        const parts = finalData.split(':', 3);
                                        const cardId = parts[2];
                                        const jsonStartIndex = finalData.indexOf('{') !== -1 ? finalData.indexOf('{') : finalData.indexOf('[');
                                        const jsonPayload = finalData.substring(jsonStartIndex);
                                        const mergedHistory = JSON.parse(jsonPayload);

                                        DeviceEventEmitter.emit('meshSyncComplete', {
                                            cardId,
                                            mergedHistory
                                        });

                                        clearTimeout(connectionTimeout);
                                        resolve({ success: true });
                                        await cleanup();
                                    } catch (parseError) {
                                        console.error(">> MESH SYNC ERROR: JSON Parse Error", parseError);
                                        clearTimeout(connectionTimeout);
                                        resolve({ success: false, error: "Parse error." });
                                        await cleanup();
                                    }
                                }
                            } else {
                                this.incomingBuffer = combinedBuffer;
                            }
                        }
                    );
                    
                    await new Promise(resolve => setTimeout(resolve, 1500)); 
                    
                    // 1. Generate a random 16-byte nonce
                    const challengeNonce = Math.random().toString(36).substring(2, 18);
                    
                    // SAVE IT TO GLOBAL MEMORY SO APP.JS CAN VERIFY IT LATER
                    global.lastSentNonce = challengeNonce;
                    global.pendingSyncCardId = card.id;

                    // 2. Start the Secure Handshake instead of sending the ledger
                // Format: REQ : CHALLENGE : CARD_ID : MY_HANDLE : NONCE
                    const requestString = `REQ:CHALLENGE:${card.id}:${myHandle}:${challengeNonce}`;
                    
                    const CHUNK_SIZE = 300; 
                    const totalSize = requestString.length;
                    let offset = 0;
                    
                    console.log(`>> MESH SYNC: Transmitting initiator payload to ${targetHandleOrId} (${totalSize} bytes)...`);
                    
                    while (offset < totalSize) {
                        const chunk = requestString.slice(offset, offset + CHUNK_SIZE);
                        const payload = Buffer.from(chunk).toString('base64');
                        await device.writeCharacteristicWithoutResponseForService(
                            cleanServiceUUID, cleanCharUUID, payload
                        );
                        offset += CHUNK_SIZE;
                        await new Promise(r => setTimeout(r, 600)); 
                    }
                    
                    await device.writeCharacteristicWithoutResponseForService(
                        cleanServiceUUID, cleanCharUUID, Buffer.from('__EOF__').toString('base64')
                    );
                    console.log(">> MESH SYNC: Payload transmitted. Awaiting return ping...");

                } catch (e) {
                    console.error(">> MESH SYNC FATAL:", e.message);
                    this.peerCache.delete(targetHandleOrId);
                    clearTimeout(connectionTimeout);
                    await cleanup(); 
                    resolve({ success: false, error: e.message });
                }
            });
        }

        async pingTargetsForSync(cardId, targetsArray, senderHandle) {
            console.log(`>> MESH: Broadcasting sync ping for Card ${cardId} to targets: ${targetsArray}`);
            
            // Format: REQ:SYNC_PING:cardId:senderHandle:target1,target2
            const targetsString = targetsArray.join(',');
            const pingPayload = `REQ:SYNC_PING:${cardId}:${senderHandle}:${targetsString}`;
            const chunk = Buffer.from(pingPayload, 'utf8').toString('base64');
            
            for (const targetHandle of targetsArray) {
                try {
                    const targetDeviceId = await this.getDeviceId(targetHandle);
                    if (!targetDeviceId) {
                        console.log(`>> MESH: Could not resolve MAC for ${targetHandle}`);
                        continue;
                    }
                    
                    console.log(`>> MESH: Connecting to ${targetHandle} (${targetDeviceId})...`);
                    const device = await this.manager.connectToDevice(targetDeviceId, { timeout: 5000 }); // Bumped timeout slightly for safety
                    
                    // --- THE 20-BYTE LIMIT FIX ---
                    try {
                        // Force the Android BLE stack to open the pipe to 512 bytes
                        await device.requestMTU(512);
                        console.log(`>> MESH: MTU pipe expanded to 512 bytes.`);
                    } catch (mtuErr) {
                        // iOS auto-negotiates, so we catch this silently if it fails
                        console.log(`>> MESH: MTU negotiation skipped or handled by OS.`);
                    }
                    // -----------------------------

                    await device.discoverAllServicesAndCharacteristics();
                    
                    const cleanServiceUUID = TRANSFER_SERVICE_UUID.toLowerCase();
                    const cleanCharUUID = TRANSFER_CHAR_UUID.toLowerCase();
                    
                    await device.writeCharacteristicWithoutResponseForService(
                        cleanServiceUUID,
                        cleanCharUUID,
                        chunk
                    );
                    
                    console.log(`>> MESH: Full Sync ping delivered to ${targetHandle}.`);
                    await device.cancelConnection().catch(() => {});
                } catch (e) {
                    console.error(`>> MESH: Auto-Sync Ping Failed for ${targetHandle}`, e.message);
                }
            }
        }

        async connectAndRequest(targetHandleOrId, requestType, requestValue, myHandle, myPublicKey) {
            this.pauseAutomatedHunt();
            await this.stopBroadcasting(true);
            const targetDeviceId = await this.getDeviceId(targetHandleOrId);

            if (!targetDeviceId) {
                console.log(`>> CLIENT: Could not resolve handle "${targetHandleOrId}". Peer may be offline.`);
                return { success: false, error: 'Peer_Offline' };
            }

            console.log(`>> CLIENT: Connecting to ${targetDeviceId} (${targetHandleOrId})...`);
            this.updateState('CONNECTING');
            this.incomingBuffer = ""; 

            let device = null;
            let disconnectionSubscription = null;
            let characteristicMonitor = null; 
            let cleanedUp = false;

            const cleanup = async () => {
                if (cleanedUp) return;
                cleanedUp = true;
                console.log(">> CLEANUP: Tearing down connection...");
                
                // >>> GATT CRASH FIX <<<
                // Give Android's native BLE thread 1.0 seconds to safely flush the final RX buffers 
                // BEFORE sending the deadly SIGSEGV-prone device.cancelConnection() command!
                await new Promise(r => setTimeout(r, 1000));

                if (disconnectionSubscription) {
                    disconnectionSubscription.remove();
                    disconnectionSubscription = null;
                }
                characteristicMonitor = null; 
                
                if (device && device.id) {
                    try {
                        const isConnected = await device.isConnected().catch(() => false);
                        if (isConnected) {
                            await device.cancelConnection();
                            console.log(">> CLEANUP: Successfully cancelled connection.");
                        }
                    } catch (e) {
                        console.log(">> CLEANUP: Safe disconnect ignored.", e.message);
                    }
                }
                this.updateState('IDLE');
                this.resumeAutomatedHunt();
            };

            return new Promise(async (resolve) => {
                const connectionTimeout = setTimeout(() => {
                    console.log(">> CLIENT: Human/Network Timeout.");
                    cleanup();
                    resolve({ success: false, error: 'Timeout' });
                }, 45000); 

                try {
                    try { await this.manager.stopDeviceScan(); } catch (e) {}
                    
                    await new Promise(r => setTimeout(r, 1000));

                    console.log(">> CLIENT: Connecting...");
                    device = await this.manager.connectToDevice(targetDeviceId, { timeout: 15000, autoConnect: false });
                    console.log(`>> CLIENT: Connected to ${device.id}.`);

                    disconnectionSubscription = device.onDisconnected((error, d) => {
                        console.log(`>> CLIENT: Device ${d.id} disconnected`, error?.message);
                        clearTimeout(connectionTimeout);
                        cleanup();
                        resolve({ success: false, error: 'DeviceDisconnected' });
                    });

                    // 1. Give the Server phone 1 full second to spin up its GATT module
                    await new Promise(r => setTimeout(r, 1000));
                    
                    // 2. Request the MTU pipe size BEFORE discovering services
                    console.log(">> CLIENT: Requesting MTU...");
                    try {
                        await device.requestMTU(512);
                    } catch (mtuError) {
                        console.log(">> CLIENT: MTU Request failed/ignored (iOS or unsupported). Proceeding.");
                    }

                    // 3. Let the radio hardware settle after resizing
                    await new Promise(r => setTimeout(r, 500));
                    
                    // 4. Map the services now that the pipe is stable
                    console.log(">> CLIENT: Discovering services...");
                    await new Promise(r => setTimeout(r, 1000));
                    await device.discoverAllServicesAndCharacteristics();

                    const cleanServiceUUID = TRANSFER_SERVICE_UUID.toLowerCase();
                    const cleanCharUUID = TRANSFER_CHAR_UUID.toLowerCase();

                    const services = await device.services();
                    let targetService = services.find(s => String(s.uuid).toLowerCase().includes(cleanServiceUUID));

                    if (!targetService) {
                        clearTimeout(connectionTimeout);
                        await cleanup();
                        resolve({ success: false, error: 'Target Invalid' });
                        return;
                    }

                    const characteristics = await device.characteristicsForService(targetService.uuid);
                    const hasCharacteristic = characteristics.some(c => c.uuid.toLowerCase().includes(cleanCharUUID));
                    
                    if (!hasCharacteristic) {
                        clearTimeout(connectionTimeout);
                        await cleanup();
                        resolve({ success: false, error: 'Characteristic Missing' });
                        return;
                    }

                    await new Promise(resolve => setTimeout(resolve, 500)); 

                    characteristicMonitor = device.monitorCharacteristicForService(
                        targetService.uuid,
                        cleanCharUUID,
                        async (error, char) => {
                            if (error) {
                                if (error.errorCode === 2) return;
                                return;
                            }

                            if (!char?.value) return;

                            let chunk = Buffer.from(char.value, 'base64').toString('utf8');
                            
                            if (chunk.includes("__WAIT__")) {
                                console.log(">> CLIENT: Server acknowledged request, waiting for human approval...");
                                chunk = chunk.replace("__WAIT__", "");
                                if (chunk.length === 0) return;
                            }

                            // ==========================================
                            // --- NEW: PRE-FLIGHT HEADER INTERCEPT ---
                            // ==========================================
                            if (chunk.startsWith('{"type":"HEADER"')) {
                                console.log(">> CLIENT: Received Pre-Flight Header. Validating...");
                                try {
                                    const header = JSON.parse(chunk);
                                    DeviceEventEmitter.emit('validateTransfer', {
                                        header,
                                        onValidationComplete: async (isRedundant) => {
                                            const responseType = isRedundant ? 'HANDSHAKE:NACK' : 'HANDSHAKE:ACK';
                                            console.log(`>> CLIENT: Validation complete. Responding with ${responseType}`);
                                            const responsePayload = Buffer.from(responseType).toString('base64');
                                            await device.writeCharacteristicWithResponseForService(
                                                cleanServiceUUID, cleanCharUUID, responsePayload
                                            );

                                            // GRACEFULLY ABORT IF REDUNDANT
                                            if (isRedundant) {
                                                console.log(">> CLIENT: Redundant card. Aborting transfer cleanly.");
                                                clearTimeout(connectionTimeout);
                                                resolve({ success: false, isRedundant: true });
                                                await cleanup();
                                            }
                                        }
                                    });
                                } catch (err) {
                                    console.error(">> CLIENT: Header parse error", err);
                                }
                                return;
                            }
                            // ==========================================

                            const combinedBuffer = this.incomingBuffer + chunk;

                            if (combinedBuffer.includes('__EOF__')) {
                                console.log(">> CLIENT: EOF Received. Processing final payload...");

                                const finalData = combinedBuffer.replace('__EOF__', '');
                                this.incomingBuffer = ""; 

                                try {
                                    const card = JSON.parse(finalData);
                                    console.log(">> CLIENT: SUCCESS! Unpacked Payload.");

                                    if (card.error) {
                                        clearTimeout(connectionTimeout);
                                        await cleanup();
                                        resolve({ success: false, error: card.error });
                                        return;
                                    }

                                    const timestamp = Date.now();
                                    const actualId = card.id || 'unknown_id';
                                    const receipt = `${actualId}:${timestamp}:${myHandle}`;
                                    const signature = await signData(receipt);
                                    const keys = await getOrGenerateKeys();

                                    if (signature && keys) {
                                        const ackData = { receipt, signature, publicKey: keys.publicKey };
                                        const ackString = `REQ:ACK:${JSON.stringify(ackData)}`;
                                        const ackPayload = Buffer.from(ackString).toString('base64');
                                        await device.writeCharacteristicWithoutResponseForService(
                                            cleanServiceUUID,
                                            cleanCharUUID,
                                            ackPayload
                                        );
                                        console.log(`>> CLIENT: Sent SIGNED ACK for card ${card.id}`);
                                    }

                                    this.updateState('DATA_RECEIVED');
                                    clearTimeout(connectionTimeout);
                                    resolve({ success: true, data: { card, timestamp } });
                                    await cleanup();

                                } catch (parseError) {
                                    console.error(">> CLIENT: JSON Parse Error", parseError);
                                    clearTimeout(connectionTimeout);
                                    resolve({ success: false, error: "Invalid data format from peer." });
                                    await cleanup();
                                }
                            } else {
                                this.incomingBuffer = combinedBuffer;
                            }
                        },
                    );
                    
                    await new Promise(resolve => setTimeout(resolve, 1500)); 
                    
                    const safeReqValue = requestValue ? requestValue : "none";
                    const requestString = `REQ:${requestType}:${safeReqValue}:${myHandle}:${myPublicKey}`;
                    const requestPayload = Buffer.from(requestString).toString('base64');
                    
                    await device.writeCharacteristicWithResponseForService(
                        cleanServiceUUID,
                        cleanCharUUID,
                        requestPayload
                    );

                } catch (e) {
                    console.error(">> CLIENT ERROR:", e.message);
                    this.peerCache.delete(targetHandleOrId);
                    clearTimeout(connectionTimeout);
                    await cleanup(); 
                    resolve({ success: false, error: e.message });
                }
            });
        }
        
        async _safeDisconnect(device, monitor) {
            try {
                await new Promise(r => setTimeout(r, 200)); 
                if (device) {
                    const isConnected = await device.isConnected().catch(() => false);
                    if (isConnected) {
                        await device.cancelConnection();
                    }
                }
            } catch (e) {
                console.log(">> CLEANUP IGNORED:", e.message);
            }
        }

        async transferStats(umpireDeviceId, statsPayload) {
            console.log(`>> STATS: Transferring to Umpire ${umpireDeviceId}`);
            this.updateState('CONNECTING');

            try {
                const device = await this.manager.connectToDevice(umpireDeviceId, { timeout: 10000 });
                await device.discoverAllServicesAndCharacteristics();
                const services = await device.services();
                const service = services.find(s => s.uuid.toLowerCase().includes(TRANSFER_SERVICE_UUID.toLowerCase()));
                if (!service) throw new Error("Umpire service not found.");

                const requestString = `REQ:STAT_PAYLOAD:${JSON.stringify(statsPayload)}`;
                const requestPayload = Buffer.from(requestString).toString('base64');
                
                await device.writeCharacteristicWithResponseForService(
                    service.uuid,
                    TRANSFER_CHAR_UUID,
                    requestPayload
                );

                await device.cancelConnection();
                this.updateState('IDLE');
                return { success: true };

            } catch (e) {
                console.error(">> STATS: Transfer failed", e);
                this.updateState('ERROR');
                return { success: false, error: e.message };
            }
        }

        // --- UMPIRE MODE: CHUNKED DATA PUSH ---
        // 👇 Notice the two new arguments added to the top here 👇
        async sendUmpirePayload(umpireDeviceId, cardsToTransfer, myHandle, umpireHandle, umpireEvent) {
            console.log(`>> UMPIRE SYNC: Establishing secure link to ${umpireDeviceId}...`);
            this.updateState('CONNECTING');
            let device = null;

            try {
                device = await this.manager.connectToDevice(umpireDeviceId, { timeout: 15000 });
                await new Promise(r => setTimeout(r, 1000)); 
                
                console.log(">> UMPIRE SYNC: Requesting MTU 512...");
                try { await device.requestMTU(512); } catch (e) { console.warn("MTU ignored"); }
                await new Promise(r => setTimeout(r, 500));

                await device.discoverAllServicesAndCharacteristics();
                const services = await device.services();
                const service = services.find(s => s.uuid.toLowerCase().includes(TRANSFER_SERVICE_UUID.toLowerCase()));
                if (!service) throw new Error("Umpire GATT service not found.");

                for (const card of cardsToTransfer) {
                    const requestString = `REQ:UMPIRE_PUSH:${myHandle}:${JSON.stringify(card)}`;
                    
                    const CHUNK_SIZE = 300; 
                    const totalSize = requestString.length;
                    let offset = 0;
                    let chunkNumber = 1;
                    
                    while (offset < totalSize) {
                        const chunk = requestString.slice(offset, offset + CHUNK_SIZE);
                        const payload = Buffer.from(chunk).toString('base64');
                        
                        console.log(`>> UMPIRE SYNC: Firing Chunk ${chunkNumber}...`);
                        
                        await device.writeCharacteristicWithoutResponseForService(
                            service.uuid, TRANSFER_CHAR_UUID, payload
                        );
                        
                        offset += CHUNK_SIZE;
                        chunkNumber++;
                        
                        await new Promise(r => setTimeout(r, 600)); 
                    }
                    
                    console.log(`>> UMPIRE SYNC: Firing __EOF__...`);
                    await device.writeCharacteristicWithoutResponseForService(
                        service.uuid, TRANSFER_CHAR_UUID, Buffer.from('__EOF__').toString('base64')
                    );
                    await new Promise(r => setTimeout(r, 600));

                    console.log(`>> UMPIRE SYNC: Payload [${card.title}] successfully transmitted.`);

                    // 👇 NO MORE POST-FLIGHT FORGING 👇
                    // The Umpire payload now fully embodies the Escrow pattern.
                    // The App.js Jitter Sync routine built the entire historical Ledger array,
                    // hashed it securely with the Umpire's Public Key, and committed it to SQLite 
                    // *before* handing it to GATT. Therefore, no secondary callback is required.
                    // 👆 ---------------------------- 👆

                }

                this.updateState('IDLE');
                if (device) await device.cancelConnection().catch(() => {});
                return { success: true };

            } catch (e) {
                console.error(">> UMPIRE SYNC: Transfer failed -", e.message);
                this.updateState('ERROR');
                return { success: false, error: e.message };
            }
        }

        _parseIdentity(device) {
            if (!device || !device.manufacturerData) return null;
            try {
                const rawBytes = Buffer.from(device.manufacturerData, 'base64');
                let payloadStartIndex = -1;

                if (rawBytes.length >= 6 && rawBytes[2] === 74 && rawBytes[3] === 87) {
                    payloadStartIndex = 4;
                } 
                else if (rawBytes.length >= 4 && rawBytes[0] === 74 && rawBytes[1] === 87) {
                    payloadStartIndex = 2;
                }

                if (payloadStartIndex === -1) return null;

                const categoryBitmask = rawBytes[payloadStartIndex];
                const packetCount = rawBytes[payloadStartIndex + 1];
                
                let rawHandle = null;
                try {
                    const handleBuffer = rawBytes.slice(payloadStartIndex + 2);
                    rawHandle = handleBuffer.toString('utf8').trim() || null;
                    if (rawHandle && rawHandle.includes('\ufffd')) rawHandle = null;
                } catch (err) {}

                if (!rawHandle) return null;

                let isUmpire = false;
                let eventStartTime = null;
                let isQuestion = false;
                let parsedHandle = rawHandle;
                let subject = null;

                if (rawHandle.startsWith('U:')) {
                    isUmpire = true;
                    const parts = rawHandle.substring(2).split(':');
                    parsedHandle = parts[0];
                    subject = parts.length > 1 ? parts.slice(1).join(':') : null;
                } else {
                    // Bi-Lingual Logic: Detects both Colons and Pipes
                    const parts = rawHandle.includes(':') ? rawHandle.split(':') : rawHandle.split('|');
                    parsedHandle = parts[0];
                    subject = parts.length > 1 ? parts.slice(1).join(rawHandle.includes(':') ? ':' : '|') : null;

                    isQuestion = parsedHandle.startsWith('?');
                    if (isQuestion) {
                        parsedHandle = parsedHandle.substring(1);
                    }
                }
                
                return {
                    uid: device.id,
                    handle: parsedHandle,
                    subject: subject,
                    isQuestion: isQuestion, 
                    isUmpire: isUmpire,
                    eventStartTime: eventStartTime,
                    categoryBitmask: categoryBitmask,
                    packetCount: packetCount,
                };        
            } catch (e) { 
                return null; 
            }
        }

// --- THE ZIPPER ENGINE ---
    async processIncomingZipper(payload) {
        try {
            // The payload is typically: ACK:DELTA_PAYLOAD:cardId:[JSON]
            // We only need the cardId from the header parts
            const parts = payload.split(':', 3);
            const cardId = parts[2];

            // Robust JSON extraction: Find the first '[' or '{' to avoid splitting colons inside the JSON string
            const jsonStartIndex = payload.indexOf('[') !== -1 ? payload.indexOf('[') : payload.indexOf('{');
            if (jsonStartIndex === -1) return { success: false, error: 'No JSON payload found' };
            const jsonPayload = payload.substring(jsonStartIndex);
            const incomingHistory = JSON.parse(jsonPayload);

            // Import database functions locally to avoid circular dependency issues
            const { getCardById, insertOrReplaceCard } = require('../model/database');
            
            const localCard = await getCardById(cardId);
            if (!localCard) return { success: false, error: 'Card Not Found' };

            console.log(`>> MESH: Verifying payload block. Zipping ledgers...`);
            
            // Merge logic: Combine local and incoming, remove duplicates by signature
            const combined = [...localCard.history, ...incomingHistory];
            const finalLedger = Array.from(new Map(combined.map(item => [item.signature, item])).values())
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            // Update SQLite with the new combined history
            await insertOrReplaceCard({
                ...localCard,
                history: finalLedger,
                hops: finalLedger.length
            });

            return { success: true, finalLedger };
        } catch (e) {
            console.error(">> MESH: Zipper Failed", e);
            return { success: false };
        }
    }

    async sendReturnPing(remoteAddress, finalLedger) {
        try {
            const device = await this.manager.connectToDevice(remoteAddress, { timeout: 5000 });
            await device.discoverAllServicesAndCharacteristics();
            
            const payload = `ACK:SYNC_LEDGER:${JSON.stringify(finalLedger)}__EOF__`;
            const chunk = Buffer.from(payload).toString('base64');

            await device.writeCharacteristicWithoutResponseForService(
                TRANSFER_SERVICE_UUID, TRANSFER_CHAR_UUID, chunk
            );
            
            console.log(">> MESH: Return ping sent. Handshake complete.");
            await device.cancelConnection();
        } catch (e) {
            console.error(">> MESH: Return Ping Failed", e);
        }
    }

    async requestDelta(remoteAddress, cardId, localSignatures) {
        try {
            // Reconnect to send the inventory list
            const device = await this.manager.connectToDevice(remoteAddress, { timeout: 5000 });
            await device.discoverAllServicesAndCharacteristics();
            
            // Format: REQ : DELTA : CARD_ID : [ARRAY_OF_SIGNATURES]
            const payload = `REQ:DELTA:${cardId}:${JSON.stringify(localSignatures)}__EOF__`;
            const chunk = Buffer.from(payload).toString('base64');

            await device.writeCharacteristicWithoutResponseForService(
                TRANSFER_SERVICE_UUID, TRANSFER_CHAR_UUID, chunk
            );
            console.log(`>> MESH: Delta Request sent. Asking peer to filter ${localSignatures.length} signatures.`);
        } catch (e) {
            console.error(">> MESH: Delta Request Failed", e);
        }
    }

    stringToBytes(str) { return[...str].map(c => c.charCodeAt(0)); }
} // <--- THIS SINGLE BRACE NOW CORRECTLY CLOSES THE ENTIRE CLASS

export default new BluetoothService();