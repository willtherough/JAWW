import { BleManager } from 'react-native-ble-plx';
import BLEAdvertiser from 'react-native-ble-advertiser';
import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import { getAllTopics } from '../model/database';
import { signData, getOrGenerateKeys } from '../model/Security';
import { getAdvertisedCard, setAdvertisedCard, clearAdvertisedCard } from './BroadcastState';

const SOURCE_UUID = '00001101-0000-1000-8000-00805F9B34FB';
const COMPANY_ID = 0x00FF;
const UNIQUE_KEY_STORAGE = 'SOURCE_UNIQUE_KEY';

// ENGINE 4 UUIDs
export const TRANSFER_SERVICE_UUID = 'baba0001-1234-5678-9abc-def012345678';
export const TRANSFER_CHAR_UUID = 'baba0002-1234-5678-9abc-def012345678';

const MTU = 512;

class BluetoothService {
    constructor() {
        this.manager = new BleManager();
        this.peerCache = new Map(); // Maps handle -> { deviceId, timestamp }
        this.uniqueKey = null;
        this.isBroadcasting = false;
        this.foundDevices = new Map();
        this.onStateChangeCallback = null;
        this.userHandle = "Unknown";
        this.incomingBuffer = "";
        this.questionBroadcastTimer = null;
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

    // --- HOOK & LINE: Question Broadcast Arming ---
    async armQuestionBroadcast(card) {
        console.log(">> HOOK: Arming question broadcast...");
        if (this.questionBroadcastTimer) {
            clearTimeout(this.questionBroadcastTimer);
        }
        
        setAdvertisedCard(card);

        // Restart broadcast with the '?' prefix
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

    // --- ENGINE 1: IRONCLAD MENU BROADCAST (with HOOK logic) ---
    async startAdvertising() {
        this.manager.stopDeviceScan(); // Immediately stop scanning to prevent conflict
        await this.initialize();
        // Do not return if broadcasting, we need to be able to restart it with new data
        if (this.isBroadcasting) {
            await this.stopBroadcasting();
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

        // --- HOOK LOGIC ---
        const isQuestionArmed = !!getAdvertisedCard();
        let handleToBroadcast = this.userHandle || 'Unknown';
        if (isQuestionArmed) {
            handleToBroadcast = `?${handleToBroadcast}`;
            console.log(">> HOOK: Broadcasting with question flag.");
        }
        // ------------------

        const truncatedHandle = handleToBroadcast.substring(0, 10);
        const handleBytes = this.stringToBytes(truncatedHandle);

        const payload = [74, 87, categoryBitmask, packetCount, ...handleBytes];

        try {
            await BLEAdvertiser.broadcast(SOURCE_UUID, payload, {
                advertiseMode: BLEAdvertiser.ADVERTISE_MODE_LOW_LATENCY,
                txPowerLevel: BLEAdvertiser.ADVERTISE_TX_POWER_HIGH,
                connectable: true,
                includeDeviceName: false,
            });
            this.isBroadcasting = true;
            console.log(`>> IRONCLAD V2: ON. Handle: "${truncatedHandle}", Bitmask: ${categoryBitmask}`);
        } catch (e) {
            console.error(">> IRONCLAD BROADCAST FAIL:", e);
            this.updateState('ERROR');
        }
    }

    async stopBroadcasting() {
        try {
            await BLEAdvertiser.stopBroadcast();
            this.isBroadcasting = false;
            this.updateState('IDLE');
            console.log(">> LIGHTHOUSE: OFF");
        } catch (e) { }
    }

    // --- ENGINE 2: RADAR SCANNING ---
    async startScanning(onDeviceFound) {
        // Do not stop broadcasting when scanning
        // await this.stopBroadcasting(); 
        const hasPerms = await this.requestPermissions();
        if (!hasPerms) return;

        console.log(">> RADAR: Scanning...");
        this.foundDevices.clear();

        this.manager.startDeviceScan([], { allowDuplicates: true, scanMode: 1 }, (error, device) => {
            if (error || !device) return;

            const identity = this._parseIdentity(device);
            if (identity) {
                this.peerCache.set(identity.handle, { deviceId: identity.uid, timestamp: Date.now() });
                // Do not use foundDevices map, pass directly to UI
                onDeviceFound({
                    id: identity.uid,
                    name: identity.handle,
                    rssi: device.rssi,
                    categoryBitmask: identity.categoryBitmask,
                    packetCount: identity.packetCount,
                    isQuestion: identity.isQuestion, // Pass the flag to the UI
                });
            }
        });
    }

    // --- ENGINE 2.5: TARGET SCANNING (With Safety Valve) ---
    async scanForTarget(targetHandle, onTargetFound) {
        const hasPerms = await this.requestPermissions();
        if (!hasPerms) {
            onTargetFound(null); // No perms = immediate failure
            return;
        }

        console.log(`>> HUNTER: Scanning specifically for handle "${targetHandle}"...`);
        
        const huntTimeout = setTimeout(() => {
            console.log(">> HUNTER: Timeout. Target not found.");
            this.manager.stopDeviceScan();
            onTargetFound(null); // Signal failure to UI
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
                        this.manager.stopDeviceScan();
                        
                        onTargetFound(identity.uid); // Success
                    }
                }
            }
        );
    }

    stopScanning() {
        this.manager.stopDeviceScan();
        console.log(">> RADAR/HUNTER: OFF");
    }

    async getDeviceId(handle) {
        if (handle.includes(':')) {
            return handle;
        }

        const cached = this.peerCache.get(handle);
        if (cached && (Date.now() - cached.timestamp) < 60000) {
            return cached.deviceId;
        }

        console.log(`>> RESOLVER: ${handle} is stale or not in cache. Performing quick scan...`);
        return new Promise(resolve => {
            const quickScanTimeout = setTimeout(() => {
                this.manager.stopDeviceScan();
                resolve(this.peerCache.get(handle)?.deviceId || null);
            }, 2000); 

            this.manager.startDeviceScan([], { allowDuplicates: true, scanMode: 1 }, (error, device) => {
                if (error || !device) return;
                const identity = this._parseIdentity(device);
                if (identity) {
                    this.peerCache.set(identity.handle, { deviceId: identity.uid, timestamp: Date.now() });
                    if (identity.handle.trim() === handle.trim()) {
                        clearTimeout(quickScanTimeout);
                        this.manager.stopDeviceScan();
                        resolve(identity.uid);
                    }
                }
            });
        });
    }

    // --- ENGINE 3: THE CLIENT ---
    async connectAndRequest(targetHandleOrId, requestType, requestValue, myHandle, myPublicKey) {
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
        
            if (disconnectionSubscription) {
                disconnectionSubscription.remove();
                disconnectionSubscription = null;
            }
            characteristicMonitor = null; 
            
            if (device) {
                try {
                    const isConnected = await device.isConnected();
                    if (isConnected) {
                        await device.cancelConnection();
                        console.log(">> CLEANUP: Successfully cancelled connection.");
                    }
                } catch (e) {
                    console.log(">> CLEANUP: Safe disconnect ignored.", e.message);
                }
            }
            this.updateState('IDLE');
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

                await new Promise(r => setTimeout(r, 1000));
                console.log(">> CLIENT: Discovering services...");
                await device.discoverAllServicesAndCharacteristics();
                
                await new Promise(r => setTimeout(r, 500));
                console.log(">> CLIENT: Requesting MTU...");
                await device.requestMTU(512);

                await new Promise(resolve => setTimeout(resolve, 800));

                const cleanServiceUUID = TRANSFER_SERVICE_UUID.toLowerCase();
                const cleanCharUUID = TRANSFER_CHAR_UUID.toLowerCase();

                const services = await device.services();
                let targetService = services.find(s => String(s.uuid).toLowerCase().includes(cleanServiceUUID));

                if (!targetService) {
                    console.log(">> CLIENT ERROR: Target is not a JAWW node.");
                    clearTimeout(connectionTimeout);
                    await cleanup();
                    resolve({ success: false, error: 'Target Invalid' });
                    return;
                }

                console.log(">> CLIENT: JAWW Service found. Verifying characteristic...");
                const characteristics = await device.characteristicsForService(targetService.uuid);
                const hasCharacteristic = characteristics.some(c => c.uuid.toLowerCase().includes(cleanCharUUID));
                
                if (!hasCharacteristic) {
                    console.log(">> CLIENT ERROR: Mailbox missing!");
                    clearTimeout(connectionTimeout);
                    await cleanup();
                    resolve({ success: false, error: 'Characteristic Missing' });
                    return;
                }

                console.log(">> CLIENT: Characteristic verified. Subscribing...");

                characteristicMonitor = device.monitorCharacteristicForService(
                    targetService.uuid,
                    cleanCharUUID,
                    async (error, char) => {
                        if (error) {
                            if (error.errorCode === 2) return;
                            console.error(">> MONITOR ERROR:", error.message);
                            return;
                        }

                        if (!char?.value) return;

                        const chunk = Buffer.from(char.value, 'base64').toString('utf8');
                        
                        if (chunk === "__WAIT__") {
                            console.log(">> CLIENT: Server acknowledged request, waiting for human approval...");
                            return;
                        }

                        const combinedBuffer = this.incomingBuffer + chunk;

                        if (combinedBuffer.includes('__EOF__')) {
                            console.log(">> CLIENT: EOF Received. Processing final payload...");

                            const finalData = combinedBuffer.replace('__EOF__', '');
                            this.incomingBuffer = ""; 

                            try {
                                const card = JSON.parse(finalData);
                                console.log(">> CLIENT: SUCCESS! Unpacked Payload.");

                                if (card.error) {
                                    console.log(`>> CLIENT: Received error from server: ${card.error}`);
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
                                resolve({ success: true, data: card });

                            } catch (parseError) {
                                console.error(">> CLIENT: JSON Parse Error", parseError);
                                clearTimeout(connectionTimeout);
                                resolve({ success: false, error: "Invalid data format from peer." });
                            }
                        } else {
                            this.incomingBuffer = combinedBuffer;
                        }
                    },
                );
                
                await new Promise(resolve => setTimeout(resolve, 1500)); 
                
                console.log(">> CLIENT: Writing request to trigger data stream...");
                const safeReqValue = requestValue ? requestValue : "none";
                const requestString = `REQ:${requestType}:${safeReqValue}:${myHandle}:${myPublicKey}`;
                const requestPayload = Buffer.from(requestString).toString('base64');
                
                await device.writeCharacteristicWithResponseForService(
                    cleanServiceUUID,
                    cleanCharUUID,
                    requestPayload
                );
                console.log(`>> CLIENT: Sent Request -> ${requestString}`);

            } catch (e) {
                console.error(">> CLIENT ERROR:", e.message);
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
            
            let rawHandle = "Unknown";
            try {
                const handleBuffer = rawBytes.slice(payloadStartIndex + 2);
                rawHandle = handleBuffer.toString('utf8').trim() || "Unknown";
                
                if (rawHandle.includes('\ufffd')) rawHandle = "Unknown Node";
            } catch (err) {
                rawHandle = "Unknown Node";
            }

            // --- HOOK PARSING LOGIC ---
            const isQuestion = rawHandle.startsWith('?');
            const handle = isQuestion ? rawHandle.substring(1) : rawHandle;
            // --------------------------

            return {
                uid: device.id,
                handle: handle,
                isQuestion: isQuestion, // Add the flag here
                categoryBitmask: categoryBitmask,
                packetCount: packetCount,
            };
        } catch (e) { 
            return null; 
        }
    }

    stringToBytes(str) { return [...str].map(c => c.charCodeAt(0)); }
}

export default new BluetoothService();