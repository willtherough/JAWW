import { NativeModules, DeviceEventEmitter } from 'react-native';
import { Buffer } from 'buffer';
import { searchCards, fetchCards, getCardById, fetchTrustedSources, isBlocked } from '../model/database';
import { verifySignature, getOrGenerateKeys, signData } from '../model/Security';
import { loadProfile } from '../model/Storage';

const { SourceGattModule } = NativeModules;
const CHUNK_SIZE = 150;
const MAX_HANDSHAKE_SIZE = 600;

import { getAdvertisedCard } from './BroadcastState';

let cardReceivedListener = null;

// ==========================================
// --- NEW: HANDSHAKE STATE & INITIATOR ---
// ==========================================
let pendingHandshakeCard = null;

const initiateHandshake = async (card, header) => {
    pendingHandshakeCard = card;
    const headerString = JSON.stringify(header);
    console.log(`>> GATT SERVER: Sending Pre-Flight Header: ${headerString}`);
    try {
        await SourceGattModule.sendData(headerString);
    } catch (e) {
        console.error(">> GATT SERVER: Failed to send header:", e);
    }
};
// ==========================================

const onCardReceived = async (requestString) => {
    console.log(`\n\n// --- RAW PACKET RECEIVED --- //\n${requestString}\n`);
    if (!requestString || typeof requestString !== 'string' || requestString.length > MAX_HANDSHAKE_SIZE) {
        return;
    }

    if (requestString.startsWith('REQ:SYNC_PING:')) {
        const parts = requestString.split(':');
        const cardId = parts[2];
        const senderHandle = parts[3];
        const targetString = parts[4] || '';
        const targets = targetString.split(',');

        console.log(`>> GATT SERVER: Caught Sync Ping for ${cardId} from ${senderHandle}`);
        
        // Pass to App.js to see if we are on the target list
        DeviceEventEmitter.emit('onSyncPingReceived', { cardId, senderHandle, targets });
        return;
    }

    // --- START OF BOUNCER CHALLENGE ---
    if (requestString.startsWith('REQ:CHALLENGE:')) {
        const parts = requestString.split(':');
        const cardId = parts[2];
        const senderHandle = parts[3];
        const nonce = parts[4];

        console.log(`>> BOUNCER: Challenge requested by ${senderHandle} for Card ${cardId}`);

        const localCard = await getCardById(cardId);
        if (!localCard) {
            console.error(">> GATT SERVER: Card not found. Aborting handshake.");
            return;
        }

        if (localCard.history && localCard.history.length > 0) {
            console.log(`\n--- LEDGER ENTRIES FOR CARD ${cardId} ---`);
            localCard.history.forEach((entry, index) => {
                let entryType = "UNKNOWN";
                switch (entry.action) {
                    case "CREATED":
                        entryType = "ORIGIN (Genesis Block)";
                        break;
                    case "SHARED":
                        entryType = "TRANSFER (Shared)";
                        break;
                    case "FORKED":
                        entryType = "BRANCH (Forked)";
                        break;
                    default:
                        entryType = entry.action || "UNKNOWN";
                }
                console.log(`[Entry ${index}] Type: ${entryType} | From: ${entry.from || 'N/A'} -> To: ${entry.to || 'N/A'}`);
            });
            console.log(`-----------------------------------------\n`);
        } else {
            console.log(`>> BOUNCER: Ledger is empty for Card ${cardId}.`);
        }

        // Sign the nonce to prove we are who we say we are
        const { privateKey } = await getOrGenerateKeys();
        const signature = await signData(nonce, privateKey);
        
        // Fetch the profile to get the local user's handle
        const myProfile = await loadProfile();
        const myHandle = myProfile?.handle || "Unknown Operator";

        // Encode the metadata and the handle
        const encodedTitle = Buffer.from(localCard.title || '').toString('base64');
        const encodedTopic = Buffer.from(localCard.classification || '').toString('base64');
        const encodedCreator = Buffer.from(localCard.creator || '').toString('base64');
        const encodedHandle = Buffer.from(myHandle).toString('base64'); // 👇 THE KEY FIX

        // Send the proof AND Metadata + Handle: SIG : PUBKEY : TITLE : TOPIC : CREATOR : HANDLE
        const proofPayload = `ACK:CHALLENGE:${signature}:${myProfile.publicKey}:${encodedTitle}:${encodedTopic}:${encodedCreator}:${encodedHandle}`;
        
        await sendSyncPingBack(cardId, proofPayload); 
        return; 
    }

    // --- START OF DELTA ENGINE (FILTER) ---
    if (requestString.startsWith('REQ:DELTA:')) {
        const rawPayload = requestString.replace('__EOF__', '');
        // Safely parse ID from header
        const parts = rawPayload.split(':', 3); 
        const cardId = parts[2];
        
        // Safely extract JSON array
        const jsonStartIndex = rawPayload.indexOf('[');
        const jsonPayload = jsonStartIndex !== -1 ? rawPayload.substring(jsonStartIndex) : null;

        let remoteSignatures = [];
        try {
            if (!jsonPayload) throw new Error("Missing JSON string.");
            remoteSignatures = JSON.parse(jsonPayload);
        } catch(e) { 
            console.error(">> GATT SERVER: JSON Parse error on signatures"); 
            return; 
        }

        console.log(`>> DELTA ENGINE: Initiator has ${remoteSignatures.length} entries. Cross-referencing...`);

        const localCard = await getCardById(cardId);
        const localLedger = localCard.history || [];

        // THE FILTER: Keep only the entries that Will DOES NOT have
        const missingEntries = localLedger.filter(entry => !remoteSignatures.includes(entry.signature));

        console.log(`>> DELTA ENGINE: Found ${missingEntries.length} new entries to send.`);

        // Send ONLY the missing entries back to Will
        const deltaPayload = `ACK:DELTA_PAYLOAD:${cardId}:${JSON.stringify(missingEntries)}`;
        await sendSyncPingBack(cardId, deltaPayload);
        return;
    }
    // --- END OF DELTA ENGINE ---

    // --- START OF THE FINAL SEAL ---
    if (requestString.startsWith('ACK:SYNC_LEDGER:')) {
        const rawPayload = requestString.replace('__EOF__', '');
        // Safely parse ID from header
        const parts = rawPayload.split(':', 3);
        const cardId = parts[2];
        
        // Safely extract JSON Array
        const jsonStartIndex = rawPayload.indexOf('[') !== -1 ? rawPayload.indexOf('[') : rawPayload.indexOf('{');
        const jsonPayload = jsonStartIndex !== -1 ? rawPayload.substring(jsonStartIndex) : null;

        try {
            if (!jsonPayload) throw new Error("Missing JSON payload inside SYNC_LEDGER.");
            const finalLedger = JSON.parse(jsonPayload);
            const localCard = await getCardById(cardId);
            
            // Calculate the diff for the UI Badge!
            const oldLength = localCard.history ? localCard.history.length : 0;
            const newLength = finalLedger.length;
            const entriesAdded = newLength - oldLength;

            // Update Neo's local database
            await insertOrReplaceCard({
                ...localCard,
                history: finalLedger,
                hops: newLength
            });

            console.log(`>> THE FINAL SEAL: Target updated. Added ${entriesAdded} new entries.`);

            // Trigger the UI jump on Neo's screen
            DeviceEventEmitter.emit('meshSyncComplete', { 
                cardId: cardId, 
                title: localCard.title,
                added: entriesAdded 
            });

        } catch (e) {
            console.error(">> GATT SERVER: Final Seal Failed", e);
        }
        return;
    }
    // --- END OF THE FINAL SEAL --- //

    const request = requestString;

    if (request === 'HANDSHAKE:ACK') {
        if (pendingHandshakeCard) {
            sendCardInChunks(null, pendingHandshakeCard);
            pendingHandshakeCard = null;
        }
        return;
    }

    if (request === 'HANDSHAKE:NACK') {
        pendingHandshakeCard = null;
        DeviceEventEmitter.emit('transferAborted', { reason: 'Redundant Intel' });
        return;
    }

    // ==========================================
    // 2. UMPIRE CHUNK ROUTING (The Final Architecture)
    // ==========================================
    let isUmpirePacket = false;

    if (request.startsWith('REQ:UMPIRE_PUSH:')) {
        const parts = request.split(':');
        global.umpireSender = parts[2] || null;
        global.umpireBuffer = request;
        isUmpirePacket = true;
        console.log(`>> GATT SERVER: Initial Umpire chunk caught from ${global.umpireSender}.`);
    } else if (global.umpireBuffer && global.umpireBuffer.length > 0) {
        if (!request.startsWith('REQ:')) {
            global.umpireBuffer += request;
            isUmpirePacket = true;
            console.log(`>> GATT SERVER: Umpire chunk appended. Buffer size: ${global.umpireBuffer.length}`);
        } else {
            console.log(`>> GATT SERVER: Dropping cross-talk packet from Umpire buffer.`);
        }
    }

    if (isUmpirePacket) {
        if (global.umpireBuffer.includes('__EOF__')) {
            console.log(`>> GATT SERVER: Umpire Payload fully received. Processing...`);
            const rawBuffer = global.umpireBuffer.replace('__EOF__', '');
            const senderHandle = global.umpireSender || null;
            if (!senderHandle) return;
            const jsonStartIndex = rawBuffer.indexOf('{');
            
            global.umpireBuffer = null;
            global.umpireSender = null;

            if (jsonStartIndex !== -1) {
                try {
                    const fullPayload = rawBuffer.substring(jsonStartIndex);
                    const incomingCard = JSON.parse(fullPayload);
                    DeviceEventEmitter.emit('umpireDataReceived', { card: incomingCard, sender: senderHandle, timestamp: Date.now() });
                } catch (e) {
                    console.error(">> GATT SERVER: Umpire JSON Parse Error -", e.message);
                }
            }
        }
        return; // Halt standard processing so it doesn't fall through to REQ: logic
    }

    // ==========================================
    // MESH SYNC BUFFERING (CLEAN HANDOFF)
    // ==========================================
    let isSyncPacket = false;
    
    if (request.startsWith('REQ:SYNC_LEDGER:')) {
        global.syncBuffer = request;
        isSyncPacket = true;
        console.log(`>> GATT SERVER: Sync Ledger start caught.`);
    } else if (global.syncBuffer && global.syncBuffer.length > 0) {
        if (!request.startsWith('REQ:')) {
            global.syncBuffer += request;
            isSyncPacket = true;
        } else {
            console.log(`>> GATT SERVER: Dropping cross-talk packet from Sync buffer.`);
        }
    }

    if (isSyncPacket) {
        if (global.syncBuffer.includes('__EOF__')) {
            console.log(`>> GATT SERVER: Payload complete. Passing to App Zipper...`);
            
            // Hand the RAW payload to the App.js listener
            DeviceEventEmitter.emit('onMeshPayloadReceived', { 
                payload: global.syncBuffer.replace('__EOF__', '') 
            });
            
            global.syncBuffer = null;
        }
        return; 
    }

    // ==========================================
    // 3. STANDARD REQUEST HANDLING
    // ==========================================
    if (request.startsWith('REQ:')) {
        const parts = request.split(':');
        const reqType = parts[1];
        const reqValue = parts[2] ? parts[2].trim() : null;
        const userHandle = parts[3] || null;
        if (!userHandle) return;
        const senderPublicKey = parts[4] || null;

        if (senderPublicKey) {
            const blocked = await isBlocked(senderPublicKey, null);
            if (blocked) {
                sendCardInChunks({ error: "BLOCKED" });
                return;
            }
        }

        if (reqType === 'ACK') {
            const jsonPayload = request.substring(request.indexOf('{'));
            try {
                const ackData = JSON.parse(jsonPayload);
                const { receipt, signature, publicKey } = ackData;
                const receiptParts = receipt.split(':');
                const cardId = receiptParts[0];
                const ackTimestamp = receiptParts[1]; 
                const recipientHandle = receiptParts[2];
                const isValid = verifySignature(receipt, signature, publicKey);
                if (isValid) {
                    DeviceEventEmitter.emit('transferComplete', { cardId, recipientHandle, recipientPublicKey: publicKey, timestamp: ackTimestamp });
                }
            } catch (e) {}
            return;
        }

        if (reqType === 'STAT_PAYLOAD') {
            const jsonPayload = request.substring(request.indexOf('{'));
            try {
                if (!jsonPayload.endsWith('}')) return; 
                const stats = JSON.parse(jsonPayload);
                DeviceEventEmitter.emit('statsReceived', { ...stats, handle: userHandle });
            } catch (e) {}
            return;
        }
        
        if (reqType === 'Q') {
            const advertisedCard = getAdvertisedCard(); 
            if (advertisedCard) {
                sendCardInChunks(advertisedCard);
            } else {
                sendCardInChunks({ error: "QUESTION_EXPIRED" });
            }
            return; 
        }

        let cardToSend = null;
        
        if (reqType === 'ID') {
            if (reqValue) cardToSend = await getCardById(reqValue);
        } else if (reqType === 'CAT' || reqType === 'general') {
            const currentlyOfferedCard = getAdvertisedCard();

            if (currentlyOfferedCard) {
                cardToSend = currentlyOfferedCard;
            } else {
                let category = (!reqValue || reqValue === 'undefined' || reqValue === 'none' || reqType === 'general' || reqValue === 'general') ? null : reqValue;
                if (category) {
                    const catLower = category.toLowerCase().trim();
                    if (catLower.includes('fit')) category = 'health OR fitness OR cooking';
                    else if (catLower.includes('food')) category = 'food OR cooking OR culinary OR health';
                    else if (catLower.includes('edu')) category = 'education OR history OR science';
                    else if (catLower.includes('pro')) category = 'professional OR technology OR military';
                    else if (catLower.includes('fun')) category = 'fun OR survival OR music';
                }

                if (!category) {
                    const allCards = await fetchCards(1, 0, { enforceBroadcastRule: true });
                    if (allCards.length > 0) cardToSend = allCards[0];
                } else {
                    const results = await searchCards(category, { enforceBroadcastRule: true });
                    if (results.length > 0) cardToSend = results[0];
                }
            }
        }

        if (cardToSend) {
            const keys = await getOrGenerateKeys();
            cardToSend.senderPublicKey = keys.publicKey;
            DeviceEventEmitter.emit('pendingTransfer', {
                deviceId: "connected_peer",
                requester: userHandle,
                requesterPublicKey: senderPublicKey,
                card: cardToSend
            });
        } else {
            sendCardInChunks({ error: "NO_CARDS" });
        }
    }
};

