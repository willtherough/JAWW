// services/Receiver.js
// THE HANDSHAKE PROTOCOL (Hybrid Mode)
// Handles both Real Bluetooth connections and Simulation testing.

import { createCard } from '../model/Schema';
import { verifySignature } from '../model/Security'; // Corrected from 'Crypto' to match your project

// --- 1. THE MAIN ENTRY POINT ---
export const grabCardFromDevice = async (device, onProgress, onComplete) => {
  console.log(`>> RECEIVER: Initiating Handshake with ${device.name || device.id}...`);

  // CHECK: Is this a Real Device or a Simulation Ghost?
  // Real 'ble-plx' devices have a .connect() method. Simulated ones don't.
  if (typeof device.connect !== 'function') {
      console.log(">> RECEIVER: Detected Simulated Device. Running Virtual Handshake.");
      simulateDownload(device, onProgress, onComplete);
      return;
  }

  // --- REAL BLUETOOTH LOGIC (Your Code) ---
  try {
    // 1. CONNECT & DISCOVER
    const connectedDevice = await device.connect();
    await connectedDevice.discoverAllServicesAndCharacteristics();

    // 2. PREPARE THE BUFFER
    let totalChunks = 0;
    let receivedChunks = {}; 
    let isComplete = false;

    // 3. SUBSCRIBE TO THE STREAM
    const subscription = connectedDevice.monitorCharacteristicForService(
      '0000CC00-0000-1000-8000-00805F9B34FB', // SERVICE UUID
      '0000CC01-0000-1000-8000-00805F9B34FB', // CHAR UUID
      (error, characteristic) => {
        if (error) {
          console.error('>> RECEIVER ERROR:', error);
          return;
        }

        // 4. DECODE (Assuming Base64 helper exists or using Buffer)
        // For simplicity in this step, we assume raw text or standard Base64
        // In production, we'd import the Chunker helper here.
        const rawData = atob(characteristic.value); // Built-in Base64 decode
        
        const separatorIndex = rawData.indexOf('|');
        if (separatorIndex === -1) return; 

        const header = rawData.substring(0, separatorIndex); // "1/40"
        const body = rawData.substring(separatorIndex + 1); 

        const [indexStr, totalStr] = header.split('/');
        const index = parseInt(indexStr);
        const total = parseInt(totalStr);

        // 5. STORE IT
        if (!totalChunks) totalChunks = total;
        receivedChunks[index] = body;

        // Update Progress UI
        const progress = Math.floor((Object.keys(receivedChunks).length / totalChunks) * 100);
        onProgress(progress);

        // 6. CHECK COMPLETION
        if (Object.keys(receivedChunks).length === totalChunks && !isComplete) {
          isComplete = true;
          subscription.remove(); 
          finishDownload(connectedDevice, receivedChunks, totalChunks, onComplete);
        }
      }
    );

  } catch (err) {
    console.error('>> CONNECTION FAILED:', err);
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

    // Verify Signature
    // const isValid = await verifySignature(JSON.stringify(card.genesis), card.genesis.signature);
    // if (!isValid) throw new Error("Signature Failed");

    await device.cancelConnection(); 
    callback(card, null);

  } catch (e) {
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