import { BleManager, ScanMode } from 'react-native-ble-plx';
import BLEAdvertiser from 'react-native-ble-advertiser';
import { PermissionsAndroid, Platform, Alert } from 'react-native';
import { chunkData, reassembleData } from '../utils/Chunker'; // Ensure reassembleData is imported!
import { decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';

const SOURCE_UUID = '00001101-0000-1000-8000-00805F9B34FB';

class BluetoothService {
  constructor() {
    this.manager = new BleManager();
    this.isBroadcasting = false;
    this.broadcastInterval = null;
    this.onCardReceivedCallback = null;
    
    // MEMORY FOR REASSEMBLY
    this.downloadBuffer = new Set(); // GLOBAL BUFFER: Ignore MAC rotation, collect all valid chunks here.
    this.readyChunks = null; // PRE-PACKAGING: Store pre-calculated chunks here.
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
        return Object.values(granted).every(status => status === PermissionsAndroid.RESULTS.GRANTED);
      } catch (err) { console.warn(err); return false; }
    }
    return true;
  }

  // --- 2. SCANNING (THE RADAR) ---
  async startScanning(onCardFound) {
    const hasPerms = await this.requestPermissions();
    if (!hasPerms) return;
    
    console.log('>> RADAR: Starting Scan for Truth...');
    this.onCardReceivedCallback = onCardFound;

    this.manager.startDeviceScan(
      [SOURCE_UUID], // <--- RESTORED: Scan specifically for our UUID. Reliable & Fast.
      { allowDuplicates: true, scanMode: ScanMode.LowLatency }, // TASK 2: AGGRESSIVE SCANNING
      (error, device) => {
        if (error) {
          // Error 600 is Location Services. If you are sure they are on, we ignore the alert.
          console.log("Scan Error:", error.errorCode, error.message);
          return;
        }

        if (device) {
           if (device.manufacturerData) console.log(">> RAW HIT:", device.id, device.rssi); // DEBUG: Prove the radio works
           this._processSignal(device);
        }
      }
    );
  }

  async stopScanning() {
    this.manager.stopDeviceScan();
    console.log('>> RADAR: Offline.');
  }

  // --- 3. THE DECODER + STITCHER ---
  _processSignal(device) {
    if (!device.manufacturerData) return;

    try {
      // 1. DECODE RAW BYTES
      const rawBytes = decodeBase64(device.manufacturerData);
      if (rawBytes.length < 3) return; 

      // Remove Apple ID (The "L")
      const payloadBytes = rawBytes.subarray(2); 
      const rawString = encodeUTF8(payloadBytes);

      // 2. CHECK FOR CHUNKS (Format: "1/5|...")
      // Regex looks for: Number + slash + Number + pipe
      const chunkMatch = rawString.match(/^(\d+)\/(\d+)\|/);

      if (chunkMatch) {
          // --- IT IS A PAGE (DATA) ---
          const totalPackets = parseInt(chunkMatch[2]);
          
          // 1. Add to Global Buffer (Ignoring MAC Address)
          this.downloadBuffer.add(rawString);

          // Calculate Progress
          const collectedCount = this.downloadBuffer.size;
          const progress = Math.floor((collectedCount / totalPackets) * 100);
          
          // STABLE ID: Use a constant ID for the stream so the Radar doesn't flicker with new dots
          const STREAM_ID = "TACTICAL_STREAM_V1"; 

          // Attempt Reassembly
          if (collectedCount >= totalPackets) {
              const fullContent = reassembleData(Array.from(this.downloadBuffer));
              if (fullContent) {
                  try {
                      const card = JSON.parse(fullContent);
                      // SUCCESS: WE HAVE THE BOOK!
                      this.onCardReceivedCallback({
                          id: STREAM_ID, // Stable ID
                          // name: "Unknown Operator", // REMOVED: Don't overwrite identity. App.js will handle fallback.
                          offer: { ...card, title: card.title, author: card.author || (card.genesis && card.genesis.author_id) || 'Unknown' }, // <--- FIX: Pass FULL card data
                          rssi: device.rssi,
                          isComplete: true,
                          _raw: device
                      });
                      return; // Done
                  } catch (e) {
                      console.log("JSON Parse Failed", e);
                      console.log(">> RAW PAYLOAD:", fullContent);
                  }
              }
          }

          // SILENCE: Do not report progress. Wait for full reassembly to avoid "Ghost Dots".
      } else {
          // --- IT IS A NAME (IDENTITY) ---
          // Clean the string
          // FILTER NOISE: Only allow printable ASCII. Prevents random devices (headphones) from showing up.
          if (!/^[\x20-\x7E]+$/.test(rawString)) return;

          this.onCardReceivedCallback({
              id: device.id,
              name: rawString, // "Mel"
              rssi: device.rssi,
              timestamp: Date.now(),
              _raw: device
          });
      }

    } catch (e) { return; }
  }

  // --- PRE-PACKAGING HELPER ---
  _generateChunks(identityHandle, packetToBroadcast) {
    // 1. MINIFY: Strip heavy history to save bandwidth
    let optimizedPacket = { ...packetToBroadcast, history: [], relayedBy: identityHandle };
    
    // 2. SIZE CHECK
    const jsonString = JSON.stringify(optimizedPacket);
    const byteSize = encodeUTF8(jsonString).length;
    const LIMIT = 500; 

    if (byteSize > LIMIT) {
        optimizedPacket = {
            ...optimizedPacket,
            body: null,
            body_json: null,
            is_heavy: true, 
            note: "Content too large for broadcast. Direct connection required."
        };
    }
    return chunkData(JSON.stringify(optimizedPacket));
  }

  // TASK 1: SILENT PRE-PACKAGING (Does NOT start radio)
  prepareBroadcast(identityHandle, packetToBroadcast) {
      if (!packetToBroadcast) { this.readyChunks = null; return; }
      this.readyChunks = this._generateChunks(identityHandle, packetToBroadcast);
      console.log(`>> PRE-PACKAGING: Ready with ${this.readyChunks.length} chunks.`);
  }

  // --- 4. BROADCASTING ---
  async startBroadcasting(identityHandle, packetToBroadcast = null) {
    if (this.isBroadcasting) return; 

    console.log('>> BROADCAST: Initializing...');
    BLEAdvertiser.setCompanyId(0x004C); 
    this.isBroadcasting = true;

    // DETERMINE DATA SOURCE
    let chunks;
    if (packetToBroadcast) {
        chunks = this._generateChunks(identityHandle, packetToBroadcast);
    } else if (this.readyChunks) {
        chunks = this.readyChunks;
    }

    // SCENARIO A: IDENTITY MODE
    if (!chunks) {
      try {
        // TRUNCATE HANDLE: 128-bit UUIDs (16 bytes) + Headers (4 bytes) + Flags (3 bytes) = 23 bytes.
        // This leaves ~8 bytes. To be safe and avoid "Ghost" bugs, we limit payload to 6 bytes.
        const payload = Array.from(decodeUTF8(identityHandle.substring(0, 6))); // FIX: Convert Uint8Array to Array
        await BLEAdvertiser.broadcast(SOURCE_UUID, payload, {
            advertiseMode: BLEAdvertiser.ADVERTISE_MODE_LOW_LATENCY, // BOOST: Broadcast faster
            txPowerLevel: BLEAdvertiser.ADVERTISE_TX_POWER_HIGH,
            connectable: false,
            includeDeviceName: false,
            serviceUUIDs: [SOURCE_UUID] // <--- RESTORED: We have room now (12 byte payload + 16 byte UUID fits!)
        });
      } catch (e) { console.log("Broadcast Error:", e); }
      return;
    }

    // SCENARIO B: DATA MODE
    console.log(`>> BROADCAST: Data Mode (${chunks.length} chunks)`);
    

    let index = 0;
    this.broadcastInterval = setInterval(async () => {
        if (!this.isBroadcasting) { clearInterval(this.broadcastInterval); return; }

        const chunk = chunks[index];
        const payloadBytes = Array.from(decodeUTF8(chunk)); // FIX: Convert Uint8Array to Array

        try { await BLEAdvertiser.stopBroadcast(); } catch (e) {}

        try {
            await BLEAdvertiser.broadcast(SOURCE_UUID, payloadBytes, {
                advertiseMode: BLEAdvertiser.ADVERTISE_MODE_LOW_LATENCY,
                txPowerLevel: BLEAdvertiser.ADVERTISE_TX_POWER_HIGH,
                connectable: false,
                includeDeviceName: false, 
                serviceUUIDs: [SOURCE_UUID] // <--- RESTORED
            });
        } catch (e) {
             if (!e.toString().includes("31 bytes")) console.log(">> TX FAILED:", e);
        }

        index = (index + 1) % chunks.length; 
    }, 40); // TASK 3: FLOOD MODE (40ms)
  }

  async stopBroadcasting() {
    this.isBroadcasting = false;
    this.downloadBuffer.clear(); // Clear memory
    if (this.broadcastInterval) clearInterval(this.broadcastInterval);
    try { await BLEAdvertiser.stopBroadcast(); } catch (e) {}
    console.log('>> BROADCAST: OFFLINE.');
  }
}

export default new BluetoothService();