import WifiMeshService from './WifiMeshService';

const sendCardInChunks = async (deviceId, card) => {
    const actualCard = card || deviceId; 

    // === DIAGNOSTIC PAYLOAD INTERCEPT ===
    console.log(`\n📡 >> TRANSMITTING PAYLOAD FROM GATT SERVER`);
    console.log(`>> Title: ${actualCard.title}`);
    console.log(`>> History Length: ${actualCard.history ? actualCard.history.length : 0}`);
    console.log(`>> Last Block Action: ${actualCard.history && actualCard.history.length > 0 ? actualCard.history[actualCard.history.length - 1].action : 'NONE'}`);
    console.log(`==========================================\n`);

    const cardString = JSON.stringify(actualCard);
    const totalSize = cardString.length;
    console.log(">> GATT SERVER: Sending", actualCard.title || "Error Object", "Size:", totalSize);

    let payloadToChunk = cardString;

    // === NEW SMART ROUTER (VECTOR 1) ===
    if (totalSize > 2500) { 
        console.log(">> SMART ROUTER: Payload exceeds 2.5KB threshold. Attempting Wi-Fi Override...");
        try {
            const { ip, port } = await WifiMeshService.hostPayload(cardString);
            payloadToChunk = `REQ:WIFI_UPGRADE:${ip}:${port}`;
            console.log(`>> SMART ROUTER: Override successful. Redirecting requestor to TCP ${ip}:${port}`);
        } catch (e) {
            console.warn(">> SMART ROUTER: Wi-Fi Override failed (No Hotspot/LAN). Falling back strictly to BLE MTU.", e.message);
        }
    }

    const transmitSize = payloadToChunk.length;
    let offset = 0;
    while (offset < transmitSize) {
        const chunk = payloadToChunk.slice(offset, offset + CHUNK_SIZE);
        try {
            await SourceGattModule.sendData(chunk);
        } catch (e) {
            console.error(">> GATT SERVER: Pipe Broken:", e);
            return;
        }
        offset += CHUNK_SIZE;
        await new Promise(r => setTimeout(r, 200));
    }

    try {
        await SourceGattModule.sendData("__EOF__");
    } catch(e) {}
    
    console.log(">> GATT SERVER: Done.");

    DeviceEventEmitter.emit('onTransferSuccess', { cardTitle: actualCard.title });
};

