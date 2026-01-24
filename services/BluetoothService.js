import { BleManager } from 'react-native-ble-plx';
import BLEAdvertiser from 'react-native-ble-advertiser';
import { PermissionsAndroid, Platform } from 'react-native';
import { chunkData } from '../utils/Chunker';
import { Buffer } from 'buffer'; // Ensure you have 'buffer' installed

// --- THE CONSTITUTION (CONSTANTS) ---
// Short 16-bit UUID (Saves 14 bytes of payload space)
// This is the specific frequency The Source listens on.
const SOURCE_UUID = '0000CC00-0000-1000-8000-00805F9B34FB';

// The "Hierarchy of Truth" (Anti-Bot Headers)
export const ORIGIN_STATUS = {
  VERIFIED: 'VERIFIED',         // Trusted Local (Green Shield)
  UNVERIFIED: 'UNVERIFIED',     // Stranger (Neutral)
  KING_OF_BOTS: 'KING_OF_BOTS'  // Known Bot Farm (Red Warning)
};

// HELPER: Convert String to Byte Array
const stringToBytes = (str) => {
  return Array.from(str).map(c => c.charCodeAt(0));
};

class BluetoothService {
  constructor() {
    this.manager = new BleManager();
    
    // Broadcasting State
    this.isBroadcasting = false;
    this.broadcastInterval = null;
    
    // Scanning & Reassembly State
    this.scannedPackets = {}; // Store chunks here: { deviceId: [chunk1, chunk2] }
    this.onCardReceivedCallback = null; // UI Callback
  }

  // --- UPDATED PROTOCOL LAYER ---
  // Wraps content in the Constitution and SIGNS it.
  createPacket(content, identityService) {
    const timestamp = Date.now();
    
    // 1. GET THE KEYS (From the Service)
    if (!identityService.publicKey) {
        console.error("Identity not ready!");
        return null;
    }
    const authorPubKey = identityService.publicKey;

    // 2. SIGN THE PAYLOAD
    // We sign "Content + Timestamp" to prevent hackers from re-playing old messages.
    const signablePayload = `${content}|${timestamp}`; 
    const signature = identityService.signMessage(signablePayload);

    const packet = {
      header: {
        ver: '1.0',
        timestamp: timestamp,
        // The Trapdoor for bots
        origin_status: ORIGIN_STATUS.UNVERIFIED, 
      },
      payload: {
        id: `card_${timestamp}_${authorPubKey.slice(0,8)}`,
        content: content,
        author_pubkey: authorPubKey,
        signature: signature // <--- REAL CRYPTO PROOF
      }
    };
    
    return packet;
  }

