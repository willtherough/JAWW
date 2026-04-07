// services/Receiver.js
// THE HANDSHAKE PROTOCOL (Hybrid Mode)
// Handles both Real Bluetooth connections and Simulation testing.

import BluetoothService from './BluetoothService';
import { atob } from 'react-native-quick-base64';
import { createCard } from '../model/Schema';
import { signData, getOrGenerateKeys } from '../model/Security';
import { Buffer } from 'buffer'; // Corrected from 'Crypto' to match your project

import { signData, getOrGenerateKeys } from '../model/Security';
import { Buffer } from 'buffer';

// --- 1. THE MAIN ENTRY POINT ---
export const grabCardFromDevice = async (device, onProgress, onComplete) => {
  console.log(`>> RECEIVER: Initiating Handshake with ${device.name || device.id}...`);

  // CHECK: Is this a Real Device or a Simulation Ghost?
  if (typeof device.connect !== 'function') {
    console.log(">> RECEIVER: Detected Simulated Device. Running Virtual Handshake.");
    simulateDownload(device, onProgress, onComplete);
    return;
  }

  // --- REAL BLUETOOTH LOGIC ---
  try {
    // 1. SAFETY STOP & STATE UPDATE
    BluetoothService.stopScanning();
    BluetoothService.updateState('CONNECTING');

    setTimeout(async () => {
      try {
        const connectedDevice = await device.connect();
        BluetoothService.updateState('CONNECTED');
        await connectedDevice.discoverAllServicesAndCharacteristics();

        let totalChunks = 0;
        let receivedChunks = {};
        let isComplete = false;

        const subscription = connectedDevice.monitorCharacteristicForService(
          '0000CC00-0000-1000-8000-00805F9B34FB', // SERVICE UUID
          '0000CC01-0000-1000-8000-00805F9B34FB', // CHAR UUID
          (error, characteristic) => {
            if (error) {
              console.error('>> RECEIVER ERROR:', error);
              BluetoothService.updateState('ERROR');
              subscription.remove();
              return;
            }

            const rawData = atob(characteristic.value);
            const separatorIndex = rawData.indexOf('|');
            if (separatorIndex === -1) return;

            const header = rawData.substring(0, separatorIndex);
            const body = rawData.substring(separatorIndex + 1);

            const [indexStr, totalStr] = header.split('/');
            const index = parseInt(indexStr);
            const total = parseInt(totalStr);

            if (!totalChunks) totalChunks = total;
            receivedChunks[index] = body;

            const progress = Math.floor((Object.keys(receivedChunks).length / totalChunks) * 100);
            onProgress(progress);

            if (Object.keys(receivedChunks).length === totalChunks && !isComplete) {
              isComplete = true;
              subscription.remove();
              finishDownload(connectedDevice, receivedChunks, totalChunks, onComplete);
            }
          }
        );
      } catch (err) {
        console.error('>> CONNECTION FAILED:', err);
        BluetoothService.updateState('ERROR');
        onComplete(null, err);
      }
    }, 500); // 500ms breather for the hardware

  } catch (err) {
    console.error('>> PRE-CONNECTION FAILED:', err);
    BluetoothService.updateState('ERROR');
    onComplete(null, err);
  }
};

// --- 2. REASSEMBLY LOGIC (Real) ---
const finishDownload = async (device, chunks, total, callback) => {
  try {
    let fullJson = '';
    for (let i = 1; i <= total; i++) {
      fullJson += chunks[i];
    }
    const card = JSON.parse(fullJson);

    // --- FIX: SEND ACKNOWLEDGEMENT ---
    const myHandle = BluetoothService.userHandle || 'Unknown';
    const timestamp = Date.now();
    const receipt = `${card.id}:${timestamp}:${myHandle}`;
    const signature = await signData(receipt);
    const keys = await getOrGenerateKeys();

    if (signature && keys) {
        const ackData = { receipt, signature, publicKey: keys.publicKey };
        const ackString = `REQ:ACK:${JSON.stringify(ackData)}`;
        const ackPayload = Buffer.from(ackString).toString('base64');
        
        try {
            await device.writeCharacteristicWithoutResponseForService(
                '0000CC00-0000-1000-8000-00805F9B34FB',
                '0000CC01-0000-1000-8000-00805F9B34FB',
                ackPayload
            );
            console.log(`>> RECEIVER: Sent signed ACK for ${card.id}`);
        } catch (e) {
            console.warn(">> RECEIVER: Failed to send ACK.", e);
        }
    }
    // --- END FIX ---

    await device.cancelConnection();
    BluetoothService.updateState('IDLE');
    callback(card, null);

  } catch (e) {
    BluetoothService.updateState('ERROR');
    callback(null, e);
  }
};

// --- 3. SIMULATION LOGIC (Virtual) ---
const simulateDownload = (device, onProgress, onComplete) => {
    let progress = 0;
    const interval = setInterval(() => {
        progress += 20; 
        onProgress(progress);

        if (progress >= 100) {
            clearInterval(interval);
            
            // Create a fake card to return to the UI
            const downloadedCard = {
                id: `imported-${Date.now()}`,
                title: device.offer ? device.offer.title : "Intercepted Signal",
                body: "This is simulated content representing a verified intel package transferred over the mesh.",
                author: device.handle || "UNKNOWN",
                path: "human/tech/simulation", 
                hops: 5,
                genesis: {
                    timestamp: new Date().toISOString(),
                    author_id: device.handle || "UNKNOWN",
                    signature: "mock_sig"
                },
                safety: { flag_count: 0 }
            };
            
            onComplete(downloadedCard, null);
        }
    }, 500);
};