const startServer = async () => {
    if (SourceGattModule) {
        if (!cardReceivedListener) {
            cardReceivedListener = DeviceEventEmitter.addListener('onDeviceRequest', onCardReceived);
            console.log(">> PERIPHERAL SERVICE: Attached GATT knock listener.");
        }
        try {
            const result = await SourceGattModule.startServer();
            console.log(`>> ENGINE 4: ${result}`);
            console.log(">> ENGINE 4: Listening...");
        } catch (e) {
            console.error(">> ENGINE 4: FAILED to start GATT server", e);
        }
    }
};

const stopServer = () => {
    if (SourceGattModule) SourceGattModule.stopServer();
    if (cardReceivedListener) {
        cardReceivedListener.remove();
        cardReceivedListener = null;
    }
};

const sendSyncPingBack = async (cardId, mergedHistory) => {
    console.log(`\n📡 >> TRANSMITTING MESH SYNC ACK FROM GATT SERVER`);
    const payloadString = `ACK:SYNC_LEDGER:${cardId}:${JSON.stringify(mergedHistory)}`;
    const totalSize = payloadString.length;
    
    let offset = 0;
    while (offset < totalSize) {
        const chunk = payloadString.slice(offset, offset + CHUNK_SIZE);
        try {
            await SourceGattModule.sendData(chunk);
        } catch (e) {
            console.error(">> GATT SERVER: Pipe Broken (Sync Ping):", e);
            return;
        }
        offset += CHUNK_SIZE;
        await new Promise(r => setTimeout(r, 200));
    }

    try {
        await SourceGattModule.sendData("__EOF__");
    } catch(e) {}
    
    console.log(">> GATT SERVER: Sync Ping Done.");
};

// ADDED INITIATE HANDSHAKE TO EXPORTS
export { startServer, stopServer, sendCardInChunks, initiateHandshake, sendSyncPingBack };