  // --- 1. PERMISSIONS ---
  async requestPermissions() {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        ]);
        const scan = granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED;
        const connect = granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;
        const advertise = granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE] === PermissionsAndroid.RESULTS.GRANTED;
        return (scan && connect && advertise);
      } catch (err) { console.warn(err); return false; }
    }
    return true;
  }

  // --- 2. SCANNING (THE RECEIVER) ---
  async startScanning(onCardFound) {
    const hasPerms = await this.requestPermissions();
    if (!hasPerms) return;
    
    console.log('>> RADAR: Starting Scan for Truth...');
    this.onCardReceivedCallback = onCardFound;

    this.manager.startDeviceScan(
      [SOURCE_UUID], // Only listen to our frequency
      { allowDuplicates: true }, // Needed to catch rotating chunks
      (error, device) => {
        if (error) {
          if (error.errorCode !== 600) console.log("Scan Error:", error);
          return;
        }

        // If we found a device with data, process it
        if (device && device.manufacturerData) {
          this._processSignal(device.manufacturerData, device.id);
        }
      }
    );
  }

  async stopScanning() {
    this.manager.stopDeviceScan();
    console.log('>> RADAR: Offline.');
  }

  // --- 3. THE REASSEMBLER (INTERNAL LOGIC) ---
  _processSignal(base64Data, deviceId) {
    try {
      // Decode the raw signal from the air
      const rawString = Buffer.from(base64Data, 'base64').toString('utf8');
      
      // LOGIC: Check if it's a full JSON packet or a chunk
      // (For MVP Phase 5, we assume small packets fit in one go)
      if (rawString.startsWith('{') && rawString.endsWith('}')) {
        const card = JSON.parse(rawString);
        this._handleFullCard(card);
      } else {
        // Placeholder for "Meat Grinder" Reassembly
        // e.g. "1|3|Part1..." -> Store in this.scannedPackets[deviceId]
        // console.log(">> CHUNK DETECTED:", rawString);
      }
    } catch (e) {
      // Ignore noise
    }
  }

  _handleFullCard(card) {
    // 1. VALIDATE: Does it have the Constitution headers?
    if (!card.header || !card.header.origin_status) {
      return; // Malformed data
    }

    // 2. CHECK VACCINE (Phase 8 Hook):
    // if (isBotSludge(card.payload.content)) card.header.origin_status = 'KING_OF_BOTS';

    // 3. DELIVER: Send it up to the UI
    if (this.onCardReceivedCallback) {
      this.onCardReceivedCallback(card);
    }
  }

  // --- 4. BROADCASTING (THE TRANSMITTER) ---
  async startBroadcasting(identityHandle, packetToBroadcast = null) {
    if (this.isBroadcasting) return; 

    console.log('>> BROADCAST: Initializing...');
    
    BLEAdvertiser.setCompanyId(0x004C); // Apple ID for max compatibility
    this.isBroadcasting = true;

    // SCENARIO A: IDENTITY ONLY (Pulse Mode)
    if (!packetToBroadcast) {
      try {
        console.log(`>> BROADCAST: Identity Mode (${identityHandle})`);
        await BLEAdvertiser.broadcast(SOURCE_UUID, [12, 34], {
            advertiseMode: BLEAdvertiser.ADVERTISE_MODE_BALANCED,
            txPowerLevel: BLEAdvertiser.ADVERTISE_TX_POWER_HIGH,
            connectable: false,
            includeDeviceName: false,
            includeTxPowerLevel: false,
            serviceUUIDs: [SOURCE_UUID]
        });
      } catch (e) { console.log("Broadcast Error:", e); }
      return;
    }

    // SCENARIO B: DATA ROTATION (The Meat Grinder)
    console.log(`>> BROADCAST: Data Mode (Sending Knowledge Card)`);
    
    const cardString = JSON.stringify(packetToBroadcast);
    const chunks = chunkData(cardString);
    console.log(`>> CHUNKER: Loaded ${chunks.length} packets.`);

    let index = 0;

    // The Pulse: Change packets every 350ms
    this.broadcastInterval = setInterval(async () => {
        if (!this.isBroadcasting) {
            clearInterval(this.broadcastInterval);
            return;
        }

        const chunk = chunks[index];
        const payloadBytes = stringToBytes(chunk);

        // Stop the previous packet to refresh the payload
        try { await BLEAdvertiser.stopBroadcast(); } catch (e) {}

        // Broadcast the new packet
        try {
            await BLEAdvertiser.broadcast(SOURCE_UUID, payloadBytes, {
                advertiseMode: BLEAdvertiser.ADVERTISE_MODE_LOW_LATENCY,
                txPowerLevel: BLEAdvertiser.ADVERTISE_TX_POWER_HIGH,
                connectable: false,
                includeDeviceName: false,
                includeTxPowerLevel: false,
                serviceUUIDs: [SOURCE_UUID]
            });
            if (index === 0) console.log(`>> TX LOOP: Restarting Cycle...`);
        } catch (e) {
            console.log(">> TX FAILED:", e);
        }

        index = (index + 1) % chunks.length; 
    }, 350); 
  }

  async stopBroadcasting() {
    this.isBroadcasting = false;
    if (this.broadcastInterval) clearInterval(this.broadcastInterval);
    
    try {
      await BLEAdvertiser.stopBroadcast();
      console.log('>> BROADCAST: OFFLINE.');
    } catch (error) { 
        console.log('>> STOP STATUS:', error); 
    }
  }
}

export default new BluetoothService();